import { randomUUID } from "crypto";
import { AuthenticatedUser } from "../../types/auth";
import { AppError } from "../../utils/AppError";
import { mensajeCheck } from "../../utils/mensajesBase";
import { assertProjectAccess, assertProjectRole } from "../authorization.service";
import { etiquetaDe } from "../rules/engine/catalogs";
import { procesarFotoPublica } from "./photo.service";
import { fichaPublica } from "./conecta.service";
import { obtenerEspeciePorId } from "../../repositories/sivu/species.repository";
import {
  ContenidoEspecieRow,
  FichaArbolRow,
  borrarFotosPublicas,
  fijarFotoArbol,
  fijarFotoEspecie,
  guardarContenidoEspecie,
  guardarFichaArbol,
  obtenerArbolParaFicha,
  obtenerContenidoEspecie,
  obtenerFichaArbol,
  subirFotoPublica,
  urlPublica,
} from "../../repositories/sivu/fichaPublica.repository";
import { ContenidoEspecieBody, FichaPublicaArbolBody } from "../../schemas/sivu/fichaPublica.schema";

/**
 * Ficha pública editable (CC-073; PR-022 v3.0, PR-004 v8.0). Editan el
 * Usuario municipal (miembro del proyecto) y el Administrador; publica al
 * guardar, sin borrador ni aprobación (P3). Las funciones de la 037
 * vuelven a verificar rol, cuenta activa y membresía.
 */

const EDITORES = ["admin", "usuario_municipal"] as const;

/** Etiqueta de un código; si no está en el catálogo, el propio código (nunca 500 por un dato). */
function etiquetaSegura(catalogo: string, codigo: string): string {
  try {
    return etiquetaDe(catalogo, codigo);
  } catch {
    return codigo;
  }
}

/** SV080/SV081, 42501, CHECK y proyecto cerrado → respuesta HTTP. */
export function traducirErrorFicha(err: unknown): Error {
  if (err instanceof AppError) return err;
  const error = err as Error;
  const codigo = (error as { cause?: unknown }).cause;
  if (/está cerrado/.test(error.message)) {
    return new AppError("El proyecto está cerrado: solo consulta", 409);
  }
  if (codigo === "42501") return new AppError("No está autorizado a ejecutar esta acción", 403);
  if (codigo === "SV080" || codigo === "SV081") {
    if (/Solo el Usuario municipal|no está activo|no es miembro/.test(error.message)) return new AppError(error.message, 403);
    if (/no existe/.test(error.message)) return new AppError(error.message, 404);
    return new AppError(error.message, 400);
  }
  if (codigo === "23514") return new AppError(mensajeCheck(error.message), 400);
  return error;
}

// --- Contenido de la especie ---------------------------------------------

function presentarContenido(c: ContenidoEspecieRow | null) {
  if (!c) return null;
  return {
    nombre_comun_visualizacion: c.nombre_comun_visualizacion,
    articulo_nombre: c.articulo_nombre,
    curiosidad: c.curiosidad,
    aportes: c.aportes,
    quien_soy: c.quien_soy,
    rasgos: c.rasgos.map((r) => ({
      id: r.id,
      etiqueta: r.etiqueta,
      texto: r.texto,
      foto: r.foto_path ? { url: urlPublica(r.foto_path), credito: r.credito ?? null } : null,
    })),
    anio_estacional: c.anio_estacional,
    ciclo: c.ciclo,
    historia_especie: c.historia_especie,
    consejo: c.consejo,
    fuentes: c.fuentes,
    foto_referencial: c.foto_referencial_path
      ? { url: urlPublica(c.foto_referencial_path), credito: c.credito_foto_referencial, temporal: c.foto_referencial_temporal }
      : null,
    updated_by: c.updated_by,
    updated_at: c.updated_at,
  };
}

async function exigirEspecie(speciesId: string): Promise<void> {
  if (!(await obtenerEspeciePorId(speciesId))) throw new AppError("La especie no existe", 404);
}

