-- Shopping date and sale period on purchase plans
ALTER TABLE public.purchase_plans
  ADD COLUMN purchase_date DATE,
  ADD COLUMN sale_start_date DATE,
  ADD COLUMN sale_end_date DATE;

ALTER TABLE public.purchase_plans
  ADD CONSTRAINT purchase_plans_sale_range_check
  CHECK (
    sale_start_date IS NULL
    OR sale_end_date IS NULL
    OR sale_end_date >= sale_start_date
  );
