import { AuthenticatedUser } from "../../types/auth";
import { AppError } from "../../utils/AppError";
import { hoyEnChile } from "../../utils/fechaChile";
import { mensajeAltaFueraDeSector, mensajeCheck } from "../../utils/mensajesBase";
import { assertProjectRole } from "../authorization.service";
import { findSectorByProyectoId, SQLSTATE_ARBOL_FUERA_SECTOR } from "../../repositories/sivu/project.repository";
import {
  AltaArbolInput,
  ArbolAltaRow,
  ArbolDeProyectoRow,
  CorreccionUbicacionResultado,
  asignarLegacyIdSiVacio,
  corregirUbicacionArbol,
  crearArbolAlta,
  obtenerArbolDeProyecto,
  obtenerArbolPorLegacyId,
  SQLSTATE_CAMPO_OBLIGATORIO_ALTA,
} from "../../repositories/sivu/tree.repository";
import { AltaMunicipalArbolBody, AsignarLegacyIdBody, CorregirUbicacionBody } from "../../schemas/sivu/arboles.schema";

/** SQLSTATE de una violación de CHECK (p. ej. `chk_trees_especie_o_comun`). */
const SQLSTATE_CHECK_VIOLATION = "23514";

/**
 * POST /api/sivu/projects/:id/trees — alta municipal mínima (#57;
 * PR-006 v11.0; CC-026; CC-032 punto 8; REGLAS_GENERALES fila 5). Solo
 * `usuario_municipal` (PR-004 v7.0: el Administrador no registra
 * árboles).
 *
 * `sector_id` lo resuelve el servidor desde el proyecto — nunca viene
 * del body (el árbol hereda la delimitación territorial del proyecto,
 * PR-006 v11.0 "Identificación y ubicación"). Sin sector no hay nada
 * contra qué validar la ubicación (CC-046): como PR-004 v7.0 exige que
 * todo proyecto se cree con su sector, esto no debería ocurrir; si
 * ocurre, se rechaza en vez de inventar una excepción a la regla.
 */
export async function altaMunicipalArbol(
  user: AuthenticatedUser,
  projectId: string,
  body: AltaMunicipalArbolBody,
  accessToken: string
): Promise<ArbolAltaRow> {
  await assertProjectRole(user, projectId, ["usuario_municipal"], accessToken);

  const sector = await findSectorByProyectoId(accessToken, projectId);
  if (!sector) {
    throw new AppError("El proyecto no tiene un sector delimitado", 404);
  }

  const input: AltaArbolInput = {
    projectId,
    sectorId: sector.id,
    sector: body.sector,
    ubicacionDescriptiva: body.ubicacion_descriptiva,
    utmEste: body.utm_este,
    utmNorte: body.utm_norte,
    especieCientifica: body.especie_cientifica ?? null,
    nombreComun: body.nombre_comun ?? null,
    fechaRegistro: hoyEnChile(),
    registradoPor: user.id,
  };

  try {
    return await crearArbolAlta(input);
  } catch (err: unknown) {
    throw traducirErrorAltaArbol(err);
  }
}

/**
 * Traduce un error de la base al alta del árbol. SV046 (CC-046; árbol
 * fuera del sector, o sector no encontrado/no visible) y SV057 (D-7 a
 * D-10; un campo obligatorio del alta llegó vacío a `fn_create_tree_alta`
 * — no debería ocurrir, el Zod ya lo exige, pero la función no confía
 * solo en el llamador) → 422, igual que en `project.service.ts`. Una
 * violación de CHECK (p. ej. `chk_trees_especie_o_comun`, que el Zod
 * del schema ya debería haber evitado) → 400: es un dato de entrada
 * rechazado, no un error de infraestructura.
 */
function traducirErrorAltaArbol(err: unknown): Error {
  if (err instanceof AppError) {
    return err;
  }

  const error = err as Error;
  const cause = (error as { cause?: unknown }).cause;

  if (cause === SQLSTATE_ARBOL_FUERA_SECTOR) {
    return new AppError(mensajeAltaFueraDeSector(error.message), 422);
  }
  if (cause === SQLSTATE_CAMPO_OBLIGATORIO_ALTA) {
    return new AppError(error.message, 422);
  }
  if (cause === SQLSTATE_CHECK_VIOLATION) {
    return new AppError(mensajeCheck(error.message), 400);
  }

  return error;
}

