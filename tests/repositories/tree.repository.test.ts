/**
 * Verifica la consulta que arma tree.repository.ts: cliente con JWT del
 * usuario, lectura `ubicacion::geometry` (E1), filtro por proyecto y
 * cursor por id. El cliente de Supabase está totalmente mockeado.
 */
jest.mock("../../src/config/supabase", () => ({
  createUserScopedClient: jest.fn(),
}));

import { createUserScopedClient } from "../../src/config/supabase";
import { TREE_PAGE_SIZE, findTreesPage } from "../../src/repositories/tree.repository";

const mockCreateUserScopedClient = createUserScopedClient as unknown as jest.Mock;
const FAKE_TOKEN = "fake-access-token";

function mockQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    gt: jest.fn(),
    order: jest.fn(),
    limit: jest.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.gt.mockReturnValue(query);
  query.order.mockReturnValue(query);
  const from = jest.fn().mockReturnValue(query);
  mockCreateUserScopedClient.mockReturnValue({ from });
  return { from, query };
}

describe("findTreesPage", () => {
  it("primera página: JWT del usuario, ubicacion::geometry, filtro por proyecto, orden por id", async () => {
    const { from, query } = mockQuery({ data: [{ id: "a" }], error: null });

    await expect(findTreesPage(FAKE_TOKEN, "p1", null)).resolves.toEqual([{ id: "a" }]);

    expect(mockCreateUserScopedClient).toHaveBeenCalledWith(FAKE_TOKEN);
    expect(from).toHaveBeenCalledWith("trees");
    expect(query.select.mock.calls[0][0]).toContain("ubicacion::geometry");
    expect(query.eq).toHaveBeenCalledWith("project_id", "p1");
    expect(query.gt).not.toHaveBeenCalled();
    expect(query.order).toHaveBeenCalledWith("id", { ascending: true });
    expect(query.limit).toHaveBeenCalledWith(TREE_PAGE_SIZE);
    expect(TREE_PAGE_SIZE).toBe(1000);
  });

  it("páginas siguientes filtran id > afterId", async () => {
    const { query } = mockQuery({ data: [], error: null });

    await expect(findTreesPage(FAKE_TOKEN, "p1", "last-id")).resolves.toEqual([]);

    expect(query.gt).toHaveBeenCalledWith("id", "last-id");
  });

  it("propaga el error de Supabase", async () => {
    mockQuery({ data: null, error: { message: "boom" } });

    await expect(findTreesPage(FAKE_TOKEN, "p1", null)).rejects.toThrow(
      "Error al listar árboles: boom"
    );
  });
});
