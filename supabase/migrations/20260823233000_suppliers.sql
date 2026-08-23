-- suppliers: shared vendor list per user
-- Depends on: auth.users, ingredients, cash_entries
--
-- Data backfill (runs as part of this file, not a separate job):
-- 1. Distinct trimmed ingredients.supplier names become suppliers rows (per user)
-- 2. ingredients.supplier_id is set from that match, then the TEXT column is dropped
-- 3. cash_entries.supplier_id is set when an expense counterparty matches a supplier name
--
-- Review before applying: supabase db push  (or supabase migration up locally)

CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT suppliers_name_trimmed CHECK (name = btrim(name) AND name <> '')
);

CREATE INDEX idx_suppliers_user_id ON public.suppliers(user_id);
CREATE INDEX idx_suppliers_is_active ON public.suppliers(is_active);
CREATE UNIQUE INDEX idx_suppliers_user_id_lower_name
  ON public.suppliers (user_id, lower(name));

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own suppliers"
  ON public.suppliers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own suppliers"
  ON public.suppliers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own suppliers"
  ON public.suppliers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own suppliers"
  ON public.suppliers FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.suppliers TO authenticated;
GRANT ALL ON TABLE public.suppliers TO service_role;

INSERT INTO public.suppliers (user_id, name)
SELECT DISTINCT ON (user_id, lower(btrim(supplier)))
  user_id,
  btrim(supplier)
FROM public.ingredients
WHERE supplier IS NOT NULL
  AND btrim(supplier) <> ''
ORDER BY user_id, lower(btrim(supplier)), created_at;

ALTER TABLE public.ingredients
  ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

CREATE INDEX idx_ingredients_supplier_id ON public.ingredients(supplier_id);

UPDATE public.ingredients AS i
SET supplier_id = s.id
FROM public.suppliers AS s
WHERE i.user_id = s.user_id
  AND i.supplier IS NOT NULL
  AND lower(btrim(i.supplier)) = lower(s.name);

ALTER TABLE public.ingredients DROP COLUMN supplier;

ALTER TABLE public.cash_entries
  ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

CREATE INDEX idx_cash_entries_supplier_id ON public.cash_entries(supplier_id);

UPDATE public.cash_entries AS c
SET supplier_id = s.id
FROM public.suppliers AS s
WHERE c.user_id = s.user_id
  AND c.type = 'expense'
  AND c.counterparty IS NOT NULL
  AND lower(btrim(c.counterparty)) = lower(s.name);
