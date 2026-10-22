jest.mock("../../src/repositories/projectMember.repository");

import { findMembership } from "../../src/repositories/projectMember.repository";
import { assertProjectRole } from "../../src/services/authorization.service";
import { AuthenticatedUser } from "../../src/types/auth";

const mockFindMembership = findMembership as jest.Mock;

function usuario(role: string | null): AuthenticatedUser {
  return { id: "u1", email: "u1@example.invalid", nombre: "Usuario de prueba", role, activo: true };
}

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const TOKEN = "token-de-prueba";

describe("assertProjectRole", () => {
  it("rechaza un rol que no está en allowedRoles, sin consultar la membresía (CC-033: deniega por defecto)", async () => {
    await expect(
      assertProjectRole(usuario("encargado_mantencion"), PROJECT_ID, ["usuario_municipal"], TOKEN)
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mockFindMembership).not.toHaveBeenCalled();
  });

  it("rechaza role = null", async () => {
    await expect(assertProjectRole(usuario(null), PROJECT_ID, ["admin"], TOKEN)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("rechaza admin cuando la acción no incluye admin, aunque admin tenga acceso transversal (PR-004 v7.0: solo lectura)", async () => {
    await expect(assertProjectRole(usuario("admin"), PROJECT_ID, ["usuario_municipal"], TOKEN)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockFindMembership).not.toHaveBeenCalled();
  });

  it("acepta admin cuando la acción sí lo incluye, sin exigir membresía (assertProjectAccess ya trata a admin como transversal)", async () => {
    await expect(assertProjectRole(usuario("admin"), PROJECT_ID, ["admin"], TOKEN)).resolves.toBeUndefined();
    expect(mockFindMembership).not.toHaveBeenCalled();
  });

  it("con un rol permitido, exige membresía igual que assertProjectAccess", async () => {
    mockFindMembership.mockResolvedValueOnce(null);
    await expect(
      assertProjectRole(usuario("usuario_municipal"), PROJECT_ID, ["usuario_municipal"], TOKEN)
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mockFindMembership).toHaveBeenCalledWith(TOKEN, PROJECT_ID, "u1");
  });

  it("acepta con rol permitido y membresía confirmada", async () => {
    mockFindMembership.mockResolvedValueOnce({ project_id: PROJECT_ID, user_id: "u1" });
    await expect(
      assertProjectRole(usuario("inspector"), PROJECT_ID, ["inspector", "encargado_mantencion"], TOKEN)
    ).resolves.toBeUndefined();
  });

  it("un rol fuera del catálogo de 4 roles (dato corrupto) nunca pasa, aunque coincida como string con allowedRoles", async () => {
    // allowedRoles solo admite RolSivu en TypeScript; esto simula un
    // user.role corrupto que no es ninguno de los 4 roles válidos.
    await expect(
      assertProjectRole(usuario("super_admin"), PROJECT_ID, ["usuario_municipal", "inspector"], TOKEN)
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
