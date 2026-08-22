-- Optional combo catalog fields, matching menu_items
ALTER TABLE public.combos
  ADD COLUMN description TEXT,
  ADD COLUMN image_url TEXT,
  ADD COLUMN status TEXT NOT NULL DEFAULT 'ready_to_sell'
    CHECK (status IN ('ready_to_sell', 'testing_recipe', 'not_ready', 'discontinued')),
  ADD COLUMN status_note TEXT;
