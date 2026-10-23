import { AuthenticatedUser } from "../../types/auth";
import { AppError } from "../../utils/AppError";
import { hoyEnChile } from "../../utils/fechaChile";
import { assertProjectRole } from "../authorization.service";
import { findSectorByProyectoId, SQLSTATE_ARBOL_FUERA_SECTOR } from "../../repositories/sivu/project.repository";
import {
  AltaArbolInput,
  ArbolAltaRow,
  crearArbolAlta,
  SQLSTATE_CAMPO_OBLIGATORIO_ALTA,
} from "../../repositories/sivu/tree.repository";
import { AltaMunicipalArbolBody } from "../../schemas/sivu/arboles.schema";

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

  if (cause === SQLSTATE_ARBOL_FUERA_SECTOR || cause === SQLSTATE_CAMPO_OBLIGATORIO_ALTA) {
    return new AppError(error.message, 422);
  }
  if (cause === SQLSTATE_CHECK_VIOLATION) {
    return new AppError(error.message, 400);
  }

  return error;
}
