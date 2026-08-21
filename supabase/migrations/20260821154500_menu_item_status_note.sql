-- Optional note explaining the current menu status
ALTER TABLE public.menu_items
  ADD COLUMN status_note TEXT;
