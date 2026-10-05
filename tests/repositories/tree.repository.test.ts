/**
 * Verifica las consultas que arma tree.repository.ts: cliente con JWT del
 * usuario, lectura `ubicacion::geometry` (E1), filtro por proyecto y
 * cursor por id, consulta por ID y RPC transaccional de alta.
 */
jest.mock("../../src/config/supabase", () => ({
  createUserScopedClient: jest.fn(),
}));

import { createUserScopedClient } from "../../src/config/supabase";
import {
  TREE_PAGE_SIZE,
  createTreeWithMeasurementRpc,
  findTreeById,
  findTreesPage,
} from "../../src/repositories/tree.repository";

const mockCreateUserScopedClient = createUserScopedClient as unknown as jest.Mock;
const FAKE_TOKEN = "fake-access-token";

function mockQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    gt: jest.fn(),
    order: jest.fn(),
    limit: jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.gt.mockReturnValue(query);
  query.order.mockReturnValue(query);
  const from = jest.fn().mockReturnValue(query);
  mockCreateUserScopedClient.mockReturnValue({ from });
  return { from, query };
}

describe("tree.repository", () => {
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

  describe("findTreeById", () => {
    it("consulta árbol por id con especies y espacios públicos", async () => {
      const { from, query } = mockQuery({
        data: { id: "tree-123", tree_code: "VAL-0001" },
        error: null,
      });

      const res = await findTreeById(FAKE_TOKEN, "tree-123");

      expect(mockCreateUserScopedClient).toHaveBeenCalledWith(FAKE_TOKEN);
      expect(from).toHaveBeenCalledWith("trees");
      expect(query.select.mock.calls[0][0]).toContain("species(id, nombre_cientifico, nombre_comun)");
      expect(query.eq).toHaveBeenCalledWith("id", "tree-123");
      expect(res).toEqual({ id: "tree-123", tree_code: "VAL-0001" });
    });

    it("devuelve null si no existe", async () => {
      mockQuery({ data: null, error: null });

      const res = await findTreeById(FAKE_TOKEN, "tree-none");
      expect(res).toBeNull();
    });

    it("propaga el error de Supabase", async () => {
      mockQuery({ data: null, error: { message: "query failed" } });

      await expect(findTreeById(FAKE_TOKEN, "tree-123")).rejects.toThrow(
        "Error al consultar árbol por id: query failed"
      );
    });
  });

  describe("createTreeWithMeasurementRpc", () => {
    it("invoca RPC fn_create_tree_with_measurement con parámetros estructurados", async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        data: {
          tree_id: "tree-new-id",
          measurement_id: "meas-new-id",
          tree_code: "VAL-0001",
        },
        error: null,
      });
      mockCreateUserScopedClient.mockReturnValue({ rpc: mockRpc });

      const params = {
        p_project_id: "proj-1",
        p_species_id: "spec-1",
        p_public_space_id: null,
        p_direccion: "Av. Gran Bretaña 123",
        p_comuna: "Valparaíso",
        p_lugar_referencia: null,
        p_lon: -71.62,
        p_lat: -33.045,
        p_medicion: {
          fecha_medicion: "2026-10-05",
          configuracion_fustes: "monofuste",
          numero_fustes: null,
          dap_fustes_cm: null,
          dap_cm: 25.5,
          altura_total_m: 12.0,
          diametro_copa_m: 6.5,
          altura_primera_rama_m: 2.5,
          clase_edad: null,
        },
      };

      const result = await createTreeWithMeasurementRpc(FAKE_TOKEN, params);

      expect(mockCreateUserScopedClient).toHaveBeenCalledWith(FAKE_TOKEN);
      expect(mockRpc).toHaveBeenCalledWith("fn_create_tree_with_measurement", params);
      expect(result).toEqual({
        tree_id: "tree-new-id",
        measurement_id: "meas-new-id",
        tree_code: "VAL-0001",
      });
    });

    it("propaga error si el RPC falla", async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Postgres RPC constraint violation" },
      });
      mockCreateUserScopedClient.mockReturnValue({ rpc: mockRpc });

      await expect(
        createTreeWithMeasurementRpc(FAKE_TOKEN, {} as any)
      ).rejects.toThrow("Error al crear árbol con medición inicial: Postgres RPC constraint violation");
    });
  });
});
