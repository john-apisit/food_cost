-- sales_records
-- Depends on: auth.users, purchase_plans, menu_items

CREATE TABLE public.sales_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.purchase_plans(id) ON DELETE SET NULL,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  target_qty INTEGER,
  actual_qty INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_records_user_id ON public.sales_records(user_id);

ALTER TABLE public.sales_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sales records"
  ON public.sales_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sales records"
  ON public.sales_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sales records"
  ON public.sales_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sales records"
  ON public.sales_records FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sales_records TO authenticated;
GRANT ALL ON TABLE public.sales_records TO service_role;
