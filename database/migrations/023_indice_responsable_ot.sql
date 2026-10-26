-- =====================================================================
-- Migración 023 — Índice de work_orders por responsable y estado
-- (CC-065 punto 8; B4, «Mis OT», CC-061 y CC-064)
-- =====================================================================
--
-- Aprobada por la responsable (2026-10-26). B4 lista las OT donde el
-- usuario es el responsable actual, en todos sus proyectos, filtradas
-- por estado. `responsable_accion_id` no tenía índice (es además una
-- clave foránea hacia user_profiles). B3 ya está cubierto por
-- idx_work_orders_project.

CREATE INDEX idx_work_orders_responsable ON public.work_orders (responsable_accion_id, estado_ot);
