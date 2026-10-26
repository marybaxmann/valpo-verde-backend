-- =====================================================================
-- Migración 024 — Nombre y rol de los miembros de un proyecto
-- (CC-065 punto 6; PR-018 v6.0)
-- =====================================================================
--
-- Aprobada por la responsable (2026-10-26). Los listados de OT (B3, B4)
-- muestran `responsable: { id, nombre }` y se leen con el JWT del
-- usuario (PR-018 v5.0), pero la RLS de user_profiles (migración 005)
-- solo deja leer el perfil propio o, al Administrador, todos.
--
-- fn_miembros_proyecto(p_project_id):
--   - SECURITY DEFINER, solo lectura (STABLE), search_path fijo;
--   - verifica dentro de la base, con auth.uid() (vía has_project_role e
--     is_admin), que quien llama sea miembro activo del proyecto o
--     Administrador; si no, no devuelve ninguna fila;
--   - devuelve solo id, nombre y rol (roles.nombre) de los miembros del
--     proyecto, también de los inactivos (una OT histórica puede tener
--     como responsable a alguien desactivado); nunca el correo, que vive
--     en auth.users, ni otros datos del perfil;
--   - EXECUTE solo para authenticated (se llama con el JWT del usuario).

CREATE FUNCTION public.fn_miembros_proyecto(p_project_id uuid)
RETURNS TABLE (id uuid, nombre text, rol text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT up.id, up.nombre, r.nombre AS rol
  FROM public.project_members pm
  JOIN public.user_profiles up ON up.id = pm.user_id
  JOIN public.roles r ON r.id = up.role_id
  WHERE pm.project_id = p_project_id
    AND (
      public.is_admin()
      OR public.has_project_role(p_project_id, ARRAY['usuario_municipal', 'inspector', 'encargado_mantencion'])
    )
  ORDER BY up.nombre, up.id;
$$;

ALTER FUNCTION public.fn_miembros_proyecto(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_miembros_proyecto(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_miembros_proyecto(uuid) TO authenticated;
