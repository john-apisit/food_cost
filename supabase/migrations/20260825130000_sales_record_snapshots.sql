-- Snapshot of price, cost and platform fee at the time sales are recorded,
-- so profit for past days does not change when ingredient prices or menu prices change.
--   unit_price            selling price per piece
--   unit_cost             total cost per piece (ingredients + packaging + fixed cost)
--   platform_fee_percent  delivery platform fee (GP) in effect
-- NULL means the record was saved before snapshots existed; the app falls back to live values.
ALTER TABLE public.sales_records
  ADD COLUMN unit_price NUMERIC(12, 2),
  ADD COLUMN unit_cost NUMERIC(12, 2),
  ADD COLUMN platform_fee_percent NUMERIC(5, 2);

ALTER TABLE public.sales_records
  ADD CONSTRAINT sales_records_snapshot_valid
    CHECK (
      (unit_price IS NULL OR unit_price >= 0)
      AND (unit_cost IS NULL OR unit_cost >= 0)
      AND (platform_fee_percent IS NULL OR (platform_fee_percent >= 0 AND platform_fee_percent <= 100))
    );
