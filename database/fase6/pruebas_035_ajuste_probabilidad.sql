-- =====================================================================
-- Pruebas de la migración 035 (CC-071). Base de PRUEBAS.
-- El bloque termina siempre en una excepción: nada se guarda. Si todo
-- pasa, el mensaje es PRUEBAS_035_OK. Antes de aplicar y tras revertir
-- debe fallar en A1. Regresión obligatoria: pruebas_020_finalizar_inspeccion.
--   A1 el CHECK admite las tres probabilidades y conserva las anteriores.
--   A2 la función acepta los tres campos, con su valor calculado y dominio.
--   A3 un campo inexistente sigue rechazado por el CHECK.
-- =====================================================================
DO $$
DECLARE
  v_def text;
  v_fn  text;
  v_ev  uuid;
  c     text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_def FROM pg_constraint WHERE conname = 'classification_adjustments_campo_check';
  FOREACH c IN ARRAY ARRAY['clasificacion_riesgo','clasificacion_infraestructura','clasificacion_prioridad',
                           'probabilidad_falla_raices_cuello','probabilidad_falla_tronco','probabilidad_falla_copa_ramas'] LOOP
    IF position(c IN v_def) = 0 THEN RAISE EXCEPTION 'A1 falló: falta % en %', c, v_def; END IF;
  END LOOP;

  v_fn := pg_get_functiondef('public.fn_finalizar_inspeccion(uuid,uuid,jsonb,jsonb,date,date,date,date,text)'::regprocedure);
  FOREACH c IN ARRAY ARRAY['probabilidad_falla_raices_cuello','probabilidad_falla_tronco','probabilidad_falla_copa_ramas'] LOOP
    IF position('WHEN ''' || c || ''' THEN v_resultado.' || c IN v_fn) = 0 THEN RAISE EXCEPTION 'A2 falló: % sin valor calculado', c; END IF;
  END LOOP;
  IF position('valor_ajustado fuera del dominio' IN v_fn) = 0 THEN RAISE EXCEPTION 'A2 falló: sin validación de dominio'; END IF;

  SELECT id INTO v_ev FROM public.evaluations LIMIT 1;
  IF v_ev IS NOT NULL THEN
    BEGIN
      INSERT INTO public.classification_adjustments (evaluation_id, campo, valor_ajustado, justificacion_ajuste_clasificacion, ajustado_por)
      SELECT v_ev, 'campo_inexistente', 'alto', 'prueba', id FROM public.user_profiles LIMIT 1;
      RAISE EXCEPTION 'A3 falló: aceptó un campo inexistente';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
  END IF;

  RAISE EXCEPTION 'PRUEBAS_035_OK';
END $$;
