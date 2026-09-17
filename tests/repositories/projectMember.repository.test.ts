/**
 * Prueba la lógica no trivial que vive dentro de projectMember.repository.ts
 * (traducción de errores de Postgres, interpretación de resultados).
 *
 * Desde el cutover a RLS, el repository ya no usa `supabaseAdmin`: cada
 * función crea su propio cliente vía `createUserScopedClient(accessToken)`
 * (src/config/supabase.ts). Se mockea esa factory, no el SDK completo de
 * @supabase/supabase-js — el cliente que devuelve sigue siendo totalmente
 * mockeado (ninguna llamada real a Supabase).
 */
jest.mock("../../src/config/supabase", () => ({
  createUserScopedClient: jest.fn(),
}));

import { createUserScopedClient } from "../../src/config/supabase";
import {
  DuplicateMembershipError,
  createMembership,
  deleteMembership,
} from "../../src/repositories/projectMember.repository";

const mockCreateUserScopedClient = createUserScopedClient as unknown as jest.Mock;

const FAKE_TOKEN = "fake-access-token";

describe("createMembership", () => {
  it("traduce el código Postgres 23505 (UNIQUE violada) a DuplicateMembershipError", async () => {
    const single = jest
      .fn()
      .mockResolvedValue({ data: null, error: { code: "23505", message: "duplicate key" } });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    const from = jest.fn().mockReturnValue({ insert });
    mockCreateUserScopedClient.mockReturnValue({ from });

    await expect(createMembership(FAKE_TOKEN, "p1", "u1", "admin1")).rejects.toThrow(
      DuplicateMembershipError
    );

    expect(mockCreateUserScopedClient).toHaveBeenCalledWith(FAKE_TOKEN);
    expect(from).toHaveBeenCalledWith("project_members");
  });

  it("propaga cualquier otro error de escritura como Error genérico", async () => {
    const single = jest
      .fn()
      .mockResolvedValue({ data: null, error: { code: "23000", message: "boom" } });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    const from = jest.fn().mockReturnValue({ insert });
    mockCreateUserScopedClient.mockReturnValue({ from });

    await expect(createMembership(FAKE_TOKEN, "p1", "u1", "admin1")).rejects.toThrow(
      "Error al agregar miembro: boom"
    );

    expect(mockCreateUserScopedClient).toHaveBeenCalledWith(FAKE_TOKEN);
  });
});

describe("deleteMembership", () => {
  it("devuelve true si existía una fila y fue eliminada", async () => {
    const select = jest.fn().mockResolvedValue({ data: [{ id: "m1" }], error: null });
    const eq2 = jest.fn().mockReturnValue({ select });
    const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
    const del = jest.fn().mockReturnValue({ eq: eq1 });
    const from = jest.fn().mockReturnValue({ delete: del });
    mockCreateUserScopedClient.mockReturnValue({ from });

    await expect(deleteMembership(FAKE_TOKEN, "p1", "u1")).resolves.toBe(true);

    expect(mockCreateUserScopedClient).toHaveBeenCalledWith(FAKE_TOKEN);
  });

  it("devuelve false si no existía ninguna fila", async () => {
    const select = jest.fn().mockResolvedValue({ data: [], error: null });
    const eq2 = jest.fn().mockReturnValue({ select });
    const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
    const del = jest.fn().mockReturnValue({ eq: eq1 });
    const from = jest.fn().mockReturnValue({ delete: del });
    mockCreateUserScopedClient.mockReturnValue({ from });

    await expect(deleteMembership(FAKE_TOKEN, "p1", "u1")).resolves.toBe(false);

    expect(mockCreateUserScopedClient).toHaveBeenCalledWith(FAKE_TOKEN);
  });
});
