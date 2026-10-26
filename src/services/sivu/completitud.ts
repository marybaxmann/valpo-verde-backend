import { camposPermitidosPorTipo } from "../../schemas/sivu/alcanceInspeccion";
import {
  CondicionActivacion,
  REGLAS_COMPLETITUD,
  ReglaCompletitud,
} from "../../schemas/sivu/completitudInspeccion";

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
  /** `photos.vista` de las fotos de esta inspección. */
  vistasFotos: readonly (string | null)[];
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
}

const TIPOS_EVALUACION_COMPLETA = new Set(["evaluacion_inicial", "reevaluacion", "levantamiento"]);

/** D-27: las cuatro vistas obligatorias. */
export const VISTAS_D27 = ["arbol_completo", "base", "tronco", "copa"] as const;

export function evaluarCompletitud(e: EntradaCompletitud): ResultadoCompletitud {
  const completa = TIPOS_EVALUACION_COMPLETA.has(e.tipo);
  const alcance = camposPermitidosPorTipo(e.tipo, e.subtipo);
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
  const efectivo = (campo: string) => (estaRegistrado(campo) ? registrado[campo] : vigente[campo]);

  const reglas = REGLAS_COMPLETITUD.filter((r) =>
    completa ? true : r.hoja === "REGISTRO_EVALUACION" && enAlcance.has(r.campo)
  );

  const faltantes: CampoFaltante[] = [];
  for (const regla of reglas) {
    if (!cumple(regla.activacion, efectivo)) continue;
    const motivo = motivoFaltante(regla, { registrado, estaRegistrado, efectivo, vistasFotos: e.vistasFotos });
    if (motivo !== null) {
      faltantes.push({ campo: regla.campo, hoja: regla.hoja, fila: regla.fila, motivo });
    }
  }

  if (completa) {
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

  return { completa: faltantes.length === 0, campos_faltantes: faltantes };
}

function motivoFaltante(
  regla: ReglaCompletitud,
  ctx: {
    registrado: Record<string, unknown>;
    estaRegistrado: (campo: string) => boolean;
    efectivo: (campo: string) => unknown;
    vistasFotos: readonly (string | null)[];
  }
): string | null {
  const referencia = `D-${regla.fila}, ${regla.obligatoriedadExcel}`;

  if (regla.exigencia === "fotos_d27") {
    const presentes = new Set(ctx.vistasFotos);
    const faltan = VISTAS_D27.filter((v) => !presentes.has(v));
    return faltan.length === 0 ? null : `Faltan fotos nuevas de esta inspección con las vistas: ${faltan.join(", ")} (${referencia})`;
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

/** Mismo criterio que `chk_species_especie_cientifica_valida` (D-13). */
function especieValidaD13(especie: string): boolean {
  return !/\ssp\.?$/i.test(especie) && especie.trim().toLowerCase() !== "no determinado";
}
