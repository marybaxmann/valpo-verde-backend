import request from "supertest";

jest.mock("../../src/repositories/auth.repository");
jest.mock("../../src/repositories/userProfile.repository");
jest.mock("../../src/repositories/project.repository");
jest.mock("../../src/repositories/projectMember.repository");

import app from "../../src/app";
import { getAuthUserByToken } from "../../src/repositories/auth.repository";
import { findUserProfileById } from "../../src/repositories/userProfile.repository";
import {
  createProject,
  findAllProjects,
  findProjectById,
  findProjectsForMember,
} from "../../src/repositories/project.repository";
import { findMembership } from "../../src/repositories/projectMember.repository";
import {
  ADMIN_ID,
  FAKE_TOKEN,
  adminProfileRow,
  fakeAuthUser,
  municipalProfileRow,
} from "../helpers/authFixtures";

const mockGetAuthUserByToken = getAuthUserByToken as unknown as jest.Mock;
const mockFindUserProfileById = findUserProfileById as unknown as jest.Mock;
const mockCreateProject = createProject as unknown as jest.Mock;
const mockFindAllProjects = findAllProjects as unknown as jest.Mock;
const mockFindProjectById = findProjectById as unknown as jest.Mock;
const mockFindProjectsForMember = findProjectsForMember as unknown as jest.Mock;
const mockFindMembership = findMembership as unknown as jest.Mock;

const authHeader = { Authorization: `Bearer ${FAKE_TOKEN}` };
const PROJECT_ID = "33333333-3333-3333-3333-333333333333";

function authAsAdmin() {
  mockGetAuthUserByToken.mockResolvedValue(fakeAuthUser());
  mockFindUserProfileById.mockResolvedValue(adminProfileRow());
}

function authAsMunicipal() {
  mockGetAuthUserByToken.mockResolvedValue(
    fakeAuthUser({ id: "22222222-2222-2222-2222-222222222222" })
  );
  mockFindUserProfileById.mockResolvedValue(municipalProfileRow());
}

describe("PROJECTS", () => {
  it("admin puede crear proyecto -> 201", async () => {
    authAsAdmin();
    const created = {
      id: PROJECT_ID,
      name: "Plaza X",
      institution_name: "Municipalidad",
      responsible_professional: null,
      created_by: ADMIN_ID,
      status: "activo",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    mockCreateProject.mockResolvedValue(created);

    const res = await request(app)
      .post("/api/projects")
      .set(authHeader)
      .send({ name: "Plaza X", institution_name: "Municipalidad" });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual(created);
  });

  it("usuario_municipal no puede crear proyecto -> 403", async () => {
    authAsMunicipal();

    const res = await request(app)
      .post("/api/projects")
      .set(authHeader)
      .send({ name: "Plaza X", institution_name: "Municipalidad" });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Requiere rol administrador");
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  it("admin lista todos los proyectos", async () => {
    authAsAdmin();
    mockFindAllProjects.mockResolvedValue([{ id: "p1" }, { id: "p2" }]);

    const res = await request(app).get("/api/projects").set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(mockFindAllProjects).toHaveBeenCalled();
    expect(mockFindProjectsForMember).not.toHaveBeenCalled();
  });

  it("usuario_municipal sin memberships -> lista vacía", async () => {
    authAsMunicipal();
    mockFindProjectsForMember.mockResolvedValue([]);

    const res = await request(app).get("/api/projects").set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("usuario_municipal con membership -> solo su proyecto", async () => {
    authAsMunicipal();
    mockFindProjectsForMember.mockResolvedValue([{ id: PROJECT_ID }]);

    const res = await request(app).get("/api/projects").set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: PROJECT_ID }]);
  });

  it("GET /:id — admin permitido", async () => {
    authAsAdmin();
    mockFindProjectById.mockResolvedValue({ id: PROJECT_ID });

    const res = await request(app)
      .get(`/api/projects/${PROJECT_ID}`)
      .set(authHeader);

    expect(res.status).toBe(200);
  });

  it("GET /:id — usuario_municipal miembro permitido", async () => {
    authAsMunicipal();
    mockFindMembership.mockResolvedValue({ id: "m1" });
    mockFindProjectById.mockResolvedValue({ id: PROJECT_ID });

    const res = await request(app)
      .get(`/api/projects/${PROJECT_ID}`)
      .set(authHeader);

    expect(res.status).toBe(200);
  });

  it("GET /:id — usuario_municipal no miembro -> 403 (no 404)", async () => {
    authAsMunicipal();
    mockFindMembership.mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/projects/${PROJECT_ID}`)
      .set(authHeader);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("No tiene acceso a este proyecto");
    // El check de acceso ocurre ANTES de buscar el proyecto (project.service.ts).
    expect(mockFindProjectById).not.toHaveBeenCalled();
  });

  it("GET /:id — admin, proyecto inexistente -> 404", async () => {
    authAsAdmin();
    mockFindProjectById.mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/projects/${PROJECT_ID}`)
      .set(authHeader);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Proyecto no encontrado");
  });
});
