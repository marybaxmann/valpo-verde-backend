jest.mock("../../../src/repositories/sivu/project.repository");
jest.mock("../../../src/services/sivu/geometriaSector.service");

import {
  crearProyectoConSectorRpc,
  findAllProyectos,
  findProyectoById,
  findProyectosForMember,
  findSectorByProyectoId,
  POSTGRES_RAISE_EXCEPTION,
  updateEstadoProyecto,
  updateGeometriaSector,
  updateNombreProyecto,
  updateNombreSector,
} from "../../../src/repositories/sivu/project.repository";
import { resolverGeometriaSector } from "../../../src/services/sivu/geometriaSector.service";
import {
  cambiarEstadoProyecto,
  crearProyectoConSector,
  editarProyecto,
  listProyectosForUser,
} from "../../../src/services/sivu/project.service";
import { AuthenticatedUser } from "../../../src/types/auth";
import { CrearProyectoConSectorBody, EditarProyectoBody } from "../../../src/schemas/sivu/proyectos.schema";

const mockFindAllProyectos = findAllProyectos as jest.Mock;
const mockFindProyectosForMember = findProyectosForMember as jest.Mock;
const mockFindProyectoById = findProyectoById as jest.Mock;
const mockFindSectorByProyectoId = findSectorByProyectoId as jest.Mock;
const mockCrearRpc = crearProyectoConSectorRpc as jest.Mock;
const mockUpdateEstado = updateEstadoProyecto as jest.Mock;
const mockUpdateNombreProyecto = updateNombreProyecto as jest.Mock;
const mockUpdateNombreSector = updateNombreSector as jest.Mock;
const mockUpdateGeometria = updateGeometriaSector as jest.Mock;
const mockResolverGeometria = resolverGeometriaSector as jest.Mock;

function usuario(role: string | null): AuthenticatedUser {
  return { id: "u1", email: "u1@example.invalid", nombre: "Usuario de prueba", role, activo: true };
}

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const TOKEN = "token-de-prueba";

function sectorInput() {
  return {
    nombre_sector: "Cerro Baquedano",
    geometria_sector: {
      formato: "geojson" as const,
      geometria: { type: "Polygon" as const, coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]] },
    },
  };
}

describe("listProyectosForUser", () => {
  it("admin -> findAllProyectos", async () => {
    mockFindAllProyectos.mockResolvedValueOnce([]);
    await listProyectosForUser(usuario("admin"), TOKEN);
    expect(mockFindAllProyectos).toHaveBeenCalledWith(TOKEN);
    expect(mockFindProyectosForMember).not.toHaveBeenCalled();
  });

  it("usuario_municipal -> findProyectosForMember", async () => {
    mockFindProyectosForMember.mockResolvedValueOnce([]);
    await listProyectosForUser(usuario("usuario_municipal"), TOKEN);
    expect(mockFindProyectosForMember).toHaveBeenCalledWith(TOKEN, "u1");
    expect(mockFindAllProyectos).not.toHaveBeenCalled();
  });
});

