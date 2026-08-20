-- purchase_plan_lines
-- Depends on: purchase_plans, menu_items

CREATE TABLE public.purchase_plan_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.purchase_plans(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  target_quantity INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_plan_lines_plan_id ON public.purchase_plan_lines(plan_id);

ALTER TABLE public.purchase_plan_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their purchase plan lines"
  ON public.purchase_plan_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_plans
      WHERE purchase_plans.id = purchase_plan_lines.plan_id
      AND purchase_plans.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert purchase plan lines for their plans"
  ON public.purchase_plan_lines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.purchase_plans
      WHERE purchase_plans.id = purchase_plan_lines.plan_id
      AND purchase_plans.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update their purchase plan lines"
  ON public.purchase_plan_lines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_plans
      WHERE purchase_plans.id = purchase_plan_lines.plan_id
      AND purchase_plans.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete their purchase plan lines"
  ON public.purchase_plan_lines FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_plans
      WHERE purchase_plans.id = purchase_plan_lines.plan_id
      AND purchase_plans.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.purchase_plan_lines TO authenticated;
GRANT ALL ON TABLE public.purchase_plan_lines TO service_role;
