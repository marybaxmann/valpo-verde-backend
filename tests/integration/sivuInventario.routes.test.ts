import request from "supertest";

jest.mock("../../src/repositories/auth.repository");
jest.mock("../../src/repositories/userProfile.repository");
jest.mock("../../src/repositories/projectMember.repository");
jest.mock("../../src/repositories/sivu/inventory.repository", () => ({
  listarArbolesInventario: jest.fn(),
}));

import app from "../../src/app";
import { getAuthUserByToken } from "../../src/repositories/auth.repository";
import { findUserProfileById } from "../../src/repositories/userProfile.repository";
import { findMembership } from "../../src/repositories/projectMember.repository";
import { listarArbolesInventario } from "../../src/repositories/sivu/inventory.repository";
import {
  FAKE_TOKEN,
  ADMIN_ID,
  MUNICIPAL_ID,
  INSPECTOR_ID,
  fakeAuthUser,
  adminProfileRow,
  municipalProfileRow,
  inspectorProfileRow,
} from "../helpers/authFixtures";

const authHeader = { Authorization: `Bearer ${FAKE_TOKEN}` };
const PROJECT_ID = "33333333-3333-3333-3333-333333333333";

/** Árbol de prueba mínimo (proyección del alta + vigentes). */
const arbolFila = {
  id: "aaaa0001-0000-0000-0000-000000000001",
  tree_code: "A-000001",
  project_id: PROJECT_ID,
  sector_id: "bbbb0001-0000-0000-0000-000000000001",
  sector: "Sector Norte",
  ubicacion_descriptiva: "Frente al n°10",
  utm_este: 234567,
  utm_norte: 6123456,
  ubicacion: { type: "Point" as const, coordinates: [-71.55, -33.04] },
  especie_cientifica: "Platanus orientalis",
  nombre_comun: "Plátano oriental",
  estado_ciclo_vida: "activo",
  fecha_registro: "2026-01-15",
};

/** Árbol esperado en la respuesta (DTO). */
const arbolDto = {
  id: arbolFila.id,
  tree_code: "A-000001",
  sector_id: arbolFila.sector_id,
  sector: "Sector Norte",
  ubicacion_descriptiva: "Frente al n°10",
  utm_este: 234567,
  utm_norte: 6123456,
  ubicacion: { lng: -71.55, lat: -33.04 },
  especie_cientifica: "Platanus orientalis",
  nombre_comun: "Plátano oriental",
  estado_ciclo_vida: "activo",
  fecha_registro: "2026-01-15",
};

function auth(
  id: string,
  perfil: unknown,
  conMembresia = true
) {
  (getAuthUserByToken as unknown as jest.Mock).mockResolvedValue(
    fakeAuthUser({ id })
  );
  (findUserProfileById as unknown as jest.Mock).mockResolvedValue(perfil);
  (findMembership as unknown as jest.Mock).mockResolvedValue(
    conMembresia ? { project_id: PROJECT_ID, user_id: id } : null
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (listarArbolesInventario as jest.Mock).mockResolvedValue({
    filas: [],
    total: 0,
  });
});

const RUTA = `/api/sivu/projects/${PROJECT_ID}/trees`;

