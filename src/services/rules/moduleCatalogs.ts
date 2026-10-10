/**
 * Catálogos de los módulos Infraestructura y Mantención (corte demo).
 * Fuente: Base de Datos Valpo Verde.xlsx
 *  - LISTAS (tabla P:X, estado_valor = vigente, CC-004): `accion` con
 *    catalogo_padre tipo_ot = mantenimiento, y `subtipo_accion` por acción.
 *  - DICCIONARIO_CAMPOS (REGISTRO_EVALUACION): dominios "Unidad / valores"
 *    de los campos de infraestructura.
 * Se guarda el `codigo` y se muestra la `etiqueta`. Ninguna lista se
 * amplió por conveniencia.
 */

export interface CatalogItem {
  codigo: string;
  etiqueta: string;
}

export interface MaintenanceAction extends CatalogItem {
  subtipos: CatalogItem[];
  /** LISTAS: "Requiere especificar en observaciones (obligatorio)." */
  requiere_observacion?: boolean;
}

export const MAINTENANCE_ACTIONS: MaintenanceAction[] = [
  { codigo: "riego", etiqueta: "Riego", subtipos: [
    { codigo: "programado", etiqueta: "Programado" },
    { codigo: "emergencia", etiqueta: "Emergencia" },
  ] },
  { codigo: "poda", etiqueta: "Poda", subtipos: [
    { codigo: "sanitaria", etiqueta: "Sanitaria" },
    { codigo: "formacion", etiqueta: "Formación" },
    { codigo: "despeje", etiqueta: "Despeje" },
    { codigo: "reduccion", etiqueta: "Reducción" },
  ] },
  { codigo: "descompactacion", etiqueta: "Descompactación", subtipos: [
    { codigo: "manual", etiqueta: "Manual" },
    { codigo: "mecanica", etiqueta: "Mecánica" },
  ] },
  { codigo: "manejo_fitosanitario", etiqueta: "Manejo fitosanitario", subtipos: [
    { codigo: "preventivo", etiqueta: "Preventivo" },
    { codigo: "correctivo", etiqueta: "Correctivo" },
  ] },
  { codigo: "tala_retiro", etiqueta: "Tala / retiro", subtipos: [
    { codigo: "tala", etiqueta: "Tala" },
    { codigo: "retiro_tocon", etiqueta: "Retiro de tocón" },
    { codigo: "retiro_residuos", etiqueta: "Retiro de residuos" },
  ] },
  { codigo: "reparacion_alcorque", etiqueta: "Reparación de alcorque", subtipos: [] },
  { codigo: "soporte_tutorado", etiqueta: "Soporte / tutorado", subtipos: [] },
  { codigo: "otra_intervencion", etiqueta: "Otra intervención", subtipos: [], requiere_observacion: true },
];

/** Dominios de DICCIONARIO_CAMPOS ("Unidad / valores"), tal cual. */
export const INFRA_DOMAINS = {
  si_no: ["Sí", "No"],
  si_no_nd: ["Sí", "No", "No determinado"],
  materialidad_vereda: ["Baldosa", "Adoquín", "Hormigón", "Asfalto", "Otro", "No determinado"],
  materialidad_calzada: ["Asfalto", "Hormigón", "Adoquín", "Otro", "No determinado"],
  forma_alcorque: ["Rectangular", "Circular", "Irregular"],
  tipo_infraestructura_vertical: ["Poste", "Luminaria", "Señalética", "Semáforo", "Muro o cierre", "Edificación", "Otro"],
  tipo_red_aerea: ["Eléctrica", "Telecomunicaciones", "Alumbrado público", "Otra", "Función no determinada"],
  tipo_red_subterranea: [
    "Eléctrica", "Telecomunicaciones", "Agua potable", "Alcantarillado", "Aguas lluvias", "Gas", "Otra", "Función no determinada",
  ],
} as const;

/**
 * Estados operativos según las listas de validación de datos del Excel
 * maestro (ORDENES DE TRABAJO.estado_ot e INCIDENCIA.estado_incidencia).
 * La fuente no define transiciones: cualquier estado de la lista es válido.
 * `pendiente` (DEFAULT de schema.sql en incidents) se conserva como valor
 * histórico legible, sin reescribir filas.
 */
export const MAINTENANCE_STATES: CatalogItem[] = [
  { codigo: "pendiente", etiqueta: "Pendiente" },
  { codigo: "programada", etiqueta: "Programada" },
  { codigo: "en_ejecucion", etiqueta: "En ejecución" },
  { codigo: "completada", etiqueta: "Completada" },
  { codigo: "cancelada", etiqueta: "Cancelada" },
];

export const INCIDENT_STATES: CatalogItem[] = [
  { codigo: "ingresada", etiqueta: "Ingresada" },
  { codigo: "en_revision", etiqueta: "En revisión" },
  { codigo: "derivada", etiqueta: "Derivada" },
  { codigo: "resuelta", etiqueta: "Resuelta" },
  { codigo: "descartada", etiqueta: "Descartada" },
];
