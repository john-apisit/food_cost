-- menu_addons
-- Depends on: menu_items

CREATE TABLE public.menu_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  addon_menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  quantity DECIMAL(10,4) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_addons_menu_item_id ON public.menu_addons(menu_item_id);

ALTER TABLE public.menu_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their menu addons"
  ON public.menu_addons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items
      WHERE menu_items.id = menu_addons.menu_item_id
      AND menu_items.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert menu addons for their menus"
  ON public.menu_addons FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_items
      WHERE menu_items.id = menu_addons.menu_item_id
      AND menu_items.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update their menu addons"
  ON public.menu_addons FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items
      WHERE menu_items.id = menu_addons.menu_item_id
      AND menu_items.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete their menu addons"
  ON public.menu_addons FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items
      WHERE menu_items.id = menu_addons.menu_item_id
      AND menu_items.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.menu_addons TO authenticated;
GRANT ALL ON TABLE public.menu_addons TO service_role;
