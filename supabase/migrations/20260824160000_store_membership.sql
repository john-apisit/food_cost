-- Store-centric membership: profiles, stores, roles, invites, store_id on data tables, RLS.
-- Existing users each get one store and an admin membership.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL DEFAULT '',
  display_name TEXT,
  last_store_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'ร้านของฉัน',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stores_name_trimmed CHECK (name = btrim(name) AND name <> '')
);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_last_store_id_fkey
  FOREIGN KEY (last_store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

CREATE TABLE public.store_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'store_manager')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, user_id)
);

CREATE INDEX idx_store_members_user_id ON public.store_members(user_id);
CREATE INDEX idx_store_members_store_id ON public.store_members(store_id);

CREATE TABLE public.role_permissions (
  role TEXT NOT NULL CHECK (role IN ('admin', 'store_manager')),
  resource TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('view', 'create', 'edit', 'delete')),
  PRIMARY KEY (role, resource, action)
);

CREATE TABLE public.store_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'store_manager')),
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT store_invites_email_trimmed CHECK (email = btrim(email) AND email <> ''),
  UNIQUE (token)
);

CREATE INDEX idx_store_invites_store_id ON public.store_invites(store_id);
CREATE UNIQUE INDEX idx_store_invites_pending_email
  ON public.store_invites (store_id, lower(email))
  WHERE status = 'pending';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_store_members_updated_at
  BEFORE UPDATE ON public.store_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Permission seed
-- ---------------------------------------------------------------------------

