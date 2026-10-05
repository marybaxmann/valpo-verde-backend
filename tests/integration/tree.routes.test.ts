import request from "supertest";

jest.mock("../../src/repositories/auth.repository");
jest.mock("../../src/repositories/userProfile.repository");
jest.mock("../../src/repositories/project.repository");
jest.mock("../../src/repositories/projectMember.repository");
jest.mock("../../src/repositories/tree.repository");
jest.mock("../../src/repositories/treeMeasurement.repository");

import app from "../../src/app";
import { getAuthUserByToken } from "../../src/repositories/auth.repository";
import { findUserProfileById } from "../../src/repositories/userProfile.repository";
import { findProjectById } from "../../src/repositories/project.repository";
import { findMembership } from "../../src/repositories/projectMember.repository";
import {
  createTreeWithMeasurementRpc,
  findTreeById,
  findTreesPage,
} from "../../src/repositories/tree.repository";
import {
  findLatestValidMeasurementsCandidates,
  findMeasurementsByTreeId,
} from "../../src/repositories/treeMeasurement.repository";
import {
  FAKE_TOKEN,
  MUNICIPAL_ID,
  adminProfileRow,
  fakeAuthUser,
  municipalProfileRow,
} from "../helpers/authFixtures";

const mockGetAuthUserByToken = getAuthUserByToken as unknown as jest.Mock;
const mockFindUserProfileById = findUserProfileById as unknown as jest.Mock;
const mockFindProjectById = findProjectById as unknown as jest.Mock;
const mockFindMembership = findMembership as unknown as jest.Mock;
const mockFindTreesPage = findTreesPage as unknown as jest.Mock;
const mockFindTreeById = findTreeById as unknown as jest.Mock;
const mockCreateTreeWithMeasurementRpc = createTreeWithMeasurementRpc as unknown as jest.Mock;
const mockFindLatestValidMeasurementsCandidates = findLatestValidMeasurementsCandidates as unknown as jest.Mock;
const mockFindMeasurementsByTreeId = findMeasurementsByTreeId as unknown as jest.Mock;

const authHeader = { Authorization: `Bearer ${FAKE_TOKEN}` };
const PROJECT_ID = "33333333-3333-3333-3333-333333333333";
const PROJECT = { id: PROJECT_ID, name: "Proyecto", institution_name: "Municipalidad" };

/** GeoJSON tal como lo serializa PostGIS para `ubicacion::geometry` (incluye `crs`). */
function postgisPoint(lon: number, lat: number) {
  return {
    type: "Point",
    crs: { type: "name", properties: { name: "EPSG:4326" } },
    coordinates: [lon, lat],
  };
}

function treeRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    tree_code: `A-${id.slice(-6)}`,
    legacy_id: null,
    estado_ciclo_vida: "activo",
    direccion: null,
    comuna: null,
    lugar_referencia: null,
    ubicacion: postgisPoint(-71.62, -33.045),
    species: { nombre_cientifico: "Especie científica", nombre_comun: "Especie común" },
    ...overrides,
  };
}

/** uuid ordenable por texto, igual que el orden de `uuid` en Postgres. */
function uuidFor(n: number): string {
  return `00000000-0000-0000-0000-${n.toString().padStart(12, "0")}`;
}

/** Simula findTreesPage con semántica de cursor sobre filas ordenadas por id. */
function serveRowsByCursor(rows: ReturnType<typeof treeRow>[], pageSize: number) {
  mockFindTreesPage.mockImplementation(
    async (_token: string, _projectId: string, afterId: string | null) => {
      const start = afterId === null ? 0 : rows.findIndex((r) => r.id > afterId);
      if (start === -1) return [];
      return rows.slice(start, start + pageSize);
    }
  );
}

function authAsAdmin() {
  mockGetAuthUserByToken.mockResolvedValue(fakeAuthUser());
  mockFindUserProfileById.mockResolvedValue(adminProfileRow());
}

function authAsMunicipal() {
  mockGetAuthUserByToken.mockResolvedValue(fakeAuthUser({ id: MUNICIPAL_ID }));
  mockFindUserProfileById.mockResolvedValue(municipalProfileRow());
}

