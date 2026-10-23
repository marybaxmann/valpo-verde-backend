import request from "supertest";

jest.mock("../../src/repositories/auth.repository");
jest.mock("../../src/repositories/userProfile.repository");
jest.mock("../../src/repositories/sivu/project.repository");

import app from "../../src/app";
import { getAuthUserByToken } from "../../src/repositories/auth.repository";
import { findUserProfileById } from "../../src/repositories/userProfile.repository";
import {
  findProyectoById,
  findSectorByProyectoId,
  previsualizarSuperficiesKmlRpc,
  SQLSTATE_GEOMETRIA_SECTOR,
  updateGeometriaSector,
} from "../../src/repositories/sivu/project.repository";
import { FAKE_TOKEN, adminProfileRow, fakeAuthUser, municipalProfileRow } from "../helpers/authFixtures";

const mockGetAuthUserByToken = getAuthUserByToken as unknown as jest.Mock;
const mockFindUserProfileById = findUserProfileById as unknown as jest.Mock;
const mockFindProyectoById = findProyectoById as unknown as jest.Mock;
const mockFindSectorByProyectoId = findSectorByProyectoId as unknown as jest.Mock;
const mockPrevisualizarRpc = previsualizarSuperficiesKmlRpc as unknown as jest.Mock;
const mockUpdateGeometria = updateGeometriaSector as unknown as jest.Mock;

const authHeader = { Authorization: `Bearer ${FAKE_TOKEN}` };
const PROJECT_ID = "33333333-3333-3333-3333-333333333333";
const KML_BASE64 = Buffer.from("<kml/>", "utf-8").toString("base64");

function authAsAdmin() {
  mockGetAuthUserByToken.mockResolvedValue(fakeAuthUser());
  mockFindUserProfileById.mockResolvedValue(adminProfileRow());
}

function authAsMunicipal() {
  mockGetAuthUserByToken.mockResolvedValue(fakeAuthUser({ id: "22222222-2222-2222-2222-222222222222" }));
  mockFindUserProfileById.mockResolvedValue(municipalProfileRow());
}

describe("POST /api/sivu/projects/sector-preview (D-265; CC-047)", () => {
  it("admin -> 200 con cada elemento, su índice y su estado", async () => {
    authAsAdmin();
    const vista = {
      superficies: [
        { indice: 0, estado: "valida", tipo: "POLYGON", motivo: null, geometria: { type: "Polygon" } },
        { indice: 1, estado: "invalida", tipo: "POLYGON", motivo: "Self-intersection", geometria: { type: "Polygon" } },
      ],
      validas: 1,
      invalidas: 1,
      excluidas: 0,
    };
    mockPrevisualizarRpc.mockResolvedValue(vista);

    const res = await request(app)
      .post("/api/sivu/projects/sector-preview")
      .set(authHeader)
      .send({ formato: "kml", archivoBase64: KML_BASE64 });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(vista);
    expect(mockPrevisualizarRpc).toHaveBeenCalledWith("<kml/>");
  });

  it("usuario_municipal -> 403, sin leer el archivo", async () => {
    authAsMunicipal();

    const res = await request(app)
      .post("/api/sivu/projects/sector-preview")
      .set(authHeader)
      .send({ formato: "kml", archivoBase64: KML_BASE64 });

    expect(res.status).toBe(403);
    expect(mockPrevisualizarRpc).not.toHaveBeenCalled();
  });

  it("body con geojson -> 400 (solo KML/KMZ se previsualizan)", async () => {
    authAsAdmin();

    const res = await request(app)
      .post("/api/sivu/projects/sector-preview")
      .set(authHeader)
      .send({ formato: "geojson", archivoBase64: KML_BASE64 });

    expect(res.status).toBe(400);
  });

  it("KML ilegible -> 422", async () => {
    authAsAdmin();
    mockPrevisualizarRpc.mockRejectedValue(
      new Error("KML inválido: no es un documento XML bien formado", { cause: SQLSTATE_GEOMETRIA_SECTOR })
    );

    const res = await request(app)
      .post("/api/sivu/projects/sector-preview")
      .set(authHeader)
      .send({ formato: "kml", archivoBase64: KML_BASE64 });

    expect(res.status).toBe(422);
  });

  it("sin token -> 401", async () => {
    const res = await request(app)
      .post("/api/sivu/projects/sector-preview")
      .send({ formato: "kml", archivoBase64: KML_BASE64 });

    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/sivu/projects/:id — delimitación del sector", () => {
  const body = { sector: { geometria_sector: { formato: "kml", archivoBase64: KML_BASE64, indicesSeleccionados: [0] } } };

  it("admin -> 200 con superficiesExcluidas (D-265: informar la exclusión también al modificar)", async () => {
    authAsAdmin();
    mockFindProyectoById.mockResolvedValue({ id: PROJECT_ID });
    mockFindSectorByProyectoId.mockResolvedValue({ id: "s1" });
    mockUpdateGeometria.mockResolvedValue({ superficies_excluidas: 2 });

    const res = await request(app).patch(`/api/sivu/projects/${PROJECT_ID}`).set(authHeader).send(body);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ superficiesExcluidas: 2 });
    expect(mockUpdateGeometria).toHaveBeenCalledWith(
      "s1",
      expect.objectContaining({ formato: "kml", geometriaKml: "<kml/>", indicesSeleccionados: [0] })
    );
  });

  it("solo nombre_proyecto -> 200 con superficiesExcluidas = null", async () => {
    authAsAdmin();
    mockFindProyectoById.mockResolvedValue({ id: PROJECT_ID });

    const res = await request(app)
      .patch(`/api/sivu/projects/${PROJECT_ID}`)
      .set(authHeader)
      .send({ nombre_proyecto: "Nuevo nombre" });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ superficiesExcluidas: null });
  });

  it("varias superficies sin selección -> 422 con el mensaje de la base (CC-047)", async () => {
    authAsAdmin();
    mockFindProyectoById.mockResolvedValue({ id: PROJECT_ID });
    mockFindSectorByProyectoId.mockResolvedValue({ id: "s1" });
    const mensaje = "El archivo contiene varias superficies: selecciona las que integrarán el sector";
    mockUpdateGeometria.mockRejectedValue(new Error(mensaje, { cause: SQLSTATE_GEOMETRIA_SECTOR }));

    const res = await request(app)
      .patch(`/api/sivu/projects/${PROJECT_ID}`)
      .set(authHeader)
      .send({ sector: { geometria_sector: { formato: "kml", archivoBase64: KML_BASE64 } } });

    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body)).toContain(mensaje);
  });
});