/** SQLSTATE propio de fn_corregir_ubicacion_arbol (039). */
const SQLSTATE_CORRECCION_UBICACION = "SV039";

/**
 * PATCH /api/sivu/projects/:id/trees/:treeId/ubicacion (039; decisión F)
 * — corrección autorizada de la ubicación del inventario sin finalizar
 * una inspección. Solo el Usuario municipal (quien registra el
 * inventario, PR-006). Queda como versión nueva en `tree_data_versions`
 * (historial, con motivo y autor) y fn_refresh_tree_current la respeta,
 * así que un recálculo posterior no la revierte; una inspección posterior
 * que registre la ubicación la reemplaza, como hoy. Idempotente: si los
 * valores ya son los vigentes devuelve `cambio: false` sin escribir.
 */
export async function corregirUbicacion(
  user: AuthenticatedUser,
  projectId: string,
  treeId: string,
  body: CorregirUbicacionBody,
  accessToken: string
): Promise<CorreccionUbicacionResultado> {
  await assertProjectRole(user, projectId, ["usuario_municipal"], accessToken);
  const arbol = await obtenerArbolDeProyecto(projectId, treeId);
  if (!arbol) {
    throw new AppError("El árbol no existe en este proyecto", 404);
  }

  try {
    return await corregirUbicacionArbol({
      treeId,
      sector: body.sector ?? null,
      ubicacionDescriptiva: body.ubicacion_descriptiva ?? null,
      utmEste: body.utm_este ?? null,
      utmNorte: body.utm_norte ?? null,
      motivo: body.motivo,
      usuarioId: user.id,
    });
  } catch (err: unknown) {
    const error = err as Error;
    if ((error as { cause?: unknown }).cause === SQLSTATE_CORRECCION_UBICACION) {
      throw new AppError(error.message, 422);
    }
    // SV046 (fuera del sector) y CHECK: mismas traducciones que el alta.
    throw traducirErrorAltaArbol(err);
  }
}

/**
 * PATCH /api/sivu/projects/:id/trees/:treeId/legacy-id (039) — vincula el
 * identificador de origen (p. ej. AV_NNNNNN del levantamiento) a un árbol
 * que aún no lo tiene. Solo el Usuario municipal. Nunca reasigna: si el
 * árbol ya tiene ese mismo valor responde sin cambios; si tiene otro, o el
 * valor ya pertenece a otro árbol, 409.
 */
export async function asignarLegacyId(
  user: AuthenticatedUser,
  projectId: string,
  treeId: string,
  body: AsignarLegacyIdBody,
  accessToken: string
): Promise<{ arbol: ArbolDeProyectoRow; cambio: boolean }> {
  await assertProjectRole(user, projectId, ["usuario_municipal"], accessToken);
  const arbol = await obtenerArbolDeProyecto(projectId, treeId);
  if (!arbol) {
    throw new AppError("El árbol no existe en este proyecto", 404);
  }
  if (arbol.legacy_id === body.legacy_id) {
    return { arbol, cambio: false };
  }
  if (arbol.legacy_id !== null) {
    throw new AppError(`El árbol ya tiene el identificador de origen ${arbol.legacy_id}; no se reasigna`, 409);
  }
  const otro = await obtenerArbolPorLegacyId(body.legacy_id);
  if (otro) {
    throw new AppError(`El identificador ${body.legacy_id} ya pertenece al árbol ${otro.tree_code}`, 409);
  }

  const actualizado = await asignarLegacyIdSiVacio(treeId, body.legacy_id);
  if (!actualizado) {
    // Otra petición lo asignó entre la lectura y la escritura.
    throw new AppError("El árbol ya tiene un identificador de origen; no se reasigna", 409);
  }
  return { arbol: actualizado, cambio: true };
}