describe("GET /api/projects/:id/trees", () => {
  it("sin Authorization -> 401", async () => {
    const res = await request(app).get(`/api/projects/${PROJECT_ID}/trees`);

    expect(res.status).toBe(401);
    expect(mockFindTreesPage).not.toHaveBeenCalled();
  });

  it("id inválido -> 400", async () => {
    authAsAdmin();

    const res = await request(app).get("/api/projects/no-es-uuid/trees").set(authHeader);

    expect(res.status).toBe(400);
    expect(mockFindTreesPage).not.toHaveBeenCalled();
  });

  it("usuario_municipal sin membresía -> 403 y no consulta árboles", async () => {
    authAsMunicipal();
    mockFindMembership.mockResolvedValue(null);

    const res = await request(app).get(`/api/projects/${PROJECT_ID}/trees`).set(authHeader);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("No tiene acceso a este proyecto");
    expect(mockFindProjectById).not.toHaveBeenCalled();
    expect(mockFindTreesPage).not.toHaveBeenCalled();
  });

  it("admin con proyecto inexistente -> 404", async () => {
    authAsAdmin();
    mockFindProjectById.mockResolvedValue(null);

    const res = await request(app).get(`/api/projects/${PROJECT_ID}/trees`).set(authHeader);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Proyecto no encontrado");
    expect(mockFindTreesPage).not.toHaveBeenCalled();
  });

  it("devuelve FeatureCollection RFC 7946 con meta; sin ubicación fuera de features", async () => {
    authAsAdmin();
    mockFindProjectById.mockResolvedValue(PROJECT);
    serveRowsByCursor(
      [
        treeRow(uuidFor(1), {
          tree_code: "A-000001",
          direccion: "Calle 1",
          comuna: "Valparaíso",
          ubicacion: postgisPoint(-71.6197, -33.0458),
        }),
        treeRow(uuidFor(2), { tree_code: "A-000002", ubicacion: null }),
        treeRow(uuidFor(3), {
          tree_code: "A-000003",
          estado_ciclo_vida: "tocon",
          species: null,
          ubicacion: postgisPoint(-71.61, -33.04),
        }),
        treeRow(uuidFor(4), { tree_code: "A-000004", estado_ciclo_vida: "retirado" }),
      ],
      1000
    );

    const res = await request(app).get(`/api/projects/${PROJECT_ID}/trees`).set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.type).toBe("FeatureCollection");
    expect(res.body.meta).toEqual({ total: 4, con_ubicacion: 3, sin_ubicacion: 1 });
    expect(res.body.data.features).toHaveLength(3);

    const [first, third, fourth] = res.body.data.features;
    expect(first).toEqual({
      type: "Feature",
      id: uuidFor(1),
      geometry: { type: "Point", coordinates: [-71.6197, -33.0458] },
      properties: {
        id: uuidFor(1),
        tree_code: "A-000001",
        legacy_id: null,
        estado_ciclo_vida: "activo",
        nombre_cientifico: "Especie científica",
        nombre_comun: "Especie común",
        direccion: "Calle 1",
        comuna: "Valparaíso",
        lugar_referencia: null,
      },
    });
    // RFC 7946: sin miembro crs.
    expect(first.geometry).not.toHaveProperty("crs");
    // Todos los estados de ciclo de vida, sin filtrar.
    expect(third.properties.estado_ciclo_vida).toBe("tocon");
    expect(third.properties.nombre_cientifico).toBeNull();
    expect(fourth.properties.estado_ciclo_vida).toBe("retirado");
    // El árbol sin ubicación no aparece.
    expect(res.body.data.features.map((f: { id: string }) => f.id)).not.toContain(uuidFor(2));
  });

  it("usuario_municipal miembro -> 200 y el repository recibe su JWT", async () => {
    authAsMunicipal();
    mockFindMembership.mockResolvedValue({ id: "m1" });
    mockFindProjectById.mockResolvedValue(PROJECT);
    serveRowsByCursor([treeRow(uuidFor(1))], 1000);

    const res = await request(app).get(`/api/projects/${PROJECT_ID}/trees`).set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ total: 1, con_ubicacion: 1, sin_ubicacion: 0 });
    expect(mockFindTreesPage).toHaveBeenCalledWith(FAKE_TOKEN, PROJECT_ID, null);
  });

  it("proyecto sin árboles -> 200 con features vacío y meta en cero", async () => {
    authAsAdmin();
    mockFindProjectById.mockResolvedValue(PROJECT);
    serveRowsByCursor([], 1000);

    const res = await request(app).get(`/api/projects/${PROJECT_ID}/trees`).set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: { type: "FeatureCollection", features: [] },
      meta: { total: 0, con_ubicacion: 0, sin_ubicacion: 0 },
    });
  });

  it.each([
    ["texto EWKB hexadecimal", "0101000020E61000006666666666E651C085EB51B81E8540C0"],
    ["otro tipo de geometría", { type: "LineString", coordinates: [[0, 0], [1, 1]] }],
    ["tres coordenadas", { type: "Point", coordinates: [-71.6, -33.0, 10] }],
    ["longitud fuera de rango", { type: "Point", coordinates: [-181, -33.0] }],
    ["latitud fuera de rango", { type: "Point", coordinates: [-71.6, 91] }],
  ])("ubicación inválida (%s) -> 500 explícito, sin descartar en silencio", async (_label, ubicacion) => {
    authAsAdmin();
    mockFindProjectById.mockResolvedValue(PROJECT);
    serveRowsByCursor([treeRow(uuidFor(1)), treeRow(uuidFor(2), { ubicacion })], 1000);
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(app).get(`/api/projects/${PROJECT_ID}/trees`).set(authHeader);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: "Los datos espaciales del inventario tienen un formato inesperado",
    });
    expect(res.body).not.toHaveProperty("data");
    consoleSpy.mockRestore();
  });

  it("error del repository -> 500 genérico sin detalles internos", async () => {
    authAsAdmin();
    mockFindProjectById.mockResolvedValue(PROJECT);
    mockFindTreesPage.mockRejectedValue(new Error("Error al listar árboles: detalle interno"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(app).get(`/api/projects/${PROJECT_ID}/trees`).set(authHeader);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Error interno del servidor" });
    consoleSpy.mockRestore();
  });

  it("paginación por cursor: 2600 árboles con páginas cortas, ninguno se pierde", async () => {
    authAsAdmin();
    mockFindProjectById.mockResolvedValue(PROJECT);
    const rows = Array.from({ length: 2600 }, (_, i) =>
      treeRow(uuidFor(i + 1), i % 10 === 0 ? { ubicacion: null } : {})
    );
    // Páginas de 700 (< 1000): una página corta NO debe interpretarse como fin.
    serveRowsByCursor(rows, 700);

    const res = await request(app).get(`/api/projects/${PROJECT_ID}/trees`).set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ total: 2600, con_ubicacion: 2340, sin_ubicacion: 260 });

    const ids = res.body.data.features.map((f: { id: string }) => f.id);
    const expectedIds = rows.filter((r) => r.ubicacion !== null).map((r) => r.id);
    expect(ids).toEqual(expectedIds);
    expect(new Set(ids).size).toBe(2340);

    // 4 páginas con datos (700+700+700+500) + 1 página vacía que marca el fin.
    expect(mockFindTreesPage).toHaveBeenCalledTimes(5);
    expect(mockFindTreesPage.mock.calls.map((c) => c[2])).toEqual([
      null,
      uuidFor(700),
      uuidFor(1400),
      uuidFor(2100),
      uuidFor(2600),
    ]);
  });

  it("cursor que no avanza -> 500 en vez de bucle infinito", async () => {
    authAsAdmin();
    mockFindProjectById.mockResolvedValue(PROJECT);
    mockFindTreesPage.mockResolvedValue([treeRow(uuidFor(1))]);
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(app).get(`/api/projects/${PROJECT_ID}/trees`).set(authHeader);

    expect(res.status).toBe(500);
    expect(mockFindTreesPage).toHaveBeenCalledTimes(2);
    consoleSpy.mockRestore();
  });
});

