import request from "supertest";

jest.mock("../../src/repositories/auth.repository");
jest.mock("../../src/repositories/userProfile.repository");
jest.mock("../../src/repositories/projectMember.repository");
jest.mock("../../src/repositories/sivu/project.repository");
jest.mock("../../src/repositories/sivu/tree.repository");

import app from "../../src/app";
import { getAuthUserByToken } from "../../src/repositories/auth.repository";
import { findUserProfileById } from "../../src/repositories/userProfile.repository";
import { findMembership } from "../../src/repositories/projectMember.repository";
import { findSectorByProyectoId, SQLSTATE_ARBOL_FUERA_SECTOR } from "../../src/repositories/sivu/project.repository";
import { crearArbolAlta } from "../../src/repositories/sivu/tree.repository";
import { FAKE_TOKEN, adminProfileRow, fakeAuthUser, municipalProfileRow } from "../helpers/authFixtures";

const mockGetAuthUserByToken = getAuthUserByToken as unknown as jest.Mock;
const mockFindUserProfileById = findUserProfileById as unknown as jest.Mock;
const mockFindMembership = findMembership as unknown as jest.Mock;
const mockFindSector = findSectorByProyectoId as unknown as jest.Mock;
const mockCrearArbolAlta = crearArbolAlta as unknown as jest.Mock;

const authHeader = { Authorization: `Bearer ${FAKE_TOKEN}` };
const PROJECT_ID = "33333333-3333-3333-3333-333333333333";
const SECTOR_ID = "44444444-4444-4444-4444-444444444444";
const MUNICIPAL_ID = "22222222-2222-2222-2222-222222222222";

function bodyValido() {
  return {
    sector: "Barrio Puerto",
    ubicacion_descriptiva: "Frente a la plaza",
    utm_este: 256000,
    utm_norte: 6348000,
    especie_cientifica: "Robinia pseudoacacia",
  };
}

function authAsAdmin() {
  mockGetAuthUserByToken.mockResolvedValue(fakeAuthUser());
  mockFindUserProfileById.mockResolvedValue(adminProfileRow());
}

function authAsMunicipal(conMembresia: boolean) {
  mockGetAuthUserByToken.mockResolvedValue(fakeAuthUser({ id: MUNICIPAL_ID }));
  mockFindUserProfileById.mockResolvedValue(municipalProfileRow());
  mockFindMembership.mockResolvedValue(conMembresia ? { project_id: PROJECT_ID, user_id: MUNICIPAL_ID } : null);
}

describe("POST /api/sivu/projects/:id/trees — alta municipal mínima (#57)", () => {
  it("usuario_municipal con membresía: 201, sector_id resuelto del proyecto (no del body)", async () => {
    authAsMunicipal(true);
    mockFindSector.mockResolvedValue({ id: SECTOR_ID, project_id: PROJECT_ID });
    const creado = {
      id: "arbol-1",
      tree_code: "A-000001",
      project_id: PROJECT_ID,
      sector_id: SECTOR_ID,
      ...bodyValido(),
    };
    mockCrearArbolAlta.mockResolvedValue(creado);

    const res = await request(app).post(`/api/sivu/projects/${PROJECT_ID}/trees`).set(authHeader).send(bodyValido());

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual(creado);
    expect(mockCrearArbolAlta).toHaveBeenCalledWith(expect.objectContaining({ projectId: PROJECT_ID, sectorId: SECTOR_ID }));
  });

  it("usuario_municipal sin membresía: 403, sin crear nada", async () => {
    authAsMunicipal(false);

    const res = await request(app).post(`/api/sivu/projects/${PROJECT_ID}/trees`).set(authHeader).send(bodyValido());

    expect(res.status).toBe(403);
    expect(mockCrearArbolAlta).not.toHaveBeenCalled();
  });

  it("admin: 403 (PR-004 v7.0 — el Administrador no registra árboles)", async () => {
    authAsAdmin();

    const res = await request(app).post(`/api/sivu/projects/${PROJECT_ID}/trees`).set(authHeader).send(bodyValido());

    expect(res.status).toBe(403);
    expect(mockCrearArbolAlta).not.toHaveBeenCalled();
  });

  it("sin especie_cientifica ni nombre_comun: 400 (Zod, D-13/D-14)", async () => {
    authAsMunicipal(true);
    const { especie_cientifica, ...resto } = bodyValido();
    void especie_cientifica;

    const res = await request(app).post(`/api/sivu/projects/${PROJECT_ID}/trees`).set(authHeader).send(resto);

    expect(res.status).toBe(400);
    expect(mockCrearArbolAlta).not.toHaveBeenCalled();
  });

  it("sin token: 401", async () => {
    const res = await request(app).post(`/api/sivu/projects/${PROJECT_ID}/trees`).send(bodyValido());
    expect(res.status).toBe(401);
  });

  it("árbol fuera del sector (CC-046): 422", async () => {
    authAsMunicipal(true);
    mockFindSector.mockResolvedValue({ id: SECTOR_ID, project_id: PROJECT_ID });
    const mensaje = "El árbol A-000005 queda fuera de la delimitación del sector de su proyecto";
    mockCrearArbolAlta.mockRejectedValue(new Error(mensaje, { cause: SQLSTATE_ARBOL_FUERA_SECTOR }));

    const res = await request(app).post(`/api/sivu/projects/${PROJECT_ID}/trees`).set(authHeader).send(bodyValido());

    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body)).toContain(mensaje);
  });
});
