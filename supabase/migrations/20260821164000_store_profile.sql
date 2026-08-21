-- Store profile shown on the settings page
ALTER TABLE public.store_settings
  ADD COLUMN store_name TEXT,
  ADD COLUMN logo_url TEXT,
  ADD COLUMN banner_url TEXT,
  ADD COLUMN open_time TIME,
  ADD COLUMN close_time TIME,
  ADD COLUMN open_days TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN google_map_url TEXT,
  ADD COLUMN address TEXT,
  ADD COLUMN phone TEXT;
