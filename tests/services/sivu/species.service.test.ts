jest.mock("../../../src/repositories/sivu/species.repository");
jest.mock("../../../src/services/authorization.service", () => ({
  assertProjectAccess: jest.fn(),
  assertProjectRole: jest.fn(),
}));

import {
  buscarEspeciesPorNombre,
  completarEspecie as completarEspecieRepo,
  obtenerEspeciePorId,
  renombrarEspecie as renombrarEspecieRepo,
  SQLSTATE_RENOMBRAR_ESPECIE,
  SQLSTATE_COMPLETAR_ESPECIE,
  SQLSTATE_UNICIDAD_ESPECIE,
  EspecieRow,
} from "../../../src/repositories/sivu/species.repository";
import { assertProjectAccess, assertProjectRole } from "../../../src/services/authorization.service";
import { buscarEspecies, completarEspecie, renombrarEspecie } from "../../../src/services/sivu/species.service";
import { AuthenticatedUser } from "../../../src/types/auth";
import { CompletarEspecieBody, RenombrarEspecieBody } from "../../../src/schemas/sivu/especies.schema";

const mockBuscar = buscarEspeciesPorNombre as jest.Mock;
const mockCompletarRepo = completarEspecieRepo as jest.Mock;
const mockObtener = obtenerEspeciePorId as jest.Mock;
const mockRenombrarRepo = renombrarEspecieRepo as jest.Mock;
const mockAssertProjectAccess = assertProjectAccess as jest.Mock;
const mockAssertProjectRole = assertProjectRole as jest.Mock;

function usuario(role: string | null): AuthenticatedUser {
  return { id: "inspector-1", email: "inspector@example.invalid", nombre: "Inspector de prueba", role, activo: true };
}

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const SPECIES_ID = "22222222-2222-2222-2222-222222222222";
const TOKEN = "token-de-prueba";

