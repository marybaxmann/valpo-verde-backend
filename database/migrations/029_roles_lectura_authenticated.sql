-- =====================================================================
-- Migración 029 — Lectura del catálogo de roles con la sesión del usuario
-- (B11; PR-018 v6.0; PR-003)
-- =====================================================================
--
-- PROPUESTA — NO APLICAR SIN APROBACIÓN DE LA RESPONSABLE.
--
-- `roles` tiene RLS activa y ninguna política: con el JWT del usuario no
-- se puede leer (comprobado en la base de pruebas: el Administrador ve 9
-- perfiles y 0 roles). B11 (usuarios disponibles para agregar como
-- miembros) necesita el rol de cada usuario, leído con el JWT del
-- Administrador como el resto de las lecturas (PR-018 v6.0).
--
-- `roles` es un catálogo (4 filas: código y descripción), sin datos
-- personales. Se agrega solo lectura para `authenticated`, igual que
-- `species_select_authenticated` (012). No cambia escrituras ni `anon`.
-- =====================================================================

CREATE POLICY roles_select_authenticated
  ON public.roles
  FOR SELECT
  TO authenticated
  USING (true);
