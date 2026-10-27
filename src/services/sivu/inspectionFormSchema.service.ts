import { AuthenticatedUser } from "../../types/auth";
import { assertProjectAccess } from "../authorization.service";
import { camposPermitidosPorTipo, CATALOGO_SELECCION_MULTIPLE } from "../../schemas/sivu/alcanceInspeccion";
import { CAMPOS_NO_EXIGIDOS, REGLAS_COMPLETITUD, METADATOS_DICCIONARIO } from "../../schemas/sivu/completitudInspeccion";
import { camposArbolBaseSchema } from "../../schemas/sivu/inspeccion.schema";
import { entradasVigentesDe } from "../rules/engine/catalogs";

type Hoja = "ARBOLES" | "REGISTRO_EVALUACION";
type Opcion = { codigo: string | boolean; etiqueta: string };

/**
 * Campo de selección única -> catálogo de catalogs.ts. Las etiquetas de
 * cada catálogo son el dominio literal de la columna H (lo comprueba
 * tests/integration/inspectionFormSchema.routes.test.ts). "Sí / No" no es
 * un catálogo (PR-021): se guarda como booleano.
 */
export const CATALOGO_DE_CAMPO_FORMULARIO: Readonly<Record<string, string>> = {
  clase_edad: "clase_edad",
  rango_edad_estimada_anios: "rango_edad_estimada_anios",
  cavidad_basal_interna: "resultado_cavidad_interna",
  cavidad_interna_tronco: "resultado_cavidad_interna",
  condicion_heridas_tronco: "condicion_herida",
  afectacion_fisura_grieta: "afectacion_grieta",
  direccion_grieta: "direccion_grieta",
  materialidad_vereda: "materialidad_vereda",
  materialidad_calzada: "materialidad_calzada",
  forma_alcorque: "forma_alcorque",
  condicion_radicular_entorno: "condicion_radicular_entorno",
  red_subterranea_presente: "si_no_no_determinado",
  compromete_funcionalidad_red_subterranea: "si_no_no_determinado",
  tipo_tutorado: "tipo_tutorado",
  condicion_tutorado: "condicion_tutorado",
  zona_objetivo: "zona_objetivo",
  tasa_ocupacion_objetivo: "tasa_ocupacion",
  consecuencia_raices_cuello: "consecuencia",
  consecuencia_tronco: "consecuencia",
  consecuencia_copa_ramas: "consecuencia",
  clasificacion_vitalidad: "clasificacion_vitalidad",
};

/** Columna G del diccionario -> tipo de entrada del formulario. */
const TIPO_ENTRADA: Readonly<Record<string, string>> = {
  "Decimal": "decimal",
  "Entero": "entero",
  "Número entero": "entero",
  "Texto": "texto",
  "Texto libre": "texto",
  "Fecha": "fecha",
  "Lista de valores numéricos": "lista_decimal",
  "Archivo de imagen": "archivo",
  "Identificador (texto)": "identificador",
};

/**
 * Campos sin fila propia en DICCIONARIO_CAMPOS: banderas "no presenta" de
 * camposArbolBaseSchema (booleanas) y la adición de CC-056 (D-125,
 * "Irregular -> ingreso manual").
 */
const SIN_FILA: Readonly<Record<string, { tipo_entrada: string; unidad: string | null }>> = {
  copa_no_presenta: { tipo_entrada: "booleano", unidad: null },
  altura_primera_rama_no_presenta: { tipo_entrada: "booleano", unidad: null },
  altura_base_copa_viva_no_presenta: { tipo_entrada: "booleano", unidad: null },
  superficie_alcorque_m2_manual: { tipo_entrada: "decimal", unidad: "m²" },
};

// La columna H también contiene dominios y descripciones; solo estas son unidades.
const UNIDADES = ["m", "cm", "m²", "grados", "% (0 a 100)", "% (0 a 100, porcentaje)", "Sin unidad", "cantidad", "Número entero adimencional"];

export function dominioExcel(unidadValores: string): string[] {
  return unidadValores.split(" / ").map(s => s.trim());
}

function tipoYOpciones(id: string, tipoDato: string | undefined, unidadValores: string | undefined): { tipo_entrada: string | null; opciones: Opcion[] | null } {
  if (tipoDato !== "Categoría") return { tipo_entrada: (tipoDato && TIPO_ENTRADA[tipoDato]) ?? null, opciones: null };
  const multiple = CATALOGO_SELECCION_MULTIPLE[id];
  const catalogo = multiple ?? CATALOGO_DE_CAMPO_FORMULARIO[id];
  if (catalogo) {
    return {
      tipo_entrada: multiple ? "seleccion_multiple" : "seleccion",
      opciones: entradasVigentesDe(catalogo).map(c => ({ codigo: c.codigo, etiqueta: c.etiqueta })),
    };
  }
  const dominio = unidadValores ? dominioExcel(unidadValores) : [];
  if (dominio.length === 2 && dominio[0] === "Sí" && dominio[1] === "No") {
    return { tipo_entrada: "booleano", opciones: [{ codigo: true, etiqueta: "Sí" }, { codigo: false, etiqueta: "No" }] };
  }
  return { tipo_entrada: null, opciones: null };
}

/** Datos no definidos por las fuentes de presentación se devuelven como null. */
function campo(hoja: Hoja, id: string) {
  const regla = REGLAS_COMPLETITUD.find(r => r.hoja === hoja && r.campo === id);
  const noExigido = CAMPOS_NO_EXIGIDOS.find(r => r.hoja === hoja && r.campo === id);
  const meta = METADATOS_DICCIONARIO.find(m => m.hoja === hoja && m.campo === id);
  const sinFila = meta ? undefined : SIN_FILA[id];
  const { tipo_entrada, opciones } = sinFila
    ? { tipo_entrada: sinFila.tipo_entrada, opciones: sinFila.tipo_entrada === "booleano" ? [{ codigo: true, etiqueta: "Sí" }, { codigo: false, etiqueta: "No" }] : null }
    : tipoYOpciones(id, meta?.tipoDato, meta?.unidadValores);
  const unidad = sinFila ? sinFila.unidad : meta && UNIDADES.includes(meta.unidadValores) ? meta.unidadValores : null;
  return {
    identificador: id,
    // Etiqueta visible pendiente de definición: por ahora, el nombre del campo.
    etiqueta: id,
    etiqueta_pendiente: true,
    tipo: meta?.tipoDato || null,
    tipo_entrada,
    unidad,
    unidad_valores_excel: meta?.unidadValores || null,
    opciones,
    obligatoriedad: regla?.obligatoriedadExcel ?? noExigido?.obligatoriedadExcel ?? null,
    condicion_activacion: regla?.activacion ?? null,
    seccion: null,
    orden: regla?.fila ?? noExigido?.fila ?? null,
    exigencia: regla?.exigencia ?? null,
    marca: regla?.marca ?? null,
    condicion_texto: regla?.condicionExcel ?? noExigido?.condicionExcel ?? null,
  };
}

export function construirInspectionFormSchema() {
  return {
    tipo: "evaluacion_inicial",
    variables: camposPermitidosPorTipo("evaluacion_inicial", null)!.map(id => campo("REGISTRO_EVALUACION", id)),
    campos_arbol: Object.keys(camposArbolBaseSchema.shape).map(id => campo("ARBOLES", id)),
  };
}

export async function obtenerInspectionFormSchema(user: AuthenticatedUser, projectId: string, token: string) {
  await assertProjectAccess(user, projectId, token);
  return construirInspectionFormSchema();
}
