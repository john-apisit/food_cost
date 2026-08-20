-- Food Cost Management — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE store_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  price_per_unit DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ingredient', 'packaging')),
  category TEXT,
  supplier TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ingredient_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  price_per_unit DECIMAL(10,2) NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE TABLE recipe_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity_per_unit DECIMAL(10,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE menu_addons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  addon_menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  quantity DECIMAL(10,4) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE combos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE combo_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  combo_id UUID NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  days INTEGER NOT NULL DEFAULT 1,
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_plan_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES purchase_plans(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  target_quantity INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sales_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES purchase_plans(id) ON DELETE SET NULL,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  target_qty INTEGER,
  actual_qty INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX idx_ingredients_user_id ON ingredients(user_id);
CREATE INDEX idx_ingredients_type ON ingredients(type);
CREATE INDEX idx_ingredients_is_active ON ingredients(is_active);
CREATE INDEX idx_menu_items_user_id ON menu_items(user_id);
CREATE INDEX idx_menu_items_is_active ON menu_items(is_active);
CREATE INDEX idx_recipe_lines_menu_item_id ON recipe_lines(menu_item_id);
CREATE INDEX idx_menu_addons_menu_item_id ON menu_addons(menu_item_id);
CREATE INDEX idx_price_history_ingredient_id ON ingredient_price_history(ingredient_id);
CREATE INDEX idx_purchase_plan_lines_plan_id ON purchase_plan_lines(plan_id);
CREATE INDEX idx_combos_user_id ON combos(user_id);
CREATE INDEX idx_sales_records_user_id ON sales_records(user_id);
CREATE INDEX idx_purchase_plans_user_id ON purchase_plans(user_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON store_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ingredients_updated_at
  BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_combos_updated_at
  BEFORE UPDATE ON combos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_plans_updated_at
  BEFORE UPDATE ON purchase_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION track_ingredient_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.price_per_unit IS DISTINCT FROM NEW.price_per_unit THEN
    INSERT INTO ingredient_price_history (ingredient_id, price_per_unit, effective_at)
    VALUES (NEW.id, NEW.price_per_unit, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_ingredient_price
  AFTER UPDATE ON ingredients
  FOR EACH ROW
  EXECUTE FUNCTION track_ingredient_price_change();

CREATE OR REPLACE FUNCTION track_ingredient_price_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ingredient_price_history (ingredient_id, price_per_unit, effective_at)
  VALUES (NEW.id, NEW.price_per_unit, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_ingredient_price_on_insert
  AFTER INSERT ON ingredients
  FOR EACH ROW
  EXECUTE FUNCTION track_ingredient_price_insert();

-- ---------------------------------------------------------------------------
-- New-user store settings
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION initialize_store_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO store_settings (user_id, platform_name, platform_fee_percent, fixed_cost_box, fixed_cost_bag)
  VALUES (NEW.id, 'LINE MAN', 30.00, 5.00, 3.00)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_store_settings();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_plan_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_records ENABLE ROW LEVEL SECURITY;

-- Store Settings
CREATE POLICY "Users can view their own store settings"
  ON store_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own store settings"
  ON store_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own store settings"
  ON store_settings FOR UPDATE USING (auth.uid() = user_id);

-- Ingredients
CREATE POLICY "Users can view their own ingredients"
  ON ingredients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ingredients"
  ON ingredients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ingredients"
  ON ingredients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ingredients"
  ON ingredients FOR DELETE USING (auth.uid() = user_id);

-- Price History
CREATE POLICY "Users can view price history of their ingredients"
  ON ingredient_price_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ingredients
      WHERE ingredients.id = ingredient_price_history.ingredient_id
      AND ingredients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert price history of their ingredients"
  ON ingredient_price_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ingredients
      WHERE ingredients.id = ingredient_price_history.ingredient_id
      AND ingredients.user_id = auth.uid()
    )
  );

-- Menu Items
CREATE POLICY "Users can view their own menu items"
  ON menu_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own menu items"
  ON menu_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own menu items"
  ON menu_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own menu items"
  ON menu_items FOR DELETE USING (auth.uid() = user_id);

-- Recipe Lines
CREATE POLICY "Users can view recipe lines of their menus"
  ON recipe_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM menu_items
      WHERE menu_items.id = recipe_lines.menu_item_id
      AND menu_items.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert recipe lines for their menus"
  ON recipe_lines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menu_items
      WHERE menu_items.id = recipe_lines.menu_item_id
      AND menu_items.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update recipe lines of their menus"
  ON recipe_lines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM menu_items
      WHERE menu_items.id = recipe_lines.menu_item_id
      AND menu_items.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete recipe lines of their menus"
  ON recipe_lines FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM menu_items
      WHERE menu_items.id = recipe_lines.menu_item_id
      AND menu_items.user_id = auth.uid()
    )
  );

-- Menu Add-ons
CREATE POLICY "Users can view their menu addons"
  ON menu_addons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM menu_items
      WHERE menu_items.id = menu_addons.menu_item_id
      AND menu_items.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert menu addons for their menus"
  ON menu_addons FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menu_items
      WHERE menu_items.id = menu_addons.menu_item_id
      AND menu_items.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update their menu addons"
  ON menu_addons FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM menu_items
      WHERE menu_items.id = menu_addons.menu_item_id
      AND menu_items.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete their menu addons"
  ON menu_addons FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM menu_items
      WHERE menu_items.id = menu_addons.menu_item_id
      AND menu_items.user_id = auth.uid()
    )
  );

-- Combos
CREATE POLICY "Users can view their own combos"
  ON combos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own combos"
  ON combos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own combos"
  ON combos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own combos"
  ON combos FOR DELETE USING (auth.uid() = user_id);

-- Combo Items
CREATE POLICY "Users can view their combo items"
  ON combo_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM combos
      WHERE combos.id = combo_items.combo_id
      AND combos.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert combo items for their combos"
  ON combo_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM combos
      WHERE combos.id = combo_items.combo_id
      AND combos.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update their combo items"
  ON combo_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM combos
      WHERE combos.id = combo_items.combo_id
      AND combos.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete their combo items"
  ON combo_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM combos
      WHERE combos.id = combo_items.combo_id
      AND combos.user_id = auth.uid()
    )
  );

-- Purchase Plans
CREATE POLICY "Users can view their own purchase plans"
  ON purchase_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own purchase plans"
  ON purchase_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own purchase plans"
  ON purchase_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own purchase plans"
  ON purchase_plans FOR DELETE USING (auth.uid() = user_id);

-- Purchase Plan Lines
CREATE POLICY "Users can view their purchase plan lines"
  ON purchase_plan_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM purchase_plans
      WHERE purchase_plans.id = purchase_plan_lines.plan_id
      AND purchase_plans.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert purchase plan lines for their plans"
  ON purchase_plan_lines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchase_plans
      WHERE purchase_plans.id = purchase_plan_lines.plan_id
      AND purchase_plans.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update their purchase plan lines"
  ON purchase_plan_lines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM purchase_plans
      WHERE purchase_plans.id = purchase_plan_lines.plan_id
      AND purchase_plans.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete their purchase plan lines"
  ON purchase_plan_lines FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM purchase_plans
      WHERE purchase_plans.id = purchase_plan_lines.plan_id
      AND purchase_plans.user_id = auth.uid()
    )
  );

-- Sales Records
CREATE POLICY "Users can view their own sales records"
  ON sales_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sales records"
  ON sales_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sales records"
  ON sales_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sales records"
  ON sales_records FOR DELETE USING (auth.uid() = user_id);
