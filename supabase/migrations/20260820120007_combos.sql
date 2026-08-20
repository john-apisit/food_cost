-- combos
-- Depends on: auth.users

CREATE TABLE public.combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_combos_user_id ON public.combos(user_id);

CREATE TRIGGER update_combos_updated_at
  BEFORE UPDATE ON public.combos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own combos"
  ON public.combos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own combos"
  ON public.combos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own combos"
  ON public.combos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own combos"
  ON public.combos FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.combos TO authenticated;
GRANT ALL ON TABLE public.combos TO service_role;
