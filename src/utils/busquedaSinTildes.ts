/**
 * Búsqueda que no distingue tildes (plan de la presentación, B-5):
 * «platano» encuentra «plátano» y al revés, sin migración (`unaccent`).
 *
 * El término se pasa a minúsculas sin tildes y cada vocal (y la n, la c)
 * se convierte en una clase que acepta sus variantes; el resultado se usa
 * con el operador `imatch` de PostgREST (`~*` de Postgres, que tampoco
 * distingue mayúsculas, también con tilde: verificado en la base de
 * pruebas). Cualquier carácter que no sea letra, dígito o espacio pasa a
 * «.» (cualquier carácter): así el patrón nunca lleva metacaracteres ni
 * los caracteres reservados del filtro `or` de PostgREST (`,`, `(`, `)`).
 */
const VARIANTES: Record<string, string> = {
  a: "[aáàäâ]",
  e: "[eéèëê]",
  i: "[iíìïî]",
  o: "[oóòöô]",
  u: "[uúùüû]",
  n: "[nñ]",
  c: "[cç]",
};

export function quitarTildes(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function patronSinTildes(termino: string): string {
  let patron = "";
  for (const ch of quitarTildes(termino.trim().toLowerCase())) {
    if (VARIANTES[ch]) patron += VARIANTES[ch];
    else if (/[a-z0-9 ]/.test(ch)) patron += ch;
    else patron += ".";
  }
  return patron;
}
