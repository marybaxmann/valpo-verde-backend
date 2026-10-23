jest.mock("../../../src/repositories/sivu/project.repository");
jest.mock("../../../src/services/sivu/geometriaSector.service");

import {
  crearProyectoConSectorRpc,
  findAllProyectos,
  findProyectoById,
  findProyectosForMember,
  findSectorByProyectoId,
  POSTGRES_RAISE_EXCEPTION,
  previsualizarSuperficiesKmlRpc,
  SQLSTATE_GEOMETRIA_SECTOR,
  updateEstadoProyecto,
  updateGeometriaSector,
  updateNombreProyecto,
  updateNombreSector,
} from "../../../src/repositories/sivu/project.repository";
import {
  resolverGeometriaSector,
  resolverKmlParaVistaPrevia,
} from "../../../src/services/sivu/geometriaSector.service";
import {
  cambiarEstadoProyecto,
  crearProyectoConSector,
  editarProyecto,
  listProyectosForUser,
  previsualizarSector,
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
const mockResolverKml = resolverKmlParaVistaPrevia as jest.Mock;
const mockPrevisualizarRpc = previsualizarSuperficiesKmlRpc as jest.Mock;

function geometriaKml(indicesSeleccionados: number[] | null) {
  return { formato: "kml", geometriaGeojson: null, geometriaKml: "<kml/>", indicesSeleccionados };
}

function rechazoGeometria(mensaje: string): Error {
  return new Error(mensaje, { cause: SQLSTATE_GEOMETRIA_SECTOR });
}

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
    const geometria = { formato: "geojson", geometriaGeojson: { x: 1 }, geometriaKml: null, indicesSeleccionados: null };
    mockResolverGeometria.mockResolvedValueOnce(geometria);
    mockCrearRpc.mockResolvedValueOnce({ project_id: "p1", sector_id: "s1", superficies_excluidas: 0 });

    const resultado = await crearProyectoConSector(usuario("admin"), body);

    expect(mockCrearRpc).toHaveBeenCalledWith("Parque Baquedano", "Cerro Baquedano", geometria, "u1");
    expect(resultado).toEqual({ projectId: "p1", sectorId: "s1", superficiesExcluidas: 0 });
  });

  it("pasa indicesSeleccionados al RPC e informa los puntos y líneas excluidos (D-265)", async () => {
    mockResolverGeometria.mockResolvedValueOnce(geometriaKml([1]));
    mockCrearRpc.mockResolvedValueOnce({ project_id: "p1", sector_id: "s1", superficies_excluidas: 2 });

    const resultado = await crearProyectoConSector(usuario("admin"), body);

    expect(mockCrearRpc.mock.calls[0][2]).toMatchObject({ indicesSeleccionados: [1] });
    expect(resultado.superficiesExcluidas).toBe(2);
  });

  it.each([
    "El archivo contiene varias superficies: selecciona las que integrarán el sector",
    "El archivo contiene superficies inválidas (superficie 0: Self-intersection): selecciona la superficie válida (superficie 1) para integrar el sector",
    "La superficie 1 es inválida y no puede integrar el sector: Self-intersection[-71.575 -33.045]",
    "La superficie 2 es un punto o una línea y no puede integrar el sector",
    "La superficie 27 (Plaza Victoria) es inválida y no puede integrar el sector: Self-intersection",
    "El archivo no contiene ninguna superficie válida (superficie 0: Self-intersection)",
  ])("un rechazo de geometría (SQLSTATE SV265) es 422 con el mensaje de la base: %s", async (mensaje) => {
    mockResolverGeometria.mockResolvedValueOnce(geometriaKml(null));
    mockCrearRpc.mockRejectedValueOnce(rechazoGeometria(mensaje));

    await expect(crearProyectoConSector(usuario("admin"), body)).rejects.toMatchObject({
      statusCode: 422,
      message: mensaje,
    });
  });

  it("un RAISE EXCEPTION de negocio sin código propio sigue siendo 400", async () => {
    mockResolverGeometria.mockResolvedValueOnce({ formato: "geojson", geometriaGeojson: {}, geometriaKml: null });
    const err = new Error("Otro rechazo de negocio", { cause: POSTGRES_RAISE_EXCEPTION });
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

  it("edita solo nombre_proyecto sin tocar el sector (superficiesExcluidas = null)", async () => {
    mockFindProyectoById.mockResolvedValueOnce({ id: PROJECT_ID });
    const resultado = await editarProyecto(usuario("admin"), PROJECT_ID, body, TOKEN);
    expect(mockUpdateNombreProyecto).toHaveBeenCalledWith(PROJECT_ID, "Nuevo nombre");
    expect(mockUpdateNombreSector).not.toHaveBeenCalled();
    expect(mockUpdateGeometria).not.toHaveBeenCalled();
    expect(resultado).toEqual({ superficiesExcluidas: null });
  });

  it("editar geometria_sector: pasa la selección e informa los excluidos (D-265)", async () => {
    mockFindProyectoById.mockResolvedValueOnce({ id: PROJECT_ID });
    mockFindSectorByProyectoId.mockResolvedValueOnce({ id: "s1" });
    mockResolverGeometria.mockResolvedValueOnce(geometriaKml([0]));
    mockUpdateGeometria.mockResolvedValueOnce({ superficies_excluidas: 3 });
    const bodyConSector: EditarProyectoBody = { sector: { geometria_sector: sectorInput().geometria_sector } };

    const resultado = await editarProyecto(usuario("admin"), PROJECT_ID, bodyConSector, TOKEN);

    expect(mockUpdateGeometria).toHaveBeenCalledWith("s1", geometriaKml([0]));
    expect(resultado).toEqual({ superficiesExcluidas: 3 });
  });

  it("editar geometria_sector: una superficie inválida seleccionada es 422 (CC-047)", async () => {
    mockFindProyectoById.mockResolvedValueOnce({ id: PROJECT_ID });
    mockFindSectorByProyectoId.mockResolvedValueOnce({ id: "s1" });
    mockResolverGeometria.mockResolvedValueOnce(geometriaKml([1]));
    const mensaje = "La superficie 1 es inválida y no puede integrar el sector: Self-intersection";
    mockUpdateGeometria.mockRejectedValueOnce(rechazoGeometria(mensaje));
    const bodyConSector: EditarProyectoBody = { sector: { geometria_sector: sectorInput().geometria_sector } };

    await expect(editarProyecto(usuario("admin"), PROJECT_ID, bodyConSector, TOKEN)).rejects.toMatchObject({
      statusCode: 422,
      message: mensaje,
    });
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

describe("previsualizarSector (D-265; CC-047)", () => {
  const body = { formato: "kml" as const, archivoBase64: "PGttbC8+" };

  it("rechaza si no es admin, sin leer el archivo", async () => {
    await expect(previsualizarSector(usuario("inspector"), body)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockResolverKml).not.toHaveBeenCalled();
    expect(mockPrevisualizarRpc).not.toHaveBeenCalled();
  });

  it("admin: devuelve cada elemento con su índice y estado, sin filtrar los inválidos", async () => {
    const vista = {
      superficies: [
        { indice: 0, nombre: "Plaza Victoria", estado: "valida", tipo: "POLYGON", motivo: null, geometria: { type: "Polygon" } },
        { indice: 1, nombre: null, estado: "invalida", tipo: "POLYGON", motivo: "Self-intersection", geometria: { type: "Polygon" } },
        { indice: 2, nombre: "A-001", estado: "excluida", tipo: "POINT", motivo: "Punto o línea", geometria: { type: "Point" } },
      ],
      validas: 1,
      invalidas: 1,
      excluidas: 1,
    };
    mockResolverKml.mockResolvedValueOnce("<kml/>");
    mockPrevisualizarRpc.mockResolvedValueOnce(vista);

    const resultado = await previsualizarSector(usuario("admin"), body);

    expect(mockResolverKml).toHaveBeenCalledWith(body);
    expect(mockPrevisualizarRpc).toHaveBeenCalledWith("<kml/>");
    expect(resultado).toEqual(vista);
  });

  it("un KML ilegible (SQLSTATE SV265) es 422", async () => {
    mockResolverKml.mockResolvedValueOnce("no es xml");
    mockPrevisualizarRpc.mockRejectedValueOnce(rechazoGeometria("KML inválido: no es un documento XML bien formado"));

    await expect(previsualizarSector(usuario("admin"), body)).rejects.toMatchObject({ statusCode: 422 });
  });
});
