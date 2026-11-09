-- Reversión de la 035. Se detiene si ya existen ajustes de probabilidad.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.classification_adjustments WHERE campo LIKE 'probabilidad_falla_%') THEN
    RAISE EXCEPTION 'Existen ajustes de probabilidad de falla: la 035 no se puede revertir sin decidir qué hacer con ellos';
  END IF;
END $$;

ALTER TABLE public.classification_adjustments DROP CONSTRAINT classification_adjustments_campo_check;
ALTER TABLE public.classification_adjustments ADD CONSTRAINT classification_adjustments_campo_check
  CHECK (campo IN ('clasificacion_riesgo', 'clasificacion_infraestructura', 'clasificacion_prioridad'));

DO $mig$
DECLARE
  d text;
  n text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO STRICT d FROM pg_proc p
   WHERE p.proname = 'fn_finalizar_inspeccion' AND p.pronamespace = 'public'::regnamespace;
  n := replace(d, $x$    -- CC-070: la probabilidad ajustada no tiene columna _ajustada; se valida su dominio.
    IF v_campo LIKE 'probabilidad_falla_%' THEN
      IF (v_ajuste->>'valor_ajustado') NOT IN ('improbable', 'posible', 'probable', 'inminente') THEN
        RAISE EXCEPTION 'Ajuste de %: valor_ajustado fuera del dominio (%)', v_campo, v_ajuste->>'valor_ajustado'
          USING ERRCODE = 'SV064';
      END IF;
    ELSIF (v_ajuste->>'valor_ajustado') IS DISTINCT FROM v_ajustada THEN$x$, $x$    IF (v_ajuste->>'valor_ajustado') IS DISTINCT FROM v_ajustada THEN$x$);
  IF n = d THEN RAISE EXCEPTION 'fn_finalizar_inspeccion: no se encontró el texto esperado'; END IF;
  d := n;
  n := replace(d, $x$      WHEN 'clasificacion_prioridad' THEN v_resultado.clasificacion_prioridad_calculada
      WHEN 'probabilidad_falla_raices_cuello' THEN v_resultado.probabilidad_falla_raices_cuello
      WHEN 'probabilidad_falla_tronco' THEN v_resultado.probabilidad_falla_tronco
      WHEN 'probabilidad_falla_copa_ramas' THEN v_resultado.probabilidad_falla_copa_ramas
    END;$x$, $x$      WHEN 'clasificacion_prioridad' THEN v_resultado.clasificacion_prioridad_calculada
    END;$x$);
  IF n = d THEN RAISE EXCEPTION 'fn_finalizar_inspeccion: no se encontró el texto esperado'; END IF;
  d := n;
  n := replace(d, $x$v_campo NOT IN ('clasificacion_riesgo', 'clasificacion_infraestructura', 'clasificacion_prioridad',
      'probabilidad_falla_raices_cuello', 'probabilidad_falla_tronco', 'probabilidad_falla_copa_ramas') THEN$x$, $x$v_campo NOT IN ('clasificacion_riesgo', 'clasificacion_infraestructura', 'clasificacion_prioridad') THEN$x$);
  IF n = d THEN RAISE EXCEPTION 'fn_finalizar_inspeccion: no se encontró el texto esperado'; END IF;
  d := n;
  EXECUTE d;
END $mig$;

COMMIT;
