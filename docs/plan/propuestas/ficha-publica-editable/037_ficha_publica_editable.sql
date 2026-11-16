-- =====================================================================
-- Migración 037 — Valpo Verde Conecta: ficha pública editable
-- (CC-073 provisional, borrador final del 2026-11-16 con las respuestas de
-- Mari y Valej; reescritura de la propuesta D6; filas D-280 a D-306
-- provisionales; PR-022 v3.0 y PR-004 v8.0 propuestas)
-- =====================================================================
--
-- PROPUESTA — NO APLICAR. Está en docs/plan/propuestas/ y no en
-- database/migrations/ a propósito. Requiere, en este orden: CC aprobado,
-- filas incorporadas al Excel maestro y autorización de la responsable
-- para aplicar en la base de pruebas (gmlbmyreoxgoqrolhyxo). Nunca en la
-- base real (ytcxswbulsmboucardxa). El número 037 es el siguiente libre
-- después de la 036; la 032 sigue como propuesta aparte.
--
-- Lo que ya existe y NO se toca: species y sus funciones (012, 018i;
-- datos botánicos que mantiene el Inspector, CC-053), trees y sus
-- valores vigentes (013/014), photos y el bucket privado tree-photos
-- (015, 019; D-27), fn_crear_incidencia_ciudadana y el seguimiento (028).
--
-- Agrega:
--   1. species_public_content: contenido ciudadano por especie
--      (CATALOGO_ESPECIES, D-280 a D-294). Tabla 1:1 aparte de species
--      porque la edita otro rol: así el Inspector no puede escribir
--      textos ciudadanos ni el Usuario municipal datos botánicos.
--   2. tree_public_content: personalización por árbol (FICHAS_PUBLICAS,
--      D-295 a D-306). Solo lo que difiere de la especie.
--   3. Bucket público conecta-publico, solo para imágenes ya
--      recodificadas sin metadatos por el backend.
--   4. Funciones de escritura SECURITY DEFINER (solo service_role):
--      guardar contenido de especie, guardar ficha de árbol y fijar o
--      quitar sus fotografías. Publican al guardar (P3): sin borrador,
--      aprobación ni versionado.
--   5. fn_ficha_publica_arbol ampliada (CREATE OR REPLACE): conserva
--      las claves actuales y agrega el contenido de la especie, lo
--      propio del árbol y solo las medidas activadas que tienen valor.
--
-- SQLSTATE SV080 (contenido de especie) y SV081 (ficha de árbol).
-- SV070/SV071 son de la 028; SV073 a SV077 ya están en uso en otras
-- ramas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Contenido ciudadano por especie (D-280 a D-294)
-- ---------------------------------------------------------------------
-- Las formas internas de los JSONB (aportes, rasgos, estaciones, ciclo,
-- fuentes) las valida el backend con Zod campo por campo; la base
-- asegura el tipo, los máximos de elementos y las exclusiones.
CREATE TABLE public.species_public_content (
  species_id                  UUID PRIMARY KEY REFERENCES public.species(id) ON DELETE RESTRICT,
  nombre_comun_visualizacion  TEXT CHECK (nombre_comun_visualizacion IS NULL OR char_length(btrim(nombre_comun_visualizacion)) BETWEEN 1 AND 60),  -- D-280
  articulo_nombre             TEXT CHECK (articulo_nombre IS NULL OR articulo_nombre IN ('el', 'la')),                                             -- D-281
  curiosidad                  TEXT CHECK (curiosidad IS NULL OR char_length(curiosidad) BETWEEN 1 AND 200),                                        -- D-282
  aportes                     JSONB NOT NULL DEFAULT '[]'::jsonb                                                                                    -- D-283
                                CHECK (jsonb_typeof(aportes) = 'array' AND jsonb_array_length(aportes) <= 2),
  quien_soy                   TEXT CHECK (quien_soy IS NULL OR char_length(quien_soy) BETWEEN 1 AND 160),                                         -- D-284
  -- D-285: [{id, etiqueta, texto, foto_path, credito}]. foto_path solo
  -- lo escribe fn_fijar_foto_especie, nunca el cliente.
  rasgos                      JSONB NOT NULL DEFAULT '[]'::jsonb
                                CHECK (jsonb_typeof(rasgos) = 'array' AND jsonb_array_length(rasgos) <= 3),
  anio_estacional             JSONB CHECK (anio_estacional IS NULL OR (jsonb_typeof(anio_estacional) = 'object'                                  -- D-286
                                AND anio_estacional ?& ARRAY['prim', 'ver', 'oto', 'inv']
                                AND (anio_estacional - ARRAY['prim', 'ver', 'oto', 'inv']) = '{}'::jsonb)),
  ciclo                       JSONB CHECK (ciclo IS NULL OR (jsonb_typeof(ciclo) = 'object' AND ciclo ? 'titulo' AND ciclo ? 'pasos')),          -- D-287
  historia_especie            TEXT CHECK (historia_especie IS NULL OR char_length(historia_especie) BETWEEN 1 AND 300),                           -- D-288
  consejo                     TEXT CHECK (consejo IS NULL OR char_length(consejo) BETWEEN 1 AND 160),                                             -- D-289
  fuentes                     JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(fuentes) = 'array'),                                         -- D-290
  foto_referencial_path       TEXT,                                                                                                                -- D-291
  credito_foto_referencial    TEXT CHECK (credito_foto_referencial IS NULL OR char_length(credito_foto_referencial) BETWEEN 1 AND 120),           -- D-292
  updated_by                  UUID NOT NULL REFERENCES public.user_profiles(id),                                                                  -- D-293
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),                                                                                  -- D-294

  CONSTRAINT chk_spc_articulo_con_nombre
    CHECK ((nombre_comun_visualizacion IS NULL) = (articulo_nombre IS NULL)),                 -- D-281
  CONSTRAINT chk_spc_anio_o_ciclo
    CHECK (anio_estacional IS NULL OR ciclo IS NULL),                                         -- D-286/D-287
  CONSTRAINT chk_spc_credito_foto
    CHECK (foto_referencial_path IS NULL OR credito_foto_referencial IS NOT NULL)             -- D-292
);

