import { AuthenticatedUser } from "../../types/auth";
import { assertProjectAccess } from "../authorization.service";
import { camposPermitidosPorTipo, CATALOGO_SELECCION_MULTIPLE } from "../../schemas/sivu/alcanceInspeccion";
import { CAMPOS_NO_EXIGIDOS, REGLAS_COMPLETITUD, METADATOS_DICCIONARIO } from "../../schemas/sivu/completitudInspeccion";
import { camposArbolBaseSchema } from "../../schemas/sivu/inspeccion.schema";
import { CATALOGO } from "../rules/engine/catalogs";

/** Datos no definidos por las fuentes de presentación se devuelven como null. */
function campo(hoja: "ARBOLES" | "REGISTRO_EVALUACION", id: string) {
  const regla = REGLAS_COMPLETITUD.find(r => r.hoja === hoja && r.campo === id);
  const noExigido = CAMPOS_NO_EXIGIDOS.find(r => r.hoja === hoja && r.campo === id);
  const meta = METADATOS_DICCIONARIO.find(m => m.hoja === hoja && m.campo === id);
  const catalogo = CATALOGO_SELECCION_MULTIPLE[id];
  const opcionesCatalogo = catalogo ? CATALOGO.filter(c => c.catalogo === catalogo && c.estado === "vigente").map(c => ({ codigo: c.codigo, etiqueta: c.etiqueta })) : null;
  const unidades = ["m", "cm", "m²", "grados", "% (0 a 100)", "% (0 a 100, porcentaje)", "Sin unidad", "cantidad", "Número entero adimencional"];
  // La columna H también contiene dominios y descripciones; no son unidades.
  const unidad = meta && unidades.includes(meta.unidadValores) ? meta.unidadValores : null;
  return {
    identificador: id,
    etiqueta: null,
    tipo: meta?.tipoDato || null,
    unidad,
    unidad_valores_excel: meta?.unidadValores || null,
    opciones: opcionesCatalogo,
    obligatoriedad: regla?.obligatoriedadExcel ?? noExigido?.obligatoriedadExcel ?? null,
    condicion_activacion: regla?.activacion ?? null,
    seccion: null,
    orden: regla?.fila ?? noExigido?.fila ?? null,
    exigencia: regla?.exigencia ?? null,
    marca: regla?.marca ?? null,
    condicion_texto: regla?.condicionExcel ?? noExigido?.condicionExcel ?? null,
  };
}

export async function obtenerInspectionFormSchema(user: AuthenticatedUser, projectId: string, token: string) {
  await assertProjectAccess(user, projectId, token);
  return {
    tipo: "evaluacion_inicial",
    variables: camposPermitidosPorTipo("evaluacion_inicial", null)!.map(id => campo("REGISTRO_EVALUACION", id)),
    campos_arbol: Object.keys(camposArbolBaseSchema.shape).map(id => campo("ARBOLES", id)),
  };
}