describe("crearProyectoConSector", () => {
  const body: CrearProyectoConSectorBody = {
    nombre_proyecto: "Parque Baquedano",
    sector: sectorInput(),
  };

  it("rechaza si no es admin, sin resolver la geometría", async () => {
    await expect(crearProyectoConSector(usuario("usuario_municipal"), body)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockResolverGeometria).not.toHaveBeenCalled();
  });

  it("admin: resuelve la geometría y llama al RPC con created_by = user.id", async () => {
    mockResolverGeometria.mockResolvedValueOnce({ formato: "geojson", geometriaGeojson: { x: 1 }, geometriaKml: null });
    mockCrearRpc.mockResolvedValueOnce({ project_id: "p1", sector_id: "s1" });

    const resultado = await crearProyectoConSector(usuario("admin"), body);

    expect(mockCrearRpc).toHaveBeenCalledWith(
      "Parque Baquedano",
      "Cerro Baquedano",
      { formato: "geojson", geometriaGeojson: { x: 1 }, geometriaKml: null },
      "u1"
    );
    expect(resultado).toEqual({ projectId: "p1", sectorId: "s1" });
  });

  it("traduce un RAISE EXCEPTION de geometría inválida a 400", async () => {
    mockResolverGeometria.mockResolvedValueOnce({ formato: "geojson", geometriaGeojson: {}, geometriaKml: null });
    const err = new Error("Geometría inválida: Self-intersection", { cause: POSTGRES_RAISE_EXCEPTION });
    mockCrearRpc.mockRejectedValueOnce(err);

    await expect(crearProyectoConSector(usuario("admin"), body)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("un error sin el cause de RAISE EXCEPTION no se trata como error de negocio (se propaga tal cual)", async () => {
    mockResolverGeometria.mockResolvedValueOnce({ formato: "geojson", geometriaGeojson: {}, geometriaKml: null });
    const err = new Error("fetch failed");
    mockCrearRpc.mockRejectedValueOnce(err);

    await expect(crearProyectoConSector(usuario("admin"), body)).rejects.toBe(err);
  });
});

describe("editarProyecto", () => {
  const body: EditarProyectoBody = { nombre_proyecto: "Nuevo nombre" };

  it("rechaza si no es admin", async () => {
    await expect(editarProyecto(usuario("inspector"), PROJECT_ID, body, TOKEN)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("404 si el proyecto no existe", async () => {
    mockFindProyectoById.mockResolvedValueOnce(null);
    await expect(editarProyecto(usuario("admin"), PROJECT_ID, body, TOKEN)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("edita solo nombre_proyecto sin tocar el sector", async () => {
    mockFindProyectoById.mockResolvedValueOnce({ id: PROJECT_ID });
    await editarProyecto(usuario("admin"), PROJECT_ID, body, TOKEN);
    expect(mockUpdateNombreProyecto).toHaveBeenCalledWith(PROJECT_ID, "Nuevo nombre");
    expect(mockUpdateNombreSector).not.toHaveBeenCalled();
    expect(mockUpdateGeometria).not.toHaveBeenCalled();
  });

  it("editar geometria_sector: 404 si el sector no existe", async () => {
    mockFindProyectoById.mockResolvedValueOnce({ id: PROJECT_ID });
    mockFindSectorByProyectoId.mockResolvedValueOnce(null);
    const bodyConSector: EditarProyectoBody = { sector: { geometria_sector: sectorInput().geometria_sector } };
    await expect(editarProyecto(usuario("admin"), PROJECT_ID, bodyConSector, TOKEN)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("traduce 'está cerrado' (CC-042) a 409", async () => {
    mockFindProyectoById.mockResolvedValueOnce({ id: PROJECT_ID });
    const err = new Error("El proyecto está cerrado: solo puede reabrirse, no editarse", {
      cause: POSTGRES_RAISE_EXCEPTION,
    });
    mockUpdateNombreProyecto.mockRejectedValueOnce(err);

    await expect(editarProyecto(usuario("admin"), PROJECT_ID, body, TOKEN)).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});

describe("cambiarEstadoProyecto", () => {
  it("rechaza si no es admin", async () => {
    await expect(
      cambiarEstadoProyecto(usuario("usuario_municipal"), PROJECT_ID, { estado_proyecto: "cerrado" })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("404 si updateEstadoProyecto no encuentra el proyecto", async () => {
    mockUpdateEstado.mockResolvedValueOnce(null);
    await expect(
      cambiarEstadoProyecto(usuario("admin"), PROJECT_ID, { estado_proyecto: "cerrado" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("admin: devuelve el proyecto actualizado", async () => {
    const actualizado = { id: PROJECT_ID, estado_proyecto: "cerrado" };
    mockUpdateEstado.mockResolvedValueOnce(actualizado);
    const resultado = await cambiarEstadoProyecto(usuario("admin"), PROJECT_ID, { estado_proyecto: "cerrado" });
    expect(resultado).toBe(actualizado);
  });
});
