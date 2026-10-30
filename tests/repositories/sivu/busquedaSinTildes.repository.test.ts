/**
 * B-5: B1 (inventario) y la búsqueda de especies filtran con `imatch`
 * (~*) y el patrón sin tildes, con el JWT del usuario.
 */
jest.mock("../../../src/config/supabase", () => ({
  createUserScopedClient: jest.fn(),
  supabaseAdmin: { from: jest.fn(), rpc: jest.fn() },
}));

import { createUserScopedClient } from "../../../src/config/supabase";
import { listarArbolesInventario } from "../../../src/repositories/sivu/inventory.repository";
import { buscarEspeciesPorNombre } from "../../../src/repositories/sivu/species.repository";
import { patronSinTildes } from "../../../src/utils/busquedaSinTildes";

const mockCreateUserScopedClient = createUserScopedClient as unknown as jest.Mock;
const TOKEN = "token-del-usuario";
const P1 = "11111111-1111-1111-1111-111111111111";

function cliente(resultado: { data: unknown; error: unknown; count?: number }) {
  const query: Record<string, jest.Mock> = {};
  for (const m of ["select", "eq", "or", "filter", "order"]) query[m] = jest.fn().mockReturnValue(query);
  query.range = jest.fn().mockResolvedValue(resultado);
  query.limit = jest.fn().mockResolvedValue(resultado);
  const from = jest.fn().mockReturnValue(query);
  mockCreateUserScopedClient.mockReturnValue({ from });
  return { from, query };
}

beforeEach(() => jest.clearAllMocks());

describe("B1 — listarArbolesInventario con búsqueda", () => {
  it("busca en especie_cientifica y nombre_comun con imatch y el patrón sin tildes", async () => {
    const { query } = cliente({ data: [], error: null, count: 0 });

    await listarArbolesInventario(TOKEN, { projectId: P1, busqueda: "platano", limit: 50, offset: 0 });

    const patron = patronSinTildes("platano");
    expect(query.or).toHaveBeenCalledWith(`especie_cientifica.imatch."${patron}",nombre_comun.imatch."${patron}"`);
  });

  it("«plátano» y «platano» generan el mismo filtro", async () => {
    const { query } = cliente({ data: [], error: null, count: 0 });
    await listarArbolesInventario(TOKEN, { projectId: P1, busqueda: "plátano", limit: 50, offset: 0 });
    await listarArbolesInventario(TOKEN, { projectId: P1, busqueda: "platano", limit: 50, offset: 0 });
    expect(query.or.mock.calls[0][0]).toBe(query.or.mock.calls[1][0]);
  });
});

describe("buscarEspeciesPorNombre", () => {
  it("filtra especie_cientifica con imatch y el patrón sin tildes", async () => {
    const { query } = cliente({ data: [{ id: "e1", especie_cientifica: "Platanus × hispanica" }], error: null });

    const filas = await buscarEspeciesPorNombre(TOKEN, "plátanus");

    expect(mockCreateUserScopedClient).toHaveBeenCalledWith(TOKEN);
    expect(query.filter).toHaveBeenCalledWith("especie_cientifica", "imatch", patronSinTildes("platanus"));
    expect(filas).toHaveLength(1);
  });
});