-- ---------------------------------------------------------------------
-- 2. Personalización por árbol (FICHAS_PUBLICAS, D-295 a D-306)
-- ---------------------------------------------------------------------
CREATE TABLE public.tree_public_content (
  tree_id                 UUID PRIMARY KEY REFERENCES public.trees(id) ON DELETE RESTRICT,  -- D-295
  mostrar_clase_edad      BOOLEAN NOT NULL DEFAULT false,                                    -- D-296
  mostrar_altura_total    BOOLEAN NOT NULL DEFAULT false,                                    -- D-297
  mostrar_dap             BOOLEAN NOT NULL DEFAULT false,                                    -- D-298
  mostrar_diametro_copa   BOOLEAN NOT NULL DEFAULT false,                                    -- D-299
  mostrar_rango_edad      BOOLEAN NOT NULL DEFAULT false,                                    -- D-300
  historia                TEXT CHECK (historia IS NULL OR char_length(btrim(historia)) BETWEEN 1 AND 1000),          -- D-301
  historia_fuente         TEXT CHECK (historia_fuente IS NULL OR char_length(btrim(historia_fuente)) BETWEEN 1 AND 300),  -- D-302
  foto_path               TEXT,                                                              -- D-303; solo fn_fijar_foto_ficha_publica
  -- D-304: {"curiosidad": {"texto", "fuente"}, "quien_soy": {...}, "consejo": {...}}
  textos_personalizados   JSONB NOT NULL DEFAULT '{}'::jsonb
                            CHECK (jsonb_typeof(textos_personalizados) = 'object'
                                   AND (textos_personalizados - ARRAY['curiosidad', 'quien_soy', 'consejo']) = '{}'::jsonb),
  updated_by              UUID NOT NULL REFERENCES public.user_profiles(id),                -- D-305
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),                                -- D-306

  CONSTRAINT chk_tpc_fuente_con_historia
    CHECK (historia_fuente IS NULL OR historia IS NOT NULL)                                   -- D-302
);

