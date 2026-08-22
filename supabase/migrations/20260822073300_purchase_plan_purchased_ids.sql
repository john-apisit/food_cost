-- Track which shopping-list ingredients have been checked off on a purchase plan
ALTER TABLE public.purchase_plans
  ADD COLUMN purchased_ingredient_ids TEXT[] NOT NULL DEFAULT '{}';
