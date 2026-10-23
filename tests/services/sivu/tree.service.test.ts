jest.mock("../../../src/repositories/sivu/project.repository");
jest.mock("../../../src/repositories/sivu/tree.repository");
jest.mock("../../../src/services/authorization.service", () => ({
  assertProjectRole: jest.fn(),
}));

import { findSectorByProyectoId, SQLSTATE_ARBOL_FUERA_SECTOR } from "../../../src/repositories/sivu/project.repository";
import { crearArbolAlta, SQLSTATE_CAMPO_OBLIGATORIO_ALTA } from "../../../src/repositories/sivu/tree.repository";
import { assertProjectRole } from "../../../src/services/authorization.service";
import { altaMunicipalArbol } from "../../../src/services/sivu/tree.service";
import { AuthenticatedUser } from "../../../src/types/auth";
import { AltaMunicipalArbolBody } from "../../../src/schemas/sivu/arboles.schema";

const mockFindSector = findSectorByProyectoId as jest.Mock;
const mockCrearArbolAlta = crearArbolAlta as jest.Mock;
const mockAssertProjectRole = assertProjectRole as jest.Mock;

function usuario(role: string | null): AuthenticatedUser {
  return { id: "muni-1", email: "muni@example.invalid", nombre: "Usuario municipal de prueba", role, activo: true };
}

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const SECTOR_ID = "22222222-2222-2222-2222-222222222222";
const TOKEN = "token-de-prueba";

function bodyValido(): AltaMunicipalArbolBody {
  return {
    sector: "Barrio Puerto",
    ubicacion_descriptiva: "Frente a la plaza",
    utm_este: 256000,
    utm_norte: 6348000,
    especie_cientifica: "Robinia pseudoacacia",
  };
}

describe("altaMunicipalArbol (#57)", () => {
  it("exige el rol usuario_municipal (delega en assertProjectRole, sin resolver el sector si rechaza)", async () => {
    mockAssertProjectRole.mockRejectedValueOnce(Object.assign(new Error("Requiere uno de los roles: usuario_municipal"), { statusCode: 403 }));

    await expect(altaMunicipalArbol(usuario("inspector"), PROJECT_ID, bodyValido(), TOKEN)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockAssertProjectRole).toHaveBeenCalledWith(usuario("inspector"), PROJECT_ID, ["usuario_municipal"], TOKEN);
    expect(mockFindSector).not.toHaveBeenCalled();
    expect(mockCrearArbolAlta).not.toHaveBeenCalled();
  });

  it("404 si el proyecto no tiene sector (no debería ocurrir, PR-004 v7.0 — se rechaza igual)", async () => {
    mockFindSector.mockResolvedValueOnce(null);

    await expect(altaMunicipalArbol(usuario("usuario_municipal"), PROJECT_ID, bodyValido(), TOKEN)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(mockCrearArbolAlta).not.toHaveBeenCalled();
  });

  it("usuario_municipal: resuelve sector_id del proyecto (nunca del body) y crea el árbol", async () => {
    mockFindSector.mockResolvedValueOnce({ id: SECTOR_ID, project_id: PROJECT_ID });
    const creado = { id: "arbol-1", tree_code: "A-000001", project_id: PROJECT_ID, sector_id: SECTOR_ID };
    mockCrearArbolAlta.mockResolvedValueOnce(creado);

    const resultado = await altaMunicipalArbol(usuario("usuario_municipal"), PROJECT_ID, bodyValido(), TOKEN);

    expect(mockCrearArbolAlta).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: PROJECT_ID,
        sectorId: SECTOR_ID,
        sector: "Barrio Puerto",
        ubicacionDescriptiva: "Frente a la plaza",
        utmEste: 256000,
        utmNorte: 6348000,
        especieCientifica: "Robinia pseudoacacia",
        nombreComun: null,
        registradoPor: "muni-1",
      })
    );
    expect(resultado).toBe(creado);
  });

  it("acepta el alta con solo nombre_comun (D-13/D-14)", async () => {
    mockFindSector.mockResolvedValueOnce({ id: SECTOR_ID, project_id: PROJECT_ID });
    mockCrearArbolAlta.mockResolvedValueOnce({ id: "arbol-2" });
    const { especie_cientifica, ...resto } = bodyValido();
    void especie_cientifica;

    await altaMunicipalArbol(usuario("usuario_municipal"), PROJECT_ID, { ...resto, nombre_comun: "Falsa acacia" }, TOKEN);

    expect(mockCrearArbolAlta).toHaveBeenCalledWith(
      expect.objectContaining({ especieCientifica: null, nombreComun: "Falsa acacia" })
    );
  });

  it("árbol fuera del sector (CC-046, SQLSTATE SV046) → 422", async () => {
    mockFindSector.mockResolvedValueOnce({ id: SECTOR_ID, project_id: PROJECT_ID });
    const mensaje = "El árbol A-000005 queda fuera de la delimitación del sector de su proyecto";
    mockCrearArbolAlta.mockRejectedValueOnce(new Error(mensaje, { cause: SQLSTATE_ARBOL_FUERA_SECTOR }));

    await expect(altaMunicipalArbol(usuario("usuario_municipal"), PROJECT_ID, bodyValido(), TOKEN)).rejects.toMatchObject({
      statusCode: 422,
      message: mensaje,
    });
  });

  it("campo obligatorio ausente en fn_create_tree_alta (SQLSTATE SV057; defensa en profundidad) → 422", async () => {
    mockFindSector.mockResolvedValueOnce({ id: SECTOR_ID, project_id: PROJECT_ID });
    mockCrearArbolAlta.mockRejectedValueOnce(
      new Error("ubicacion_descriptiva es obligatoria", { cause: SQLSTATE_CAMPO_OBLIGATORIO_ALTA })
    );

    await expect(altaMunicipalArbol(usuario("usuario_municipal"), PROJECT_ID, bodyValido(), TOKEN)).rejects.toMatchObject({
      statusCode: 422,
    });
  });

  it("violación de CHECK (chk_trees_especie_o_comun; defensa en profundidad) → 400", async () => {
    mockFindSector.mockResolvedValueOnce({ id: SECTOR_ID, project_id: PROJECT_ID });
    mockCrearArbolAlta.mockRejectedValueOnce(
      new Error('new row for relation "trees" violates check constraint "chk_trees_especie_o_comun"', { cause: "23514" })
    );

    await expect(altaMunicipalArbol(usuario("usuario_municipal"), PROJECT_ID, bodyValido(), TOKEN)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("un error sin cause reconocido se propaga tal cual (no es un error de negocio conocido)", async () => {
    mockFindSector.mockResolvedValueOnce({ id: SECTOR_ID, project_id: PROJECT_ID });
    const err = new Error("fetch failed");
    mockCrearArbolAlta.mockRejectedValueOnce(err);

    await expect(altaMunicipalArbol(usuario("usuario_municipal"), PROJECT_ID, bodyValido(), TOKEN)).rejects.toBe(err);
  });
});