/** GET …/species/:speciesId/contenido-publico — cualquier miembro (solo lectura). */
export async function verContenidoEspecie(user: AuthenticatedUser, projectId: string, speciesId: string, accessToken: string) {
  await assertProjectAccess(user, projectId, accessToken);
  await exigirEspecie(speciesId);
  return presentarContenido(await obtenerContenidoEspecie(accessToken, speciesId));
}

/** PUT …/species/:speciesId/contenido-publico — reemplazo completo; publica al guardar. */
export async function editarContenidoEspecie(
  user: AuthenticatedUser,
  projectId: string,
  speciesId: string,
  body: ContenidoEspecieBody,
  accessToken: string
) {
  await assertProjectRole(user, projectId, EDITORES, accessToken);
  await exigirEspecie(speciesId);
  let rutas: string[];
  try {
    rutas = (await guardarContenidoEspecie(speciesId, user.id, body)).rutas_a_borrar;
  } catch (err) {
    throw traducirErrorFicha(err);
  }
  // Fotos de rasgos eliminados: el cambio ya está confirmado en la base.
  await borrarFotosPublicas(rutas);
  return presentarContenido(await obtenerContenidoEspecie(accessToken, speciesId));
}

/**
 * PUT …/contenido-publico/fotos/:ranura — foto referencial (D-291) o de un
 * rasgo (D-285). Orden seguro: subir → función → si falla, borrar lo
 * subido; si funciona, borrar el archivo anterior.
 */
export async function fijarFotoContenidoEspecie(
  user: AuthenticatedUser,
  projectId: string,
  speciesId: string,
  ranura: string,
  datos: { credito: string | null; temporal: boolean },
  archivo: Buffer | undefined,
  accessToken: string
) {
  await assertProjectRole(user, projectId, EDITORES, accessToken);
  if (!archivo) throw new AppError("Debe adjuntar la fotografía en el campo «foto»", 400);
  if (datos.temporal && ranura !== "referencial") {
    throw new AppError("Solo la foto referencial de la especie puede ser temporal (D-293)", 400);
  }
  if (!datos.temporal && !datos.credito) {
    throw new AppError("La fotografía requiere su crédito: autor y licencia (D-292)", 400);
  }
  await exigirEspecie(speciesId);
  const webp = await procesarFotoPublica(archivo);
  const ruta = `especies/${randomUUID()}.webp`;
  await subirFotoPublica(ruta, webp);
  let anterior: string | null;
  try {
    anterior = (await fijarFotoEspecie({ speciesId, usuario: user.id, ranura, path: ruta, credito: datos.credito, temporal: datos.temporal })).ruta_anterior;
  } catch (err) {
    await borrarFotosPublicas([ruta]);
    throw traducirErrorFicha(err);
  }
  await borrarFotosPublicas([anterior]);
  return presentarContenido(await obtenerContenidoEspecie(accessToken, speciesId));
}

/** DELETE …/contenido-publico/fotos/:ranura — quita la foto y borra el archivo. */
export async function quitarFotoContenidoEspecie(user: AuthenticatedUser, projectId: string, speciesId: string, ranura: string, accessToken: string) {
  await assertProjectRole(user, projectId, EDITORES, accessToken);
  await exigirEspecie(speciesId);
  let anterior: string | null;
  try {
    anterior = (await fijarFotoEspecie({ speciesId, usuario: user.id, ranura, path: null, credito: null, temporal: false })).ruta_anterior;
  } catch (err) {
    throw traducirErrorFicha(err);
  }
  await borrarFotosPublicas([anterior]);
}

// --- Ficha del árbol --------------------------------------------------------

function presentarFichaArbol(f: FichaArbolRow | null) {
  return {
    mostrar_clase_edad: f?.mostrar_clase_edad ?? false,
    mostrar_altura_total: f?.mostrar_altura_total ?? false,
    mostrar_dap: f?.mostrar_dap ?? false,
    mostrar_diametro_copa: f?.mostrar_diametro_copa ?? false,
    mostrar_rango_edad: f?.mostrar_rango_edad ?? false,
    historia: f?.historia ?? null,
    historia_fuente: f?.historia_fuente ?? null,
    textos_personalizados: f?.textos_personalizados ?? {},
    foto: f?.foto_path ? { url: urlPublica(f.foto_path) } : null,
    updated_by: f?.updated_by ?? null,
    updated_at: f?.updated_at ?? null,
  };
}

