-- ingredient_price_history
-- Depends on: ingredients

CREATE TABLE public.ingredient_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  price_per_unit DECIMAL(10,2) NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX idx_price_history_ingredient_id ON public.ingredient_price_history(ingredient_id);

CREATE OR REPLACE FUNCTION public.track_ingredient_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.price_per_unit IS DISTINCT FROM NEW.price_per_unit THEN
    INSERT INTO public.ingredient_price_history (ingredient_id, price_per_unit, effective_at)
    VALUES (NEW.id, NEW.price_per_unit, NOW());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER track_ingredient_price
  AFTER UPDATE ON public.ingredients
  FOR EACH ROW
  EXECUTE FUNCTION public.track_ingredient_price_change();

CREATE OR REPLACE FUNCTION public.track_ingredient_price_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.ingredient_price_history (ingredient_id, price_per_unit, effective_at)
  VALUES (NEW.id, NEW.price_per_unit, NOW());
  RETURN NEW;
END;
$$;

CREATE TRIGGER track_ingredient_price_on_insert
  AFTER INSERT ON public.ingredients
  FOR EACH ROW
  EXECUTE FUNCTION public.track_ingredient_price_insert();

ALTER TABLE public.ingredient_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view price history of their ingredients"
  ON public.ingredient_price_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ingredients
      WHERE ingredients.id = ingredient_price_history.ingredient_id
      AND ingredients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert price history of their ingredients"
  ON public.ingredient_price_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ingredients
      WHERE ingredients.id = ingredient_price_history.ingredient_id
      AND ingredients.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ingredient_price_history TO authenticated;
GRANT ALL ON TABLE public.ingredient_price_history TO service_role;
