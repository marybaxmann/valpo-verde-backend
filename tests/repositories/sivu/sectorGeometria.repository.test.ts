/**
 * B13: el sector del proyecto con su contorno en GeoJSON WGS84, leído con
 * la sesión del usuario (PR-018 v6.0), nunca con `supabaseAdmin`.
 */
jest.mock("../../../src/config/supabase", () => ({
  createUserScopedClient: jest.fn(),
  supabaseAdmin: { from: jest.fn(), rpc: jest.fn() },
}));

import { createUserScopedClient, supabaseAdmin } from "../../../src/config/supabase";
import { findSectorConGeometriaByProyectoId } from "../../../src/repositories/sivu/project.repository";

const mockCreateUserScopedClient = createUserScopedClient as unknown as jest.Mock;
const mockAdmin = supabaseAdmin as unknown as { from: jest.Mock; rpc: jest.Mock };
const TOKEN = "token-del-usuario";
const P1 = "11111111-1111-1111-1111-111111111111";

function cliente(resultado: { data: unknown; error: unknown }) {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue(resultado),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  const from = jest.fn().mockReturnValue(query);
  mockCreateUserScopedClient.mockReturnValue({ from });
  return { from, query };
}

beforeEach(() => jest.clearAllMocks());

describe("findSectorConGeometriaByProyectoId (B13)", () => {
  it("pide geometria_sector::geometry (GeoJSON) del sector del proyecto con el JWT del usuario", async () => {
    const geometria = { type: "MultiPolygon", coordinates: [[[[-71.63, -33.05], [-71.61, -33.05], [-71.61, -33.038], [-71.63, -33.05]]]] };
    const { from, query } = cliente({ data: { id: "s1", project_id: P1, geometria_sector: geometria }, error: null });

    const sector = await findSectorConGeometriaByProyectoId(TOKEN, P1);

    expect(mockCreateUserScopedClient).toHaveBeenCalledWith(TOKEN);
    expect(mockAdmin.from).not.toHaveBeenCalled();
    expect(from).toHaveBeenCalledWith("sectors");
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining("geometria_sector::geometry"));
    expect(query.eq).toHaveBeenCalledWith("project_id", P1);
    expect(sector?.geometria_sector).toEqual(geometria);
  });

  it("sin sector o con error de lectura devuelve null", async () => {
    cliente({ data: null, error: null });
    expect(await findSectorConGeometriaByProyectoId(TOKEN, P1)).toBeNull();

    cliente({ data: null, error: { message: "falló" } });
    expect(await findSectorConGeometriaByProyectoId(TOKEN, P1)).toBeNull();
  });
});
