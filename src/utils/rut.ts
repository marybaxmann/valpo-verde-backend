/**
 * RUT chileno (D-179): «Validar estructura y dígito verificador».
 * Acepta «12.345.678-9», «12345678-9» o con «k» minúscula; devuelve la
 * forma que guarda la base (`incident_reporters.rut_reportante`, CHECK
 * `^[0-9]{1,8}-[0-9kK]$`): sin puntos y con «K» mayúscula. `null` si la
 * estructura o el dígito verificador no corresponden.
 */
export function normalizarRut(valor: string): string | null {
  const limpio = valor.trim().replace(/\./g, "").toUpperCase();
  const m = /^(\d{1,8})-([\dK])$/.exec(limpio);
  if (!m) return null;
  const [, cuerpo, dv] = m;
  return digitoVerificador(cuerpo) === dv ? `${cuerpo}-${dv}` : null;
}

/** Módulo 11 con la serie 2, 3, 4, 5, 6, 7. */
function digitoVerificador(cuerpo: string): string {
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  return resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
}
