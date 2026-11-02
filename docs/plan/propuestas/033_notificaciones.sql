-- =====================================================================
-- Migración 033 — Notificaciones internas de SIVU (CC-051)
-- PROPUESTA — NO APLICADA. Requiere autorización de Valej.
-- (032 queda reservada para la propuesta de identificación de especie.)
-- =====================================================================
--
-- CC-051 (aprobado 2026-10-23), primera etapa decidida por Valej el
-- 2026-11-02: solo el aviso dentro de SIVU; el correo queda para cuando
-- exista el dominio remitente (las columnas email_* quedan en su valor
-- por defecto).
--
-- Columnas: las de CC-051 («Impacto en BD»), sin agregar otras.
-- tipo: los eventos de CC-051/CC-050 —
--   ot_cancelada             → al responsable de la OT cancelada;
--   ot_reasignada_nuevo      → al nuevo responsable;
--   ot_reasignada_anterior   → al responsable anterior.
-- (Los recordatorios de #63 agregarán su tipo en una migración aparte,
-- cuando se decida su regla.)
--
-- Escritura: solo el backend con service_role (CC-033: ninguna política
-- de escritura para authenticated/anon). Lectura: cada usuario solo sus
-- avisos (RLS). Marcar como leído: endpoint del backend, tras verificar
-- que el aviso es del usuario autenticado.
-- =====================================================================

BEGIN;

CREATE TABLE public.notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  tipo           TEXT NOT NULL
                   CHECK (tipo IN ('ot_cancelada', 'ot_reasignada_nuevo', 'ot_reasignada_anterior')),
  work_order_id  UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  mensaje        TEXT NOT NULL CHECK (btrim(mensaje) <> ''),
  leido_at       TIMESTAMPTZ,                       -- NULL = no leído
  email_enviado  BOOLEAN NOT NULL DEFAULT false,    -- etapa 2 (correo), sin uso todavía
  email_error    TEXT,                              -- etapa 2
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS
  'Avisos dentro de SIVU (CC-051). Escribe solo el backend (service_role); cada usuario lee solo los suyos.';

CREATE INDEX idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_no_leidas ON public.notifications (user_id) WHERE leido_at IS NULL;
CREATE INDEX idx_notifications_work_order ON public.notifications (work_order_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Sin políticas de INSERT, UPDATE ni DELETE (CC-033).

COMMIT;
