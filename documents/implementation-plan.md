# Food Cost — Implementation Plan

> แผนการพัฒนาระบบ Food Cost Management ทั้งหมดในครั้งเดียว  
> **Stack:** Vite + Vue 3 + TypeScript + Tailwind CSS + Supabase + Vercel

---

## การจัดลำดับการพัฒนา (Implementation Order)

การพัฒนาจะเรียงตามลำดับ dependency — จากส่วนที่เป็นฐานไปหาส่วนที่ใช้ฐานนั้น

```
1. Project Setup & Configuration
   ├─ Vite + Vue 3 + TypeScript + Tailwind CSS
   ├─ Supabase Client Setup
   └─ Environment Configuration

2. Database Schema & Supabase Setup
   ├─ Create Tables
   ├─ RLS Policies
   └─ Helper Functions

3. Authentication System
   └─ Supabase Auth Integration

4. Core Data Management (Foundation)
   ├─ Ingredients Management
   ├─ Packaging Management
   └─ Store Settings

5. Menu Management (Depends on #4)
   ├─ Menu Items with BOM
   ├─ Add-ons System
   └─ Packaging Presets by Sale Unit Type

6. Cost Calculation Engine (Depends on #4, #5)
   ├─ Cost Breakdown per Menu
   ├─ Platform Fee Calculation (LINE MAN 30%)
   └─ Net Profit Calculation

7. Menu Comparison & Analytics (Depends on #6)
   ├─ Menu Profit Comparison Table
   ├─ What-if Analysis
   └─ Margin Target Alerts

8. Purchase Planning (Depends on #4, #5)
   ├─ Purchase Plan Creation
   ├─ Multi-day Calculation
   └─ Export to PDF/CSV

9. Additional Features
   ├─ Combos/Promo Sets
   ├─ Sales Records vs Target
   ├─ Price History Tracking
   └─ Notifications

10. UI/UX Polish & Testing
    ├─ Responsive Design
    ├─ Error Handling
    └─ Loading States
```

---

## 1. Project Setup & Configuration

### 1.1 Initialize Vite + Vue 3 + TypeScript

```bash
npm create vite@latest . -- --template vue-ts
npm install
```

### 1.2 Install Dependencies

```bash
# Core
npm install vue-router@4 pinia

# Supabase
npm install @supabase/supabase-js

# UI & Utilities
npm install tailwindcss postcss autoprefixer
npm install -D @tailwindcss/forms @tailwindcss/typography

# Icons
npm install lucide-vue-next

# Date & Number Formatting
npm install date-fns

# Export
npm install jspdf jspdf-autotable
npm install papaparse
npm install -D @types/papaparse

# Form Validation
npm install vee-validate yup
```

### 1.3 Configure Tailwind CSS

Create `tailwind.config.js`:

```js
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef3e2',
          100: '#fde7c5',
          200: '#fbcf8b',
          300: '#f9b751',
          400: '#f79f17',
          500: '#e68900',
          600: '#c77400',
          700: '#a85f00',
          800: '#894a00',
          900: '#6a3500',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

Create `src/assets/main.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900;
  }
}

@layer components {
  .btn-primary {
    @apply bg-primary-500 hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg transition-colors;
  }
  .btn-secondary {
    @apply bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium px-4 py-2 rounded-lg transition-colors;
  }
  .input-field {
    @apply border-gray-300 rounded-lg focus:border-primary-500 focus:ring-primary-500;
  }
}
```

### 1.4 Environment Configuration

Create `.env`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Create `src/config/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

### 1.5 Project Structure

```
src/
├── assets/
│   └── main.css
├── components/
│   ├── common/          # Shared components (Button, Input, Modal, etc.)
│   ├── ingredients/     # Ingredient management
│   ├── menu/           # Menu management
│   ├── planning/       # Purchase planning
│   ├── comparison/     # Menu comparison
│   └── settings/       # Store settings
├── composables/        # Vue composables (useAuth, useMenu, etc.)
├── config/
│   └── supabase.ts
├── layouts/            # Layout components
├── router/
│   └── index.ts
├── stores/             # Pinia stores
├── types/              # TypeScript types & interfaces
├── utils/              # Utility functions
├── views/              # Page components
├── App.vue
└── main.ts
```

---

## 2. Database Schema & Supabase Setup

### 2.1 SQL Schema

Create file `supabase/schema.sql`:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Store Settings Table
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

-- Ingredients & Packaging Table (unified)
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

-- Ingredient Price History
CREATE TABLE ingredient_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  price_per_unit DECIMAL(10,2) NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- Menu Items Table
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

