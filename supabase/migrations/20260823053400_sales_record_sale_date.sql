-- Calendar date of the sale (can be backdated; recorded_at stays as created-at)
ALTER TABLE public.sales_records
  ADD COLUMN sale_date DATE NOT NULL DEFAULT CURRENT_DATE;

UPDATE public.sales_records
  SET sale_date = (recorded_at AT TIME ZONE 'Asia/Bangkok')::date;

CREATE INDEX idx_sales_records_user_sale_date
  ON public.sales_records(user_id, sale_date DESC);
