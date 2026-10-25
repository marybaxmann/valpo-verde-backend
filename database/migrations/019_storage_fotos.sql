-- =====================================================================
-- Migración 019 — Storage de fotografías (CC-049; AM-14; issue #74)
-- =====================================================================
--
-- Aprobada por la responsable (2026-10-25). No agrega ninguna tabla ni
-- columna: `photos` (migración 015) ya modela tree_id, el origen único
-- (inspection_id/maintenance_record_id/incident_id,
-- chk_photos_un_solo_origen) y `vista` (arbol_completo/base/tronco/copa,
-- D-27 — las 4 vistas obligatorias, confirmado sin discrepancia). Esta
-- migración solo crea el bucket, con dos barreras físicas además de las
-- que valida el backend (sharp, por contenido real; CC-049 puntos 4/5).
--
-- ---------------------------------------------------------------------
-- Bucket privado, con límites físicos, sin políticas de storage.objects
-- ---------------------------------------------------------------------
-- Diseño (CC-049 puntos 2/3): TODO acceso — subir Y leer — pasa por el
-- backend con `service_role`, nunca directo cliente↔Storage. Leer
-- significa "el backend genera un enlace firmado (signed URL) de 10
-- minutos" (createSignedUrl), después de que el backend ya verificó
-- membresía del proyecto (assertProjectAccess). No se necesita ninguna
-- policy de storage.objects para `authenticated` ni `anon`, porque
-- ninguno de los dos llega nunca a Storage directamente. `service_role`
-- ignora RLS por diseño de Postgres/Supabase (igual que ya usan
-- `supabaseAdmin.rpc(...)` en el resto de esta fase) — con RLS
-- habilitada (viene por defecto en todo proyecto Supabase) y CERO
-- policies, `authenticated`/`anon` quedan sin ningún acceso. No se
-- agrega ninguna policy a propósito: agregar una sería más superficie
-- de ataque sin necesidad, no una garantía adicional.
--
-- `file_size_limit` (bytes) y `allowed_mime_types`: segunda barrera,
-- física, en el propio bucket — no reemplaza la verificación del
-- backend por contenido real (un archivo puede declarar un MIME type
-- falso; Storage solo rechaza por lo declarado, `sharp` decodifica de
-- verdad), la complementa.

-- Idempotente: si el bucket ya existe (reaplicar, o la primera corrida
-- en valpo-verde-conecta en la Fase 8, issue #45), corrige su
-- configuración a estos valores en vez de no hacer nada — para que
-- reaplicar esta migración sea siempre seguro, no solo la primera vez.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('tree-photos', 'tree-photos', false, 10485760, ARRAY['image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png'];

-- Verificación posterior (solo lectura, no forma parte de la
-- migración): confirmar que storage.objects sigue con RLS habilitada y
-- sin policies para 'tree-photos':
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'objects' AND relnamespace = 'storage'::regnamespace;
--   SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';
