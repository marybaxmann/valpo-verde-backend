/**
 * Prueba la lógica no trivial que vive dentro de projectMember.repository.ts
 * (traducción de errores de Postgres, interpretación de resultados),
 * mockeando únicamente `supabaseAdmin` (no el módulo bajo test, no el SDK
 * completo de @supabase/supabase-js) — ver informe de diseño, sección B.
 */
jest.mock("../../src/config/supabase", () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

import { supabaseAdmin } from "../../src/config/supabase";
import {
  DuplicateMembershipError,
  createMembership,
  deleteMembership,
} from "../../src/repositories/projectMember.repository";

const mockFrom = supabaseAdmin.from as unknown as jest.Mock;

describe("createMembership", () => {
  it("traduce el código Postgres 23505 (UNIQUE violada) a DuplicateMembershipError", async () => {
    const single = jest
      .fn()
      .mockResolvedValue({ data: null, error: { code: "23505", message: "duplicate key" } });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    mockFrom.mockReturnValue({ insert });

    await expect(createMembership("p1", "u1", "admin1")).rejects.toThrow(
      DuplicateMembershipError
    );
  });

  it("propaga cualquier otro error de escritura como Error genérico", async () => {
    const single = jest
      .fn()
      .mockResolvedValue({ data: null, error: { code: "23000", message: "boom" } });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    mockFrom.mockReturnValue({ insert });

    await expect(createMembership("p1", "u1", "admin1")).rejects.toThrow(
      "Error al agregar miembro: boom"
    );
  });
});

describe("deleteMembership", () => {
  it("devuelve true si existía una fila y fue eliminada", async () => {
    const select = jest.fn().mockResolvedValue({ data: [{ id: "m1" }], error: null });
    const eq2 = jest.fn().mockReturnValue({ select });
    const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
    const del = jest.fn().mockReturnValue({ eq: eq1 });
    mockFrom.mockReturnValue({ delete: del });

    await expect(deleteMembership("p1", "u1")).resolves.toBe(true);
  });

  it("devuelve false si no existía ninguna fila", async () => {
    const select = jest.fn().mockResolvedValue({ data: [], error: null });
    const eq2 = jest.fn().mockReturnValue({ select });
    const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
    const del = jest.fn().mockReturnValue({ eq: eq1 });
    mockFrom.mockReturnValue({ delete: del });

    await expect(deleteMembership("p1", "u1")).resolves.toBe(false);
  });
});