-- Proyecto Cerrado = solo consulta (D-265; RG fila 27; CC-042). El
-- contenido de la especie es transversal y no depende de un proyecto.
CREATE TRIGGER trg_tree_public_content_proyecto_cerrado
  BEFORE INSERT OR UPDATE OR DELETE ON public.tree_public_content
  FOR EACH ROW EXECUTE FUNCTION public.fn_check_proyecto_no_cerrado('via_tree');

-- ---------------------------------------------------------------------
-- RLS (ADR-014): lectura para la vista interna; ninguna escritura directa
-- ---------------------------------------------------------------------
-- Las escrituras pasan solo por las funciones del punto 4 (service_role),
-- que verifican rol, cuenta activa y membresía. No se crean políticas de
-- INSERT/UPDATE/DELETE: la excepción del Administrador (PR-004 v8.0
-- propuesta) queda en un solo lugar y no abre escritura sobre ninguna
-- otra tabla del proyecto.
ALTER TABLE public.species_public_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_public_content ENABLE ROW LEVEL SECURITY;

-- Igual que species (010): todo usuario autenticado lee el catálogo.
CREATE POLICY species_public_content_select_authenticated
  ON public.species_public_content FOR SELECT TO authenticated
  USING (true);

-- Igual que trees: el Administrador (transversal) y los miembros del
-- proyecto del árbol.
CREATE POLICY tree_public_content_select_admin_o_miembro
  ON public.tree_public_content FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.trees t
               WHERE t.id = tree_public_content.tree_id
                 AND public.is_project_member(t.project_id))
  );

REVOKE ALL ON public.species_public_content, public.tree_public_content FROM PUBLIC, anon;
GRANT SELECT ON public.species_public_content, public.tree_public_content TO authenticated;

-- ---------------------------------------------------------------------
-- 3. Bucket público de fotos de la ficha
-- ---------------------------------------------------------------------
-- public = true: los archivos se leen por su URL pública, sin firma,
-- porque la ficha es pública y se cachea. NO se crean políticas en
-- storage.objects: subir, reemplazar y borrar lo hace solo el backend
-- con service_role; anon y authenticated no pueden listar ni escribir.
-- Antes de subir, el backend decodifica con sharp, aplica la orientación
-- (rotate), redimensiona a 1600 px de lado mayor y recodifica a WebP SIN
-- metadatos (EXIF, GPS, cámara, ICC). Las rutas son UUID aleatorios
-- (especies/<uuid>.webp, arboles/<uuid>.webp): nunca tree_code,
-- tree_id, qr_token ni el nombre del archivo original.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('conecta-publico', 'conecta-publico', true, 2097152, ARRAY['image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/webp'];

-- ---------------------------------------------------------------------
-- 4. Escritura (SECURITY DEFINER, solo service_role)
-- ---------------------------------------------------------------------

-- Quién puede editar contenido ciudadano (P4): Administrador o Usuario
-- municipal, con cuenta activa. Con p_project_id, el Usuario municipal
-- debe ser miembro de ese proyecto (el Administrador es transversal,
-- PR-004). El Inspector y el Encargado de mantención, nunca.
CREATE FUNCTION public.fn_assert_editor_contenido_publico(
  p_usuario UUID,
  p_project_id UUID,
  p_sqlstate TEXT
) RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rol TEXT;
  v_activo BOOLEAN;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_usuario THEN
    RAISE EXCEPTION 'No está autorizado a ejecutar esta acción en nombre de otro usuario' USING ERRCODE = '42501';
  END IF;

  SELECT r.nombre, up.activo INTO v_rol, v_activo
  FROM public.user_profiles up JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = p_usuario;

  IF v_rol IS NULL OR v_rol NOT IN ('admin', 'usuario_municipal') THEN
    RAISE EXCEPTION 'Solo el Usuario municipal o el Administrador editan la ficha pública (rol actual: %)', v_rol USING ERRCODE = p_sqlstate;
  END IF;
  IF NOT v_activo THEN
    RAISE EXCEPTION 'El usuario % no está activo (D-251)', p_usuario USING ERRCODE = p_sqlstate;
  END IF;
  IF v_rol = 'usuario_municipal' AND p_project_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.project_members WHERE project_id = p_project_id AND user_id = p_usuario) THEN
    RAISE EXCEPTION 'El usuario % no es miembro del proyecto del árbol', p_usuario USING ERRCODE = p_sqlstate;
  END IF;
  RETURN v_rol;