const TREE_ID = "44444444-4444-4444-4444-444444444444";
const SPECIES_ID = "55555555-5555-5555-5555-555555555555";

function fakeTreeDetailRow(id: string = TREE_ID, overrides: Record<string, unknown> = {}) {
  return {
    id,
    tree_code: `VAL-${id.slice(-4)}`,
    legacy_id: null,
    project_id: PROJECT_ID,
    public_space_id: null,
    direccion: "Calle Prat 123",
    comuna: "Valparaíso",
    lugar_referencia: "Frente a plaza",
    ubicacion: postgisPoint(-71.62, -33.045),
    estado_ciclo_vida: "activo",
    created_by: "user-1",
    created_at: "2026-10-05T12:00:00Z",
    updated_at: "2026-10-05T12:00:00Z",
    species: { id: SPECIES_ID, nombre_cientifico: "Quillaja saponaria", nombre_comun: "Quillay" },
    public_spaces: null,
    ...overrides,
  };
}

function fakeMeasurementRow(id: string = "m-1", overrides: Record<string, unknown> = {}) {
  return {
    id,
    tree_id: TREE_ID,
    fecha_medicion: "2026-10-05",
    configuracion_fustes: "monofuste_test",
    numero_fustes: null,
    dap_fustes_cm: null,
    dap_cm: 20.5,
    altura_total_m: 8.5,
    diametro_copa_m: 4.2,
    altura_primera_rama_m: 1.8,
    clase_edad: "juvenil",
    estado_medicion: "valida",
    motivo_anulacion: null,
    anulada_por: null,
    anulada_en: null,
    created_by: "user-1",
    created_at: "2026-10-05T12:00:00Z",
    ...overrides,
  };
}

