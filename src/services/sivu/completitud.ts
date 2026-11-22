import { camposPermitidosPorTipo } from "../../schemas/sivu/alcanceInspeccion";
import { aplicaAlcanceInspeccion, type AlcanceInspeccion } from "../rules/engine/alcance";
import {
  CAMPOS_NO_APLICAN_PALMERA,
  CondicionActivacion,
  REGLAS_COMPLETITUD,
  ReglaCompletitud,
} from "../../schemas/sivu/completitudInspeccion";
import { incluyePalmeras, RULE_VERSION_OPERATIVA, VersionMotor } from "../rules/engine/version";

/**
 * Completitud para finalizar una inspección (CC-056; REGLAS_GENERALES
 * fila 28; D-209). Función pura: no lee la base. Quien la llama
 * (/calcular, /finalizar) le pasa lo registrado en esta inspección y
 * lo vigente del árbol.
 *
 * - Evaluación inicial, Reevaluación y Levantamiento: todas las reglas
 *   de la tabla (ARBOLES y REGISTRO_EVALUACION), D-27 y D-13.
 * - Evaluación instrumental y Monitoreo: solo las reglas de
 *   REGISTRO_EVALUACION dentro de su alcance (CC-040); sin ARBOLES ni
 *   D-13 (CC-056 punto 2 y decisión i).
 *
 * Las condiciones de activación se evalúan con lo registrado en esta
 * inspección sobre lo vigente (lo registrado reemplaza a lo vigente).
 * Un campo exigido con origen `registrado` tiene que estar registrado
 * en esta inspección; con `vigente_o_registrado` basta el valor que
 * quede.
 */

export interface EntradaCompletitud {
  tipo: string;
  subtipo: string | null;
  alcance?: AlcanceInspeccion | null;
  /** `evaluations.variables` de esta inspección. */
  variablesRegistradas: Readonly<Record<string, unknown>>;
  /** `v_tree_current_inputs.entradas_vigentes` del árbol. */
  variablesVigentes: Readonly<Record<string, unknown>>;
  /** Fila de `tree_data_versions` de esta inspección (vacía si no registró campos del árbol). */
  arbolRegistrado: Readonly<Record<string, unknown>>;
  /** `tree_data_versions.campos_registrados` de esta inspección. */
  camposRegistradosArbol: readonly string[];
  /** Valores vigentes del árbol (`trees`). */
  arbolVigente: Readonly<Record<string, unknown>>;
  inspeccionId: string;
  fotos: readonly FotoD27[];
  /** Versión con que se calcula (por omisión, la operativa). CC-082: las palmeras dependen de ella. */
  ruleVersion?: VersionMotor;
}

interface FotoD27 {
  id: string;
  inspection_id: string | null;
  storage_path: string;
  sha256: string | null;
  vista: string | null;
}

export interface CampoFaltante {
  campo: string;
  hoja: "ARBOLES" | "REGISTRO_EVALUACION";
  fila: number;
  motivo: string;
}

export interface ResultadoCompletitud {
  completa: boolean;
  campos_faltantes: CampoFaltante[];
  fotos_validas_d27: number | null;
  vistas_recomendadas_faltantes: string[];
}

const NO_APLICAN_PALMERA: ReadonlySet<string> = new Set(CAMPOS_NO_APLICAN_PALMERA);

/** CC-082: una regla con `desdeVersion` solo se exige desde esa versión (comparación MAJOR.MINOR). */
export function vigenteEnVersion(regla: Pick<ReglaCompletitud, "desdeVersion">, version: VersionMotor): boolean {
  if (!regla.desdeVersion) return true;
  const [a, b] = version.split(".").map(Number);
  const [c, d] = regla.desdeVersion.split(".").map(Number);
  return a > c || (a === c && b >= d);
}

/** Tipos con evaluación completa (CC-056). También habilitan los indicadores biométricos de B19. */
export const TIPOS_EVALUACION_COMPLETA: ReadonlySet<string> = new Set(["evaluacion_inicial", "reevaluacion", "levantamiento"]);

/** D-27: las cuatro vistas recomendadas. */
export const VISTAS_D27 = ["arbol_completo", "base", "tronco", "copa"] as const;

