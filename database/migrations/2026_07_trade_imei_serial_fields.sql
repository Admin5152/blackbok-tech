-- =============================================================================
-- Trade identity fields: IMEI 1, IMEI 2, serial number
-- =============================================================================
-- Dual-SIM phones have two IMEIs; Wi-Fi iPads often only have a serial.
-- Keep legacy imei_serial in sync (primary identity) for older clients / indexes.
-- Admin views full values; customer surfaces use masked last-4.
-- =============================================================================

ALTER TABLE public.trade_in_requests
  ADD COLUMN IF NOT EXISTS imei_1 TEXT,
  ADD COLUMN IF NOT EXISTS imei_2 TEXT,
  ADD COLUMN IF NOT EXISTS serial_number TEXT;

COMMENT ON COLUMN public.trade_in_requests.imei_1 IS
  'Primary IMEI (15-digit Luhn). Required for cellular devices when available.';
COMMENT ON COLUMN public.trade_in_requests.imei_2 IS
  'Secondary IMEI for dual-SIM devices. Optional.';
COMMENT ON COLUMN public.trade_in_requests.serial_number IS
  'Apple serial number (Settings → General → About). Required for Wi-Fi-only devices.';

-- Backfill from legacy single column when possible
UPDATE public.trade_in_requests
SET imei_1 = imei_serial
WHERE imei_1 IS NULL
  AND imei_serial IS NOT NULL
  AND btrim(imei_serial) <> ''
  AND length(regexp_replace(imei_serial, '\D', '', 'g')) = 15;

UPDATE public.trade_in_requests
SET serial_number = imei_serial
WHERE serial_number IS NULL
  AND imei_serial IS NOT NULL
  AND btrim(imei_serial) <> ''
  AND length(regexp_replace(imei_serial, '\D', '', 'g')) <> 15;

-- Keep imei_serial as primary lookup key (IMEI 1 preferred, else serial)
CREATE OR REPLACE FUNCTION public.fn_trade_sync_imei_serial()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.imei_1 := NULLIF(btrim(COALESCE(NEW.imei_1, '')), '');
  NEW.imei_2 := NULLIF(btrim(COALESCE(NEW.imei_2, '')), '');
  NEW.serial_number := NULLIF(btrim(COALESCE(NEW.serial_number, '')), '');

  -- Prefer explicit imei_serial if client still sends only that field
  IF NEW.imei_serial IS NOT NULL AND btrim(NEW.imei_serial) <> '' THEN
    IF NEW.imei_1 IS NULL AND length(regexp_replace(NEW.imei_serial, '\D', '', 'g')) = 15 THEN
      NEW.imei_1 := btrim(NEW.imei_serial);
    ELSIF NEW.serial_number IS NULL AND length(regexp_replace(NEW.imei_serial, '\D', '', 'g')) <> 15 THEN
      NEW.serial_number := btrim(NEW.imei_serial);
    END IF;
  END IF;

  NEW.imei_serial := COALESCE(NEW.imei_1, NEW.serial_number, NEW.imei_2, NEW.imei_serial);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trade_sync_imei_serial ON public.trade_in_requests;
CREATE TRIGGER trg_trade_sync_imei_serial
  BEFORE INSERT OR UPDATE OF imei_1, imei_2, serial_number, imei_serial
  ON public.trade_in_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trade_sync_imei_serial();

-- Active-trade uniqueness per identity field (partial indexes)
DROP INDEX IF EXISTS public.uq_trade_active_imei;
CREATE UNIQUE INDEX IF NOT EXISTS uq_trade_active_imei_1
  ON public.trade_in_requests (lower(btrim(imei_1)))
  WHERE imei_1 IS NOT NULL AND btrim(imei_1) <> ''
    AND status IN ('submitted', 'under_review', 'offer_made', 'accepted', 'scheduled');

CREATE UNIQUE INDEX IF NOT EXISTS uq_trade_active_imei_2
  ON public.trade_in_requests (lower(btrim(imei_2)))
  WHERE imei_2 IS NOT NULL AND btrim(imei_2) <> ''
    AND status IN ('submitted', 'under_review', 'offer_made', 'accepted', 'scheduled');

CREATE UNIQUE INDEX IF NOT EXISTS uq_trade_active_serial
  ON public.trade_in_requests (lower(btrim(serial_number)))
  WHERE serial_number IS NOT NULL AND btrim(serial_number) <> ''
    AND status IN ('submitted', 'under_review', 'offer_made', 'accepted', 'scheduled');

-- Also keep legacy imei_serial uniqueness for older rows / clients
CREATE UNIQUE INDEX IF NOT EXISTS uq_trade_active_imei_serial
  ON public.trade_in_requests (lower(btrim(imei_serial)))
  WHERE imei_serial IS NOT NULL AND btrim(imei_serial) <> ''
    AND status IN ('submitted', 'under_review', 'offer_made', 'accepted', 'scheduled');

-- Refresh admin view mask helper columns when the view exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'v_trade_requests_admin'
  ) THEN
    -- View definitions vary by env; only document expectation here.
    -- App falls back to client-side masking when imei_masked is absent.
    NULL;
  END IF;
END $$;