INSERT INTO public.role_permissions (role, resource, action)
SELECT role, resource, action
FROM (
  SELECT unnest(ARRAY['admin', 'store_manager']) AS role
) roles
CROSS JOIN (
  SELECT unnest(ARRAY[
    'menu', 'combos', 'ingredients', 'suppliers', 'planning',
    'sales', 'cashbook', 'revenue', 'settings', 'users'
  ]) AS resource
) resources
CROSS JOIN (
  SELECT unnest(ARRAY['view', 'create', 'edit', 'delete']) AS action
) actions
WHERE roles.role = 'admin'
   OR resources.resource <> 'users';

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER to avoid RLS recursion)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_store_member(_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_id = _store_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_store_admin(_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_id = _store_id AND user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_store_permission(_store_id UUID, _resource TEXT, _action TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.store_members m
    JOIN public.role_permissions p
      ON p.role = m.role
     AND p.resource = _resource
     AND p.action = _action
    WHERE m.store_id = _store_id
      AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.store_created_by(_store_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT created_by FROM public.stores WHERE id = _store_id;
$$;

CREATE OR REPLACE FUNCTION public.shares_store_with(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.store_members mine
    JOIN public.store_members other ON other.store_id = mine.store_id
    WHERE mine.user_id = auth.uid()
      AND other.user_id = _user_id
  );
$$;

-- ---------------------------------------------------------------------------
-- Backfill existing users
-- ---------------------------------------------------------------------------

INSERT INTO public.profiles (id, email, display_name, created_at)
SELECT
  u.id,
  COALESCE(u.email, ''),
  NULLIF(btrim(COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', '')), ''),
  u.created_at
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.stores (name, created_by, created_at)
SELECT
  COALESCE(NULLIF(btrim(ss.store_name), ''), 'ร้านของฉัน'),
  u.id,
  COALESCE(ss.created_at, u.created_at)
FROM auth.users u
LEFT JOIN public.store_settings ss ON ss.user_id = u.id;

INSERT INTO public.store_members (store_id, user_id, role)
SELECT s.id, s.created_by, 'admin'
FROM public.stores s
ON CONFLICT (store_id, user_id) DO NOTHING;

ALTER TABLE public.store_settings
  ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

UPDATE public.store_settings ss
SET store_id = s.id
FROM public.stores s
WHERE s.created_by = ss.user_id
  AND ss.store_id IS NULL;

INSERT INTO public.store_settings (
  store_id, user_id, platform_name, platform_fee_percent, fixed_cost_box, fixed_cost_bag, store_name
)
SELECT s.id, s.created_by, 'LINE MAN', 30.00, 5.00, 3.00, s.name
FROM public.stores s
WHERE NOT EXISTS (
  SELECT 1 FROM public.store_settings ss WHERE ss.store_id = s.id
);

ALTER TABLE public.store_settings ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.store_settings DROP CONSTRAINT IF EXISTS store_settings_user_id_key;
ALTER TABLE public.store_settings ADD CONSTRAINT store_settings_store_id_key UNIQUE (store_id);

UPDATE public.profiles p
SET last_store_id = s.id
FROM public.stores s
WHERE s.created_by = p.id
  AND p.last_store_id IS NULL;

-- ---------------------------------------------------------------------------
-- store_id on data tables
-- ---------------------------------------------------------------------------

ALTER TABLE public.ingredients
  ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
UPDATE public.ingredients i
SET store_id = s.id
FROM public.stores s
WHERE s.created_by = i.user_id;
ALTER TABLE public.ingredients ALTER COLUMN store_id SET NOT NULL;
CREATE INDEX idx_ingredients_store_id ON public.ingredients(store_id);

ALTER TABLE public.menu_items
  ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
UPDATE public.menu_items i
SET store_id = s.id
FROM public.stores s
WHERE s.created_by = i.user_id;
ALTER TABLE public.menu_items ALTER COLUMN store_id SET NOT NULL;
CREATE INDEX idx_menu_items_store_id ON public.menu_items(store_id);

ALTER TABLE public.combos
  ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
UPDATE public.combos i
SET store_id = s.id
FROM public.stores s
WHERE s.created_by = i.user_id;
ALTER TABLE public.combos ALTER COLUMN store_id SET NOT NULL;
CREATE INDEX idx_combos_store_id ON public.combos(store_id);

ALTER TABLE public.purchase_plans
  ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
UPDATE public.purchase_plans i
SET store_id = s.id
FROM public.stores s
WHERE s.created_by = i.user_id;
ALTER TABLE public.purchase_plans ALTER COLUMN store_id SET NOT NULL;
CREATE INDEX idx_purchase_plans_store_id ON public.purchase_plans(store_id);

ALTER TABLE public.sales_records
  ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
UPDATE public.sales_records i
SET store_id = s.id
FROM public.stores s
WHERE s.created_by = i.user_id;
ALTER TABLE public.sales_records ALTER COLUMN store_id SET NOT NULL;
CREATE INDEX idx_sales_records_store_sale_date
  ON public.sales_records(store_id, sale_date DESC);

ALTER TABLE public.cash_entries
  ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
UPDATE public.cash_entries i
SET store_id = s.id
FROM public.stores s
WHERE s.created_by = i.user_id;
ALTER TABLE public.cash_entries ALTER COLUMN store_id SET NOT NULL;
CREATE INDEX idx_cash_entries_store_occurred_at
  ON public.cash_entries(store_id, occurred_at DESC);

ALTER TABLE public.suppliers
  ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
UPDATE public.suppliers i
SET store_id = s.id
FROM public.stores s
WHERE s.created_by = i.user_id;
ALTER TABLE public.suppliers ALTER COLUMN store_id SET NOT NULL;
CREATE INDEX idx_suppliers_store_id ON public.suppliers(store_id);
DROP INDEX IF EXISTS public.idx_suppliers_user_id_lower_name;
CREATE UNIQUE INDEX idx_suppliers_store_id_lower_name
  ON public.suppliers (store_id, lower(name));

-- Keep created_by rows if the author is deleted later
ALTER TABLE public.ingredients ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.menu_items ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.combos ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.purchase_plans ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.sales_records ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.cash_entries ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.suppliers ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.store_settings ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.ingredients DROP CONSTRAINT IF EXISTS ingredients_user_id_fkey;
ALTER TABLE public.ingredients
  ADD CONSTRAINT ingredients_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS menu_items_user_id_fkey;
ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.combos DROP CONSTRAINT IF EXISTS combos_user_id_fkey;
ALTER TABLE public.combos
  ADD CONSTRAINT combos_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.purchase_plans DROP CONSTRAINT IF EXISTS purchase_plans_user_id_fkey;
ALTER TABLE public.purchase_plans
  ADD CONSTRAINT purchase_plans_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.sales_records DROP CONSTRAINT IF EXISTS sales_records_user_id_fkey;
ALTER TABLE public.sales_records
  ADD CONSTRAINT sales_records_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.cash_entries DROP CONSTRAINT IF EXISTS cash_entries_user_id_fkey;
ALTER TABLE public.cash_entries
  ADD CONSTRAINT cash_entries_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.suppliers DROP CONSTRAINT IF EXISTS suppliers_user_id_fkey;
ALTER TABLE public.suppliers
  ADD CONSTRAINT suppliers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.store_settings DROP CONSTRAINT IF EXISTS store_settings_user_id_fkey;
ALTER TABLE public.store_settings
  ADD CONSTRAINT store_settings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Triggers for new users / stores
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_store()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.store_members (store_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT (store_id, user_id) DO NOTHING;

  INSERT INTO public.store_settings (
    store_id, user_id, platform_name, platform_fee_percent, fixed_cost_box, fixed_cost_bag, store_name
  )
  VALUES (NEW.id, NEW.created_by, 'LINE MAN', 30.00, 5.00, 3.00, NEW.name)
  ON CONFLICT (store_id) DO NOTHING;

  UPDATE public.profiles
  SET last_store_id = COALESCE(last_store_id, NEW.id)
  WHERE id = NEW.created_by;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_store_created
  AFTER INSERT ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_store();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    NULLIF(btrim(COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      ''
    )), '')
  )
  ON CONFLICT (id) DO NOTHING;

  IF COALESCE(NEW.raw_user_meta_data->>'invited_store_id', '') = '' THEN
    INSERT INTO public.stores (name, created_by)
    VALUES ('ร้านของฉัน', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_user_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    email = COALESCE(NEW.email, email),
    display_name = COALESCE(
      NULLIF(btrim(COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'full_name',
        ''
      )), ''),
      display_name
    ),
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.initialize_store_settings();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_updated();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_store(p_name TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _store_id UUID;
  _name TEXT;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน';
  END IF;

  _name := COALESCE(NULLIF(btrim(p_name), ''), 'ร้านของฉัน');

  INSERT INTO public.stores (name, created_by)
  VALUES (_name, _user_id)
  RETURNING id INTO _store_id;

  UPDATE public.profiles
  SET last_store_id = _store_id
  WHERE id = _user_id;

  RETURN _store_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_store_invite(p_token UUID)
RETURNS TABLE (
  store_id UUID,
  store_name TEXT,
  role TEXT,
  email TEXT,
  status TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.store_id, s.name, i.role, i.email, i.status, i.expires_at
  FROM public.store_invites i
  JOIN public.stores s ON s.id = i.store_id
  WHERE i.token = p_token;
$$;

CREATE OR REPLACE FUNCTION public.accept_store_invite(p_token UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite public.store_invites%ROWTYPE;
  _email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน';
  END IF;

  SELECT COALESCE(email, '') INTO _email
  FROM public.profiles
  WHERE id = auth.uid();

  IF _email = '' THEN
    SELECT COALESCE(email, '') INTO _email
    FROM auth.users
    WHERE id = auth.uid();
  END IF;

  SELECT * INTO _invite
  FROM public.store_invites
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'คำเชิญไม่ถูกต้อง';
  END IF;

  IF _invite.status <> 'pending' THEN
    RAISE EXCEPTION 'คำเชิญนี้ถูกใช้ไปแล้ว';
  END IF;

  IF _invite.expires_at <= NOW() THEN
    UPDATE public.store_invites SET status = 'expired' WHERE id = _invite.id;
    RAISE EXCEPTION 'คำเชิญหมดอายุแล้ว';
  END IF;

  IF lower(_invite.email) <> lower(_email) THEN
    RAISE EXCEPTION 'อีเมลนี้ไม่ตรงกับคำเชิญ';
  END IF;

  INSERT INTO public.store_members (store_id, user_id, role)
  VALUES (_invite.store_id, auth.uid(), _invite.role)
  ON CONFLICT (store_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.store_invites
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = _invite.id;

  UPDATE public.profiles
  SET last_store_id = _invite.store_id
  WHERE id = auth.uid();

  RETURN _invite.store_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_invites ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'store_settings', 'ingredients', 'ingredient_price_history',
        'menu_items', 'recipe_lines', 'menu_addons', 'combos', 'combo_items',
        'purchase_plans', 'purchase_plan_lines', 'sales_records',
        'cash_entries', 'suppliers'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- profiles
CREATE POLICY "Users can view own or shared profiles"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.shares_store_with(id));
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- stores
CREATE POLICY "Members can view their stores"
  ON public.stores FOR SELECT
  USING (public.is_store_member(id));
CREATE POLICY "Users can create stores"
  ON public.stores FOR INSERT
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Members can update store with settings permission"
  ON public.stores FOR UPDATE
  USING (public.has_store_permission(id, 'settings', 'edit'));

-- members
CREATE POLICY "Members can view store members"
  ON public.store_members FOR SELECT
  USING (public.is_store_member(store_id));
CREATE POLICY "Admins can update store members"
  ON public.store_members FOR UPDATE
  USING (public.is_store_admin(store_id))
  WITH CHECK (
    public.is_store_admin(store_id)
    AND (
      user_id <> public.store_created_by(store_id)
      OR role = 'admin'
    )
  );
CREATE POLICY "Admins can remove store members"
  ON public.store_members FOR DELETE
  USING (
    public.is_store_admin(store_id)
    AND user_id <> public.store_created_by(store_id)
  );

-- role_permissions
CREATE POLICY "Authenticated users can read role permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- invites
CREATE POLICY "Admins and invitees can view invites"
  ON public.store_invites FOR SELECT
  USING (
    public.is_store_admin(store_id)
    OR lower(email) = lower((SELECT p.email FROM public.profiles p WHERE p.id = auth.uid()))
  );
CREATE POLICY "Admins can insert invites"
  ON public.store_invites FOR INSERT
  WITH CHECK (public.is_store_admin(store_id) AND invited_by = auth.uid());
CREATE POLICY "Admins can update invites"
  ON public.store_invites FOR UPDATE
  USING (public.is_store_admin(store_id));
CREATE POLICY "Admins can delete invites"
  ON public.store_invites FOR DELETE
  USING (public.is_store_admin(store_id));

-- store_settings
CREATE POLICY "Members can view store settings"
  ON public.store_settings FOR SELECT
  USING (public.is_store_member(store_id));
CREATE POLICY "Members can insert store settings"
  ON public.store_settings FOR INSERT
  WITH CHECK (public.has_store_permission(store_id, 'settings', 'create'));
CREATE POLICY "Members can update store settings"
  ON public.store_settings FOR UPDATE
  USING (public.has_store_permission(store_id, 'settings', 'edit'));

-- ingredients
CREATE POLICY "Members can view ingredients"
  ON public.ingredients FOR SELECT
  USING (public.is_store_member(store_id));
CREATE POLICY "Members can insert ingredients"
  ON public.ingredients FOR INSERT
  WITH CHECK (public.has_store_permission(store_id, 'ingredients', 'create'));
CREATE POLICY "Members can update ingredients"
  ON public.ingredients FOR UPDATE
  USING (public.has_store_permission(store_id, 'ingredients', 'edit'));
CREATE POLICY "Members can delete ingredients"
  ON public.ingredients FOR DELETE
  USING (public.has_store_permission(store_id, 'ingredients', 'delete'));

CREATE POLICY "Members can view price history"
  ON public.ingredient_price_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ingredients
      WHERE ingredients.id = ingredient_price_history.ingredient_id
        AND public.is_store_member(ingredients.store_id)
    )
  );
CREATE POLICY "Members can insert price history"
  ON public.ingredient_price_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ingredients
      WHERE ingredients.id = ingredient_price_history.ingredient_id
        AND public.has_store_permission(ingredients.store_id, 'ingredients', 'edit')
    )
  );

-- menu
CREATE POLICY "Members can view menu items"
  ON public.menu_items FOR SELECT
  USING (public.is_store_member(store_id));
CREATE POLICY "Members can insert menu items"
  ON public.menu_items FOR INSERT
  WITH CHECK (public.has_store_permission(store_id, 'menu', 'create'));
CREATE POLICY "Members can update menu items"
  ON public.menu_items FOR UPDATE
  USING (public.has_store_permission(store_id, 'menu', 'edit'));
CREATE POLICY "Members can delete menu items"
  ON public.menu_items FOR DELETE
  USING (public.has_store_permission(store_id, 'menu', 'delete'));

CREATE POLICY "Members can view recipe lines"
  ON public.recipe_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items
      WHERE menu_items.id = recipe_lines.menu_item_id
        AND public.is_store_member(menu_items.store_id)
    )
  );
CREATE POLICY "Members can insert recipe lines"
  ON public.recipe_lines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_items
      WHERE menu_items.id = recipe_lines.menu_item_id
        AND public.has_store_permission(menu_items.store_id, 'menu', 'edit')
    )
  );
