-- =============================================================================
-- Admin-managed Shop taxonomy
-- Category -> subcategory -> series. Products keep their existing category,
-- brand, subcategory and specifications.series fields, so no parallel catalog
-- or product migration is required.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.shop_taxonomy_nodes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES public.shop_taxonomy_nodes(id) ON DELETE RESTRICT,
  kind        TEXT NOT NULL CHECK (kind IN ('category', 'subcategory', 'series')),
  value       TEXT NOT NULL CHECK (length(btrim(value)) BETWEEN 1 AND 80),
  label       TEXT NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 80),
  description TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS shop_taxonomy_nodes_root_value_key
  ON public.shop_taxonomy_nodes (lower(value))
  WHERE parent_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS shop_taxonomy_nodes_parent_value_key
  ON public.shop_taxonomy_nodes (parent_id, lower(value))
  WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shop_taxonomy_nodes_parent
  ON public.shop_taxonomy_nodes (parent_id, sort_order, label);

CREATE OR REPLACE FUNCTION public.validate_shop_taxonomy_node()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  parent_kind TEXT;
BEGIN
  NEW.value := btrim(NEW.value);
  NEW.label := btrim(NEW.label);
  NEW.description := btrim(COALESCE(NEW.description, ''));
  NEW.updated_at := NOW();

  IF NEW.kind = 'category' THEN
    IF NEW.parent_id IS NOT NULL THEN
      RAISE EXCEPTION 'A category cannot have a parent';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.parent_id IS NULL THEN
    RAISE EXCEPTION '% requires a parent', NEW.kind;
  END IF;

  SELECT kind INTO parent_kind
  FROM public.shop_taxonomy_nodes
  WHERE id = NEW.parent_id;

  IF NEW.kind = 'subcategory' AND parent_kind IS DISTINCT FROM 'category' THEN
    RAISE EXCEPTION 'A subcategory must belong to a category';
  END IF;
  IF NEW.kind = 'series' AND parent_kind IS DISTINCT FROM 'subcategory' THEN
    RAISE EXCEPTION 'A series must belong to a subcategory';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shop_taxonomy_nodes_validate ON public.shop_taxonomy_nodes;
CREATE TRIGGER shop_taxonomy_nodes_validate
BEFORE INSERT OR UPDATE ON public.shop_taxonomy_nodes
FOR EACH ROW EXECUTE FUNCTION public.validate_shop_taxonomy_node();

ALTER TABLE public.shop_taxonomy_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shop_taxonomy_public_read ON public.shop_taxonomy_nodes;
CREATE POLICY shop_taxonomy_public_read
  ON public.shop_taxonomy_nodes FOR SELECT
  USING (is_active OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS shop_taxonomy_staff_manage ON public.shop_taxonomy_nodes;
CREATE POLICY shop_taxonomy_staff_manage
  ON public.shop_taxonomy_nodes FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
  );

-- Custom categories and series cannot work while old allow-list constraints
-- reject values created by admins. Other product validation remains intact.
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_subcategory_check;

NOTIFY pgrst, 'reload schema';
COMMIT;
