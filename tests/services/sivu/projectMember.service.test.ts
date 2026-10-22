jest.mock("../../../src/repositories/sivu/project.repository");
jest.mock("../../../src/repositories/sivu/projectMember.repository");
jest.mock("../../../src/repositories/projectMember.repository");
jest.mock("../../../src/repositories/userProfile.repository");
jest.mock("../../../src/services/authorization.service", () => ({
  assertAdmin: jest.fn((user) => {
    if (user.role !== "admin") {
      const err = Object.assign(new Error("Requiere rol administrador"), { statusCode: 403 });
      throw err;
    }
  }),
  invalidateMembership: jest.fn(),
}));

import { findProyectoById } from "../../../src/repositories/sivu/project.repository";
import {
  createMembershipSivu,
  deleteMembershipSivu,
  DuplicateMembershipError,
} from "../../../src/repositories/sivu/projectMember.repository";
import { listMembersByProject } from "../../../src/repositories/projectMember.repository";
import { findUserProfileById } from "../../../src/repositories/userProfile.repository";
import { assertAdmin, invalidateMembership } from "../../../src/services/authorization.service";
import {
  addProyectoMember,
  listProyectoMembers,
  removeProyectoMember,
} from "../../../src/services/sivu/projectMember.service";
import { AuthenticatedUser } from "../../../src/types/auth";

const mockFindProyectoById = findProyectoById as jest.Mock;
const mockListMembers = listMembersByProject as jest.Mock;
const mockFindUserProfileById = findUserProfileById as jest.Mock;
const mockCreateMembershipSivu = createMembershipSivu as jest.Mock;
const mockDeleteMembershipSivu = deleteMembershipSivu as jest.Mock;
const mockInvalidateMembership = invalidateMembership as jest.Mock;
const mockAssertAdmin = assertAdmin as jest.Mock;

// `resetMocks: true` (jest.config.js) borra, antes de cada test, la
// implementación que el factory de `jest.mock(...)` le dio a
// `assertAdmin` — hay que restablecerla en cada test, no solo una vez.
beforeEach(() => {
  mockAssertAdmin.mockImplementation((user: AuthenticatedUser) => {
    if (user.role !== "admin") {
      throw Object.assign(new Error("Requiere rol administrador"), { statusCode: 403 });
    }
  });
});

function usuario(role: string | null): AuthenticatedUser {
  return { id: "admin-1", email: "admin@example.invalid", nombre: "Admin de prueba", role, activo: true };
}

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const TARGET_USER_ID = "22222222-2222-2222-2222-222222222222";
const TOKEN = "token-de-prueba";

describe("listProyectoMembers", () => {
  it("rechaza si no es admin", async () => {
    await expect(listProyectoMembers(usuario("inspector"), PROJECT_ID, TOKEN)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("404 si el proyecto no existe", async () => {
    mockFindProyectoById.mockResolvedValueOnce(null);
    await expect(listProyectoMembers(usuario("admin"), PROJECT_ID, TOKEN)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("admin: lista los miembros con el JWT del usuario", async () => {
    mockFindProyectoById.mockResolvedValueOnce({ id: PROJECT_ID });
    mockListMembers.mockResolvedValueOnce([{ id: "m1" }]);
    const data = await listProyectoMembers(usuario("admin"), PROJECT_ID, TOKEN);
    expect(mockListMembers).toHaveBeenCalledWith(TOKEN, PROJECT_ID);
    expect(data).toEqual([{ id: "m1" }]);
  });
});

describe("addProyectoMember", () => {
  it("404 si el usuario a agregar no existe", async () => {
    mockFindProyectoById.mockResolvedValueOnce({ id: PROJECT_ID });
    mockFindUserProfileById.mockResolvedValueOnce(null);
    await expect(
      addProyectoMember(usuario("admin"), PROJECT_ID, TARGET_USER_ID, TOKEN)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("409 si la membresía ya existe", async () => {
    mockFindProyectoById.mockResolvedValueOnce({ id: PROJECT_ID });
    mockFindUserProfileById.mockResolvedValueOnce({ id: TARGET_USER_ID });
    mockCreateMembershipSivu.mockRejectedValueOnce(new DuplicateMembershipError());
    await expect(
      addProyectoMember(usuario("admin"), PROJECT_ID, TARGET_USER_ID, TOKEN)
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("admin: crea la membresía con service_role (added_by = user.id)", async () => {
    mockFindProyectoById.mockResolvedValueOnce({ id: PROJECT_ID });
    mockFindUserProfileById.mockResolvedValueOnce({ id: TARGET_USER_ID });
    mockCreateMembershipSivu.mockResolvedValueOnce({ id: "pm1" });
    const data = await addProyectoMember(usuario("admin"), PROJECT_ID, TARGET_USER_ID, TOKEN);
    expect(mockCreateMembershipSivu).toHaveBeenCalledWith(PROJECT_ID, TARGET_USER_ID, "admin-1");
    expect(data).toEqual({ id: "pm1" });
  });
});

describe("removeProyectoMember", () => {
  it("404 si la membresía no existía", async () => {
    mockFindProyectoById.mockResolvedValueOnce({ id: PROJECT_ID });
    mockDeleteMembershipSivu.mockResolvedValueOnce(false);
    await expect(
      removeProyectoMember(usuario("admin"), PROJECT_ID, TARGET_USER_ID, TOKEN)
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(mockInvalidateMembership).not.toHaveBeenCalled();
  });

  it("al eliminar, invalida la membresía en caché (si no, seguiría pasando assertProjectAccess hasta 60s)", async () => {
    mockFindProyectoById.mockResolvedValueOnce({ id: PROJECT_ID });
    mockDeleteMembershipSivu.mockResolvedValueOnce(true);
    await removeProyectoMember(usuario("admin"), PROJECT_ID, TARGET_USER_ID, TOKEN);
    expect(mockInvalidateMembership).toHaveBeenCalledWith(PROJECT_ID, TARGET_USER_ID);
  });
});
