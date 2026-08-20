-- recipe_lines
-- Depends on: menu_items, ingredients

CREATE TABLE public.recipe_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  quantity_per_unit DECIMAL(10,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recipe_lines_menu_item_id ON public.recipe_lines(menu_item_id);

ALTER TABLE public.recipe_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recipe lines of their menus"
  ON public.recipe_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items
      WHERE menu_items.id = recipe_lines.menu_item_id
      AND menu_items.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert recipe lines for their menus"
  ON public.recipe_lines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_items
      WHERE menu_items.id = recipe_lines.menu_item_id
      AND menu_items.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update recipe lines of their menus"
  ON public.recipe_lines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items
      WHERE menu_items.id = recipe_lines.menu_item_id
      AND menu_items.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete recipe lines of their menus"
  ON public.recipe_lines FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items
      WHERE menu_items.id = recipe_lines.menu_item_id
      AND menu_items.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recipe_lines TO authenticated;
GRANT ALL ON TABLE public.recipe_lines TO service_role;
