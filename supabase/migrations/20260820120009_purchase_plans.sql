-- purchase_plans
-- Depends on: auth.users

CREATE TABLE public.purchase_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  days INTEGER NOT NULL DEFAULT 1,
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_plans_user_id ON public.purchase_plans(user_id);

CREATE TRIGGER update_purchase_plans_updated_at
  BEFORE UPDATE ON public.purchase_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.purchase_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchase plans"
  ON public.purchase_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own purchase plans"
  ON public.purchase_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own purchase plans"
  ON public.purchase_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own purchase plans"
  ON public.purchase_plans FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.purchase_plans TO authenticated;
GRANT ALL ON TABLE public.purchase_plans TO service_role;
