-- Daily routines: templates, per-day runs/checklists, and restock lines on purchase plans.

INSERT INTO public.role_permissions (role, resource, action)
SELECT role, 'routines', action
FROM (
  SELECT unnest(ARRAY['admin', 'store_manager']) AS role
) roles
CROSS JOIN (
  SELECT unnest(ARRAY['view', 'create', 'edit', 'delete']) AS action
) actions
ON CONFLICT DO NOTHING;

CREATE TABLE public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('kitchen_prep', 'stock_check', 'custom')),
  days TEXT[] NOT NULL DEFAULT '{}',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  include_packaging BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT routines_name_trimmed CHECK (name = btrim(name) AND name <> ''),
  CONSTRAINT routines_time_order CHECK (end_time > start_time)
);

CREATE INDEX idx_routines_store_id ON public.routines(store_id);

CREATE TRIGGER update_routines_updated_at
  BEFORE UPDATE ON public.routines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.routine_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'menu_prep', 'ingredient')),
  source_id UUID,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT routine_items_title_trimmed CHECK (title = btrim(title) AND title <> '')
);

CREATE INDEX idx_routine_items_routine_id ON public.routine_items(routine_id);

CREATE TABLE public.routine_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  run_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'done', 'skipped')),
  note TEXT,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  purchase_plan_id UUID REFERENCES public.purchase_plans(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (routine_id, run_date)
);

CREATE INDEX idx_routine_runs_store_date ON public.routine_runs(store_id, run_date DESC);
CREATE INDEX idx_routine_runs_plan_id ON public.routine_runs(purchase_plan_id);

CREATE TRIGGER update_routine_runs_updated_at
  BEFORE UPDATE ON public.routine_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.routine_run_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.routine_runs(id) ON DELETE CASCADE,
  template_item_id UUID REFERENCES public.routine_items(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'menu_prep', 'ingredient')),
  source_id UUID,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  done_at TIMESTAMPTZ,
  done_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stock_status TEXT CHECK (stock_status IN ('ok', 'low', 'out')),
  restock_quantity NUMERIC,
  item_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_routine_run_items_run_id ON public.routine_run_items(run_id);

CREATE TABLE public.purchase_plan_restock_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.purchase_plans(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity NUMERIC,
  stock_status TEXT NOT NULL CHECK (stock_status IN ('low', 'out')),
  note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_id, ingredient_id)
);

CREATE INDEX idx_purchase_plan_restock_plan_id ON public.purchase_plan_restock_lines(plan_id);

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_run_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_plan_restock_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view routines"
  ON public.routines FOR SELECT
  USING (public.is_store_member(store_id));
CREATE POLICY "Members can insert routines"
  ON public.routines FOR INSERT
  WITH CHECK (public.has_store_permission(store_id, 'routines', 'create'));
CREATE POLICY "Members can update routines"
  ON public.routines FOR UPDATE
  USING (public.has_store_permission(store_id, 'routines', 'edit'));
CREATE POLICY "Members can delete routines"
  ON public.routines FOR DELETE
  USING (public.has_store_permission(store_id, 'routines', 'delete'));

CREATE POLICY "Members can view routine items"
  ON public.routine_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.routines
      WHERE routines.id = routine_items.routine_id
        AND public.is_store_member(routines.store_id)
    )
  );
CREATE POLICY "Members can insert routine items"
  ON public.routine_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.routines
      WHERE routines.id = routine_items.routine_id
        AND public.has_store_permission(routines.store_id, 'routines', 'edit')
    )
  );
CREATE POLICY "Members can update routine items"
  ON public.routine_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.routines
      WHERE routines.id = routine_items.routine_id
        AND public.has_store_permission(routines.store_id, 'routines', 'edit')
    )
  );
CREATE POLICY "Members can delete routine items"
  ON public.routine_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.routines
      WHERE routines.id = routine_items.routine_id
        AND public.has_store_permission(routines.store_id, 'routines', 'delete')
    )
  );

CREATE POLICY "Members can view routine runs"
  ON public.routine_runs FOR SELECT
  USING (public.is_store_member(store_id));
CREATE POLICY "Members can insert routine runs"
  ON public.routine_runs FOR INSERT
  WITH CHECK (public.has_store_permission(store_id, 'routines', 'create'));
CREATE POLICY "Members can update routine runs"
  ON public.routine_runs FOR UPDATE
  USING (public.has_store_permission(store_id, 'routines', 'edit'));
CREATE POLICY "Members can delete routine runs"
  ON public.routine_runs FOR DELETE
  USING (public.has_store_permission(store_id, 'routines', 'delete'));

CREATE POLICY "Members can view routine run items"
  ON public.routine_run_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.routine_runs
      WHERE routine_runs.id = routine_run_items.run_id
        AND public.is_store_member(routine_runs.store_id)
    )
  );
CREATE POLICY "Members can insert routine run items"
  ON public.routine_run_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.routine_runs
      WHERE routine_runs.id = routine_run_items.run_id
        AND public.has_store_permission(routine_runs.store_id, 'routines', 'edit')
    )
  );
CREATE POLICY "Members can update routine run items"
  ON public.routine_run_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.routine_runs
      WHERE routine_runs.id = routine_run_items.run_id
        AND public.has_store_permission(routine_runs.store_id, 'routines', 'edit')
    )
  );
CREATE POLICY "Members can delete routine run items"
  ON public.routine_run_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.routine_runs
      WHERE routine_runs.id = routine_run_items.run_id
        AND public.has_store_permission(routine_runs.store_id, 'routines', 'delete')
    )
  );

CREATE POLICY "Members can view purchase plan restock lines"
  ON public.purchase_plan_restock_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_plans
      WHERE purchase_plans.id = purchase_plan_restock_lines.plan_id
        AND public.is_store_member(purchase_plans.store_id)
    )
  );
CREATE POLICY "Members can insert purchase plan restock lines"
  ON public.purchase_plan_restock_lines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.purchase_plans
      WHERE purchase_plans.id = purchase_plan_restock_lines.plan_id
        AND public.has_store_permission(purchase_plans.store_id, 'planning', 'edit')
    )
  );
CREATE POLICY "Members can update purchase plan restock lines"
  ON public.purchase_plan_restock_lines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_plans
      WHERE purchase_plans.id = purchase_plan_restock_lines.plan_id
        AND public.has_store_permission(purchase_plans.store_id, 'planning', 'edit')
    )
  );
CREATE POLICY "Members can delete purchase plan restock lines"
  ON public.purchase_plan_restock_lines FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_plans
      WHERE purchase_plans.id = purchase_plan_restock_lines.plan_id
        AND public.has_store_permission(purchase_plans.store_id, 'planning', 'delete')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.routines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.routine_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.routine_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.routine_run_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.purchase_plan_restock_lines TO authenticated;

GRANT ALL ON TABLE public.routines TO service_role;
GRANT ALL ON TABLE public.routine_items TO service_role;
GRANT ALL ON TABLE public.routine_runs TO service_role;
GRANT ALL ON TABLE public.routine_run_items TO service_role;
GRANT ALL ON TABLE public.purchase_plan_restock_lines TO service_role;
