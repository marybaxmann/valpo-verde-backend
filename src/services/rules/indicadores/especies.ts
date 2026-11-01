/**
 * B19 bloque 2 — indicadores de especies (hoja INDICES, filas 5 a 10;
 * CC-016). Funciones puras sobre los árboles presentes del ámbito.
 *
 * Identificación a nivel de especie (Valej, 2026-11-01): cuenta un taxón
 * determinado a nivel específico, incluidos híbridos y variedades; no
 * cuenta una identificación solo de género («Quercus sp.»). Agrupación
 * (INDICES: «unificar … variantes de escritura»): sin distinguir
 * mayúsculas ni espacios repetidos, con «x» de híbrido igual a «×»; las
 * categorías bajo especie (var., subsp., f., cultivar) se agrupan en su
 * especie, porque los indicadores cuentan especies.
 */

export interface ArbolEspecie {
  id: string;
  /** Nombre del catálogo si el árbol está vinculado (species_id, CC-053); si no, D-13. */
  especie_cientifica: string | null;
  /** CATALOGO_ESPECIES (v_species_traits; CC-053). null = sin dato en el catálogo. */
  genero: string | null;
  familia: string | null;
  /** nativa | endemica | introducida | no_determinado (D-260). */
  origen_biogeografico: string;
}

const NO_ESPECIFICO = new Set(["sp", "sp.", "spp", "spp.", "cf", "cf.", "aff", "aff.", "indet", "indet.", "sp.nov", "sp.nov."]);
const HIBRIDO = new Set(["x", "×"]);
const EPITETO = /^[a-zà-ÿ][a-zà-ÿ-]*$/;

/**
 * Clave de especie (`género [×] epíteto`, en minúsculas) o null si el
 * nombre no está determinado a nivel específico.
 */
export function claveEspecie(nombre: string | null): string | null {
  if (!nombre) return null;
  const t = nombre.trim().replace(/\s+/g, " ").toLowerCase().split(" ").filter(Boolean);
  let i = 0;
  let notogenero = "";
  if (HIBRIDO.has(t[0])) {
    notogenero = "× ";
    i = 1;
  } else if (t[0]?.startsWith("×") && t[0].length > 1) {
    t[0] = t[0].slice(1);
    notogenero = "× ";
  }
  const genero = t[i];
  if (!genero || !/^[a-zà-ÿ-]+$/.test(genero)) return null;
  let j = i + 1;
  let hibrido = "";
  if (HIBRIDO.has(t[j])) {
    hibrido = "× ";
    j++;
  } else if (t[j]?.startsWith("×") && t[j].length > 1) {
    t[j] = t[j].slice(1);
    hibrido = "× ";
  }
  const epiteto = t[j];
  if (!epiteto || NO_ESPECIFICO.has(epiteto) || !EPITETO.test(epiteto)) return null;
  return `${notogenero}${genero} ${hibrido}${epiteto}`;
}

/** Nombre para mostrar de la clave: género con mayúscula inicial. */
function nombreDeClave(clave: string): string {
  return clave.replace(/^(× )?([a-zà-ÿ])/, (_m, x: string | undefined, l: string) => `${x ?? ""}${l.toUpperCase()}`);
}

const porcentaje = (n: number, total: number): number | null => (total > 0 ? (n / total) * 100 : null);

interface Agrupado {
  presentes: number;
  identificados: number;
  noIdentificados: number;
  porEspecie: Map<string, number>;
}

function agrupar(arboles: ArbolEspecie[]): Agrupado {
  const porEspecie = new Map<string, number>();
  let identificados = 0;
  for (const a of arboles) {
    const k = claveEspecie(a.especie_cientifica);
    if (k === null) continue;
    identificados++;
    porEspecie.set(k, (porEspecie.get(k) ?? 0) + 1);
  }
  return { presentes: arboles.length, identificados, noIdentificados: arboles.length - identificados, porEspecie };
}

/** Cobertura taxonómica común a los indicadores de especies. */
export function coberturaTaxonomica(arboles: ArbolEspecie[]) {
  const g = agrupar(arboles);
  return {
    presentes: g.presentes,
    identificados_especie: g.identificados,
    no_identificados_especie: g.noIdentificados,
    porcentaje_identificados: porcentaje(g.identificados, g.presentes),
    con_genero_catalogo: arboles.filter((a) => a.genero).length,
    con_familia_catalogo: arboles.filter((a) => a.familia).length,
    con_origen_catalogo: arboles.filter((a) => a.origen_biogeografico !== "no_determinado").length,
    // Provisional o confirmada (por ejemplar): sin dato hasta la migración propuesta; nunca 0.
    identificaciones_provisionales: null,
    identificaciones_confirmadas: null,
    motivo_provisionales: "La base todavía no registra si la identificación es provisional o confirmada (migración pendiente de autorización).",
  };
}