export function evaluarCompletitud(e: EntradaCompletitud): ResultadoCompletitud {
  if (e.tipo === "evaluacion_instrumental") return evaluarCompletitudInstrumental(e);
  const completa = TIPOS_EVALUACION_COMPLETA.has(e.tipo);
  const parcial = aplicaAlcanceInspeccion(e.tipo) && (e.alcance === "arbol" || e.alcance === "infraestructura");
  const alcance = camposPermitidosPorTipo(e.tipo, e.subtipo, false, e.alcance);
  if (alcance === null) {
    throw new Error(`Tipo/subtipo de inspección sin alcance definido: ${e.tipo}/${e.subtipo ?? "—"}`);
  }
  const enAlcance = new Set<string>(alcance);

  const registrado: Record<string, unknown> = { ...e.variablesRegistradas };
  for (const campo of e.camposRegistradosArbol) {
    registrado[campo] = e.arbolRegistrado[campo];
  }
  const vigente: Record<string, unknown> = { ...e.arbolVigente, ...e.variablesVigentes };
  const estaRegistrado = (campo: string) => Object.prototype.hasOwnProperty.call(registrado, campo);
  const valorCompuesto = (campo: string) => (estaRegistrado(campo) ? registrado[campo] : vigente[campo]);
  const efectivo = (campo: string) => {
    // Un «No» vigente en la pregunta principal desactiva la cavidad externa
    // aunque una inspección anterior haya registrado un «Sí» en el detalle.
    if (campo === "cavidad_externa_tronco" && valorCompuesto("presenta_cavidad_pudricion_tronco") === false) return false;
    return valorCompuesto(campo);
  };

  // CC-082 (superposición): los campos de palmeras se exigen desde su versión, y con ella una
  // palmera no responde los campos de la hoja PALMERAS, sección B (REGLAS_GENERALES fila 31).
  const version = e.ruleVersion ?? RULE_VERSION_OPERATIVA;
  const noAplicanPalmera = incluyePalmeras(version) && efectivo("tipo_hoja") === "palmera" ? NO_APLICAN_PALMERA : null;
  const reglas = REGLAS_COMPLETITUD.filter((r) => {
    if (!vigenteEnVersion(r, version) || noAplicanPalmera?.has(r.campo)) return false;
    if (!parcial && completa) return true;
    if (r.hoja === "REGISTRO_EVALUACION") return enAlcance.has(r.campo);
    return parcial && (e.alcance === "arbol" || r.campo === "fotografias_arbol");
  });

  const evidencia = completa ? evaluarFotosD27(e.inspeccionId, e.fotos) : null;
  const faltantes: CampoFaltante[] = [];
  for (const regla of reglas) {
    if (!cumple(regla.activacion, efectivo)) continue;
    const motivo = motivoFaltante(regla, { registrado, estaRegistrado, efectivo, fotosValidas: evidencia?.cantidad ?? 0 });
    if (motivo !== null) {
      faltantes.push({ campo: regla.campo, hoja: regla.hoja, fila: regla.fila, motivo });
    }
  }

  if (completa && (!parcial || e.alcance === "arbol")) {
    const especie = efectivo("especie_cientifica");
    if (tieneValor(especie) && !especieValidaD13(String(especie))) {
      faltantes.push({
        campo: "especie_cientifica",
        hoja: "ARBOLES",
        fila: REGLAS_COMPLETITUD.find((r) => r.campo === "especie_cientifica")!.fila,
        motivo: "Para finalizar no se admite «Género sp.» ni «No determinado» (D-13)",
      });
    }
  }

  return {
    completa: faltantes.length === 0,
    campos_faltantes: faltantes,
    fotos_validas_d27: evidencia?.cantidad ?? null,
    vistas_recomendadas_faltantes: evidencia?.vistasFaltantes ?? [],
  };
}

function evaluarCompletitudInstrumental(e: EntradaCompletitud): ResultadoCompletitud {
  const componentes = [
    {
      principal: "cavidad_pudricion_basal", externa: "cavidad_basal_externa", interna: "cavidad_basal_interna",
      espesor: "t_pared_residual_basal_cm",
      dimensiones: ["D_diametro_basal_tronco_cm", "d_diametro_cavidad_basal_cm",
        "Cc_longitud_abertura_cavidad_cm", "C_circunferencia_basal_cm"],
    },
    {
      principal: "presenta_cavidad_pudricion_tronco", externa: "cavidad_externa_tronco", interna: "cavidad_interna_tronco",
      espesor: "t_pared_residual_tronco_cm",
      dimensiones: ["D_diametro_tronco_cm", "d_diametro_cavidad_tronco_cm",
        "Cc_longitud_abertura_tronco_cm", "C_circunferencia_tronco_cm"],
    },
  ];
  const registrados = e.variablesRegistradas;
  const vigente = { ...e.variablesVigentes, ...registrados };
  const faltantes: CampoFaltante[] = [];
  function falta(campo: string, motivo: string) {
    const regla = REGLAS_COMPLETITUD.find(r => r.hoja === "REGISTRO_EVALUACION" && r.campo === campo)!;
    faltantes.push({ campo, hoja: regla.hoja, fila: regla.fila, motivo });
  }
  const ensayados = componentes.filter(c => typeof registrados[c.principal] === "boolean");
  if (!ensayados.length) {
    falta(componentes[0].principal, "CC-084: registre al menos un componente ensayado (D-39 o D-51).");
  }
  for (const c of ensayados) {
    if (registrados[c.principal] !== true) continue;
    if (registrados[c.interna] !== "si" && registrados[c.interna] !== "no") {
      falta(c.interna, "CC-084: registre Sí o No para la cavidad interna del componente ensayado.");
    }
    if (!tieneValor(registrados[c.espesor])) {
      falta(c.espesor, "CC-084: registre el espesor residual medido en el componente ensayado.");
    }
    if (vigente[c.externa] === true) {
      for (const campo of c.dimensiones) {
        if (!tieneValor(vigente[campo])) falta(campo, "CC-084: falta la dimensión externa registrada o vigente.");
      }
    }
  }
  return { completa: faltantes.length === 0, campos_faltantes: faltantes, fotos_validas_d27: null, vistas_recomendadas_faltantes: [] };
}

