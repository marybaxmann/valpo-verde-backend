jest.mock("../../src/config/supabase", () => ({
  createUserScopedClient: jest.fn(),
}));

import { createUserScopedClient } from "../../src/config/supabase";
import {
  findLatestValidMeasurementsCandidates,
  findMeasurementsByTreeId,
} from "../../src/repositories/treeMeasurement.repository";

const mockCreateUserScopedClient = createUserScopedClient as unknown as jest.Mock;
const FAKE_TOKEN = "fake-access-token";

function mockQuery(result: { data: unknown; error: unknown }) {
  const query: any = {
    select: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);

  // If query is awaited directly or at the end of chain:
  query.then = (resolve: (v: any) => any, reject: (err: any) => any) => {
    return Promise.resolve(result).then(resolve, reject);
  };

  const from = jest.fn().mockReturnValue(query);
  mockCreateUserScopedClient.mockReturnValue({ from });
  return { from, query };
}

describe("treeMeasurement.repository", () => {
  describe("findMeasurementsByTreeId", () => {
    it("filtra por tree_id y estado_medicion valida por defecto", async () => {
      const { from, query } = mockQuery({
        data: [{ id: "m-1", estado_medicion: "valida" }],
        error: null,
      });

      const res = await findMeasurementsByTreeId(FAKE_TOKEN, "t-1", false);

      expect(mockCreateUserScopedClient).toHaveBeenCalledWith(FAKE_TOKEN);
      expect(from).toHaveBeenCalledWith("tree_measurements");
      expect(query.eq).toHaveBeenCalledWith("tree_id", "t-1");
      expect(query.eq).toHaveBeenCalledWith("estado_medicion", "valida");
      expect(res).toEqual([{ id: "m-1", estado_medicion: "valida" }]);
    });

    it("cuando includeAnuladas es true, no filtra por estado_medicion", async () => {
      const { from, query } = mockQuery({
        data: [
          { id: "m-1", estado_medicion: "valida" },
          { id: "m-2", estado_medicion: "anulada" },
        ],
        error: null,
      });

      const res = await findMeasurementsByTreeId(FAKE_TOKEN, "t-1", true);

      expect(query.eq).toHaveBeenCalledWith("tree_id", "t-1");
      expect(query.eq).not.toHaveBeenCalledWith("estado_medicion", "valida");
      expect(res).toHaveLength(2);
    });

    it("propaga el error si Supabase falla", async () => {
      mockQuery({ data: null, error: { message: "connection timeout" } });

      await expect(findMeasurementsByTreeId(FAKE_TOKEN, "t-1")).rejects.toThrow(
        "Error al consultar mediciones: connection timeout"
      );
    });
  });

  describe("findLatestValidMeasurementsCandidates", () => {
    it("consulta hasta 2 mediciones válidas ordenadas por fecha_medicion DESC", async () => {
      const { query } = mockQuery({
        data: [{ id: "m-1", fecha_medicion: "2026-10-05" }],
        error: null,
      });

      const res = await findLatestValidMeasurementsCandidates(FAKE_TOKEN, "t-1");

      expect(query.eq).toHaveBeenCalledWith("tree_id", "t-1");
      expect(query.eq).toHaveBeenCalledWith("estado_medicion", "valida");
      expect(query.order).toHaveBeenCalledWith("fecha_medicion", { ascending: false });
      expect(query.limit).toHaveBeenCalledWith(2);
      expect(res).toEqual([{ id: "m-1", fecha_medicion: "2026-10-05" }]);
    });

    it("propaga el error si Supabase falla", async () => {
      mockQuery({ data: null, error: { message: "db error" } });

      await expect(findLatestValidMeasurementsCandidates(FAKE_TOKEN, "t-1")).rejects.toThrow(
        "Error al consultar última medición: db error"
      );
    });
  });
});
