/**
 * Variables "Calculado por plataforma... No admite ingreso manual"
 * (DICCIONARIO_CAMPOS): SL_basal_pct (D-56), R_radio_basal_cm (D-58),
 * t_R_basal (D-59); SL_tronco_pct (D-68), R_radio_tronco_cm (D-70),
 * t_R_tronco (D-71). R01 y R02 reciben las mediciones crudas (D, d, Cc,
 * C, t) y llaman a estas funciones — nunca reciben el resultado ya
 * calculado ni lo aceptan como entrada.
 *
 * "No calculable" — falta una medición, viola una condición del Excel
 * (D > 0, d > 0, Cc > 0, C > 0, d ≤ D, Cc < C; t > 0), o el resultado
 * sale fuera de rango, NaN o Infinity — nunca se trata como 0 ni se
 * redondea a un límite. Queda en `{ valor: null, motivo }`; quien llama
 * (R01/R02) decide el motivo de no_determinado (RC-CAV-05/08,
 * TR-CAV-05/08).
 *
 * Nota matemática: dadas las condiciones exigidas (d ≤ D, 0 < Cc < C),
 * SL% queda siempre en [0, 100] y t/R siempre en (0, ∞) — las guardas
 * de rango sobre el resultado son defensa en profundidad, no alcanzan
 * a ejercitarse con entradas que ya pasaron esas condiciones. NaN e
 * Infinity sí son alcanzables (una medición corrupta) y se detectan
 * antes de calcular, no después.
 */

export interface ResultadoCalculo {
  valor: number | null; // null = no calculable
  motivo?: string; // presente solo si valor = null
}

function campoFaltanteOInvalido(valor: number | null, nombre: string): string | null {
  if (valor === null) return `${nombre} sin valor`;
  if (!Number.isFinite(valor)) return `${nombre} no es un número finito (${valor})`;
  return null;
}

/**
 * SL% = [(d³ + (Cc/C) × (D³ − d³)) / D³] × 100 (D-56, D-68).
 * D = diámetro de la sección; d = diámetro de la cavidad; Cc = longitud
 * de la abertura; C = circunferencia de la sección.
 */
function calcularSeveridadLongitud(m: {
  D: number | null;
  d: number | null;
  Cc: number | null;
  C: number | null;
}): ResultadoCalculo {
  const campos: Array<[string, number | null]> = [
    ["D", m.D],
    ["d", m.d],
    ["Cc", m.Cc],
    ["C", m.C],
  ];
  for (const [nombre, valor] of campos) {
    const error = campoFaltanteOInvalido(valor, nombre);
    if (error) return { valor: null, motivo: error };
  }
  const D = m.D as number;
  const d = m.d as number;
  const Cc = m.Cc as number;
  const C = m.C as number;
  if (D <= 0) return { valor: null, motivo: "D debe ser > 0" };
  if (d <= 0) return { valor: null, motivo: "d debe ser > 0" };
  if (Cc <= 0) return { valor: null, motivo: "Cc debe ser > 0" };
  if (C <= 0) return { valor: null, motivo: "C debe ser > 0" };
  if (d > D) return { valor: null, motivo: "d debe ser ≤ D (D-56)" };
  if (Cc >= C) return { valor: null, motivo: "Cc debe ser < C (D-56)" };

  const valor = ((d ** 3 + (Cc / C) * (D ** 3 - d ** 3)) / D ** 3) * 100;
  if (!Number.isFinite(valor)) return { valor: null, motivo: `resultado no finito (${valor})` };
  if (valor < 0 || valor > 100) return { valor: null, motivo: `resultado fuera de rango 0–100 % (${valor})` };
  return { valor };
}

/** R = D / 2 (D-58, D-70). */
function calcularRadio(D: number | null): ResultadoCalculo {
  const error = campoFaltanteOInvalido(D, "D");
  if (error) return { valor: null, motivo: error };
  const Dv = D as number;
  if (Dv <= 0) return { valor: null, motivo: "D debe ser > 0" };
  const valor = Dv / 2;
  if (!Number.isFinite(valor) || valor <= 0) return { valor: null, motivo: `resultado inválido (${valor})` };
  return { valor };
}

/** t/R = t / R (D-59, D-71). */
function calcularEspesorSobreRadio(t: number | null, R: ResultadoCalculo): ResultadoCalculo {
  if (R.valor === null) return { valor: null, motivo: `R no calculable: ${R.motivo}` };
  const error = campoFaltanteOInvalido(t, "t");
  if (error) return { valor: null, motivo: error };
  const tv = t as number;
  if (tv <= 0) return { valor: null, motivo: "t debe ser > 0" };
  const valor = tv / R.valor;
  if (!Number.isFinite(valor) || valor < 0) return { valor: null, motivo: `resultado fuera de rango (≥ 0) (${valor})` };
  return { valor };
}

// ---------------------------------------------------------------------
// Nombres exactos del Excel — raíces y cuello (sección basal)
// ---------------------------------------------------------------------

export function calcularSLBasalPct(m: {
  D_diametro_basal_tronco_cm: number | null;
  d_diametro_cavidad_basal_cm: number | null;
  Cc_longitud_abertura_cavidad_cm: number | null;
  C_circunferencia_basal_cm: number | null;
}): ResultadoCalculo {
  return calcularSeveridadLongitud({
    D: m.D_diametro_basal_tronco_cm,
    d: m.d_diametro_cavidad_basal_cm,
    Cc: m.Cc_longitud_abertura_cavidad_cm,
    C: m.C_circunferencia_basal_cm,
  });
}

export function calcularRRadioBasalCm(D_diametro_basal_tronco_cm: number | null): ResultadoCalculo {
  return calcularRadio(D_diametro_basal_tronco_cm);
}

export function calcularTRBasal(
  t_pared_residual_basal_cm: number | null,
  D_diametro_basal_tronco_cm: number | null,
): ResultadoCalculo {
  return calcularEspesorSobreRadio(t_pared_residual_basal_cm, calcularRadio(D_diametro_basal_tronco_cm));
}

// ---------------------------------------------------------------------
// Nombres exactos del Excel — tronco
// ---------------------------------------------------------------------

export function calcularSLTroncoPct(m: {
  D_diametro_tronco_cm: number | null;
  d_diametro_cavidad_tronco_cm: number | null;
  Cc_longitud_abertura_tronco_cm: number | null;
  C_circunferencia_tronco_cm: number | null;
}): ResultadoCalculo {
  return calcularSeveridadLongitud({
    D: m.D_diametro_tronco_cm,
    d: m.d_diametro_cavidad_tronco_cm,
    Cc: m.Cc_longitud_abertura_tronco_cm,
    C: m.C_circunferencia_tronco_cm,
  });
}

export function calcularRRadioTroncoCm(D_diametro_tronco_cm: number | null): ResultadoCalculo {
  return calcularRadio(D_diametro_tronco_cm);
}

export function calcularTRTronco(
  t_pared_residual_tronco_cm: number | null,
  D_diametro_tronco_cm: number | null,
): ResultadoCalculo {
  return calcularEspesorSobreRadio(t_pared_residual_tronco_cm, calcularRadio(D_diametro_tronco_cm));
}
