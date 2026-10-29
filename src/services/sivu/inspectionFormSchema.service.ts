import { AuthenticatedUser } from "../../types/auth";
import { assertProjectAccess } from "../authorization.service";
import { camposPermitidosPorTipo, CATALOGO_SELECCION_MULTIPLE, CATALOGO_SELECCION_UNICA } from "../../schemas/sivu/alcanceInspeccion";
import {
  CAMPOS_NO_EXIGIDOS,
  REGLAS_COMPLETITUD,
  METADATOS_DICCIONARIO,
  SECCIONES_FORMULARIO,
  SECCION_DE_CAMPO,
} from "../../schemas/sivu/completitudInspeccion";
import { camposArbolBaseSchema } from "../../schemas/sivu/inspeccion.schema";
import { entradasVigentesDe } from "../rules/engine/catalogs";
import { ETIQUETAS_FORMULARIO } from "../../schemas/sivu/etiquetasFormulario";

type Hoja = "ARBOLES" | "REGISTRO_EVALUACION";
type Opcion = { codigo: string | boolean; etiqueta: string };

/**
 * Campo de selección única -> catálogo de catalogs.ts. Las etiquetas de
 * cada catálogo son el dominio literal de la columna H (lo comprueba
 * tests/integration/inspectionFormSchema.routes.test.ts). "Sí / No" no es
 * un catálogo (PR-021): se guarda como booleano. Los de REGISTRO_EVALUACION
 * vienen de CATALOGO_SELECCION_UNICA, la misma lista con que se valida el
 * borrador; los de ARBOLES ya los valida camposArbolBaseSchema.
 */
export const CATALOGO_DE_CAMPO_FORMULARIO: Readonly<Record<string, string>> = {
  clase_edad: "clase_edad",
  rango_edad_estimada_anios: "rango_edad_estimada_anios",
  ...CATALOGO_SELECCION_UNICA,
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
const SIN_FILA: Readonly<Record<string, { tipo_entrada: string; unidad: string | null; junto_a: string }>> = {
  copa_no_presenta: { tipo_entrada: "booleano", unidad: null, junto_a: "diametro_copa_eo_m" },
  altura_primera_rama_no_presenta: { tipo_entrada: "booleano", unidad: null, junto_a: "altura_primera_rama_m" },
  altura_base_copa_viva_no_presenta: { tipo_entrada: "booleano", unidad: null, junto_a: "altura_base_copa_viva_m" },
  superficie_alcorque_m2_manual: { tipo_entrada: "decimal", unidad: "m²", junto_a: "superficie_alcorque_m2" },
};

/**
 * Sección y orden de presentación (B16): la posición de la columna en su
 * hoja del Excel. Un campo sin columna propia va justo después del campo
 * al que acompaña.
 */
function ubicacion(hoja: Hoja, id: string): { seccion: (typeof SECCIONES_FORMULARIO)[number] | null; orden: number | null } {
  const directo = SECCION_DE_CAMPO.find(s => s.hoja === hoja && s.campo === id);
  const ancla = directo ?? SECCION_DE_CAMPO.find(s => s.hoja === hoja && s.campo === SIN_FILA[id]?.junto_a);
  if (!ancla) return { seccion: null, orden: null };
  return {
    seccion: SECCIONES_FORMULARIO.find(s => s.codigo === ancla.seccion) ?? null,
    orden: directo ? directo.orden : ancla.orden + 0.5,
  };
}

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
  const { seccion, orden } = ubicacion(hoja, id);
  return {
    identificador: id,
    // Etiqueta aprobada (etiquetasFormulario.ts); sin ella, el nombre del campo.
    etiqueta: ETIQUETAS_FORMULARIO[`${hoja}:${id}`] ?? id,
    etiqueta_pendiente: ETIQUETAS_FORMULARIO[`${hoja}:${id}`] === undefined,
    tipo: meta?.tipoDato || null,
    tipo_entrada,
    unidad,
    unidad_valores_excel: meta?.unidadValores || null,
    opciones,
    obligatoriedad: regla?.obligatoriedadExcel ?? noExigido?.obligatoriedadExcel ?? null,
    condicion_activacion: regla?.activacion ?? null,
    seccion: seccion ? { codigo: seccion.codigo, etiqueta: seccion.etiqueta, propuesta: seccion.propuesta } : null,
    orden,
    fila_diccionario: regla?.fila ?? noExigido?.fila ?? null,
    exigencia: regla?.exigencia ?? null,
    marca: regla?.marca ?? null,
    condicion_texto: regla?.condicionExcel ?? noExigido?.condicionExcel ?? null,
  };
}

function ordenar<T extends { orden: number | null }>(campos: T[]): T[] {
  return [...campos].sort((a, b) => (a.orden ?? Infinity) - (b.orden ?? Infinity));
}

export function construirInspectionFormSchema() {
  return {
    tipo: "evaluacion_inicial",
    secciones: SECCIONES_FORMULARIO.map(s => ({ codigo: s.codigo, etiqueta: s.etiqueta, orden: s.orden, propuesta: s.propuesta })),
    variables: ordenar(camposPermitidosPorTipo("evaluacion_inicial", null)!.map(id => campo("REGISTRO_EVALUACION", id))),
    campos_arbol: ordenar(Object.keys(camposArbolBaseSchema.shape).map(id => campo("ARBOLES", id))),
  };
}

export async function obtenerInspectionFormSchema(user: AuthenticatedUser, projectId: string, token: string) {
  await assertProjectAccess(user, projectId, token);
  return construirInspectionFormSchema();
}
