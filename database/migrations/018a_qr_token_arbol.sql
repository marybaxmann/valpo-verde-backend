-- =====================================================================
-- Migración 018a — Token QR no adivinable por árbol (PR-022)
-- =====================================================================
--
-- Decisión de la responsable (2026-10-22): el formulario ciudadano de
-- incidencias (PR-022) es un endpoint público, sin autenticación. El
-- identificador que se imprime en el QR físico del árbol NO puede ser
-- `tree_code` (A-000001, A-000002...): es correlativo y predecible, y
-- permitiría a cualquiera recorrer todo el inventario del proyecto
-- (enumerar árboles) sin pasar por el formulario. Se agrega una
-- columna técnica nueva, ajena al Excel (no tiene fila en
-- DICCIONARIO_CAMPOS; es una decisión de implementación, CC-041):
-- un token aleatorio de 122 bits (`gen_random_uuid()`, pgcrypto, ya
-- habilitado — mismo generador que usa `id` en toda la base), único,
-- que no revela nada sobre el orden ni la cantidad de árboles.
--
-- `tree_code` sigue existiendo y sigue siendo el identificador visible
-- en el inventario interno (Inspector, Usuario municipal, Admin).
-- `qr_token` es exclusivamente para el QR físico y el endpoint público.
--
-- Solo falta este cambio en el esquema físico. El endpoint público
-- (Fase 6, issue de incidencias por QR) lee por `qr_token`, siempre a
-- través del backend con `service_role` — no cambia ninguna política
-- RLS: `anon` ya no tiene SELECT en `trees` desde la migración 017
-- (CC-033), así que esta columna no amplía ni reduce ningún acceso
-- directo a la base.

ALTER TABLE trees
  ADD COLUMN qr_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid();

COMMENT ON COLUMN trees.qr_token IS
  'Token aleatorio no adivinable para el QR físico del árbol (PR-022, decisión de la responsable 2026-10-22). Nunca usar tree_code en el QR público: es correlativo y permitiría enumerar el inventario.';