-- Recipe Lines (BOM) - for both ingredients and packaging
CREATE TABLE recipe_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity_per_unit DECIMAL(10,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Menu Add-ons (menu พ่วง)
CREATE TABLE menu_addons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  addon_menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  quantity DECIMAL(10,4) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Combos Table
CREATE TABLE combos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Combo Items
CREATE TABLE combo_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  combo_id UUID NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Purchase Plans
CREATE TABLE purchase_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  days INTEGER NOT NULL DEFAULT 1,
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Purchase Plan Lines
CREATE TABLE purchase_plan_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES purchase_plans(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  target_quantity INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sales Records (actual vs target)
CREATE TABLE sales_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES purchase_plans(id) ON DELETE SET NULL,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  target_qty INTEGER,
  actual_qty INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ingredients_user_id ON ingredients(user_id);
CREATE INDEX idx_ingredients_type ON ingredients(type);
CREATE INDEX idx_ingredients_is_active ON ingredients(is_active);
CREATE INDEX idx_menu_items_user_id ON menu_items(user_id);
CREATE INDEX idx_menu_items_is_active ON menu_items(is_active);
CREATE INDEX idx_recipe_lines_menu_item_id ON recipe_lines(menu_item_id);
CREATE INDEX idx_menu_addons_menu_item_id ON menu_addons(menu_item_id);
CREATE INDEX idx_price_history_ingredient_id ON ingredient_price_history(ingredient_id);
CREATE INDEX idx_purchase_plan_lines_plan_id ON purchase_plan_lines(plan_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_store_settings_updated_at BEFORE UPDATE ON store_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON ingredients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_combos_updated_at BEFORE UPDATE ON combos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_plans_updated_at BEFORE UPDATE ON purchase_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to track price changes
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
```

### 2.2 Row Level Security (RLS) Policies

```sql
-- Enable RLS
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

-- Store Settings Policies
CREATE POLICY "Users can view their own store settings"
  ON store_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own store settings"
  ON store_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own store settings"
  ON store_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Ingredients Policies
CREATE POLICY "Users can view their own ingredients"
  ON ingredients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ingredients"
  ON ingredients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ingredients"
  ON ingredients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ingredients"
  ON ingredients FOR DELETE
  USING (auth.uid() = user_id);

-- Price History Policies
CREATE POLICY "Users can view price history of their ingredients"
  ON ingredient_price_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ingredients
      WHERE ingredients.id = ingredient_price_history.ingredient_id
      AND ingredients.user_id = auth.uid()
    )
  );

-- Menu Items Policies
CREATE POLICY "Users can view their own menu items"
  ON menu_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own menu items"
  ON menu_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own menu items"
  ON menu_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own menu items"
  ON menu_items FOR DELETE
  USING (auth.uid() = user_id);

-- Recipe Lines Policies
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

-- Similar policies for menu_addons, combos, combo_items, purchase_plans, purchase_plan_lines, sales_records
-- (follow same pattern: check user_id or check via JOIN to parent table)

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
  ON combos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own combos"
  ON combos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own combos"
  ON combos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own combos"
  ON combos FOR DELETE
  USING (auth.uid() = user_id);

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
  ON purchase_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchase plans"
  ON purchase_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own purchase plans"
  ON purchase_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own purchase plans"
  ON purchase_plans FOR DELETE
  USING (auth.uid() = user_id);

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
  ON sales_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sales records"
  ON sales_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales records"
  ON sales_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sales records"
  ON sales_records FOR DELETE
  USING (auth.uid() = user_id);
```

### 2.3 Initial Data Setup Function

```sql
-- Function to initialize store settings for new user
CREATE OR REPLACE FUNCTION initialize_store_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO store_settings (user_id, platform_name, platform_fee_percent, fixed_cost_box, fixed_cost_bag)
  VALUES (NEW.id, 'LINE MAN', 30.00, 5.00, 3.00)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users (if accessible) or call manually after signup
-- CREATE TRIGGER on_auth_user_created
-- AFTER INSERT ON auth.users
-- FOR EACH ROW
-- EXECUTE FUNCTION initialize_store_settings();
```

---

## 3. TypeScript Types

Create `src/types/database.types.ts`:

```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      store_settings: {
        Row: {
          id: string
          user_id: string
          platform_name: string
          platform_fee_percent: number
          fixed_cost_box: number
          fixed_cost_bag: number
          target_food_cost_percent: number | null
          target_margin_percent: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform_name?: string
          platform_fee_percent?: number
          fixed_cost_box?: number
          fixed_cost_bag?: number
          target_food_cost_percent?: number | null
          target_margin_percent?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform_name?: string
          platform_fee_percent?: number
          fixed_cost_box?: number
          fixed_cost_bag?: number
          target_food_cost_percent?: number | null
          target_margin_percent?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      ingredients: {
        Row: {
          id: string
          user_id: string
          name: string
          unit: string
          price_per_unit: number
          type: 'ingredient' | 'packaging'
          category: string | null
          supplier: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          unit: string
          price_per_unit: number
          type: 'ingredient' | 'packaging'
          category?: string | null
          supplier?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          unit?: string
          price_per_unit?: number
          type?: 'ingredient' | 'packaging'
          category?: string | null
          supplier?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      ingredient_price_history: {
        Row: {
          id: string
          ingredient_id: string
          price_per_unit: number
          effective_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          ingredient_id: string
          price_per_unit: number
          effective_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          ingredient_id?: string
          price_per_unit?: number
          effective_at?: string
          notes?: string | null
        }
      }
      menu_items: {
        Row: {
          id: string
          user_id: string
          name: string
          sale_unit_type: 'box' | 'bag'
          selling_price: number
          category: string | null
          image_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          sale_unit_type: 'box' | 'bag'
          selling_price: number
          category?: string | null
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          sale_unit_type?: 'box' | 'bag'
          selling_price?: number
          category?: string | null
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      recipe_lines: {
        Row: {
          id: string
          menu_item_id: string
          ingredient_id: string
          quantity_per_unit: number
          created_at: string
        }
        Insert: {
          id?: string
          menu_item_id: string
          ingredient_id: string
          quantity_per_unit: number
          created_at?: string
        }
        Update: {
          id?: string
          menu_item_id?: string
          ingredient_id?: string
          quantity_per_unit?: number
          created_at?: string
        }
      }
      menu_addons: {
        Row: {
          id: string
          menu_item_id: string
          addon_menu_item_id: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          menu_item_id: string
          addon_menu_item_id: string
          quantity?: number
          created_at?: string
        }
        Update: {
          id?: string
          menu_item_id?: string
          addon_menu_item_id?: string
          quantity?: number
          created_at?: string
        }
      }
      combos: {
        Row: {
          id: string
          user_id: string
          name: string
          selling_price: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          selling_price: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          selling_price?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      combo_items: {
        Row: {
          id: string
          combo_id: string
          menu_item_id: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          combo_id: string
          menu_item_id: string
          quantity?: number
          created_at?: string
        }
        Update: {
          id?: string
          combo_id?: string
          menu_item_id?: string
          quantity?: number
          created_at?: string
        }
      }
      purchase_plans: {
        Row: {
          id: string
          user_id: string
          name: string
          days: number
          is_template: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          days?: number
          is_template?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          days?: number
          is_template?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      purchase_plan_lines: {
        Row: {
          id: string
          plan_id: string
          menu_item_id: string
          target_quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          menu_item_id: string
          target_quantity: number
          created_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          menu_item_id?: string
          target_quantity?: number
          created_at?: string
        }
      }
      sales_records: {
        Row: {
          id: string
          user_id: string
          plan_id: string | null
          menu_item_id: string
          target_qty: number | null
          actual_qty: number
          recorded_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id?: string | null
          menu_item_id: string
          target_qty?: number | null
          actual_qty: number
          recorded_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string | null
          menu_item_id?: string
          target_qty?: number | null
          actual_qty?: number
          recorded_at?: string
        }
      }
    }
  }
}
```

Create `src/types/models.ts`:

```typescript
export type SaleUnitType = 'box' | 'bag'
export type IngredientType = 'ingredient' | 'packaging'

export interface StoreSettings {
  id: string
  userId: string
  platformName: string
  platformFeePercent: number
  fixedCostBox: number
  fixedCostBag: number
  targetFoodCostPercent?: number
  targetMarginPercent?: number
  createdAt: string
  updatedAt: string
}

export interface Ingredient {
  id: string
  userId: string
  name: string
  unit: string
  pricePerUnit: number
  type: IngredientType
  category?: string
  supplier?: string
  notes?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PriceHistory {
  id: string
  ingredientId: string
  pricePerUnit: number
  effectiveAt: string
  notes?: string
}

export interface RecipeLine {
  id: string
  menuItemId: string
  ingredientId: string
  quantityPerUnit: number
  createdAt: string
  ingredient?: Ingredient
}

export interface MenuAddon {
  id: string
  menuItemId: string
  addonMenuItemId: string
  quantity: number
  createdAt: string
  addonMenuItem?: MenuItem
}

export interface MenuItem {
  id: string
  userId: string
  name: string
  saleUnitType: SaleUnitType
  sellingPrice: number
  category?: string
  imageUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  recipeLines?: RecipeLine[]
  addons?: MenuAddon[]
}

export interface MenuCostBreakdown {
  menuItem: MenuItem
  ingredientCost: number
  packagingCost: number
  fixedCost: number
  totalCost: number
  platformFee: number
  netRevenue: number
  netProfit: number
  netMarginPercent: number
  totalCostPercent: number
  ingredientDetails: Array<{
    ingredient: Ingredient
    quantity: number
    cost: number
  }>
  packagingDetails: Array<{
    packaging: Ingredient
    quantity: number
    cost: number
  }>
}

export interface Combo {
  id: string
  userId: string
  name: string
  sellingPrice: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  items?: ComboItem[]
}

export interface ComboItem {
  id: string
  comboId: string
  menuItemId: string
  quantity: number
  createdAt: string
  menuItem?: MenuItem
}

export interface PurchasePlan {
  id: string
  userId: string
  name: string
  days: number
  isTemplate: boolean
  createdAt: string
  updatedAt: string
  lines?: PurchasePlanLine[]
}

export interface PurchasePlanLine {
  id: string
  planId: string
  menuItemId: string
  targetQuantity: number
  createdAt: string
  menuItem?: MenuItem
}

export interface PurchaseItem {
  ingredient: Ingredient
  totalQuantity: number
  totalCost: number
  fromMenus: Array<{
    menuName: string
    quantity: number
  }>
}

export interface SalesRecord {
  id: string
  userId: string
  planId?: string
  menuItemId: string
  targetQty?: number
  actualQty: number
  recordedAt: string
  menuItem?: MenuItem
}
```

---

## 4. Authentication System

### 4.1 Auth Composable

Create `src/composables/useAuth.ts`:

```typescript
import { ref, computed } from 'vue'
import { supabase } from '@/config/supabase'
import type { User, Session } from '@supabase/supabase-js'

const user = ref<User | null>(null)
const session = ref<Session | null>(null)
const loading = ref(true)

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value)

  const initAuth = async () => {
    loading.value = true
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      session.value = currentSession
      user.value = currentSession?.user ?? null

      supabase.auth.onAuthStateChange((_event, newSession) => {
        session.value = newSession
        user.value = newSession?.user ?? null
      })
    } catch (error) {
      console.error('Auth initialization error:', error)
    } finally {
      loading.value = false
    }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error
    
    // Initialize store settings after signup
    if (data.user) {
      await supabase.from('store_settings').insert({
        user_id: data.user.id,
        platform_name: 'LINE MAN',
        platform_fee_percent: 30.00,
        fixed_cost_box: 5.00,
        fixed_cost_bag: 3.00,
      })
    }
    
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  }

  return {
    user,
    session,
    loading,
    isAuthenticated,
    initAuth,
    signIn,
    signUp,
    signOut,
    resetPassword,
  }
}
```

### 4.2 Auth Pages

Create `src/views/auth/LoginView.vue`:

```vue
<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
    <div class="max-w-md w-full mx-4">
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Food Cost</h1>
          <p class="text-gray-600">ระบบจัดการต้นทุนและวางแผนซื้อวัตถุดิบ</p>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-6">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
              อีเมล
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              class="input-field w-full"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
              รหัสผ่าน
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              class="input-field w-full"
              placeholder="••••••••"
            />
          </div>

          <div v-if="error" class="text-red-600 text-sm">
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full btn-primary disabled:opacity-50"
          >
            {{ isSignUp ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ' }}
          </button>

          <div class="text-center">
            <button
              type="button"
              @click="isSignUp = !isSignUp"
              class="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              {{ isSignUp ? 'มีบัญชีแล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สมัครสมาชิก' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { signIn, signUp } = useAuth()

const email = ref('')
const password = ref('')
const isSignUp = ref(false)
const isLoading = ref(false)
const error = ref('')

const handleSubmit = async () => {
  isLoading.value = true
  error.value = ''
  
  try {
    if (isSignUp.value) {
      await signUp(email.value, password.value)
      alert('สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี')
    } else {
      await signIn(email.value, password.value)
      router.push('/dashboard')
    }
  } catch (e: any) {
    error.value = e.message || 'เกิดข้อผิดพลาด'
  } finally {
    isLoading.value = false
  }
}
</script>
```

---

## 5. Store Settings Management

Create `src/composables/useStoreSettings.ts`:

```typescript
import { ref } from 'vue'
import { supabase } from '@/config/supabase'
import type { StoreSettings } from '@/types/models'
import { useAuth } from './useAuth'

export function useStoreSettings() {
  const { user } = useAuth()
  const settings = ref<StoreSettings | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchSettings = async () => {
    if (!user.value) return

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('store_settings')
        .select('*')
        .eq('user_id', user.value.id)
        .single()

      if (fetchError) throw fetchError
      settings.value = data
    } catch (e: any) {
      error.value = e.message
      console.error('Fetch settings error:', e)
    } finally {
      loading.value = false
    }
  }

  const updateSettings = async (updates: Partial<StoreSettings>) => {
    if (!user.value) return

    loading.value = true
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from('store_settings')
        .update(updates)
        .eq('user_id', user.value.id)
        .select()
        .single()

      if (updateError) throw updateError
      settings.value = data
    } catch (e: any) {
      error.value = e.message
      console.error('Update settings error:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings,
  }
}
```

---

## 6. Ingredients & Packaging Management

### 6.1 Ingredients Composable

Create `src/composables/useIngredients.ts`:

```typescript
import { ref } from 'vue'
import { supabase } from '@/config/supabase'
import type { Ingredient, IngredientType } from '@/types/models'
import { useAuth } from './useAuth'

export function useIngredients() {
  const { user } = useAuth()
  const ingredients = ref<Ingredient[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchIngredients = async (type?: IngredientType) => {
    if (!user.value) return

    loading.value = true
    error.value = null

    try {
      let query = supabase
        .from('ingredients')
        .select('*')
        .eq('user_id', user.value.id)
        .eq('is_active', true)
        .order('name')

      if (type) {
        query = query.eq('type', type)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      ingredients.value = data || []
    } catch (e: any) {
      error.value = e.message
      console.error('Fetch ingredients error:', e)
    } finally {
      loading.value = false
    }
  }

  const fetchIngredientById = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('ingredients')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      return data
    } catch (e: any) {
      error.value = e.message
      console.error('Fetch ingredient error:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const createIngredient = async (ingredient: Omit<Ingredient, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user.value) return

    loading.value = true
    error.value = null

    try {
      const { data, error: insertError } = await supabase
        .from('ingredients')
        .insert({
          user_id: user.value.id,
          ...ingredient,
        })
        .select()
        .single()

      if (insertError) throw insertError
      ingredients.value.push(data)
      return data
    } catch (e: any) {
      error.value = e.message
      console.error('Create ingredient error:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const updateIngredient = async (id: string, updates: Partial<Ingredient>) => {
    loading.value = true
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from('ingredients')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError
      
      const index = ingredients.value.findIndex(i => i.id === id)
      if (index !== -1) {
        ingredients.value[index] = data
      }
      
      return data
    } catch (e: any) {
      error.value = e.message
      console.error('Update ingredient error:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const deleteIngredient = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      // Soft delete
      const { error: deleteError } = await supabase
        .from('ingredients')
        .update({ is_active: false })
        .eq('id', id)

      if (deleteError) throw deleteError
      
      ingredients.value = ingredients.value.filter(i => i.id !== id)
    } catch (e: any) {
      error.value = e.message
      console.error('Delete ingredient error:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const searchIngredients = async (searchTerm: string, type?: IngredientType) => {
    if (!user.value) return

    loading.value = true
    error.value = null

    try {
      let query = supabase
        .from('ingredients')
        .select('*')
        .eq('user_id', user.value.id)
        .eq('is_active', true)
        .ilike('name', `%${searchTerm}%`)
        .order('name')

      if (type) {
        query = query.eq('type', type)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      return data || []
    } catch (e: any) {
      error.value = e.message
      console.error('Search ingredients error:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  const fetchPriceHistory = async (ingredientId: string) => {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('ingredient_price_history')
        .select('*')
        .eq('ingredient_id', ingredientId)
        .order('effective_at', { ascending: false })

      if (fetchError) throw fetchError
      return data || []
    } catch (e: any) {
      error.value = e.message
      console.error('Fetch price history error:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  return {
    ingredients,
    loading,
    error,
    fetchIngredients,
    fetchIngredientById,
    createIngredient,
    updateIngredient,
    deleteIngredient,
    searchIngredients,
    fetchPriceHistory,
  }
}
```

### 6.2 Ingredients List Component

Create `src/components/ingredients/IngredientsList.vue`:

```vue
<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold">{{ title }}</h2>
      <button @click="$emit('add')" class="btn-primary">
        + เพิ่ม{{ type === 'ingredient' ? 'วัตถุดิบ' : 'บรรจุภัณฑ์' }}
      </button>
    </div>

    <div class="flex gap-4">
      <input
        v-model="searchTerm"
        type="text"
        placeholder="ค้นหา..."
        class="input-field flex-1"
      />
      <select v-if="!type" v-model="filterType" class="input-field w-48">
        <option value="">ทั้งหมด</option>
        <option value="ingredient">วัตถุดิบ</option>
        <option value="packaging">บรรจุภัณฑ์</option>
      </select>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p>กำลังโหลด...</p>
    </div>

    <div v-else-if="filteredItems.length === 0" class="text-center py-8 text-gray-500">
      <p>ไม่พบรายการ</p>
    </div>

    <div v-else class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อ</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หน่วย</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ราคา/หน่วย</th>
            <th v-if="!type" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ประเภท</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หมวดหมู่</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr
            v-for="item in filteredItems"
            :key="item.id"
            class="hover:bg-gray-50 cursor-pointer"
            @click="$emit('edit', item)"
          >
            <td class="px-6 py-4 whitespace-nowrap">{{ item.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ item.unit }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ formatCurrency(item.pricePerUnit) }}</td>
            <td v-if="!type" class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 py-1 text-xs rounded-full" :class="item.type === 'ingredient' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'">
                {{ item.type === 'ingredient' ? 'วัตถุดิบ' : 'บรรจุภัณฑ์' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-500">{{ item.category || '-' }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <button
                @click.stop="$emit('edit', item)"
                class="text-primary-600 hover:text-primary-900 mr-3"
              >
                แก้ไข
              </button>
              <button
                @click.stop="$emit('delete', item)"
                class="text-red-600 hover:text-red-900"
              >
                ลบ
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Ingredient, IngredientType } from '@/types/models'

interface Props {
  items: Ingredient[]
  loading: boolean
  title: string
  type?: IngredientType
}

const props = defineProps<Props>()
defineEmits<{
  add: []
  edit: [item: Ingredient]
  delete: [item: Ingredient]
}>()

const searchTerm = ref('')
const filterType = ref<IngredientType | ''>('')

const filteredItems = computed(() => {
  let result = props.items

  if (searchTerm.value) {
    result = result.filter(item =>
      item.name.toLowerCase().includes(searchTerm.value.toLowerCase())
    )
  }

  if (filterType.value && !props.type) {
    result = result.filter(item => item.type === filterType.value)
  }

  return result
})

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(amount)
}
</script>
```

### 6.3 Ingredient Form Modal

Create `src/components/ingredients/IngredientFormModal.vue`:

```vue
<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
      <h3 class="text-xl font-bold mb-4">
        {{ ingredient?.id ? 'แก้ไข' : 'เพิ่ม' }}{{ type === 'ingredient' ? 'วัตถุดิบ' : 'บรรจุภัณฑ์' }}
      </h3>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">ชื่อ *</label>
          <input
            v-model="formData.name"
            type="text"
            required
            class="input-field w-full"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">หน่วย *</label>
            <input
              v-model="formData.unit"
              type="text"
              required
              placeholder="เช่น kg, กำ, ใบ"
              class="input-field w-full"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">ราคา/หน่วย (บาท) *</label>
            <input
              v-model.number="formData.pricePerUnit"
              type="number"
              step="0.01"
              required
              class="input-field w-full"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่</label>
          <input
            v-model="formData.category"
            type="text"
            placeholder="เช่น เนื้อสัตว์, ผัก, เครื่องปรุง"
            class="input-field w-full"
          />
        </div>

        <div v-if="type === 'ingredient'">
          <label class="block text-sm font-medium text-gray-700 mb-1">ซัพพลายเออร์</label>
          <input
            v-model="formData.supplier"
            type="text"
            class="input-field w-full"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
          <textarea
            v-model="formData.notes"
            rows="3"
            class="input-field w-full"
          ></textarea>
        </div>

        <div v-if="error" class="text-red-600 text-sm">{{ error }}</div>

        <div class="flex gap-3 pt-4">
          <button type="submit" :disabled="loading" class="btn-primary flex-1">
            {{ loading ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
          <button type="button" @click="$emit('close')" class="btn-secondary flex-1">
            ยกเลิก
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Ingredient, IngredientType } from '@/types/models'

interface Props {
  isOpen: boolean
  ingredient?: Ingredient | null
  type: IngredientType
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  save: [data: any]
}>()

const loading = ref(false)
const error = ref('')

const formData = ref({
  name: '',
  unit: '',
  pricePerUnit: 0,
  category: '',
  supplier: '',
  notes: '',
  type: props.type,
  isActive: true,
})

watch(() => props.ingredient, (newVal) => {
  if (newVal) {
    formData.value = {
      name: newVal.name,
      unit: newVal.unit,
      pricePerUnit: newVal.pricePerUnit,
      category: newVal.category || '',
      supplier: newVal.supplier || '',
      notes: newVal.notes || '',
      type: newVal.type,
      isActive: newVal.isActive,
    }
  } else {
    formData.value = {
      name: '',
      unit: '',
      pricePerUnit: 0,
      category: '',
      supplier: '',
      notes: '',
      type: props.type,
      isActive: true,
    }
  }
}, { immediate: true })

const handleSubmit = async () => {
  loading.value = true
  error.value = ''

  try {
    emit('save', formData.value)
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>
```

---

## 7. Menu Management

### 7.1 Menu Composable

Create `src/composables/useMenu.ts`:

```typescript
import { ref } from 'vue'
import { supabase } from '@/config/supabase'
import type { MenuItem, RecipeLine, MenuAddon } from '@/types/models'
import { useAuth } from './useAuth'

export function useMenu() {
  const { user } = useAuth()
  const menuItems = ref<MenuItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchMenuItems = async () => {
    if (!user.value) return

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('menu_items')
        .select(`
          *,
          recipeLines:recipe_lines(
            *,
            ingredient:ingredients(*)
          ),
          addons:menu_addons(
            *,
            addonMenuItem:addon_menu_item_id(*)
          )
        `)
        .eq('user_id', user.value.id)
        .eq('is_active', true)
        .order('name')

      if (fetchError) throw fetchError
      menuItems.value = data || []
    } catch (e: any) {
      error.value = e.message
      console.error('Fetch menu items error:', e)
    } finally {
      loading.value = false
    }
  }

  const fetchMenuItemById = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('menu_items')
        .select(`
          *,
          recipeLines:recipe_lines(
            *,
            ingredient:ingredients(*)
          ),
          addons:menu_addons(
            *,
            addonMenuItem:addon_menu_item_id(*)
          )
        `)
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      return data
    } catch (e: any) {
      error.value = e.message
      console.error('Fetch menu item error:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const createMenuItem = async (menuItem: {
    name: string
    saleUnitType: 'box' | 'bag'
    sellingPrice: number
    category?: string
    imageUrl?: string
    recipeLines: Array<{ ingredientId: string; quantityPerUnit: number }>
    addons?: Array<{ addonMenuItemId: string; quantity: number }>
  }) => {
    if (!user.value) return

    loading.value = true
    error.value = null

    try {
      // Create menu item
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .insert({
          user_id: user.value.id,
          name: menuItem.name,
          sale_unit_type: menuItem.saleUnitType,
          selling_price: menuItem.sellingPrice,
          category: menuItem.category,
          image_url: menuItem.imageUrl,
        })
        .select()
        .single()

      if (menuError) throw menuError

      // Create recipe lines
      if (menuItem.recipeLines.length > 0) {
        const { error: recipeError } = await supabase
          .from('recipe_lines')
          .insert(
            menuItem.recipeLines.map(line => ({
              menu_item_id: menuData.id,
              ingredient_id: line.ingredientId,
              quantity_per_unit: line.quantityPerUnit,
            }))
          )

        if (recipeError) throw recipeError
      }

      // Create addons
      if (menuItem.addons && menuItem.addons.length > 0) {
        const { error: addonError } = await supabase
          .from('menu_addons')
          .insert(
            menuItem.addons.map(addon => ({
              menu_item_id: menuData.id,
              addon_menu_item_id: addon.addonMenuItemId,
              quantity: addon.quantity,
            }))
          )

        if (addonError) throw addonError
      }

      await fetchMenuItems()
      return menuData
    } catch (e: any) {
      error.value = e.message
      console.error('Create menu item error:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const updateMenuItem = async (id: string, updates: {
    name?: string
    saleUnitType?: 'box' | 'bag'
    sellingPrice?: number
    category?: string
    imageUrl?: string
    recipeLines?: Array<{ ingredientId: string; quantityPerUnit: number }>
    addons?: Array<{ addonMenuItemId: string; quantity: number }>
  }) => {
    loading.value = true
    error.value = null

    try {
      // Update menu item
      const { data, error: updateError } = await supabase
        .from('menu_items')
        .update({
          name: updates.name,
          sale_unit_type: updates.saleUnitType,
          selling_price: updates.sellingPrice,
          category: updates.category,
          image_url: updates.imageUrl,
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      // Update recipe lines if provided
      if (updates.recipeLines) {
        // Delete existing lines
        await supabase
          .from('recipe_lines')
          .delete()
          .eq('menu_item_id', id)

        // Insert new lines
        if (updates.recipeLines.length > 0) {
          await supabase
            .from('recipe_lines')
            .insert(
              updates.recipeLines.map(line => ({
                menu_item_id: id,
                ingredient_id: line.ingredientId,
                quantity_per_unit: line.quantityPerUnit,
              }))
            )
        }
      }

      // Update addons if provided
      if (updates.addons) {
        // Delete existing addons
        await supabase
          .from('menu_addons')
          .delete()
          .eq('menu_item_id', id)

        // Insert new addons
        if (updates.addons.length > 0) {
          await supabase
            .from('menu_addons')
            .insert(
              updates.addons.map(addon => ({
                menu_item_id: id,
                addon_menu_item_id: addon.addonMenuItemId,
                quantity: addon.quantity,
              }))
            )
        }
      }

      await fetchMenuItems()
      return data
    } catch (e: any) {
      error.value = e.message
      console.error('Update menu item error:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const deleteMenuItem = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      // Soft delete
      const { error: deleteError } = await supabase
        .from('menu_items')
        .update({ is_active: false })
        .eq('id', id)

      if (deleteError) throw deleteError
      
      menuItems.value = menuItems.value.filter(m => m.id !== id)
    } catch (e: any) {
      error.value = e.message
      console.error('Delete menu item error:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const duplicateMenuItem = async (id: string, newName: string) => {
    loading.value = true
    error.value = null

    try {
      const original = await fetchMenuItemById(id)
      if (!original) throw new Error('Menu item not found')

      await createMenuItem({
        name: newName,
        saleUnitType: original.saleUnitType,
        sellingPrice: original.sellingPrice,
        category: original.category,
        recipeLines: original.recipeLines?.map(line => ({
          ingredientId: line.ingredientId,
          quantityPerUnit: line.quantityPerUnit,
        })) || [],
        addons: original.addons?.map(addon => ({
          addonMenuItemId: addon.addonMenuItemId,
          quantity: addon.quantity,
        })) || [],
      })
    } catch (e: any) {
      error.value = e.message
      console.error('Duplicate menu item error:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    menuItems,
    loading,
    error,
    fetchMenuItems,
    fetchMenuItemById,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    duplicateMenuItem,
  }
}
```

---

## 8. Cost Calculation Engine

Create `src/utils/costCalculator.ts`:

```typescript
import type { MenuItem, StoreSettings, Ingredient, RecipeLine, MenuAddon, MenuCostBreakdown } from '@/types/models'

export function calculateMenuCost(
  menuItem: MenuItem,
  storeSettings: StoreSettings,
  allIngredients: Ingredient[],
  allMenuItems: MenuItem[]
): MenuCostBreakdown {
  // Helper: get ingredient by id
  const getIngredient = (id: string) => allIngredients.find(i => i.id === id)

  // Helper: calculate recipe cost recursively (handles addons)
  const calculateRecipeCost = (menu: MenuItem, visited = new Set<string>()): {
    ingredientCost: number
    packagingCost: number
    ingredientDetails: Array<{ ingredient: Ingredient; quantity: number; cost: number }>
    packagingDetails: Array<{ packaging: Ingredient; quantity: number; cost: number }>
  } => {
    if (visited.has(menu.id)) {
      throw new Error(`Circular addon reference detected: ${menu.name}`)
    }
    visited.add(menu.id)

    let ingredientCost = 0
    let packagingCost = 0
    const ingredientDetails: Array<{ ingredient: Ingredient; quantity: number; cost: number }> = []
    const packagingDetails: Array<{ packaging: Ingredient; quantity: number; cost: number }> = []

    // Calculate cost from recipe lines
    menu.recipeLines?.forEach(line => {
      const ingredient = getIngredient(line.ingredientId)
      if (!ingredient) return

      const cost = line.quantityPerUnit * ingredient.pricePerUnit

      if (ingredient.type === 'ingredient') {
        ingredientCost += cost
        ingredientDetails.push({
          ingredient,
          quantity: line.quantityPerUnit,
          cost,
        })
      } else if (ingredient.type === 'packaging') {
        packagingCost += cost
        packagingDetails.push({
          packaging: ingredient,
          quantity: line.quantityPerUnit,
          cost,
        })
      }
    })

    // Calculate cost from addons (recursive)
    menu.addons?.forEach(addon => {
      const addonMenu = allMenuItems.find(m => m.id === addon.addonMenuItemId)
      if (!addonMenu) return

      const addonCost = calculateRecipeCost(addonMenu, new Set(visited))
      
      ingredientCost += addonCost.ingredientCost * addon.quantity
      packagingCost += addonCost.packagingCost * addon.quantity

      // Merge details
      addonCost.ingredientDetails.forEach(detail => {
        const existing = ingredientDetails.find(d => d.ingredient.id === detail.ingredient.id)
        if (existing) {
          existing.quantity += detail.quantity * addon.quantity
          existing.cost += detail.cost * addon.quantity
        } else {
          ingredientDetails.push({
            ingredient: detail.ingredient,
            quantity: detail.quantity * addon.quantity,
            cost: detail.cost * addon.quantity,
          })
        }
      })

      addonCost.packagingDetails.forEach(detail => {
        const existing = packagingDetails.find(d => d.packaging.id === detail.packaging.id)
        if (existing) {
          existing.quantity += detail.quantity * addon.quantity
          existing.cost += detail.cost * addon.quantity
        } else {
          packagingDetails.push({
            packaging: detail.packaging,
            quantity: detail.quantity * addon.quantity,
            cost: detail.cost * addon.quantity,
          })
        }
      })
    })

    return { ingredientCost, packagingCost, ingredientDetails, packagingDetails }
  }

  // Main calculation
  const recipeCost = calculateRecipeCost(menuItem)

  const fixedCost = menuItem.saleUnitType === 'box'
    ? storeSettings.fixedCostBox
    : storeSettings.fixedCostBag

  const totalCost = recipeCost.ingredientCost + recipeCost.packagingCost + fixedCost

  const platformFee = menuItem.sellingPrice * (storeSettings.platformFeePercent / 100)
  const netRevenue = menuItem.sellingPrice - platformFee
  const netProfit = netRevenue - totalCost

  const netMarginPercent = (netProfit / menuItem.sellingPrice) * 100
  const totalCostPercent = ((totalCost + platformFee) / menuItem.sellingPrice) * 100

  return {
    menuItem,
    ingredientCost: recipeCost.ingredientCost,
    packagingCost: recipeCost.packagingCost,
    fixedCost,
    totalCost,
    platformFee,
    netRevenue,
    netProfit,
    netMarginPercent,
    totalCostPercent,
    ingredientDetails: recipeCost.ingredientDetails,
    packagingDetails: recipeCost.packagingDetails,
  }
}

export function calculateSuggestedPrice(
  targetMarginPercent: number,
  totalCost: number,
  platformFeePercent: number
): number {
  // Formula: selling_price = totalCost / (1 - targetMargin% - platformFee%)
  const targetMarginDecimal = targetMarginPercent / 100
  const platformFeeDecimal = platformFeePercent / 100
  
  if (targetMarginDecimal + platformFeeDecimal >= 1) {
    throw new Error('Target margin + platform fee cannot be >= 100%')
  }

  return totalCost / (1 - targetMarginDecimal - platformFeeDecimal)
}

export function simulatePriceChange(
  breakdown: MenuCostBreakdown,
  priceChangePercent: number
): MenuCostBreakdown {
  const newIngredientCost = breakdown.ingredientCost * (1 + priceChangePercent / 100)
  const newTotalCost = newIngredientCost + breakdown.packagingCost + breakdown.fixedCost
  const newNetProfit = breakdown.netRevenue - newTotalCost
  const newNetMarginPercent = (newNetProfit / breakdown.menuItem.sellingPrice) * 100
  const newTotalCostPercent = ((newTotalCost + breakdown.platformFee) / breakdown.menuItem.sellingPrice) * 100

  return {
    ...breakdown,
    ingredientCost: newIngredientCost,
    totalCost: newTotalCost,
    netProfit: newNetProfit,
    netMarginPercent: newNetMarginPercent,
    totalCostPercent: newTotalCostPercent,
  }
}
```

---

## 9. Menu Comparison Table

Create `src/components/comparison/MenuComparisonTable.vue`:

```vue
<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold">เปรียบเทียบกำไรเมนู</h2>
      <div class="flex gap-2">
        <select v-model="sortBy" class="input-field">
          <option value="netProfit">เรียงตามกำไรสุทธิ</option>
          <option value="netMarginPercent">เรียงตาม % margin</option>
          <option value="name">เรียงตามชื่อ</option>
        </select>
        <select v-model="filterCategory" class="input-field">
          <option value="">ทุกหมวดหมู่</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
        <select v-model="filterUnitType" class="input-field">
          <option value="">ทุกประเภท</option>
          <option value="box">กล่อง</option>
          <option value="bag">มัดถุง</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p>กำลังคำนวณ...</p>
    </div>

    <div v-else-if="sortedBreakdowns.length === 0" class="text-center py-8 text-gray-500">
      <p>ไม่มีเมนู</p>
    </div>

    <div v-else class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เมนู</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ประเภท</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ราคาขาย</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ต้นทุนรวม</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ค่าบริการ</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">กำไรสุทธิ</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% Margin</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="breakdown in sortedBreakdowns"
              :key="breakdown.menuItem.id"
              class="hover:bg-gray-50 cursor-pointer"
              :class="getRowClass(breakdown)"
              @click="$emit('select', breakdown.menuItem)"
            >
              <td class="px-6 py-4 whitespace-nowrap font-medium">
                {{ breakdown.menuItem.name }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs rounded-full" :class="breakdown.menuItem.saleUnitType === 'box' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'">
                  {{ breakdown.menuItem.saleUnitType === 'box' ? 'กล่อง' : 'มัดถุง' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">{{ formatCurrency(breakdown.menuItem.sellingPrice) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-right">{{ formatCurrency(breakdown.totalCost) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-red-600">{{ formatCurrency(breakdown.platformFee) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-right font-semibold" :class="breakdown.netProfit < 0 ? 'text-red-600' : 'text-green-600'">
                {{ formatCurrency(breakdown.netProfit) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right font-semibold" :class="getMarginClass(breakdown.netMarginPercent)">
                {{ breakdown.netMarginPercent.toFixed(1) }}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="targetMargin" class="bg-yellow-50 border-t border-yellow-200 px-6 py-3 text-sm">
        <p class="text-yellow-800">
          เป้าหมาย margin: {{ targetMargin }}% —
          <span class="font-semibold">{{ belowTargetCount }}</span> เมนูต่ำกว่าเป้า
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { MenuCostBreakdown } from '@/types/models'

interface Props {
  breakdowns: MenuCostBreakdown[]
  loading: boolean
  targetMargin?: number
}

const props = defineProps<Props>()
defineEmits<{
  select: [menuItem: any]
}>()

const sortBy = ref<'netProfit' | 'netMarginPercent' | 'name'>('netProfit')
const filterCategory = ref('')
const filterUnitType = ref<'' | 'box' | 'bag'>('')

const categories = computed(() => {
  const cats = new Set<string>()
  props.breakdowns.forEach(b => {
    if (b.menuItem.category) cats.add(b.menuItem.category)
  })
  return Array.from(cats).sort()
})

const filteredBreakdowns = computed(() => {
  let result = props.breakdowns

  if (filterCategory.value) {
    result = result.filter(b => b.menuItem.category === filterCategory.value)
  }

  if (filterUnitType.value) {
    result = result.filter(b => b.menuItem.saleUnitType === filterUnitType.value)
  }

  return result
})

const sortedBreakdowns = computed(() => {
  const sorted = [...filteredBreakdowns.value]

  if (sortBy.value === 'netProfit') {
    sorted.sort((a, b) => b.netProfit - a.netProfit)
  } else if (sortBy.value === 'netMarginPercent') {
    sorted.sort((a, b) => b.netMarginPercent - a.netMarginPercent)
  } else if (sortBy.value === 'name') {
    sorted.sort((a, b) => a.menuItem.name.localeCompare(b.menuItem.name))
  }

  return sorted
})

const belowTargetCount = computed(() => {
  if (!props.targetMargin) return 0
  return props.breakdowns.filter(b => b.netMarginPercent < props.targetMargin!).length
})

const getRowClass = (breakdown: MenuCostBreakdown) => {
  if (breakdown.netProfit < 0) {
    return 'bg-red-50'
  }
  if (props.targetMargin && breakdown.netMarginPercent < props.targetMargin) {
    return 'bg-yellow-50'
  }
  return ''
}

const getMarginClass = (margin: number) => {
  if (margin < 0) return 'text-red-600'
  if (props.targetMargin && margin < props.targetMargin) return 'text-yellow-600'
  return 'text-green-600'
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(amount)
}
</script>
```

---

## 10. Purchase Planning

Create `src/composables/usePurchasePlanning.ts`:

```typescript
import { ref } from 'vue'
import type { MenuItem, Ingredient, PurchaseItem } from '@/types/models'

export function usePurchasePlanning() {
  const calculatePurchaseList = (
    menuSelections: Array<{ menuItem: MenuItem; quantity: number }>,
    days: number,
    allIngredients: Ingredient[],
    allMenuItems: MenuItem[]
  ): PurchaseItem[] => {
    const purchaseMap = new Map<string, PurchaseItem>()

    // Helper to add ingredient to purchase list
    const addIngredientToPurchase = (
      ingredientId: string,
      quantity: number,
      menuName: string
    ) => {
      const ingredient = allIngredients.find(i => i.id === ingredientId)
      if (!ingredient) return

      if (purchaseMap.has(ingredientId)) {
        const existing = purchaseMap.get(ingredientId)!
        existing.totalQuantity += quantity
        existing.totalCost = existing.totalQuantity * ingredient.pricePerUnit
        
        const menuEntry = existing.fromMenus.find(m => m.menuName === menuName)
        if (menuEntry) {
          menuEntry.quantity += quantity
        } else {
          existing.fromMenus.push({ menuName, quantity })
        }
      } else {
        purchaseMap.set(ingredientId, {
          ingredient,
          totalQuantity: quantity,
          totalCost: quantity * ingredient.pricePerUnit,
          fromMenus: [{ menuName, quantity }],
        })
      }
    }

    // Process each menu selection
    menuSelections.forEach(({ menuItem, quantity }) => {
      const totalQuantity = quantity * days

      // Process recipe lines (ingredients + packaging)
      menuItem.recipeLines?.forEach(line => {
        const requiredQty = line.quantityPerUnit * totalQuantity
        addIngredientToPurchase(line.ingredientId, requiredQty, menuItem.name)
      })

      // Process addons recursively
      const processAddons = (menu: MenuItem, multiplier: number) => {
        menu.addons?.forEach(addon => {
          const addonMenu = allMenuItems.find(m => m.id === addon.addonMenuItemId)
          if (!addonMenu) return

          const addonMultiplier = multiplier * addon.quantity

          addonMenu.recipeLines?.forEach(line => {
            const requiredQty = line.quantityPerUnit * addonMultiplier
            addIngredientToPurchase(line.ingredientId, requiredQty, `${menuItem.name} (${addonMenu.name})`)
          })

          // Recursive addons
          processAddons(addonMenu, addonMultiplier)
        })
      }

      processAddons(menuItem, totalQuantity)
    })

    return Array.from(purchaseMap.values()).sort((a, b) => {
      // Sort by type (ingredients first, then packaging), then by name
      if (a.ingredient.type !== b.ingredient.type) {
        return a.ingredient.type === 'ingredient' ? -1 : 1
      }
      return a.ingredient.name.localeCompare(b.ingredient.name)
    })
  }

  return {
    calculatePurchaseList,
  }
}
```

Create `src/components/planning/PurchasePlanningForm.vue`:

```vue
<template>
  <div class="space-y-6">
    <h2 class="text-2xl font-bold">วางแผนการซื้อวัตถุดิบ</h2>

    <div class="bg-white rounded-lg shadow p-6 space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">จำนวนวัน</label>
        <input
          v-model.number="days"
          type="number"
          min="1"
          class="input-field w-32"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">เลือกเมนูและจำนวน</label>
        <div class="space-y-2">
          <div
            v-for="(selection, index) in menuSelections"
            :key="index"
            class="flex gap-2 items-center"
          >
            <select
              v-model="selection.menuItemId"
              class="input-field flex-1"
            >
              <option value="">เลือกเมนู...</option>
              <option
                v-for="menu in menuItems"
                :key="menu.id"
                :value="menu.id"
              >
                {{ menu.name }} ({{ menu.saleUnitType === 'box' ? 'กล่อง' : 'มัดถุง' }})
              </option>
            </select>
            <input
              v-model.number="selection.quantity"
              type="number"
              min="1"
              placeholder="จำนวน"
              class="input-field w-24"
            />
            <button
              @click="removeSelection(index)"
              class="text-red-600 hover:text-red-800"
            >
              ลบ
            </button>
          </div>
        </div>
        <button
          @click="addSelection"
          class="mt-2 text-primary-600 hover:text-primary-800 text-sm font-medium"
        >
          + เพิ่มเมนู
        </button>
      </div>

      <button
        @click="calculate"
        class="btn-primary w-full"
        :disabled="!canCalculate"
      >
        คำนวณรายการซื้อ
      </button>
    </div>

    <div v-if="purchaseItems.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
      <div class="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
        <h3 class="text-lg font-semibold">รายการวัตถุดิบและบรรจุภัณฑ์</h3>
        <div class="flex gap-2">
          <button @click="exportToCSV" class="btn-secondary text-sm">Export CSV</button>
          <button @click="exportToPDF" class="btn-secondary text-sm">Export PDF</button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">รายการ</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ประเภท</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">หน่วย</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ปริมาณรวม</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ราคา/หน่วย</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ราคารวม</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="item in purchaseItems" :key="item.ingredient.id">
              <td class="px-6 py-4">
                <div>{{ item.ingredient.name }}</div>
                <div class="text-xs text-gray-500">
                  {{ item.fromMenus.map(m => `${m.menuName} (${m.quantity.toFixed(2)})`).join(', ') }}
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="px-2 py-1 text-xs rounded-full" :class="item.ingredient.type === 'ingredient' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'">
                  {{ item.ingredient.type === 'ingredient' ? 'วัตถุดิบ' : 'บรรจุภัณฑ์' }}
                </span>
              </td>
              <td class="px-6 py-4">{{ item.ingredient.unit }}</td>
              <td class="px-6 py-4 text-right font-medium">{{ item.totalQuantity.toFixed(2) }}</td>
              <td class="px-6 py-4 text-right">{{ formatCurrency(item.ingredient.pricePerUnit) }}</td>
              <td class="px-6 py-4 text-right font-semibold">{{ formatCurrency(item.totalCost) }}</td>
            </tr>
          </tbody>
          <tfoot class="bg-gray-50">
            <tr>
              <td colspan="5" class="px-6 py-4 text-right font-bold">รวมงบซื้อทั้งหมด</td>
              <td class="px-6 py-4 text-right font-bold text-lg text-primary-600">
                {{ formatCurrency(totalCost) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { MenuItem, Ingredient, PurchaseItem } from '@/types/models'
import { usePurchasePlanning } from '@/composables/usePurchasePlanning'

interface Props {
  menuItems: MenuItem[]
  allIngredients: Ingredient[]
}

const props = defineProps<Props>()

const { calculatePurchaseList } = usePurchasePlanning()

const days = ref(1)
const menuSelections = ref([
  { menuItemId: '', quantity: 1 }
])
const purchaseItems = ref<PurchaseItem[]>([])

const canCalculate = computed(() => {
  return menuSelections.value.some(s => s.menuItemId && s.quantity > 0)
})

const totalCost = computed(() => {
  return purchaseItems.value.reduce((sum, item) => sum + item.totalCost, 0)
})

const addSelection = () => {
  menuSelections.value.push({ menuItemId: '', quantity: 1 })
}

const removeSelection = (index: number) => {
  menuSelections.value.splice(index, 1)
}

const calculate = () => {
  const selections = menuSelections.value
    .filter(s => s.menuItemId && s.quantity > 0)
    .map(s => {
      const menuItem = props.menuItems.find(m => m.id === s.menuItemId)!
      return { menuItem, quantity: s.quantity }
    })

  purchaseItems.value = calculatePurchaseList(
    selections,
    days.value,
    props.allIngredients,
    props.menuItems
  )
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(amount)
}

const exportToCSV = () => {
  // Implementation using papaparse
  console.log('Export to CSV')
}

const exportToPDF = () => {
  // Implementation using jspdf
  console.log('Export to PDF')
}
</script>
```

---

## 11. Router Setup

Create `src/router/index.ts`:

```typescript
import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/ingredients',
      name: 'Ingredients',
      component: () => import('@/views/IngredientsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/packaging',
      name: 'Packaging',
      component: () => import('@/views/PackagingView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/menu',
      name: 'Menu',
      component: () => import('@/views/MenuView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/menu/:id',
      name: 'MenuDetail',
      component: () => import('@/views/MenuDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/comparison',
      name: 'Comparison',
      component: () => import('@/views/ComparisonView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/planning',
      name: 'Planning',
      component: () => import('@/views/PlanningView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const { isAuthenticated, loading } = useAuth()

  // Wait for auth to initialize
  if (loading.value) {
    await new Promise(resolve => {
      const unwatch = watch(loading, (newVal) => {
        if (!newVal) {
          unwatch()
          resolve(true)
        }
      })
    })
  }

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next('/login')
  } else if (to.meta.requiresGuest && isAuthenticated.value) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
```

---

## 12. Main App Setup

Update `src/main.ts`:

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/main.css'
import { useAuth } from './composables/useAuth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize auth before mounting
const { initAuth } = useAuth()
initAuth().then(() => {
  app.mount('#app')
})
```

Update `src/App.vue`:

```vue
<template>
  <router-view />
</template>

<script setup lang="ts">
// App entry point
</script>
```

---

## 13. Layout Component

Create `src/layouts/MainLayout.vue`:

```vue
<template>
  <div class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex-shrink-0 flex items-center">
              <h1 class="text-xl font-bold text-primary-600">Food Cost</h1>
            </div>
            <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
              <router-link
                v-for="item in navItems"
                :key="item.to"
                :to="item.to"
                class="inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors"
                active-class="border-primary-500 text-gray-900"
                inactive-class="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                {{ item.label }}
              </router-link>
            </div>
          </div>
          <div class="flex items-center">
            <button
              @click="handleSignOut"
              class="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { signOut } = useAuth()

const navItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'วัตถุดิบ', to: '/ingredients' },
  { label: 'บรรจุภัณฑ์', to: '/packaging' },
  { label: 'เมนู', to: '/menu' },
  { label: 'เปรียบเทียบเมนู', to: '/comparison' },
  { label: 'วางแผนซื้อ', to: '/planning' },
  { label: 'ตั้งค่า', to: '/settings' },
]

const handleSignOut = async () => {
  try {
    await signOut()
    router.push('/login')
  } catch (error) {
    console.error('Sign out error:', error)
  }
}
</script>
```

---

## 14. View Pages (Examples)

### Dashboard View

Create `src/views/DashboardView.vue`:

```vue
<template>
  <MainLayout>
    <div class="space-y-6">
      <h1 class="text-3xl font-bold">Dashboard</h1>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-gray-500 text-sm font-medium">วัตถุดิบทั้งหมด</h3>
          <p class="text-3xl font-bold mt-2">{{ stats.ingredientCount }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-gray-500 text-sm font-medium">เมนูทั้งหมด</h3>
          <p class="text-3xl font-bold mt-2">{{ stats.menuCount }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-gray-500 text-sm font-medium">Margin เฉลี่ย</h3>
          <p class="text-3xl font-bold mt-2">{{ stats.avgMargin.toFixed(1) }}%</p>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-bold mb-4">Quick Actions</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <router-link to="/ingredients" class="btn-secondary text-center">เพิ่มวัตถุดิบ</router-link>
          <router-link to="/menu" class="btn-secondary text-center">เพิ่มเมนู</router-link>
          <router-link to="/comparison" class="btn-secondary text-center">เปรียบเทียบเมนู</router-link>
          <router-link to="/planning" class="btn-secondary text-center">วางแผนซื้อ</router-link>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { useIngredients } from '@/composables/useIngredients'
import { useMenu } from '@/composables/useMenu'

const { ingredients, fetchIngredients } = useIngredients()
const { menuItems, fetchMenuItems } = useMenu()

const stats = ref({
  ingredientCount: 0,
  menuCount: 0,
  avgMargin: 0,
})

onMounted(async () => {
  await Promise.all([
    fetchIngredients(),
    fetchMenuItems(),
  ])

  stats.value.ingredientCount = ingredients.value.length
  stats.value.menuCount = menuItems.value.length
  // Calculate avg margin would require cost calculation
})
</script>
```

---

## 15. Deployment

### 15.1 Vercel Deployment

Create `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 15.2 Environment Variables on Vercel

Add to Vercel project settings:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 15.3 Deploy Commands

```bash
# Build for production
npm run build

# Deploy to Vercel (manual)
vercel --prod

# Or connect GitHub repo to Vercel for auto-deploy
```

---

## 16. Testing Strategy

### Unit Tests (Optional but Recommended)

```bash
npm install -D vitest @vue/test-utils
```

Create tests for:
- Cost calculation functions (`costCalculator.ts`)
- Purchase list calculation
- Price history tracking

### Manual Testing Checklist

- [ ] สมัครสมาชิกและ login ได้
- [ ] เพิ่ม/แก้ไข/ลบวัตถุดิบ
- [ ] เพิ่ม/แก้ไข/ลบบรรจุภัณฑ์
- [ ] สร้างเมนูพร้อมสูตร (BOM)
- [ ] เพิ่ม add-on ในเมนู (เช่น +ไข่ดาว)
- [ ] คำนวณต้นทุนและกำไรสุทธิถูกต้อง
- [ ] ตารางเปรียบเทียบเมนูแสดงข้อมูลครบ
- [ ] แผนซื้อของคำนวณถูกสำหรับหลายเมนู
- [ ] Export PDF/CSV
- [ ] What-if analysis (เปลี่ยนราคาขาย)
- [ ] Responsive บนมือถือ
- [ ] RLS ป้องกันการเข้าถึงข้อมูลคนอื่น

---

## 17. คำสั่งพัฒนาที่ต้องรัน (Development Commands)

```bash
# 1. Setup project
npm install

# 2. Setup Supabase (run schema.sql in Supabase SQL editor)

# 3. Configure environment variables in .env

# 4. Run development server
npm run dev

# 5. Build for production
npm run build

# 6. Preview production build
npm run preview

# 7. Deploy to Vercel
vercel --prod
```

---

## 18. Additional Features Implementation Notes

### Combo/Promo Sets

- Create combo form that allows selecting multiple menu items
- Calculate combined cost and profit
- Display in comparison table alongside regular menus

### Sales Records vs Target

- Create form to record actual sales per menu
- Compare with purchase plan target
- Show variance report

### Price History & Impact

- Display price change history for each ingredient
- Calculate impact on menu margins when price changes
- Alert user about menus affected by price increase

### Notifications

- Show toast notifications for:
  - Ingredients without price set
  - Menus with negative margin
  - Menus exceeding target food cost %
- Use a toast library like `vue-toastification`

### Packaging Presets

- When creating menu with `saleUnitType: 'box'`:
  - Auto-add: กล่องข้าว (1), ช้อน (1), ถุงใส่กล่อง (1)
- When creating menu with `saleUnitType: 'bag'`:
  - Auto-add: ถุงมัด (1)
- Allow user to override quantities

---

## 19. Performance Optimization

- Use `v-once` for static content
- Lazy load routes
- Debounce search inputs
- Index Supabase tables properly (already in schema)
- Cache calculated breakdowns in Pinia store
- Use `computed` for derived data

---

## 20. Accessibility

- Add ARIA labels to buttons and inputs
- Ensure keyboard navigation works
- Add loading states and error messages
- Use semantic HTML (button, main, nav, etc.)
- Test with screen reader

---

## Summary

นี่คือ **Implementation Plan แบบครบชุด** สำหรับระบบ Food Cost Management โดยจัดลำดับการทำงานจาก foundation ไปหา advanced features

**ลำดับการพัฒนาที่แนะนำ:**

1. Project setup (Vite, Vue, TypeScript, Tailwind, Supabase client)
2. Database schema + RLS
3. Authentication system
4. Store settings management
5. Ingredients & Packaging management
6. Menu management (BOM + Add-ons)
7. Cost calculation engine
8. Menu comparison table
9. Purchase planning
10. Additional features (combos, sales records, price history)
11. UI polish + responsive design
12. Testing + deployment

ทุกส่วนพร้อมให้ Cursor AI ทำงานได้ทีเดียว โดยมีโค้ดตัวอย่าง, database schema, และ business logic ครบถ้วน
