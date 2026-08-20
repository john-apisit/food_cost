-- combo_items
-- Depends on: combos, menu_items

CREATE TABLE public.combo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id UUID NOT NULL REFERENCES public.combos(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.combo_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their combo items"
  ON public.combo_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.combos
      WHERE combos.id = combo_items.combo_id
      AND combos.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert combo items for their combos"
  ON public.combo_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.combos
      WHERE combos.id = combo_items.combo_id
      AND combos.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update their combo items"
  ON public.combo_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.combos
      WHERE combos.id = combo_items.combo_id
      AND combos.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete their combo items"
  ON public.combo_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.combos
      WHERE combos.id = combo_items.combo_id
      AND combos.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.combo_items TO authenticated;
GRANT ALL ON TABLE public.combo_items TO service_role;
