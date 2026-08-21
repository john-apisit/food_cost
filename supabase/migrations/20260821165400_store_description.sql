-- Optional store description shown on the settings page
ALTER TABLE public.store_settings
  ADD COLUMN store_description TEXT;
