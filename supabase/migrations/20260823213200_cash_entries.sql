-- cash_entries: actual money in/out (cashbook), not theoretical menu cost
-- Depends on: auth.users, ingredients, purchase_plans

CREATE TABLE public.cash_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  category TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  occurred_at DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer'
    CHECK (payment_method IN ('cash', 'bank_transfer')),
  counterparty TEXT,
  note TEXT,
  period_from DATE,
  period_to DATE,
  gross_amount DECIMAL(12,2),
  fee_amount DECIMAL(12,2),
  adjustment_amount DECIMAL(12,2),
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE SET NULL,
  quantity DECIMAL(12,4),
  unit TEXT,
  is_asset BOOLEAN NOT NULL DEFAULT FALSE,
  plan_id UUID REFERENCES public.purchase_plans(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cash_entries_type_category CHECK (
    (type = 'income' AND category IN ('platform_payout', 'other_income'))
    OR (type = 'expense' AND category IN ('ingredient', 'packaging', 'equipment', 'utility', 'labor', 'other'))
    OR (type = 'transfer' AND category IN ('owner_draw'))
  ),
  CONSTRAINT cash_entries_period_order CHECK (
    period_from IS NULL OR period_to IS NULL OR period_from <= period_to
  )
);

CREATE INDEX idx_cash_entries_user_occurred_at ON public.cash_entries(user_id, occurred_at DESC);
CREATE INDEX idx_cash_entries_user_type ON public.cash_entries(user_id, type);
CREATE INDEX idx_cash_entries_ingredient_id ON public.cash_entries(ingredient_id);
CREATE INDEX idx_cash_entries_plan_id ON public.cash_entries(plan_id);

CREATE TRIGGER update_cash_entries_updated_at
  BEFORE UPDATE ON public.cash_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cash entries"
  ON public.cash_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own cash entries"
  ON public.cash_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cash entries"
  ON public.cash_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cash entries"
  ON public.cash_entries FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cash_entries TO authenticated;
GRANT ALL ON TABLE public.cash_entries TO service_role;
