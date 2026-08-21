-- Menu sales status (stored as English snake_case)
ALTER TABLE public.menu_items
  ADD COLUMN status TEXT NOT NULL DEFAULT 'ready_to_sell'
  CHECK (status IN ('ready_to_sell', 'testing_recipe', 'not_ready', 'discontinued'));