CREATE POLICY "Members can update recipe lines"
  ON public.recipe_lines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items
      WHERE menu_items.id = recipe_lines.menu_item_id
        AND public.has_store_permission(menu_items.store_id, 'menu', 'edit')
    )
  );
CREATE POLICY "Members can delete recipe lines"
  ON public.recipe_lines FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items
      WHERE menu_items.id = recipe_lines.menu_item_id
        AND public.has_store_permission(menu_items.store_id, 'menu', 'edit')
    )
  );

CREATE POLICY "Members can view menu addons"
  ON public.menu_addons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items
      WHERE menu_items.id = menu_addons.menu_item_id
        AND public.is_store_member(menu_items.store_id)
    )
  );
CREATE POLICY "Members can insert menu addons"
  ON public.menu_addons FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_items
      WHERE menu_items.id = menu_addons.menu_item_id
        AND public.has_store_permission(menu_items.store_id, 'menu', 'edit')
    )
  );
CREATE POLICY "Members can update menu addons"
  ON public.menu_addons FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items
      WHERE menu_items.id = menu_addons.menu_item_id
        AND public.has_store_permission(menu_items.store_id, 'menu', 'edit')
    )
  );
CREATE POLICY "Members can delete menu addons"
  ON public.menu_addons FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items
      WHERE menu_items.id = menu_addons.menu_item_id
        AND public.has_store_permission(menu_items.store_id, 'menu', 'edit')
    )
  );

