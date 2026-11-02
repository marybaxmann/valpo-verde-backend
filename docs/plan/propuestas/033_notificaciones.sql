-- NOTA (2026-11-02): versión de trabajo. La migración aplicada es
-- database/migrations/033_notificaciones.sql (sin BEGIN/COMMIT, md5 ec1032440230f504113b01f6176deee7).
-- =====================================================================
-- Migración 033 — Notificaciones internas de SIVU (CC-051) y
-- recordatorios de inspección (#63)
-- PROPUESTA — NO APLICADA. Requiere revisión y autorización de Valej.
-- (032 queda reservada para la propuesta de identificación de especie.)
-- =====================================================================
--
-- Decisiones de Valej (2026-11-02):
--   CC-051, primera etapa: solo el aviso dentro de SIVU (sin correo; las
--     columnas email_* quedan en su valor por defecto hasta que exista
--     el dominio remitente).
--   Creación transaccional de los avisos cuando sea viable.
--   #63: recordatorios a los Usuarios municipales del proyecto, desde
--     `recordatorio_activo` de B5, generados al consultar los avisos
--     (solución provisional), sin duplicados aun con consultas
--     simultáneas.
--
-- 1. Tabla `notifications`: las columnas de CC-051 («Impacto en BD») más
--    dos que pide #63 (se explican abajo):
--      tree_id      — el árbol del aviso (OT con árbol o recordatorio);
--      clave_unica  — clave de idempotencia de los recordatorios; con el
--                     UNIQUE (user_id, clave_unica), dos consultas
--                     simultáneas no pueden crear el mismo recordatorio
--                     dos veces (la segunda inserción no hace nada).
--                     NULL en los avisos de OT (NULL no choca en UNIQUE).
-- 2. Avisos de OT TRANSACCIONALES SIN MODIFICAR FUNCIONES EXISTENTES:
--    un trigger AFTER UPDATE en `work_orders` crea el aviso en la misma
--    transacción que la cancelación (fn_cancel_work_order, 025) o la
--    reasignación (fn_reassign_work_order, 025). Si el aviso no se puede
--    crear, la operación completa se revierte. No se reescribe ninguna
--    función de la 025 ni de la 031.
--      estado_ot pasa a 'cancelada'        → ot_cancelada, al responsable;
--      responsable_accion_id cambia        → ot_reasignada_nuevo (al
--                                             nuevo) y ot_reasignada_anterior
--                                             (al anterior).
--    El cambio de Inspector revisor (031) NO notifica: no es un evento de
--    CC-051.
-- 3. RLS: cada usuario lee solo sus avisos; sin políticas de escritura
--    (CC-033). Escriben el trigger (SECURITY DEFINER) y el backend con
--    service_role (recordatorios y marcar como leído). Además (auditoría
--    del 2026-11-02, defensa en profundidad): se quitan a anon todos los
--    privilegios sobre la tabla y a authenticated los de escritura, para
--    no depender solo de que falten políticas.
-- 4. Si crear el aviso falla, el trigger lanza SV075 con un mensaje claro
--    y la cancelación o reasignación se revierte entera (transaccional).
--    El backend lo traduce a 503 con ese mensaje.
-- =====================================================================

BEGIN;

CREATE TABLE public.notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  tipo           TEXT NOT NULL
                   CHECK (tipo IN ('ot_cancelada', 'ot_reasignada_nuevo', 'ot_reasignada_anterior', 'recordatorio_inspeccion')),
  work_order_id  UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  tree_id        UUID REFERENCES public.trees(id) ON DELETE SET NULL,
  mensaje        TEXT NOT NULL CHECK (btrim(mensaje) <> ''),
  clave_unica    TEXT,
  leido_at       TIMESTAMPTZ,                       -- NULL = no leído
  email_enviado  BOOLEAN NOT NULL DEFAULT false,    -- etapa 2 (correo), sin uso todavía
  email_error    TEXT,                              -- etapa 2
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_notifications_user_clave UNIQUE (user_id, clave_unica),
  CONSTRAINT chk_notifications_recordatorio
    CHECK ((tipo = 'recordatorio_inspeccion') = (clave_unica IS NOT NULL))
);

COMMENT ON TABLE public.notifications IS
  'Avisos dentro de SIVU (CC-051) y recordatorios (#63). Escriben el trigger de work_orders y el backend (service_role); cada usuario lee solo los suyos.';

CREATE INDEX idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_no_leidas ON public.notifications (user_id) WHERE leido_at IS NULL;
CREATE INDEX idx_notifications_work_order ON public.notifications (work_order_id);
CREATE INDEX idx_notifications_tree ON public.notifications (tree_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Sin políticas de INSERT, UPDATE ni DELETE (CC-033).
REVOKE ALL ON public.notifications FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.notifications FROM authenticated;

-- ---------------------------------------------------------------------
-- Avisos de OT (CC-051), en la misma transacción que el cambio.
-- ---------------------------------------------------------------------
CREATE FUNCTION public.fn_notificar_cambio_ot() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ot TEXT := COALESCE(NEW.codigo_ot, 'sin código');
BEGIN
  IF NEW.estado_ot = 'cancelada' AND OLD.estado_ot IS DISTINCT FROM 'cancelada' AND NEW.responsable_accion_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, tipo, work_order_id, tree_id, mensaje)
    VALUES (
      NEW.responsable_accion_id, 'ot_cancelada', NEW.id, NEW.tree_id,
      'La orden de trabajo ' || v_ot || ' fue cancelada. Motivo: ' || COALESCE(NEW.motivo_cancelacion, 'sin motivo registrado') || '.'
    );
  END IF;

  IF NEW.responsable_accion_id IS DISTINCT FROM OLD.responsable_accion_id THEN
    IF NEW.responsable_accion_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, tipo, work_order_id, tree_id, mensaje)
      VALUES (NEW.responsable_accion_id, 'ot_reasignada_nuevo', NEW.id, NEW.tree_id,
              'Se le asignó la orden de trabajo ' || v_ot || '.');
    END IF;
    IF OLD.responsable_accion_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, tipo, work_order_id, tree_id, mensaje)
      VALUES (OLD.responsable_accion_id, 'ot_reasignada_anterior', NEW.id, NEW.tree_id,
              'La orden de trabajo ' || v_ot || ' fue asignada a otro responsable.');
    END IF;
  END IF;

  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'No se pudo registrar el aviso de la orden de trabajo %: no se aplicó el cambio (%)', v_ot, SQLERRM
      USING ERRCODE = 'SV075';
END;
$$;

REVOKE ALL ON FUNCTION public.fn_notificar_cambio_ot() FROM PUBLIC, anon, authenticated;

-- Solo se dispara si cambia de verdad el estado o el responsable (no por
-- un UPDATE que repita el mismo valor ni por otras columnas).
CREATE TRIGGER trg_work_orders_notificar
  AFTER UPDATE OF estado_ot, responsable_accion_id ON public.work_orders
  FOR EACH ROW
  WHEN (NEW.estado_ot IS DISTINCT FROM OLD.estado_ot OR NEW.responsable_accion_id IS DISTINCT FROM OLD.responsable_accion_id)
  EXECUTE FUNCTION public.fn_notificar_cambio_ot();

COMMIT;