function especieBase(): EspecieRow {
  return {
    id: SPECIES_ID,
    especie_cientifica: "Robinia pseudoacacia",
    genero: null,
    familia: null,
    origen_biogeografico: null,
    persistencia_follaje: null,
    tipo_hoja: null,
    created_by: "inspector-1",
    created_at: "2026-10-25T00:00:00Z",
    updated_at: "2026-10-25T00:00:00Z",
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("buscarEspecies (#73)", () => {
  it("exige acceso al proyecto (cualquier rol) antes de buscar", async () => {
    mockAssertProjectAccess.mockRejectedValueOnce(Object.assign(new Error("No tiene acceso a este proyecto"), { statusCode: 403 }));

    await expect(buscarEspecies(usuario("usuario_municipal"), PROJECT_ID, "robinia", TOKEN)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockAssertProjectAccess).toHaveBeenCalledWith(usuario("usuario_municipal"), PROJECT_ID, TOKEN);
    expect(mockBuscar).not.toHaveBeenCalled();
  });

  it("con acceso, delega la búsqueda al repositorio", async () => {
    const especies = [especieBase()];
    mockBuscar.mockResolvedValueOnce(especies);

    const resultado = await buscarEspecies(usuario("usuario_municipal"), PROJECT_ID, "robinia", TOKEN);

    expect(mockBuscar).toHaveBeenCalledWith(TOKEN, "robinia");
    expect(resultado).toBe(especies);
  });
});

describe("completarEspecie (#73 punto 4)", () => {
  function bodyValido(): CompletarEspecieBody {
    return { genero: "Robinia", origen_biogeografico: "introducida" };
  }

  it("exige rol Inspector (delega en assertProjectRole, sin consultar la especie si rechaza)", async () => {
    mockAssertProjectRole.mockRejectedValueOnce(Object.assign(new Error("Requiere uno de los roles: inspector"), { statusCode: 403 }));

    await expect(completarEspecie(usuario("usuario_municipal"), PROJECT_ID, SPECIES_ID, bodyValido(), TOKEN)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockAssertProjectRole).toHaveBeenCalledWith(usuario("usuario_municipal"), PROJECT_ID, ["inspector"], TOKEN);
    expect(mockObtener).not.toHaveBeenCalled();
  });

  it("404 si la especie no existe", async () => {
    mockObtener.mockResolvedValueOnce(null);

    await expect(completarEspecie(usuario("inspector"), PROJECT_ID, SPECIES_ID, bodyValido(), TOKEN)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(mockCompletarRepo).not.toHaveBeenCalled();
  });

  it("completa solo los campos del body; los no incluidos no se envían como null (merge en la capa de repositorio)", async () => {
    const actual = especieBase();
    mockObtener.mockResolvedValueOnce(actual);
    const actualizada = { ...actual, genero: "Robinia", origen_biogeografico: "introducida" as const };
    mockCompletarRepo.mockResolvedValueOnce(actualizada);

    const resultado = await completarEspecie(usuario("inspector"), PROJECT_ID, SPECIES_ID, bodyValido(), TOKEN);

    expect(mockCompletarRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        speciesId: SPECIES_ID,
        genero: "Robinia",
        familia: undefined,
        origenBiogeografico: "introducida",
        persistenciaFollaje: undefined,
        tipoHoja: undefined,
        changedBy: "inspector-1",
      }),
      actual
    );
    expect(resultado).toBe(actualizada);
  });

  it("rechazo de la base (SV062: rol/actividad, defensa en profundidad) → 422", async () => {
    mockObtener.mockResolvedValueOnce(especieBase());
    mockCompletarRepo.mockRejectedValueOnce(
      new Error("El usuario inspector-1 no está activo", { cause: SQLSTATE_COMPLETAR_ESPECIE })
    );

    await expect(completarEspecie(usuario("inspector"), PROJECT_ID, SPECIES_ID, bodyValido(), TOKEN)).rejects.toMatchObject({
      statusCode: 422,
    });
  });

  it("violación de CHECK (defensa en profundidad) → 400", async () => {
    mockObtener.mockResolvedValueOnce(especieBase());
    mockCompletarRepo.mockRejectedValueOnce(new Error("violates check constraint", { cause: "23514" }));

    await expect(completarEspecie(usuario("inspector"), PROJECT_ID, SPECIES_ID, bodyValido(), TOKEN)).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe("renombrarEspecie (#73 punto 5)", () => {
  function bodyValido(): RenombrarEspecieBody {
    return { especie_cientifica: "Robinia pseudoacacia corregida" };
  }

  it("exige rol Inspector", async () => {
    mockAssertProjectRole.mockRejectedValueOnce(Object.assign(new Error("Requiere uno de los roles: inspector"), { statusCode: 403 }));

    await expect(renombrarEspecie(usuario("usuario_municipal"), PROJECT_ID, SPECIES_ID, bodyValido(), TOKEN)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockRenombrarRepo).not.toHaveBeenCalled();
  });

  it("con rol Inspector, delega en el repositorio con el usuario autenticado como changed_by", async () => {
    const resultado = { id: SPECIES_ID, especie_cientifica: "Robinia pseudoacacia corregida", nombre_anterior: "Robinia pseudoacacia" };
    mockRenombrarRepo.mockResolvedValueOnce(resultado);

    const devuelto = await renombrarEspecie(usuario("inspector"), PROJECT_ID, SPECIES_ID, bodyValido(), TOKEN);

    expect(mockRenombrarRepo).toHaveBeenCalledWith(SPECIES_ID, "Robinia pseudoacacia corregida", "inspector-1");
    expect(devuelto).toBe(resultado);
  });

  it("nombre colisionando (23505, forma normalizada ya existe) → 409 con mensaje claro", async () => {
    mockRenombrarRepo.mockRejectedValueOnce(
      new Error('duplicate key value violates unique constraint "uq_species_especie_cientifica_norm"', {
        cause: SQLSTATE_UNICIDAD_ESPECIE,
      })
    );

    await expect(renombrarEspecie(usuario("inspector"), PROJECT_ID, SPECIES_ID, bodyValido(), TOKEN)).rejects.toMatchObject({
      statusCode: 409,
      message: "Ya existe una especie con ese nombre",
    });
  });

  it("rechazo de la base (SV061: rol/actividad, especie inexistente, nombre igual al actual) → 422", async () => {
    mockRenombrarRepo.mockRejectedValueOnce(
      new Error("El nombre nuevo es igual al actual (Robinia pseudoacacia)", { cause: SQLSTATE_RENOMBRAR_ESPECIE })
    );

    await expect(renombrarEspecie(usuario("inspector"), PROJECT_ID, SPECIES_ID, bodyValido(), TOKEN)).rejects.toMatchObject({
      statusCode: 422,
    });
  });
});