function evaluarFotosD27(inspeccionId: string, fotos: readonly FotoD27[]) {
  // Elegir una huella por ruta y luego deduplicar por huella cuando existe.
  // El PK de photos garantiza un solo registro por ID.
  const huellasPorRuta = new Map<string, string | null>();
  const vistas = new Set<string | null>();
  for (const foto of fotos) {
    if (foto.vista === "detalle" || foto.inspection_id !== inspeccionId || !/[^ \t\n\r\f\v]/.test(foto.storage_path)) continue;
    const anterior = huellasPorRuta.get(foto.storage_path);
    const huella = foto.sha256;
    if (anterior === undefined || (huella !== null && (anterior === null || huella < anterior))) {
      huellasPorRuta.set(foto.storage_path, huella);
    }
    vistas.add(foto.vista);
  }
  const archivos = new Set<string>();
  for (const [ruta, huella] of huellasPorRuta) {
    archivos.add(huella === null ? `ruta:${ruta}` : `huella:${huella}`);
  }
  return { cantidad: archivos.size, vistasFaltantes: VISTAS_D27.filter((vista) => !vistas.has(vista)) };
}

function motivoFaltante(
  regla: ReglaCompletitud,
  ctx: {
    registrado: Record<string, unknown>;
    estaRegistrado: (campo: string) => boolean;
    efectivo: (campo: string) => unknown;
    fotosValidas: number;
  }
): string | null {
  const referencia = `D-${regla.fila}, ${regla.obligatoriedadExcel}`;

  if (regla.exigencia === "fotos_d27") {
    return ctx.fotosValidas >= 2 ? null : `Se requieren al menos dos fotos válidas y distintas de esta inspección (${referencia})`;
  }

  if (regla.origen === "vigente_o_registrado") {
    return tieneValor(ctx.efectivo(regla.campo)) ? null : `Sin valor (${referencia})`;
  }

  if (tieneValor(ctx.registrado[regla.campo])) return null;
  if (regla.exigencia === "valor_o_marca" && regla.marca && ctx.registrado[regla.marca] === true) return null;

  const base =
    regla.exigencia === "valor_o_marca"
      ? `Responder con un valor o con ${regla.marca} = Sí`
      : !ctx.estaRegistrado(regla.campo) && tieneValor(ctx.efectivo(regla.campo))
        ? "Debe registrarse en esta inspección (el valor vigente no basta)"
        : "Sin valor";
  return `${base} (${referencia})`;
}

/** Evalúa una condición de activación (CC-056). Un dato que falta nunca activa una comparación. */
export function cumple(c: CondicionActivacion, valor: (campo: string) => unknown): boolean {
  switch (c.op) {
    case "siempre":
      return true;
    case "igual": {
      const v = valor(c.campo);
      return Array.isArray(v) ? v.includes(c.valor) : v === c.valor;
    }
    case "no_verdadero":
      return valor(c.campo) !== true;
    case "distinto":
      return valor(c.campo) !== c.valor;
    case "mayor_o_igual": {
      const v = valor(c.campo);
      return typeof v === "number" && v >= c.valor;
    }
    case "mayor_que": {
      const v = valor(c.campo);
      return typeof v === "number" && v > c.valor;
    }
    case "menor_que": {
      const v = valor(c.campo);
      return typeof v === "number" && v < c.valor;
    }
    case "mas_de_un_valor": {
      const v = valor(c.campo);
      return Array.isArray(v) && v.length > 1;
    }
    case "y":
      return c.condiciones.every((x) => cumple(x, valor));
    case "o":
      return c.condiciones.some((x) => cumple(x, valor));
  }
}

function tieneValor(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/**
 * D-13: sin identificación solo a nivel de género («Género sp.», y
 * también «Género spp.», decisión de la responsable del 2026-10-26,
 * CC-056 r) ni «No determinado». Se compara sin los espacios del
 * principio y del final. `chk_species_especie_cientifica_valida` todavía
 * no reconoce «spp.» (migración aparte, pendiente).
 */
export function especieValidaD13(especie: string): boolean {
  const nombre = especie.trim();
  return !/\sspp?\.?$/i.test(nombre) && nombre.toLowerCase() !== "no determinado";
}