-- combos
CREATE POLICY "Members can view combos"
  ON public.combos FOR SELECT
  USING (public.is_store_member(store_id));
CREATE POLICY "Members can insert combos"
  ON public.combos FOR INSERT
  WITH CHECK (public.has_store_permission(store_id, 'combos', 'create'));
CREATE POLICY "Members can update combos"
  ON public.combos FOR UPDATE
  USING (public.has_store_permission(store_id, 'combos', 'edit'));
CREATE POLICY "Members can delete combos"
  ON public.combos FOR DELETE
  USING (public.has_store_permission(store_id, 'combos', 'delete'));

CREATE POLICY "Members can view combo items"
  ON public.combo_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.combos
      WHERE combos.id = combo_items.combo_id
        AND public.is_store_member(combos.store_id)
    )
  );
CREATE POLICY "Members can insert combo items"
  ON public.combo_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.combos
      WHERE combos.id = combo_items.combo_id
        AND public.has_store_permission(combos.store_id, 'combos', 'edit')
    )
  );
CREATE POLICY "Members can update combo items"
  ON public.combo_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.combos
      WHERE combos.id = combo_items.combo_id
        AND public.has_store_permission(combos.store_id, 'combos', 'edit')
    )
  );
CREATE POLICY "Members can delete combo items"
  ON public.combo_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.combos
      WHERE combos.id = combo_items.combo_id
        AND public.has_store_permission(combos.store_id, 'combos', 'edit')
    )
  );