async function exigirArbol(accessToken: string, projectId: string, treeId: string) {
  const arbol = await obtenerArbolParaFicha(accessToken, projectId, treeId);
  if (!arbol) throw new AppError("El árbol no existe en este proyecto", 404);
  return arbol;
}

/**
 * GET …/trees/:treeId/ficha-publica — lo propio del árbol, los valores
 * vigentes de las 5 medidas (para que el formulario muestre qué se
 * publicaría con cada interruptor) y la vista previa de la ficha.
 */
export async function verFichaArbol(user: AuthenticatedUser, projectId: string, treeId: string, accessToken: string) {
  await assertProjectAccess(user, projectId, accessToken);
  const arbol = await exigirArbol(accessToken, projectId, treeId);
  const conEtiqueta = (catalogo: string, codigo: string | null) => (codigo === null ? null : { codigo, etiqueta: etiquetaSegura(catalogo, codigo) });
  return {
    ficha: presentarFichaArbol(await obtenerFichaArbol(accessToken, treeId)),
    medidas_vigentes: {
      clase_edad: conEtiqueta("clase_edad", arbol.clase_edad),
      altura_total_m: arbol.altura_total_m,
      dap_cm: arbol.dap_cm,
      diametro_copa_m: arbol.diametro_copa_m,
      rango_edad_estimada_anios: conEtiqueta("rango_edad_estimada_anios", arbol.rango_edad_estimada_anios),
    },
    vista_previa: await fichaPublica(arbol.qr_token),
  };
}

/** PUT …/trees/:treeId/ficha-publica — interruptores, «Mi historia» y textos personalizados. */
export async function editarFichaArbol(user: AuthenticatedUser, projectId: string, treeId: string, body: FichaPublicaArbolBody, accessToken: string) {
  await assertProjectRole(user, projectId, EDITORES, accessToken);
  await exigirArbol(accessToken, projectId, treeId);
  try {
    await guardarFichaArbol(treeId, user.id, body);
  } catch (err) {
    throw traducirErrorFicha(err);
  }
  return verFichaArbol(user, projectId, treeId, accessToken);
}

/** PUT …/trees/:treeId/ficha-publica/foto — foto pública del ejemplar (D-304). */
export async function fijarFotoFichaArbol(user: AuthenticatedUser, projectId: string, treeId: string, archivo: Buffer | undefined, accessToken: string) {
  await assertProjectRole(user, projectId, EDITORES, accessToken);
  if (!archivo) throw new AppError("Debe adjuntar la fotografía en el campo «foto»", 400);
  await exigirArbol(accessToken, projectId, treeId);
  const webp = await procesarFotoPublica(archivo);
  const ruta = `arboles/${randomUUID()}.webp`;
  await subirFotoPublica(ruta, webp);
  let anterior: string | null;
  try {
    anterior = (await fijarFotoArbol(treeId, user.id, ruta)).ruta_anterior;
  } catch (err) {
    await borrarFotosPublicas([ruta]);
    throw traducirErrorFicha(err);
  }
  await borrarFotosPublicas([anterior]);
  return verFichaArbol(user, projectId, treeId, accessToken);
}

/** DELETE …/trees/:treeId/ficha-publica/foto — quita la foto y borra el archivo. */
export async function quitarFotoFichaArbol(user: AuthenticatedUser, projectId: string, treeId: string, accessToken: string) {
  await assertProjectRole(user, projectId, EDITORES, accessToken);
  await exigirArbol(accessToken, projectId, treeId);
  let anterior: string | null;
  try {
    anterior = (await fijarFotoArbol(treeId, user.id, null)).ruta_anterior;
  } catch (err) {
    throw traducirErrorFicha(err);
  }
  await borrarFotosPublicas([anterior]);
}