const validCreateTreePayload = {
  species_id: SPECIES_ID,
  public_space_id: null,
  direccion: "Calle Prat 123",
  comuna: "Valparaíso",
  lugar_referencia: "Frente a plaza",
  ubicacion: { lon: -71.62, lat: -33.045 },
  medicion_inicial: {
    fecha_medicion: "2026-10-05",
    configuracion_fustes: "monofuste_test",
    dap_cm: 20.5,
    altura_total_m: 8.5,
    diametro_copa_m: 4.2,
    altura_primera_rama_m: 1.8,
    clase_edad: "juvenil",
  },
};

describe("POST /api/projects/:id/trees", () => {
  it("sin Authorization -> 401", async () => {
    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/trees`)
      .send(validCreateTreePayload);

    expect(res.status).toBe(401);
    expect(mockCreateTreeWithMeasurementRpc).not.toHaveBeenCalled();
  });

  it("projectId inválido -> 400", async () => {
    authAsAdmin();

    const res = await request(app)
      .post("/api/projects/no-es-uuid/trees")
      .set(authHeader)
      .send(validCreateTreePayload);

    expect(res.status).toBe(400);
    expect(mockCreateTreeWithMeasurementRpc).not.toHaveBeenCalled();
  });

  it("payload sin species_id -> 400", async () => {
    authAsAdmin();

    const invalidPayload = { ...validCreateTreePayload, species_id: undefined };
    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/trees`)
      .set(authHeader)
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(mockCreateTreeWithMeasurementRpc).not.toHaveBeenCalled();
  });

  it("payload con altura_primera_rama_m > altura_total_m -> 400", async () => {
    authAsAdmin();

    const invalidPayload = {
      ...validCreateTreePayload,
      medicion_inicial: {
        ...validCreateTreePayload.medicion_inicial,
        altura_total_m: 5.0,
        altura_primera_rama_m: 8.0,
      },
    };
    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/trees`)
      .set(authHeader)
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("altura_primera_rama_m");
    expect(mockCreateTreeWithMeasurementRpc).not.toHaveBeenCalled();
  });

  it("usuario_municipal sin membresía -> 403", async () => {
    authAsMunicipal();
    mockFindMembership.mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/trees`)
      .set(authHeader)
      .send(validCreateTreePayload);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("No tiene acceso a este proyecto");
    expect(mockCreateTreeWithMeasurementRpc).not.toHaveBeenCalled();
  });

  it("admin con proyecto inexistente -> 404", async () => {
    authAsAdmin();
    mockFindProjectById.mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/trees`)
      .set(authHeader)
      .send(validCreateTreePayload);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Proyecto no encontrado");
    expect(mockCreateTreeWithMeasurementRpc).not.toHaveBeenCalled();
  });

  it("admin crea árbol + medición inicial -> 201 y delega al RPC", async () => {
    authAsAdmin();
    mockFindProjectById.mockResolvedValue(PROJECT);
    mockCreateTreeWithMeasurementRpc.mockResolvedValue({
      tree_id: TREE_ID,
      measurement_id: "m-init-1",
      tree_code: "VAL-4444",
    });
    mockFindTreeById.mockResolvedValue(fakeTreeDetailRow(TREE_ID));
    mockFindLatestValidMeasurementsCandidates.mockResolvedValue([
      fakeMeasurementRow("m-init-1"),
    ]);

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/trees`)
      .set(authHeader)
      .send(validCreateTreePayload);

    expect(res.status).toBe(201);
    expect(mockCreateTreeWithMeasurementRpc).toHaveBeenCalledWith(FAKE_TOKEN, {
      p_project_id: PROJECT_ID,
      p_species_id: SPECIES_ID,
      p_public_space_id: null,
      p_direccion: "Calle Prat 123",
      p_comuna: "Valparaíso",
      p_lugar_referencia: "Frente a plaza",
      p_lon: -71.62,
      p_lat: -33.045,
      p_medicion: {
        fecha_medicion: "2026-10-05",
        configuracion_fustes: "monofuste_test",
        numero_fustes: null,
        dap_fustes_cm: null,
        dap_cm: 20.5,
        altura_total_m: 8.5,
        diametro_copa_m: 4.2,
        altura_primera_rama_m: 1.8,
        clase_edad: "juvenil",
      },
    });
    expect(res.body.data.id).toBe(TREE_ID);
    expect(res.body.data.medicion_actual_estado).toBe("ok");
    expect(res.body.data.medicion_actual.id).toBe("m-init-1");
  });

  it("usuario_municipal miembro -> 201 exitoso", async () => {
    authAsMunicipal();
    mockFindMembership.mockResolvedValue({ id: "m1" });
    mockFindProjectById.mockResolvedValue(PROJECT);
    mockCreateTreeWithMeasurementRpc.mockResolvedValue({
      tree_id: TREE_ID,
      measurement_id: "m-init-1",
      tree_code: "VAL-4444",
    });
    mockFindTreeById.mockResolvedValue(fakeTreeDetailRow(TREE_ID));
    mockFindLatestValidMeasurementsCandidates.mockResolvedValue([
      fakeMeasurementRow("m-init-1"),
    ]);

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/trees`)
      .set(authHeader)
      .send(validCreateTreePayload);

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(TREE_ID);
  });
});

describe("GET /api/trees/:treeId", () => {
  it("sin Authorization -> 401", async () => {
    const res = await request(app).get(`/api/trees/${TREE_ID}`);
    expect(res.status).toBe(401);
  });

  it("treeId inválido -> 400", async () => {
    authAsAdmin();
    const res = await request(app).get("/api/trees/no-es-uuid").set(authHeader);
    expect(res.status).toBe(400);
  });

  it("árbol inexistente -> 404", async () => {
    authAsAdmin();
    mockFindTreeById.mockResolvedValue(null);

    const res = await request(app).get(`/api/trees/${TREE_ID}`).set(authHeader);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Árbol no encontrado");
  });

  it("usuario_municipal sin membresía del proyecto -> 403", async () => {
    authAsMunicipal();
    mockFindTreeById.mockResolvedValue(fakeTreeDetailRow(TREE_ID));
    mockFindMembership.mockResolvedValue(null);

    const res = await request(app).get(`/api/trees/${TREE_ID}`).set(authHeader);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("No tiene acceso a este proyecto");
  });

  it("árbol con 1 medición válida -> 200 con medicion_actual ok", async () => {
    authAsAdmin();
    mockFindTreeById.mockResolvedValue(fakeTreeDetailRow(TREE_ID));
    const m1 = fakeMeasurementRow("m-1", { fecha_medicion: "2026-10-05" });
    mockFindLatestValidMeasurementsCandidates.mockResolvedValue([m1]);

    const res = await request(app).get(`/api/trees/${TREE_ID}`).set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(TREE_ID);
    expect(res.body.data.medicion_actual_estado).toBe("ok");
    expect(res.body.data.medicion_actual.id).toBe("m-1");
  });

  it("árbol sin mediciones (legacy) -> 200 con medicion_actual null y estado sin_mediciones", async () => {
    authAsAdmin();
    mockFindTreeById.mockResolvedValue(fakeTreeDetailRow(TREE_ID));
    mockFindLatestValidMeasurementsCandidates.mockResolvedValue([]);

    const res = await request(app).get(`/api/trees/${TREE_ID}`).set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(TREE_ID);
    expect(res.body.data.medicion_actual).toBeNull();
    expect(res.body.data.medicion_actual_estado).toBe("sin_mediciones");
  });

  it("árbol con 2 mediciones válidas con empate en fecha máxima -> 200 con medicion_actual null y error_empate_fecha_maxima", async () => {
    authAsAdmin();
    mockFindTreeById.mockResolvedValue(fakeTreeDetailRow(TREE_ID));
    const m1 = fakeMeasurementRow("m-1", { fecha_medicion: "2026-10-05" });
    const m2 = fakeMeasurementRow("m-2", { fecha_medicion: "2026-10-05" });
    mockFindLatestValidMeasurementsCandidates.mockResolvedValue([m1, m2]);

    const res = await request(app).get(`/api/trees/${TREE_ID}`).set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.medicion_actual).toBeNull();
    expect(res.body.data.medicion_actual_estado).toBe("error_empate_fecha_maxima");
  });
});

describe("GET /api/trees/:treeId/measurements", () => {
  it("sin Authorization -> 401", async () => {
    const res = await request(app).get(`/api/trees/${TREE_ID}/measurements`);
    expect(res.status).toBe(401);
  });

  it("treeId inválido -> 400", async () => {
    authAsAdmin();
    const res = await request(app).get("/api/trees/no-es-uuid/measurements").set(authHeader);
    expect(res.status).toBe(400);
  });

  it("árbol inexistente -> 404", async () => {
    authAsAdmin();
    mockFindTreeById.mockResolvedValue(null);

    const res = await request(app).get(`/api/trees/${TREE_ID}/measurements`).set(authHeader);
    expect(res.status).toBe(404);
  });

  it("usuario_municipal sin membresía -> 403", async () => {
    authAsMunicipal();
    mockFindTreeById.mockResolvedValue(fakeTreeDetailRow(TREE_ID));
    mockFindMembership.mockResolvedValue(null);

    const res = await request(app).get(`/api/trees/${TREE_ID}/measurements`).set(authHeader);
    expect(res.status).toBe(403);
  });

  it("admin consulta historial -> 200 y no incluye anuladas por defecto", async () => {
    authAsAdmin();
    mockFindTreeById.mockResolvedValue(fakeTreeDetailRow(TREE_ID));
    mockFindMeasurementsByTreeId.mockResolvedValue([fakeMeasurementRow("m-1")]);

    const res = await request(app).get(`/api/trees/${TREE_ID}/measurements`).set(authHeader);

    expect(res.status).toBe(200);
    expect(mockFindMeasurementsByTreeId).toHaveBeenCalledWith(FAKE_TOKEN, TREE_ID, false);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.total).toBe(1);
  });

  it("query include_anuladas=true -> pasa true al repository", async () => {
    authAsAdmin();
    mockFindTreeById.mockResolvedValue(fakeTreeDetailRow(TREE_ID));
    mockFindMeasurementsByTreeId.mockResolvedValue([
      fakeMeasurementRow("m-1"),
      fakeMeasurementRow("m-2", { estado_medicion: "anulada" }),
    ]);

    const res = await request(app)
      .get(`/api/trees/${TREE_ID}/measurements?include_anuladas=true`)
      .set(authHeader);

    expect(res.status).toBe(200);
    expect(mockFindMeasurementsByTreeId).toHaveBeenCalledWith(FAKE_TOKEN, TREE_ID, true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.total).toBe(2);
  });
});

