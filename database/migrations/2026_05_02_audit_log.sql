-- ============================================================
-- (2/4) audit_log — append-only trail for high-stakes changes
--
-- Logs: orders (status, totals), repair_requests (status, estimate),
-- trade_in_requests (status, offer fields).
-- RLS: admins/staff read; inserts via SECURITY DEFINER triggers only.
--
-- Run AFTER: roles_canonical_user_roles (for has_role).
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id    UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  old_data    JSONB,
  new_data    JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log (entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log (created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_admin_read" ON public.audit_log;
CREATE POLICY "audit_log_admin_read"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
  );

-- No INSERT/UPDATE/DELETE for authenticated clients; rows come from triggers.

CREATE OR REPLACE FUNCTION public.fn_audit_log_row(
  p_action    TEXT,
  p_entity    TEXT,
  p_entity_id TEXT,
  p_old       JSONB,
  p_new       JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, old_data, new_data)
  VALUES (auth.uid(), p_action, p_entity, p_entity_id, p_old, p_new);
END;
$$;

-- ------------------------------------------------------------
-- orders
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_audit_orders_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.total_price IS DISTINCT FROM OLD.total_price
       OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
    THEN
      PERFORM public.fn_audit_log_row(
        'update',
        'orders',
        NEW.id::TEXT,
        jsonb_build_object(
          'status', OLD.status,
          'total_price', OLD.total_price,
          'discount_amount', OLD.discount_amount
        ),
        jsonb_build_object(
          'status', NEW.status,
          'total_price', NEW.total_price,
          'discount_amount', NEW.discount_amount
        )
      );
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM public.fn_audit_log_row(
      'insert',
      'orders',
      NEW.id::TEXT,
      NULL,
      jsonb_build_object(
        'status', NEW.status,
        'total_price', NEW.total_price,
        'display_id', NEW.display_id
      )
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_orders ON public.orders;
CREATE TRIGGER trg_audit_orders
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_audit_orders_changes();

-- ------------------------------------------------------------
-- repair_requests
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_audit_repair_requests_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.estimated_cost IS DISTINCT FROM OLD.estimated_cost
    THEN
      PERFORM public.fn_audit_log_row(
        'update',
        'repair_requests',
        NEW.id::TEXT,
        jsonb_build_object('status', OLD.status, 'estimated_cost', OLD.estimated_cost, 'display_id', OLD.display_id),
        jsonb_build_object('status', NEW.status, 'estimated_cost', NEW.estimated_cost, 'display_id', NEW.display_id)
      );
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM public.fn_audit_log_row(
      'insert',
      'repair_requests',
      NEW.id::TEXT,
      NULL,
      jsonb_build_object('status', NEW.status, 'display_id', NEW.display_id)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_repair_requests ON public.repair_requests;
CREATE TRIGGER trg_audit_repair_requests
  AFTER INSERT OR UPDATE ON public.repair_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_audit_repair_requests_changes();

-- ------------------------------------------------------------
-- trade_in_requests
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_audit_trade_in_requests_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.final_value IS DISTINCT FROM OLD.final_value
       OR NEW.offered_price IS DISTINCT FROM OLD.offered_price
       OR NEW.condition IS DISTINCT FROM OLD.condition
    THEN
      PERFORM public.fn_audit_log_row(
        'update',
        'trade_in_requests',
        NEW.id::TEXT,
        jsonb_build_object(
          'status', OLD.status,
          'final_value', OLD.final_value,
          'offered_price', OLD.offered_price,
          'condition', OLD.condition,
          'display_id', OLD.display_id
        ),
        jsonb_build_object(
          'status', NEW.status,
          'final_value', NEW.final_value,
          'offered_price', NEW.offered_price,
          'condition', NEW.condition,
          'display_id', NEW.display_id
        )
      );
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM public.fn_audit_log_row(
      'insert',
      'trade_in_requests',
      NEW.id::TEXT,
      NULL,
      jsonb_build_object('status', NEW.status, 'display_id', NEW.display_id)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_trade_in_requests ON public.trade_in_requests;
CREATE TRIGGER trg_audit_trade_in_requests
  AFTER INSERT OR UPDATE ON public.trade_in_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_audit_trade_in_requests_changes();

COMMIT;
