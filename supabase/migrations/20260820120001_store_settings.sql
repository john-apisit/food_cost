-- store_settings
-- Depends on: auth.users

CREATE TABLE public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_name TEXT NOT NULL DEFAULT 'LINE MAN',
  platform_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 30.00,
  fixed_cost_box DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  fixed_cost_bag DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  target_food_cost_percent DECIMAL(5,2),
  target_margin_percent DECIMAL(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.initialize_store_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.store_settings (user_id, platform_name, platform_fee_percent, fixed_cost_box, fixed_cost_bag)
  VALUES (NEW.id, 'LINE MAN', 30.00, 5.00, 3.00)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_store_settings();

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own store settings"
  ON public.store_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own store settings"
  ON public.store_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own store settings"
  ON public.store_settings FOR UPDATE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.store_settings TO authenticated;
GRANT ALL ON TABLE public.store_settings TO service_role;
