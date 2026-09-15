import request from "supertest";

jest.mock("../../src/repositories/auth.repository");
jest.mock("../../src/repositories/userProfile.repository");
jest.mock("../../src/repositories/project.repository");
jest.mock("../../src/repositories/projectMember.repository");

import app from "../../src/app";
import { getAuthUserByToken } from "../../src/repositories/auth.repository";
import { findUserProfileById } from "../../src/repositories/userProfile.repository";
import { findProjectById } from "../../src/repositories/project.repository";
import {
  DuplicateMembershipError,
  createMembership,
  deleteMembership,
  listMembersByProject,
} from "../../src/repositories/projectMember.repository";
import {
  ADMIN_ID,
  FAKE_TOKEN,
  MUNICIPAL_ID,
  adminProfileRow,
  fakeAuthUser,
  municipalProfileRow,
} from "../helpers/authFixtures";

const mockGetAuthUserByToken = getAuthUserByToken as unknown as jest.Mock;
const mockFindUserProfileById = findUserProfileById as unknown as jest.Mock;
const mockFindProjectById = findProjectById as unknown as jest.Mock;
const mockListMembersByProject = listMembersByProject as unknown as jest.Mock;
const mockCreateMembership = createMembership as unknown as jest.Mock;
const mockDeleteMembership = deleteMembership as unknown as jest.Mock;

const authHeader = { Authorization: `Bearer ${FAKE_TOKEN}` };
const PROJECT_ID = "33333333-3333-3333-3333-333333333333";
const TARGET_USER_ID = "44444444-4444-4444-4444-444444444444";

function authAsAdmin() {
  mockGetAuthUserByToken.mockResolvedValue(fakeAuthUser({ id: ADMIN_ID }));
}

function authAsMunicipal() {
  mockGetAuthUserByToken.mockResolvedValue(fakeAuthUser({ id: MUNICIPAL_ID }));
}

/**
 * `findUserProfileById` se reutiliza tanto para resolver `req.user` (vía
 * auth.middleware.ts) como para verificar la existencia del usuario
 * destino en `addProjectMember`. Este default distingue por id; los
 * tests de "usuario inexistente" confían en el `return null` final.
 */
function defaultFindUserProfileById(targetProfile?: Record<string, unknown>) {
  mockFindUserProfileById.mockImplementation((id: string) => {
    if (id === ADMIN_ID) return Promise.resolve(adminProfileRow());
    if (id === MUNICIPAL_ID) return Promise.resolve(municipalProfileRow());
    if (targetProfile && id === TARGET_USER_ID) return Promise.resolve(targetProfile);
    return Promise.resolve(null);
  });
}

beforeEach(() => {
  defaultFindUserProfileById();
  mockFindProjectById.mockResolvedValue({ id: PROJECT_ID });
});

describe("MEMBERSHIPS", () => {
  it("admin puede listar miembros", async () => {
    authAsAdmin();
    mockListMembersByProject.mockResolvedValue([
      { id: "m1", user_id: TARGET_USER_ID, user: { nombre: "X" } },
    ]);

    const res = await request(app)
      .get(`/api/projects/${PROJECT_ID}/members`)
      .set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("usuario_municipal no puede listar miembros -> 403", async () => {
    authAsMunicipal();

    const res = await request(app)
      .get(`/api/projects/${PROJECT_ID}/members`)
      .set(authHeader);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Requiere rol administrador");
  });

  it("admin puede agregar miembro -> 201", async () => {
    authAsAdmin();
    defaultFindUserProfileById({
      id: TARGET_USER_ID,
      nombre: "Miembro nuevo",
      activo: true,
      role: { nombre: "usuario_municipal" },
    });
    mockCreateMembership.mockResolvedValue({
      id: "m1",
      project_id: PROJECT_ID,
      user_id: TARGET_USER_ID,
      added_by: ADMIN_ID,
      created_at: "2026-01-01T00:00:00.000Z",
    });

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/members`)
      .set(authHeader)
      .send({ user_id: TARGET_USER_ID });

    expect(res.status).toBe(201);
  });

  it("membresía duplicada -> 409", async () => {
    authAsAdmin();
    defaultFindUserProfileById({
      id: TARGET_USER_ID,
      nombre: "Miembro nuevo",
      activo: true,
      role: { nombre: "usuario_municipal" },
    });
    mockCreateMembership.mockRejectedValue(new DuplicateMembershipError());

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/members`)
      .set(authHeader)
      .send({ user_id: TARGET_USER_ID });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("El usuario ya es miembro de este proyecto");
  });

  it("usuario destino inexistente -> 404 'Usuario no encontrado'", async () => {
    authAsAdmin();
    // defaultFindUserProfileById() del beforeEach ya devuelve null para
    // cualquier id que no sea ADMIN_ID/MUNICIPAL_ID — no hace falta
    // reconfigurar nada para simular "usuario no encontrado".

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/members`)
      .set(authHeader)
      .send({ user_id: TARGET_USER_ID });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Usuario no encontrado");
    expect(mockCreateMembership).not.toHaveBeenCalled();
  });

  it("admin puede eliminar miembro -> 204", async () => {
    authAsAdmin();
    mockDeleteMembership.mockResolvedValue(true);

    const res = await request(app)
      .delete(`/api/projects/${PROJECT_ID}/members/${TARGET_USER_ID}`)
      .set(authHeader);

    expect(res.status).toBe(204);
  });

  it("admin elimina membresía inexistente -> 404 'Membresía no encontrada'", async () => {
    authAsAdmin();
    mockDeleteMembership.mockResolvedValue(false);

    const res = await request(app)
      .delete(`/api/projects/${PROJECT_ID}/members/${TARGET_USER_ID}`)
      .set(authHeader);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Membresía no encontrada");
  });

  it("usuario_municipal no puede agregar miembro -> 403", async () => {
    authAsMunicipal();

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/members`)
      .set(authHeader)
      .send({ user_id: TARGET_USER_ID });

    expect(res.status).toBe(403);
    expect(mockCreateMembership).not.toHaveBeenCalled();
  });

  it("usuario_municipal no puede eliminar miembro -> 403", async () => {
    authAsMunicipal();

    const res = await request(app)
      .delete(`/api/projects/${PROJECT_ID}/members/${TARGET_USER_ID}`)
      .set(authHeader);

    expect(res.status).toBe(403);
    expect(mockDeleteMembership).not.toHaveBeenCalled();
  });
});
