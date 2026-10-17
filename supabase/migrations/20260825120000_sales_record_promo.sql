-- Promotion sales on a sales record (e.g. "buy 3 for 50 THB" when the normal price is 20 THB).
-- actual_qty stays the TOTAL pieces sold (so it still compares with target_qty).
-- promo_qty is how many of those pieces were sold under the promotion, and
-- promo_revenue is the total money received for those promo pieces.
-- Revenue = (actual_qty - promo_qty) * selling_price + promo_revenue.
ALTER TABLE public.sales_records
  ADD COLUMN promo_qty INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN promo_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN promo_note TEXT;

ALTER TABLE public.sales_records
  ADD CONSTRAINT sales_records_promo_qty_valid
    CHECK (promo_qty >= 0 AND promo_qty <= actual_qty),
  ADD CONSTRAINT sales_records_promo_revenue_valid
    CHECK (promo_revenue >= 0 AND (promo_qty > 0 OR promo_revenue = 0));