-- planning
CREATE POLICY "Members can view purchase plans"
  ON public.purchase_plans FOR SELECT
  USING (public.is_store_member(store_id));
CREATE POLICY "Members can insert purchase plans"
  ON public.purchase_plans FOR INSERT
  WITH CHECK (public.has_store_permission(store_id, 'planning', 'create'));
CREATE POLICY "Members can update purchase plans"
  ON public.purchase_plans FOR UPDATE
  USING (public.has_store_permission(store_id, 'planning', 'edit'));
CREATE POLICY "Members can delete purchase plans"
  ON public.purchase_plans FOR DELETE
  USING (public.has_store_permission(store_id, 'planning', 'delete'));

CREATE POLICY "Members can view purchase plan lines"
  ON public.purchase_plan_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_plans
      WHERE purchase_plans.id = purchase_plan_lines.plan_id
        AND public.is_store_member(purchase_plans.store_id)
    )
  );
CREATE POLICY "Members can insert purchase plan lines"
  ON public.purchase_plan_lines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.purchase_plans
      WHERE purchase_plans.id = purchase_plan_lines.plan_id
        AND public.has_store_permission(purchase_plans.store_id, 'planning', 'edit')
    )
  );
CREATE POLICY "Members can update purchase plan lines"
  ON public.purchase_plan_lines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_plans
      WHERE purchase_plans.id = purchase_plan_lines.plan_id
        AND public.has_store_permission(purchase_plans.store_id, 'planning', 'edit')
    )
  );
