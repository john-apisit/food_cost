-- Prep tasks to complete before opening, e.g. รวนหมู, หุงข้าว
ALTER TABLE public.menu_items
  ADD COLUMN prep_steps TEXT[] NOT NULL DEFAULT '{}';