END;
$$;

-- 4a. Guardar el contenido de una especie (reemplazo completo, PUT).
-- p_contenido trae los campos D-280 a D-290 ya validados por Zod. Las
-- fotos no vienen del cliente: se conservan las de los rasgos que siguen
-- (mismo id) y se devuelven las rutas de los rasgos eliminados para que
-- el backend borre los archivos.
CREATE FUNCTION public.fn_guardar_contenido_especie(
  p_species_id UUID,
  p_usuario UUID,
  p_contenido JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actual public.species_public_content%ROWTYPE;
  v_rasgos JSONB := '[]'::jsonb;
  v_rasgo JSONB;
  v_foto TEXT;
  v_rutas_huerfanas TEXT[] := ARRAY[]::TEXT[];
BEGIN
  PERFORM public.fn_assert_editor_contenido_publico(p_usuario, NULL, 'SV080');

  IF NOT EXISTS (SELECT 1 FROM public.species WHERE id = p_species_id) THEN
    RAISE EXCEPTION 'La especie % no existe en el catálogo', p_species_id USING ERRCODE = 'SV080';
  END IF;

  SELECT * INTO v_actual FROM public.species_public_content WHERE species_id = p_species_id FOR UPDATE;

  -- Rasgos: foto_path y credito de la foto salen de la fila actual.
  FOR v_rasgo IN SELECT value FROM jsonb_array_elements(COALESCE(p_contenido->'rasgos', '[]'::jsonb)) LOOP
    SELECT r->>'foto_path' INTO v_foto
    FROM jsonb_array_elements(COALESCE(v_actual.rasgos, '[]'::jsonb)) r
    WHERE r->>'id' = v_rasgo->>'id';
    v_rasgos := v_rasgos || jsonb_build_array(
      (v_rasgo - 'foto_path') || jsonb_build_object('foto_path', v_foto));
  END LOOP;

  SELECT COALESCE(array_agg(r->>'foto_path'), ARRAY[]::TEXT[]) INTO v_rutas_huerfanas
  FROM jsonb_array_elements(COALESCE(v_actual.rasgos, '[]'::jsonb)) r
  WHERE r->>'foto_path' IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_rasgos) n WHERE n->>'id' = r->>'id');

  INSERT INTO public.species_public_content AS c (
    species_id, nombre_comun_visualizacion, articulo_nombre, curiosidad, aportes, quien_soy,
    rasgos, anio_estacional, ciclo, historia_especie, consejo, fuentes,
    foto_referencial_path, credito_foto_referencial, updated_by, updated_at
  ) VALUES (
    p_species_id,
    NULLIF(btrim(p_contenido->>'nombre_comun_visualizacion'), ''),
    p_contenido->>'articulo_nombre',
    NULLIF(btrim(p_contenido->>'curiosidad'), ''),
    COALESCE(p_contenido->'aportes', '[]'::jsonb),
    NULLIF(btrim(p_contenido->>'quien_soy'), ''),
    v_rasgos,
    NULLIF(p_contenido->'anio_estacional', 'null'::jsonb),
    NULLIF(p_contenido->'ciclo', 'null'::jsonb),
    NULLIF(btrim(p_contenido->>'historia_especie'), ''),
    NULLIF(btrim(p_contenido->>'consejo'), ''),
    COALESCE(p_contenido->'fuentes', '[]'::jsonb),
    v_actual.foto_referencial_path,
    v_actual.credito_foto_referencial,
    p_usuario, now()
  )
  ON CONFLICT (species_id) DO UPDATE SET
    nombre_comun_visualizacion = EXCLUDED.nombre_comun_visualizacion,
    articulo_nombre            = EXCLUDED.articulo_nombre,
    curiosidad                 = EXCLUDED.curiosidad,
    aportes                    = EXCLUDED.aportes,
    quien_soy                  = EXCLUDED.quien_soy,
    rasgos                     = EXCLUDED.rasgos,
    anio_estacional            = EXCLUDED.anio_estacional,
    ciclo                      = EXCLUDED.ciclo,
    historia_especie           = EXCLUDED.historia_especie,
    consejo                    = EXCLUDED.consejo,
    fuentes                    = EXCLUDED.fuentes,
    updated_by                 = EXCLUDED.updated_by,
    updated_at                 = EXCLUDED.updated_at;

  RETURN jsonb_build_object('rutas_a_borrar', to_jsonb(v_rutas_huerfanas));
