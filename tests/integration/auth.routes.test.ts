import request from "supertest";

jest.mock("../../src/repositories/auth.repository");
jest.mock("../../src/repositories/userProfile.repository");

import app from "../../src/app";
import { getAuthUserByToken } from "../../src/repositories/auth.repository";
import { findUserProfileById } from "../../src/repositories/userProfile.repository";
import {
  FAKE_TOKEN,
  adminProfileRow,
  fakeAuthUser,
  municipalProfileRow,
} from "../helpers/authFixtures";

const mockGetAuthUserByToken = getAuthUserByToken as unknown as jest.Mock;
const mockFindUserProfileById = findUserProfileById as unknown as jest.Mock;

const authHeader = { Authorization: `Bearer ${FAKE_TOKEN}` };

describe("AUTH — GET /api/auth/me", () => {
  it("sin header Authorization -> 401", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
  });

  it("Bearer vacío (sin token) -> 401", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer ");

    expect(res.status).toBe(401);
  });

  it("token no reconocido por Supabase Auth -> 401", async () => {
    mockGetAuthUserByToken.mockResolvedValue(null);

    const res = await request(app).get("/api/auth/me").set(authHeader);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Token inválido o expirado");
  });

  it("autenticado en Supabase Auth pero sin perfil en user_profiles -> 403 (no 401)", async () => {
    mockGetAuthUserByToken.mockResolvedValue(fakeAuthUser());
    mockFindUserProfileById.mockResolvedValue(null);

    const res = await request(app).get("/api/auth/me").set(authHeader);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Perfil de usuario no encontrado");
  });

  it("perfil inactivo -> 403 (no 401)", async () => {
    mockGetAuthUserByToken.mockResolvedValue(fakeAuthUser());
    mockFindUserProfileById.mockResolvedValue(adminProfileRow({ activo: false }));

    const res = await request(app).get("/api/auth/me").set(authHeader);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Usuario inactivo");
  });

  it("admin válido -> 200", async () => {
    mockGetAuthUserByToken.mockResolvedValue(fakeAuthUser());
    mockFindUserProfileById.mockResolvedValue(adminProfileRow());

    const res = await request(app).get("/api/auth/me").set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("admin");
  });

  it("usuario_municipal válido -> 200", async () => {
    mockGetAuthUserByToken.mockResolvedValue(fakeAuthUser({ id: "22222222-2222-2222-2222-222222222222" }));
    mockFindUserProfileById.mockResolvedValue(municipalProfileRow());

    const res = await request(app).get("/api/auth/me").set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("usuario_municipal");
  });
});
