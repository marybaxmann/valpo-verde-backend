/**
 * PROPUESTA EXPERIMENTAL (Valej, 2026-11-23) — no es metodología vigente.
 *
 * Proyección del DAP de un árbol con el crecimiento de i-Tree Eco (Nowak
 * 2024, pp. 44-45): tasa estandarizada de la categoría × factor por
 * exposición lumínica de copa (CLE) × (1 − muerte regresiva). Son las mismas
 * tasas y factores que usa el secuestro anual (CRECIMIENTO_ITREE). Se
 * muestran las tres categorías como escenarios: ninguna especie del Piloto
 * tiene una categoría aprobada.
 */
import { CRECIMIENTO_ITREE, categoriaItreeReferencia, factorCle } from "../carbono/secuestro";

export const HORIZONTES_ANIOS = [1, 5, 10, 20] as const;

export const SUPUESTOS_PROYECCION = [
  "Crecimiento constante en el tiempo, con la misma exposición de copa y la misma muerte regresiva de hoy.",
  "Sin la reducción de crecimiento cerca del diámetro máximo de la especie ni la mortalidad (Nowak 2024, p. 45).",
  "Sin el ajuste por días libres de heladas (decisión B, 2026-11-20).",
] as const;

export type MotivoSinProyeccion = "falta_dap" | "falta_cle" | "falta_muerte_regresiva";

export const MOTIVO_SIN_PROYECCION: Record<MotivoSinProyeccion, string> = {
  falta_dap: "Falta el DAP vigente.",
  falta_cle: "Falta la exposición lumínica de copa (CLE, 0 a 5).",
  falta_muerte_regresiva: "Falta la muerte regresiva de copa.",
};

export function proyeccionCrecimiento(a: { especie_cientifica: string | null; dap_cm: number | null; cle: number | null; muerte_regresiva_pct: number | null }) {
  const base = { estado_metodologico: "propuesta experimental: escenarios, no una predicción", fuente: CRECIMIENTO_ITREE.fuente, supuestos: [...SUPUESTOS_PROYECCION] };
  const sin = (motivo: MotivoSinProyeccion) => ({ ...base, valor: null, motivo, detalle_motivo: MOTIVO_SIN_PROYECCION[motivo] });
  if (a.dap_cm === null || !(a.dap_cm > 0)) return sin("falta_dap");
  const fCle = a.cle === null ? null : factorCle(a.cle);
  if (fCle === null) return sin("falta_cle");
  if (a.muerte_regresiva_pct === null || a.muerte_regresiva_pct < 0 || a.muerte_regresiva_pct > 100) return sin("falta_muerte_regresiva");
  const fCondicion = 1 - a.muerte_regresiva_pct / 100;
  const referencia = categoriaItreeReferencia(a.especie_cientifica);
  const dap = a.dap_cm;
  return {
    ...base,
    motivo: null,
    detalle_motivo: null,
    valor: {
      dap_actual_cm: dap,
      factores: { factor_cle: fCle, factor_condicion: fCondicion },
      /** Categoría de i-Tree de referencia para la especie (no aprobada), si existe. */
      categoria_referencia: referencia?.categoria ?? null,
      escenarios: CRECIMIENTO_ITREE.categorias.map((c) => {
        const incremento = c.tasa_cm_anio * fCle * fCondicion;
        return {
          categoria: c.codigo,
          etiqueta: c.etiqueta,
          incremento_cm_anio: incremento,
          dap_cm: HORIZONTES_ANIOS.map((anios) => ({ anios, dap_cm: dap + incremento * anios })),
        };
      }),
    },
  };
}
