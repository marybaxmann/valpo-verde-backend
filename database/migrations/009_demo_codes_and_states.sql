-- ============================================================================
-- Migración 009 — Identificadores oficiales de orden de trabajo e incidencia
-- (corte demo). SOLO operaciones ADITIVAS.
-- ============================================================================
--
-- Formato tomado de Base de Datos Valpo Verde.xlsx:
--   - ORDENES DE TRABAJO.ID_OT: 'OT-M-000001' (tipo_ot = Mantenimiento)
--   - INCIDENCIA.id_incidencia: 'INC-000001'
-- Se generan con secuencias propias; nunca se reutilizan ni se calculan en
-- el cliente.
--
-- Estados (validados en el backend, no como CHECK, igual que schema.sql:
-- "vocabularios que probablemente evolucionen"), según las listas de
-- validación del mismo Excel:
--   - estado_ot: Pendiente, Programada, En ejecución, Completada, Cancelada
--   - estado_incidencia: Ingresada, En revisión, Derivada, Resuelta, Descartada
--
-- Sin DROP / DELETE / TRUNCATE. Sin cambios de RLS.
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS maintenance_codigo_ot_seq;
ALTER TABLE maintenance
  ADD COLUMN IF NOT EXISTS codigo_ot TEXT
  DEFAULT ('OT-M-' || lpad(nextval('maintenance_codigo_ot_seq')::text, 6, '0'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_maintenance_codigo_ot ON maintenance (codigo_ot);

CREATE SEQUENCE IF NOT EXISTS incidents_codigo_seq;
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS codigo_incidencia TEXT
  DEFAULT ('INC-' || lpad(nextval('incidents_codigo_seq')::text, 6, '0'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_incidents_codigo ON incidents (codigo_incidencia);