describe("GET /api/sivu/projects/:id/trees (B1 — inventario arbóreo; CC-064)", () => {
  // ------------------------------------------------------------------ autenticación
  it("sin token: 401", async () => {
    const res = await request(app).get(RUTA);
    expect(res.status).toBe(401);
    expect(listarArbolesInventario).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------ autorización
  it("sin membresía: 403", async () => {
    auth(INSPECTOR_ID, inspectorProfileRow(), false);
    const res = await request(app).get(RUTA).set(authHeader);
    expect(res.status).toBe(403);
    expect(listarArbolesInventario).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------ roles autorizados (CC-064 a)
  it.each([
    ["admin", ADMIN_ID, adminProfileRow()],
    ["usuario_municipal", MUNICIPAL_ID, municipalProfileRow()],
    ["inspector", INSPECTOR_ID, inspectorProfileRow()],
  ])("rol '%s' con membresía: 200 con estructura esperada", async (_, id, perfil) => {
    auth(id, perfil);
    const res = await request(app).get(RUTA).set(authHeader);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [], total: 0, limit: 50, offset: 0 });
  });

  // ------------------------------------------------------------------ respuesta con datos
  it("devuelve árbol mapeado al DTO con ubicacion {lng, lat}", async () => {
    auth(MUNICIPAL_ID, municipalProfileRow());
    (listarArbolesInventario as jest.Mock).mockResolvedValue({
      filas: [arbolFila],
      total: 1,
    });
    const res = await request(app).get(RUTA).set(authHeader);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toEqual(arbolDto);
    expect(res.body.total).toBe(1);
  });

  // ------------------------------------------------------------------ árbol sin coordenadas
  it("árbol sin ubicacion → ubicacion null en el DTO", async () => {
    auth(MUNICIPAL_ID, municipalProfileRow());
    (listarArbolesInventario as jest.Mock).mockResolvedValue({
      filas: [{ ...arbolFila, ubicacion: null, utm_este: null, utm_norte: null }],
      total: 1,
    });
    const res = await request(app).get(RUTA).set(authHeader);
    expect(res.body.data[0].ubicacion).toBeNull();
  });

  // ------------------------------------------------------------------ filtros pasados al repositorio
  it("pasa limit y offset al repositorio", async () => {
    auth(MUNICIPAL_ID, municipalProfileRow());
    await request(app)
      .get(RUTA)
      .query({ limit: "10", offset: "20" })
      .set(authHeader);
    expect(
      (listarArbolesInventario as jest.Mock).mock.calls[0][1]
    ).toMatchObject({ limit: 10, offset: 20 });
  });

  it("pasa sector_id al repositorio", async () => {
    auth(MUNICIPAL_ID, municipalProfileRow());
    const SECTOR_ID = "bbbb0001-0000-0000-0000-000000000001";
    await request(app)
      .get(RUTA)
      .query({ sector_id: SECTOR_ID })
      .set(authHeader);
    expect(
      (listarArbolesInventario as jest.Mock).mock.calls[0][1]
    ).toMatchObject({ sectorId: SECTOR_ID });
  });

  it("pasa estado_ciclo_vida al repositorio", async () => {
    auth(MUNICIPAL_ID, municipalProfileRow());
    await request(app)
      .get(RUTA)
      .query({ estado_ciclo_vida: "retirado" })
      .set(authHeader);
    expect(
      (listarArbolesInventario as jest.Mock).mock.calls[0][1]
    ).toMatchObject({ estadoCicloVida: "retirado" });
  });

  it("pasa busqueda al repositorio", async () => {
    auth(MUNICIPAL_ID, municipalProfileRow());
    await request(app)
      .get(RUTA)
      .query({ busqueda: "Platanus" })
      .set(authHeader);
    expect(
      (listarArbolesInventario as jest.Mock).mock.calls[0][1]
    ).toMatchObject({ busqueda: "Platanus" });
  });

  // ------------------------------------------------------------------ validación query
  it("estado_ciclo_vida inválido: 400", async () => {
    auth(MUNICIPAL_ID, municipalProfileRow());
    const res = await request(app)
      .get(RUTA)
      .query({ estado_ciclo_vida: "no_existe" })
      .set(authHeader);
    expect(res.status).toBe(400);
  });

  it("sector_id que no es UUID: 400", async () => {
    auth(MUNICIPAL_ID, municipalProfileRow());
    const res = await request(app)
      .get(RUTA)
      .query({ sector_id: "no-un-uuid" })
      .set(authHeader);
    expect(res.status).toBe(400);
  });

  it("limit fuera de rango: 400", async () => {
    auth(MUNICIPAL_ID, municipalProfileRow());
    const res = await request(app)
      .get(RUTA)
      .query({ limit: "500" })
      .set(authHeader);
    expect(res.status).toBe(400);
  });

  // ------------------------------------------------------------------ paginación por defecto
  it("sin filtros: usa limit=50 y offset=0 por defecto", async () => {
    auth(ADMIN_ID, adminProfileRow());
    const res = await request(app).get(RUTA).set(authHeader);
    expect(res.body).toMatchObject({ limit: 50, offset: 0 });
    expect(
      (listarArbolesInventario as jest.Mock).mock.calls[0][1]
    ).toMatchObject({ limit: 50, offset: 0 });
  });
});
