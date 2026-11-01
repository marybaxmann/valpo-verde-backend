-- Reversión de la 029: `roles` vuelve a no ser legible con la sesión del usuario.
DROP POLICY IF EXISTS roles_select_authenticated ON public.roles;