END;
$$;

-- 4b. Fijar o quitar una foto de la especie. p_ranura = 'referencial'
-- o el id de un rasgo existente. p_path NULL = quitar. Devuelve la ruta
-- anterior para que el backend borre el archivo DESPUÉS de confirmar.
CREATE FUNCTION public.fn_fijar_foto_especie(
  p_species_id UUID,
  p_usuario UUID,
  p_ranura TEXT,
  p_path TEXT,
  p_credito TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actual public.species_public_content%ROWTYPE;
  v_anterior TEXT;
  v_credito TEXT := NULLIF(btrim(COALESCE(p_credito, '')), '');
BEGIN
  PERFORM public.fn_assert_editor_contenido_publico(p_usuario, NULL, 'SV080');
  IF p_path IS NOT NULL AND v_credito IS NULL THEN
    RAISE EXCEPTION 'La fotografía requiere su crédito (autor y licencia)' USING ERRCODE = 'SV080';
  END IF;

  SELECT * INTO v_actual FROM public.species_public_content WHERE species_id = p_species_id FOR UPDATE;
  IF v_actual.species_id IS NULL THEN
    RAISE EXCEPTION 'Primero guarde el contenido ciudadano de la especie' USING ERRCODE = 'SV080';
  END IF;

  IF p_ranura = 'referencial' THEN
    v_anterior := v_actual.foto_referencial_path;
    UPDATE public.species_public_content
    SET foto_referencial_path = p_path,
        credito_foto_referencial = CASE WHEN p_path IS NULL THEN NULL ELSE v_credito END,
        updated_by = p_usuario, updated_at = now()
    WHERE species_id = p_species_id;
  ELSE
    SELECT r->>'foto_path' INTO v_anterior
    FROM jsonb_array_elements(v_actual.rasgos) r WHERE r->>'id' = p_ranura;
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_actual.rasgos) r WHERE r->>'id' = p_ranura) THEN
      RAISE EXCEPTION 'El rasgo % no existe en la especie', p_ranura USING ERRCODE = 'SV080';
    END IF;
    UPDATE public.species_public_content
    SET rasgos = (
          SELECT jsonb_agg(CASE WHEN r->>'id' = p_ranura
                                THEN r || jsonb_build_object('foto_path', p_path,
                                                             'credito', CASE WHEN p_path IS NULL THEN NULL ELSE v_credito END)
                                ELSE r END ORDER BY o)
          FROM jsonb_array_elements(v_actual.rasgos) WITH ORDINALITY AS x(r, o)),
        updated_by = p_usuario, updated_at = now()
    WHERE species_id = p_species_id;
  END IF;

  RETURN jsonb_build_object('ruta_anterior', v_anterior);
END;
$$;