CREATE POLICY "Members can delete purchase plan lines"
  ON public.purchase_plan_lines FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_plans
      WHERE purchase_plans.id = purchase_plan_lines.plan_id
        AND public.has_store_permission(purchase_plans.store_id, 'planning', 'edit')
    )
  );

-- sales / cash / suppliers
CREATE POLICY "Members can view sales records"
  ON public.sales_records FOR SELECT
  USING (public.is_store_member(store_id));
CREATE POLICY "Members can insert sales records"
  ON public.sales_records FOR INSERT
  WITH CHECK (public.has_store_permission(store_id, 'sales', 'create'));
CREATE POLICY "Members can update sales records"
  ON public.sales_records FOR UPDATE
  USING (public.has_store_permission(store_id, 'sales', 'edit'));
CREATE POLICY "Members can delete sales records"
  ON public.sales_records FOR DELETE
  USING (public.has_store_permission(store_id, 'sales', 'delete'));

CREATE POLICY "Members can view cash entries"
  ON public.cash_entries FOR SELECT
  USING (public.is_store_member(store_id));
CREATE POLICY "Members can insert cash entries"
  ON public.cash_entries FOR INSERT
  WITH CHECK (public.has_store_permission(store_id, 'cashbook', 'create'));
CREATE POLICY "Members can update cash entries"
  ON public.cash_entries FOR UPDATE
  USING (public.has_store_permission(store_id, 'cashbook', 'edit'));
CREATE POLICY "Members can delete cash entries"
  ON public.cash_entries FOR DELETE
  USING (public.has_store_permission(store_id, 'cashbook', 'delete'));

CREATE POLICY "Members can view suppliers"
  ON public.suppliers FOR SELECT
  USING (public.is_store_member(store_id));
CREATE POLICY "Members can insert suppliers"
  ON public.suppliers FOR INSERT
  WITH CHECK (public.has_store_permission(store_id, 'suppliers', 'create'));
CREATE POLICY "Members can update suppliers"
  ON public.suppliers FOR UPDATE
  USING (public.has_store_permission(store_id, 'suppliers', 'edit'));
CREATE POLICY "Members can delete suppliers"
  ON public.suppliers FOR DELETE
  USING (public.has_store_permission(store_id, 'suppliers', 'delete'));

-- ---------------------------------------------------------------------------
-- Storage: allow store folder or legacy user folder
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can upload own menu images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own menu images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own menu images" ON storage.objects;

CREATE POLICY "Authenticated users can upload menu images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'menu-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        public.is_store_member(((storage.foldername(name))[1])::uuid)
        AND public.has_store_permission(((storage.foldername(name))[1])::uuid, 'menu', 'create')
      )
    )
  );

CREATE POLICY "Authenticated users can update menu images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        public.is_store_member(((storage.foldername(name))[1])::uuid)
        AND public.has_store_permission(((storage.foldername(name))[1])::uuid, 'menu', 'edit')
      )
    )
  )
  WITH CHECK (
    bucket_id = 'menu-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        public.is_store_member(((storage.foldername(name))[1])::uuid)
        AND public.has_store_permission(((storage.foldername(name))[1])::uuid, 'menu', 'edit')
      )
    )
  );

CREATE POLICY "Authenticated users can delete menu images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        public.is_store_member(((storage.foldername(name))[1])::uuid)
        AND public.has_store_permission(((storage.foldername(name))[1])::uuid, 'menu', 'delete')
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.stores TO authenticated;
GRANT SELECT, UPDATE, DELETE ON TABLE public.store_members TO authenticated;
GRANT SELECT ON TABLE public.role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.store_invites TO authenticated;

GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.stores TO service_role;
GRANT ALL ON TABLE public.store_members TO service_role;
GRANT ALL ON TABLE public.role_permissions TO service_role;
GRANT ALL ON TABLE public.store_invites TO service_role;

REVOKE ALL ON FUNCTION public.is_store_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_store_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_store_permission(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.store_created_by(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.shares_store_with(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_store(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_store_invite(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_store_invite(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_store_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_store_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_store_permission(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.store_created_by(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_store_with(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_store(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_invite(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_store_invite(UUID) TO authenticated;