/** Fila 5: S = especies distintas entre los presentes identificados a nivel de especie. */
export function riquezaEspecies(arboles: ArbolEspecie[]) {
  const g = agrupar(arboles);
  return { valor: g.porEspecie.size, unidad: "especies" as const, n_identificados: g.identificados, n_no_identificados: g.noIdentificados };
}

/**
 * Fila 6: AR_i = N_i / N × 100, con N = todos los presentes. Los no
 * identificados a nivel de especie van aparte, así todo suma 100 %.
 */
export function abundanciaRelativa(arboles: ArbolEspecie[]) {
  const g = agrupar(arboles);
  const especies = [...g.porEspecie.entries()]
    .map(([clave, n]) => ({ especie: nombreDeClave(clave), arboles: n, porcentaje: porcentaje(n, g.presentes) }))
    .sort((a, b) => b.arboles - a.arboles || a.especie.localeCompare(b.especie));
  return {
    denominador: g.presentes,
    especies,
    no_identificados: { arboles: g.noIdentificados, porcentaje: porcentaje(g.noIdentificados, g.presentes) },
  };
}

/** Fila 7: H′ = −Σ p_i ln p_i, p_i = N_i / N_identificados. Sin identificados: null. */
export function diversidadShannon(arboles: ArbolEspecie[]) {
  const g = agrupar(arboles);
  let h = 0;
  for (const n of g.porEspecie.values()) {
    const p = n / g.identificados;
    h -= p * Math.log(p);
  }
  return {
    valor: g.identificados > 0 ? h : null,
    riqueza: g.porEspecie.size,
    n_identificados: g.identificados,
    cobertura_identificacion: porcentaje(g.identificados, g.presentes),
  };
}

/**
 * Fila 8: % de presentes por especie, género y familia, contra ≤10 %,
 * ≤20 % y ≤30 % (Santamour 1990). Género y familia, del catálogo
 * (CATALOGO_ESPECIES); los presentes sin el dato se informan aparte.
 */
export function diversidadTaxonomica102030(arboles: ArbolEspecie[]) {
  const total = arboles.length;
  const nivel = (claves: Array<string | null>, umbral: number, mostrar: (k: string) => string) => {
    const conteo = new Map<string, number>();
    let sinDato = 0;
    for (const k of claves) {
      if (k === null) sinDato++;
      else conteo.set(k, (conteo.get(k) ?? 0) + 1);
    }
    const taxones = [...conteo.entries()]
      .map(([k, n]) => {
        const pct = porcentaje(n, total);
        return { taxon: mostrar(k), arboles: n, porcentaje: pct, supera_umbral: pct !== null && pct > umbral };
      })
      .sort((a, b) => b.arboles - a.arboles || a.taxon.localeCompare(b.taxon));
    return {
      umbral_porcentaje: umbral,
      taxones,
      sin_dato: { arboles: sinDato, porcentaje: porcentaje(sinDato, total) },
      cumple: taxones.length === 0 ? null : taxones.every((t) => !t.supera_umbral),
    };
  };
  const norm = (s: string | null) => (s && s.trim() ? s.trim().replace(/\s+/g, " ") : null);
  return {
    denominador: total,
    especie: nivel(arboles.map((a) => claveEspecie(a.especie_cientifica)), 10, nombreDeClave),
    genero: nivel(arboles.map((a) => norm(a.genero)), 20, (k) => k),
    familia: nivel(arboles.map((a) => norm(a.familia)), 30, (k) => k),
  };
}

/**
 * Filas 9 y 10: PN = (nativas + endémicas) / N × 100; PI = introducidas /
 * N × 100, con N = todos los presentes. Origen del catálogo (D-260); los
 * presentes con origen no determinado se informan aparte. Si ningún
 * presente tiene origen en el catálogo, los porcentajes son null: un dato
 * faltante no equivale a 0 % (Valej, 2026-11-01).
 */
export function proporcionOrigen(arboles: ArbolEspecie[]) {
  const total = arboles.length;
  const nativos = arboles.filter((a) => a.origen_biogeografico === "nativa" || a.origen_biogeografico === "endemica").length;
  const introducidos = arboles.filter((a) => a.origen_biogeografico === "introducida").length;
  const noDeterminado = total - nativos - introducidos;
  const conOrigen = nativos + introducidos > 0;
  return {
    denominador: total,
    nativos: { arboles: nativos, porcentaje: conOrigen ? porcentaje(nativos, total) : null },
    introducidos: { arboles: introducidos, porcentaje: conOrigen ? porcentaje(introducidos, total) : null },
    origen_no_determinado: { arboles: noDeterminado, porcentaje: porcentaje(noDeterminado, total) },
  };
}
