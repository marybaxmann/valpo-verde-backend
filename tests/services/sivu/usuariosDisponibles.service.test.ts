/** B11 — usuarios que aún no son miembros: solo el Administrador; filtro por rol. */
jest.mock("../../../src/services/authorization.service", () => ({
  ...jest.requireActual("../../../src/services/authorization.service"),
  invalidateMembership: jest.fn(),
}));
jest.mock("../../../src/repositories/sivu/project.repository");
jest.mock("../../../src/repositories/sivu/projectMember.repository", () => ({
  ...jest.requireActual("../../../src/repositories/sivu/projectMember.repository"),
  listarUsuariosNoMiembros: jest.fn(),
}));

import { listarUsuariosDisponibles } from "../../../src/services/sivu/projectMember.service";
import { findProyectoById } from "../../../src/repositories/sivu/project.repository";
import { listarUsuariosNoMiembros } from "../../../src/repositories/sivu/projectMember.repository";

const admin = { id: "a1", email: undefined, nombre: "Admin", role: "admin", activo: true };
const municipal = { ...admin, id: "m1", role: "usuario_municipal" };

beforeEach(() => {
  (findProyectoById as jest.Mock).mockResolvedValue({ id: "p1" });
  (listarUsuariosNoMiembros as jest.Mock).mockResolvedValue([
    { id: "u1", nombre: "Inspector 3", codigo_usuario: "USR-201", activo: true, role: { nombre: "inspector" } },
    { id: "u2", nombre: "Municipal 2", codigo_usuario: "USR-202", activo: false, role: { nombre: "usuario_municipal" } },
  ]);
});

describe("listarUsuariosDisponibles (B11)", () => {
  it("entrega id, nombre, código, rol y si está activo", async () => {
    const r = await listarUsuariosDisponibles(admin, "p1", "token");
    expect(r).toEqual([
      { id: "u1", nombre: "Inspector 3", codigo_usuario: "USR-201", rol: "inspector", activo: true },
      { id: "u2", nombre: "Municipal 2", codigo_usuario: "USR-202", rol: "usuario_municipal", activo: false },
    ]);
    expect(listarUsuariosNoMiembros).toHaveBeenCalledWith("token", "p1");
  });

  it("filtra por rol", async () => {
    const r = await listarUsuariosDisponibles(admin, "p1", "token", "inspector");
    expect(r.map((u) => u.id)).toEqual(["u1"]);
  });

  it("solo el Administrador (403 para otro rol)", async () => {
    await expect(listarUsuariosDisponibles(municipal, "p1", "token")).rejects.toMatchObject({ statusCode: 403 });
    expect(listarUsuariosNoMiembros).not.toHaveBeenCalled();
  });

  it("proyecto inexistente: 404", async () => {
    (findProyectoById as jest.Mock).mockResolvedValue(null);
    await expect(listarUsuariosDisponibles(admin, "p1", "token")).rejects.toMatchObject({ statusCode: 404 });
  });
});
