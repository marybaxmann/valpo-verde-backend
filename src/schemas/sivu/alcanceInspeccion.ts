import { esCodigoVigente } from "../../services/rules/engine/catalogs";

/**
 * Mismos pares tipo/subtipo que `fn_save_inspection_draft` (018e) y
 * `fn_create_work_order_inspeccion` (018h) — D-196/D-197. Se repite
 * aquí (API) por la misma razón que en ambas funciones SQL: ninguna
 * capa confía solo en la anterior. Si este par cambia, cambiarlo
 * también en esas dos funciones.
 */
export function tipoSubtipoValido(tipo: string, subtipo: string | null): boolean {
  if (!esCodigoVigente("tipo_inspeccion_realizada", tipo)) return false;
  switch (tipo) {
    case "evaluacion_inicial":
    case "levantamiento":
      return subtipo === null;
    case "reevaluacion":
      return subtipo === null || subtipo === "seguimiento" || subtipo === "post_intervencion";
    case "evaluacion_instrumental":
      return (
        subtipo === null ||
        subtipo === "tomografia_sonica" ||
        subtipo === "resistografia" ||
        subtipo === "otra_instrumental"
      );
    case "monitoreo":
      return subtipo === "fitosanitario" || subtipo === "estructural" || subtipo === "vitalidad";
    default:
      return false;
  }
}


/**
 * Alcance de REGISTRO_EVALUACION por tipo/subtipo (CC-040; CC-063): una
 * sola lista, en el motor (`services/rules/engine/alcance.ts`), que usan
 * el borrador (Zod), la completitud y `validarAlcance`.
 */
export {
  CAMPOS_EVALUACION_COMPLETA,
  CAMPOS_EVALUACION_INSTRUMENTAL,
  CAMPOS_MONITOREO_ESTRUCTURAL,
  CAMPOS_MONITOREO_FITOSANITARIO,
  CAMPOS_MONITOREO_VITALIDAD,
  camposPermitidosPorTipo,
} from "../../services/rules/engine/alcance";

/**
 * Campos de REGISTRO_EVALUACION de selección múltiple → catálogo de sus
 * códigos (CC-056 decisión o). D-132 y D-143: "Permitir selección
 * múltiple"; D-139: selección múltiple (`TipoRedAereaCodigo[]` en M04).
 * Son los únicos campos del borrador que aceptan una lista.
 */
export const CATALOGO_SELECCION_MULTIPLE: Readonly<Record<string, string>> = {
  tipo_infraestructura_vertical: "tipo_infraestructura_vertical",
  tipo_red_aerea: "tipo_red_aerea",
  tipo_red_subterranea: "tipo_red_subterranea",
};

