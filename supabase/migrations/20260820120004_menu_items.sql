-- menu_items
-- Depends on: auth.users

CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sale_unit_type TEXT NOT NULL CHECK (sale_unit_type IN ('box', 'bag')),
  selling_price DECIMAL(10,2) NOT NULL,
  category TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_items_user_id ON public.menu_items(user_id);
CREATE INDEX idx_menu_items_is_active ON public.menu_items(is_active);

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own menu items"
  ON public.menu_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own menu items"
  ON public.menu_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own menu items"
  ON public.menu_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own menu items"
  ON public.menu_items FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.menu_items TO authenticated;
GRANT ALL ON TABLE public.menu_items TO service_role;