-- 4c. Guardar la ficha pública de un árbol (reemplazo completo, PUT).
-- La foto no viene del cliente: se conserva.
CREATE FUNCTION public.fn_guardar_ficha_publica_arbol(
  p_tree_id UUID,
  p_usuario UUID,
  p_datos JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_project_id UUID;
  v_historia TEXT := NULLIF(btrim(COALESCE(p_datos->>'historia', '')), '');
  v_fuente TEXT := NULLIF(btrim(COALESCE(p_datos->>'historia_fuente', '')), '');
BEGIN
  SELECT project_id INTO v_project_id FROM public.trees WHERE id = p_tree_id;
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'El árbol % no existe', p_tree_id USING ERRCODE = 'SV081';
  END IF;
  PERFORM public.fn_assert_editor_contenido_publico(p_usuario, v_project_id, 'SV081');

  IF v_fuente IS NOT NULL AND v_historia IS NULL THEN
    RAISE EXCEPTION 'La fuente de «Mi historia» requiere el texto (D-302)' USING ERRCODE = 'SV081';
  END IF;

  INSERT INTO public.tree_public_content AS c (
    tree_id, mostrar_clase_edad, mostrar_altura_total, mostrar_dap, mostrar_diametro_copa,
    mostrar_rango_edad, historia, historia_fuente, textos_personalizados, updated_by, updated_at
  ) VALUES (
    p_tree_id,
    COALESCE((p_datos->>'mostrar_clase_edad')::boolean, false),
    COALESCE((p_datos->>'mostrar_altura_total')::boolean, false),
    COALESCE((p_datos->>'mostrar_dap')::boolean, false),
    COALESCE((p_datos->>'mostrar_diametro_copa')::boolean, false),
    COALESCE((p_datos->>'mostrar_rango_edad')::boolean, false),
    v_historia, v_fuente,
    COALESCE(p_datos->'textos_personalizados', '{}'::jsonb),
    p_usuario, now()
  )
  ON CONFLICT (tree_id) DO UPDATE SET
    mostrar_clase_edad    = EXCLUDED.mostrar_clase_edad,
    mostrar_altura_total  = EXCLUDED.mostrar_altura_total,
    mostrar_dap           = EXCLUDED.mostrar_dap,
    mostrar_diametro_copa = EXCLUDED.mostrar_diametro_copa,
    mostrar_rango_edad    = EXCLUDED.mostrar_rango_edad,
    historia              = EXCLUDED.historia,
    historia_fuente       = EXCLUDED.historia_fuente,
    textos_personalizados = EXCLUDED.textos_personalizados,
    updated_by            = EXCLUDED.updated_by,
    updated_at            = EXCLUDED.updated_at;

  RETURN jsonb_build_object('tree_id', p_tree_id);
END;
$$;

-- 4d. Fijar o quitar la foto pública del árbol (D-303). Crea la fila si
-- no existe (interruptores en No). Devuelve la ruta anterior.
CREATE FUNCTION public.fn_fijar_foto_ficha_publica(
  p_tree_id UUID,
  p_usuario UUID,
  p_path TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_project_id UUID;
  v_anterior TEXT;
BEGIN
  SELECT project_id INTO v_project_id FROM public.trees WHERE id = p_tree_id;
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'El árbol % no existe', p_tree_id USING ERRCODE = 'SV081';
  END IF;
  PERFORM public.fn_assert_editor_contenido_publico(p_usuario, v_project_id, 'SV081');

  SELECT foto_path INTO v_anterior FROM public.tree_public_content WHERE tree_id = p_tree_id FOR UPDATE;

  INSERT INTO public.tree_public_content (tree_id, foto_path, updated_by, updated_at)
  VALUES (p_tree_id, p_path, p_usuario, now())
  ON CONFLICT (tree_id) DO UPDATE SET
    foto_path = EXCLUDED.foto_path, updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at;

  RETURN jsonb_build_object('ruta_anterior', v_anterior);
END;
$$;

-- ---------------------------------------------------------------------
-- 5. Ficha pública ampliada (reemplaza la proyección de CC-062 punto 3)
-- ---------------------------------------------------------------------
-- Conserva las claves de la 028 (el frontend actual sigue funcionando)
-- y agrega:
--   nombre_visualizacion  D-280 → D-14 → NULL (el frontend escribe
--                         «Un árbol de Valparaíso»).
--   contenido_especie     D-281 a D-292, con los textos personalizados
--                         del árbol (D-304) ya aplicados encima.
--   ejemplar              «Mi historia» (D-301, D-302) y foto (D-303).
--   foto_principal        ejemplar → referencial de la especie → NULL,
--                         con su tipo para rotular «Foto referencial».
--   medidas               solo las activadas (D-296 a D-300) que tienen
--                         valor vigente; cada una con su naturaleza
--                         (Valej, 2026-11-16: DAP, altura y copa =
--                         medicion_o_estimacion; D-26 = estimacion;
--                         D-25 = clasificacion).
-- Sigue sin entregar: tree_code, tree_id, coordenadas, proyecto,
-- inspecciones, fotos técnicas (D-27), incidencias, riesgo ni ninguna
-- clasificación técnica. updated_by nunca sale.
-- Las rutas de foto salen como rutas del bucket; el backend arma la URL
-- pública (no se guarda el dominio en la base).
CREATE OR REPLACE FUNCTION public.fn_ficha_publica_arbol(p_qr_token UUID) RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH base AS (
    SELECT t.*, s.id AS s_id, s.especie_cientifica AS s_especie, s.genero, s.familia,
           s.origen_biogeografico, s.persistencia_follaje, s.tipo_hoja
    FROM public.trees t
    LEFT JOIN public.species s
      ON s.id = COALESCE(
        t.species_id,
        (SELECT s2.id FROM public.species s2
         WHERE lower(regexp_replace(trim(s2.especie_cientifica), '\s+', ' ', 'g'))
             = lower(regexp_replace(trim(t.especie_cientifica), '\s+', ' ', 'g'))
         LIMIT 1))
    WHERE t.qr_token = p_qr_token
  )
  SELECT jsonb_build_object(
    -- Claves de la 028, sin cambios
    'especie_cientifica', b.especie_cientifica,
    'nombre_comun', b.nombre_comun,
    'ubicacion_descriptiva', b.ubicacion_descriptiva,
    'sobre_la_especie', jsonb_build_object(
      'especie_cientifica', b.s_especie,
      'genero', b.genero,
      'familia', b.familia,
      'origen_biogeografico', CASE WHEN b.especie_cientifica IS NULL THEN 'no_determinado'
                                   ELSE COALESCE(b.origen_biogeografico, 'no_determinado') END,
      'persistencia_follaje', CASE WHEN b.especie_cientifica IS NULL THEN NULL ELSE b.persistencia_follaje END,
      'tipo_hoja', CASE WHEN b.especie_cientifica IS NULL THEN NULL ELSE b.tipo_hoja END
    ),
    -- Nuevo
    'nombre_visualizacion', CASE WHEN b.especie_cientifica IS NULL THEN b.nombre_comun
                                 ELSE COALESCE(c.nombre_comun_visualizacion, b.nombre_comun) END,
    'articulo', CASE WHEN b.especie_cientifica IS NULL THEN NULL ELSE c.articulo_nombre END,
    'contenido_especie', CASE WHEN b.especie_cientifica IS NULL OR c.species_id IS NULL THEN NULL ELSE jsonb_strip_nulls(jsonb_build_object(
      'curiosidad', COALESCE(p.textos_personalizados #>> '{curiosidad,texto}', c.curiosidad),
      'aportes', NULLIF(c.aportes, '[]'::jsonb),
      'quien_soy', COALESCE(p.textos_personalizados #>> '{quien_soy,texto}', c.quien_soy),
      'rasgos', NULLIF((SELECT jsonb_agg(r - 'id' ORDER BY o)
                        FROM jsonb_array_elements(c.rasgos) WITH ORDINALITY AS x(r, o)), 'null'::jsonb),
      'anio_estacional', c.anio_estacional,
      'ciclo', c.ciclo,
      'historia_especie', c.historia_especie,
      'consejo', COALESCE(p.textos_personalizados #>> '{consejo,texto}', c.consejo),
      'fuentes', NULLIF(c.fuentes, '[]'::jsonb)
    )) END,
    'ejemplar', jsonb_strip_nulls(jsonb_build_object(
      'historia', p.historia,
      'historia_fuente', p.historia_fuente
    )),
    'foto_principal', CASE
      WHEN p.foto_path IS NOT NULL THEN jsonb_build_object('tipo', 'ejemplar', 'ruta', p.foto_path)
      WHEN b.especie_cientifica IS NOT NULL AND c.foto_referencial_path IS NOT NULL
        THEN jsonb_build_object('tipo', 'referencial_especie', 'ruta', c.foto_referencial_path,
                                'credito', c.credito_foto_referencial)
      ELSE NULL END,
    'medidas', jsonb_strip_nulls(jsonb_build_object(
      'clase_edad',      CASE WHEN p.mostrar_clase_edad    AND b.clase_edad IS NOT NULL
                              THEN jsonb_build_object('codigo', b.clase_edad, 'naturaleza', 'clasificacion') END,
      'altura_total_m',  CASE WHEN p.mostrar_altura_total  AND b.altura_total_m IS NOT NULL
                              THEN jsonb_build_object('valor', b.altura_total_m, 'unidad', 'm', 'naturaleza', 'medicion_o_estimacion') END,
      'dap_cm',          CASE WHEN p.mostrar_dap           AND b.dap_cm IS NOT NULL
                              THEN jsonb_build_object('valor', b.dap_cm, 'unidad', 'cm', 'naturaleza', 'medicion_o_estimacion') END,
      'diametro_copa_m', CASE WHEN p.mostrar_diametro_copa AND b.diametro_copa_m IS NOT NULL
                              THEN jsonb_build_object('valor', b.diametro_copa_m, 'unidad', 'm', 'naturaleza', 'medicion_o_estimacion') END,
      'rango_edad_estimada_anios', CASE WHEN p.mostrar_rango_edad AND b.rango_edad_estimada_anios IS NOT NULL
                              THEN jsonb_build_object('codigo', b.rango_edad_estimada_anios, 'naturaleza', 'estimacion') END
    ))
  )
  FROM base b
  LEFT JOIN public.species_public_content c ON c.species_id = b.s_id
  LEFT JOIN public.tree_public_content p ON p.tree_id = b.id;
$$;

-- CREATE OR REPLACE conserva los privilegios de la 028; se repiten para
-- que la migración sea explícita.
REVOKE ALL ON FUNCTION public.fn_ficha_publica_arbol(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_ficha_publica_arbol(UUID) TO service_role;

REVOKE ALL ON FUNCTION public.fn_assert_editor_contenido_publico(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_guardar_contenido_especie(UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_fijar_foto_especie(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_guardar_ficha_publica_arbol(UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_fijar_foto_ficha_publica(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_assert_editor_contenido_publico(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_guardar_contenido_especie(UUID, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_fijar_foto_especie(UUID, UUID, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_guardar_ficha_publica_arbol(UUID, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_fijar_foto_ficha_publica(UUID, UUID, TEXT) TO service_role;

-- ---------------------------------------------------------------------
-- Verificación posterior (solo lectura, no forma parte de la migración)
-- ---------------------------------------------------------------------
--   SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'conecta-publico';
--   SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';  -- sin políticas nuevas
--   SELECT has_function_privilege('anon', 'public.fn_ficha_publica_arbol(uuid)', 'EXECUTE');      -- false
--   SELECT has_table_privilege('authenticated', 'public.tree_public_content', 'INSERT');          -- false
