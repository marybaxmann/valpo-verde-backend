import request from "supertest";

jest.mock("../../src/repositories/auth.repository");
jest.mock("../../src/repositories/userProfile.repository");
jest.mock("../../src/repositories/species.repository");

import app from "../../src/app";
import { getAuthUserByToken } from "../../src/repositories/auth.repository";
import { findUserProfileById } from "../../src/repositories/userProfile.repository";
import { findAllSpecies } from "../../src/repositories/species.repository";
import { FAKE_TOKEN, MUNICIPAL_ID, fakeAuthUser, municipalProfileRow } from "../helpers/authFixtures";

const mockGetAuthUserByToken = getAuthUserByToken as unknown as jest.Mock;
const mockFindUserProfileById = findUserProfileById as unknown as jest.Mock;
const mockFindAllSpecies = findAllSpecies as unknown as jest.Mock;

describe("GET /api/species", () => {
  it("sin token -> 401", async () => {
    const res = await request(app).get("/api/species");
    expect(res.status).toBe(401);
    expect(mockFindAllSpecies).not.toHaveBeenCalled();
  });

  it("usuario autenticado recibe el catálogo -> 200", async () => {
    mockGetAuthUserByToken.mockResolvedValue(fakeAuthUser({ id: MUNICIPAL_ID }));
    mockFindUserProfileById.mockResolvedValue(municipalProfileRow());
    const especies = [{ id: "44444444-4444-4444-4444-444444444444", nombre_cientifico: "Quillaja saponaria", nombre_comun: "Quillay" }];
    mockFindAllSpecies.mockResolvedValue(especies);

    const res = await request(app).get("/api/species").set("Authorization", `Bearer ${FAKE_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: especies });
    expect(mockFindAllSpecies).toHaveBeenCalledWith(FAKE_TOKEN);
  });

  it("error de la base de datos -> 500, sin catálogo ficticio", async () => {
    mockGetAuthUserByToken.mockResolvedValue(fakeAuthUser({ id: MUNICIPAL_ID }));
    mockFindUserProfileById.mockResolvedValue(municipalProfileRow());
    mockFindAllSpecies.mockRejectedValue(new Error("Error al listar especies: x"));

    const res = await request(app).get("/api/species").set("Authorization", `Bearer ${FAKE_TOKEN}`);
    expect(res.status).toBe(500);
    expect(res.body.data).toBeUndefined();
  });
});
