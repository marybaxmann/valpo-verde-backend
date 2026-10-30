/**
 * B-4: «no tiene perfil» (null) no es lo mismo que «no se pudo leer el
 * perfil» (lanza); el service responde 403 y 503 respectivamente.
 */
jest.mock("../../src/config/supabase", () => ({
  supabaseAdmin: { from: jest.fn() },
  createUserScopedClient: jest.fn(),
}));

import { supabaseAdmin } from "../../src/config/supabase";
import { findUserProfileById } from "../../src/repositories/userProfile.repository";

const mockFrom = (supabaseAdmin as unknown as { from: jest.Mock }).from;

function respuesta(resultado: { data: unknown; error: unknown }) {
  const query = { select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn().mockResolvedValue(resultado) };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  mockFrom.mockReturnValue(query);
}

beforeEach(() => jest.clearAllMocks());

describe("findUserProfileById", () => {
  it("sin fila → null", async () => {
    respuesta({ data: null, error: null });
    await expect(findUserProfileById("u1")).resolves.toBeNull();
  });

  it("con fila → el perfil", async () => {
    respuesta({ data: { id: "u1", nombre: "N", activo: true, role: { nombre: "inspector" } }, error: null });
    await expect(findUserProfileById("u1")).resolves.toMatchObject({ id: "u1", activo: true });
  });

  it("falla la lectura → lanza (no se confunde con «sin perfil»)", async () => {
    respuesta({ data: null, error: { message: "timeout", code: "57014" } });
    await expect(findUserProfileById("u1")).rejects.toThrow("Error al leer el perfil del usuario: timeout");
  });
});
