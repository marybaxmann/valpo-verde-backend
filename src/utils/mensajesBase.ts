/**
 * Mensajes claros para errores de la base que llegan al usuario (plan de
 * la presentación, B-4). Solo se reescriben los casos conocidos; el resto
 * conserva el mensaje de la base.
 */

/**
 * Alta rechazada por la ubicación (SV046; CC-046). El trigger que asigna
 * `tree_code` corre antes del que revisa el sector, así que el mensaje de
 * la base nombra un código («El árbol A-000123 queda fuera…») de un árbol
 * que no se creó. Aquí no se nombra ningún código.
 */
export function mensajeAltaFueraDeSector(mensajeBase: string): string {
  if (/queda fuera de la delimitaci[oó]n del sector/i.test(mensajeBase)) {
    return "El árbol no se registró: la ubicación indicada queda fuera del sector del proyecto. Revise las coordenadas UTM (este y norte).";
  }
  if (/No se encontr[oó] el sector/i.test(mensajeBase)) {
    return "El árbol no se registró: no se encontró el sector del proyecto.";
  }
  return mensajeBase;
}

/**
 * Violaciones de CHECK conocidas (23514), en palabras simples. D-13 y
 * D-257: no se admiten «Género sp.» ni «No determinado»; la 022
 * (CC-056 decisión r) rechaza también «Género spp.».
 */
const MENSAJES_CHECK: Array<[string, string]> = [
  [
    "chk_species_especie_cientifica_valida",
    "La especie científica debe ser el nombre completo de una especie: no se aceptan «Género sp.», «Género spp.» ni «No determinado».",
  ],
  [
    "chk_trees_especie_o_comun",
    "Indique la especie científica o el nombre común del árbol.",
  ],
];

export function mensajeCheck(mensajeBase: string): string {
  for (const [restriccion, mensaje] of MENSAJES_CHECK) {
    if (mensajeBase.includes(restriccion)) return mensaje;
  }
  return mensajeBase;
}
