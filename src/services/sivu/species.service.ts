import { AuthenticatedUser } from "../../types/auth";
import { AppError } from "../../utils/AppError";
import { assertProjectAccess, assertProjectRole } from "../authorization.service";
import {
  CompletarEspecieInput,
  EspecieRenombradaResultado,
  EspecieRow,
  SQLSTATE_COMPLETAR_ESPECIE,
  SQLSTATE_RENOMBRAR_ESPECIE,
  SQLSTATE_UNICIDAD_ESPECIE,
  buscarEspeciesPorNombre,
  completarEspecie as completarEspecieRepo,
  obtenerEspeciePorId,
  renombrarEspecie as renombrarEspecieRepo,
} from "../../repositories/sivu/species.repository";
import { CompletarEspecieBody, RenombrarEspecieBody } from "../../schemas/sivu/especies.schema";

/** SQLSTATE de una violación de CHECK (dominio fuera del Excel). */
const SQLSTATE_CHECK_VIOLATION = "23514";

/**
 * GET /api/sivu/projects/:id/species?nombre=... — búsqueda por nombre
 * (#73; CC-053). Cualquier rol con acceso al proyecto: a diferencia de
 * completar/corregir, CC-053 no reserva la búsqueda al Inspector —
 * cualquiera que trabaje en el proyecto puede necesitar consultar el
 * catálogo (por ejemplo, para ver si una especie ya existe antes de
 * reportarla).
 */
export async function buscarEspecies(
  user: AuthenticatedUser,
  projectId: string,
  nombre: string,
  accessToken: string
): Promise<EspecieRow[]> {
  await assertProjectAccess(user, projectId, accessToken);
  return buscarEspeciesPorNombre(accessToken, nombre);
}

/**
 * PATCH /api/sivu/projects/:id/species/:speciesId — completar
 * genero/familia/origen_biogeografico/persistencia_follaje/tipo_hoja
 * (CC-053 punto 4). Solo el Inspector (REGLAS_GENERALES fila 18).
 */
export async function completarEspecie(
  user: AuthenticatedUser,
  projectId: string,
  speciesId: string,
  body: CompletarEspecieBody,
  accessToken: string
): Promise<EspecieRow> {
  await assertProjectRole(user, projectId, ["inspector"], accessToken);

  const actual = await obtenerEspeciePorId(speciesId);
  if (!actual) {
    throw new AppError("La especie no existe", 404);
  }

  const input: CompletarEspecieInput = {
    speciesId,
    genero: body.genero,
    familia: body.familia,
    origenBiogeografico: body.origen_biogeografico,
    persistenciaFollaje: body.persistencia_follaje,
    tipoHoja: body.tipo_hoja,
    changedBy: user.id,
  };

  try {
    return await completarEspecieRepo(input, actual);
  } catch (err: unknown) {
    throw traducirErrorEspecie(err, SQLSTATE_COMPLETAR_ESPECIE);
  }
}

/**
 * PATCH /api/sivu/projects/:id/species/:speciesId/nombre — corregir
 * especie_cientifica (CC-053 punto 5). Solo el Inspector. 409 si el
 * nombre nuevo ya existe (forma normalizada) — pedido explícitamente
 * por la responsable, distinto del resto de SQLSTATE de esta fase
 * (que van todos a 422): no es una regla de negocio rechazada, es un
 * recurso (la especie destino) que ya existe.
 */
export async function renombrarEspecie(
  user: AuthenticatedUser,
  projectId: string,
  speciesId: string,
  body: RenombrarEspecieBody,
  accessToken: string
): Promise<EspecieRenombradaResultado> {
  await assertProjectRole(user, projectId, ["inspector"], accessToken);

  try {
    return await renombrarEspecieRepo(speciesId, body.especie_cientifica, user.id);
  } catch (err: unknown) {
    throw traducirErrorEspecie(err, SQLSTATE_RENOMBRAR_ESPECIE);
  }
}

/**
 * Traduce un error de la base. `SV061`/`SV062` (rol/actividad del
 * usuario, especie inexistente, nombre nuevo igual al actual) → 422,
 * mismo criterio que el resto de SQLSTATE propios de la Fase 6.
 * `23505` (unicidad por forma normalizada, solo posible en el
 * renombre) → 409. `23514` (CHECK de dominio, que el Zod ya debería
 * haber evitado) → 400.
 */
function traducirErrorEspecie(err: unknown, sqlstate: string): Error {
  if (err instanceof AppError) {
    return err;
  }
  const error = err as Error;
  const cause = (error as { cause?: unknown }).cause;

  if (cause === SQLSTATE_UNICIDAD_ESPECIE) {
    return new AppError("Ya existe una especie con ese nombre", 409);
  }
  if (cause === sqlstate) {
    return new AppError(error.message, 422);
  }
  if (cause === SQLSTATE_CHECK_VIOLATION) {
    return new AppError(error.message, 400);
  }
  return error;
}
