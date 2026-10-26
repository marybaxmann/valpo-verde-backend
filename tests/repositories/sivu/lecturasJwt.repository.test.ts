/**
 * PR-018 v5.0 (CC-064, decisiones h e i): las lecturas que entran en la
 * respuesta de /calcular, /finalizar y GET .../photos se hacen con el
 * cliente con la sesión del usuario (`createUserScopedClient`), nunca con
 * `supabaseAdmin`; la función de finalizar sigue con `supabaseAdmin`.
 */
jest.mock("../../../src/config/supabase", () => ({
  createUserScopedClient: jest.fn(),
  supabaseAdmin: { from: jest.fn(), rpc: jest.fn(), storage: { from: jest.fn() } },
}));

import { createUserScopedClient, supabaseAdmin } from "../../../src/config/supabase";
import {
  finalizarInspeccion,
  obtenerArbolVigente,
  obtenerEntradasVigentes,
  obtenerFechaProximaInspeccionVigente,
  obtenerVariablesBorrador,
  obtenerVersionArbolDeInspeccion,
} from "../../../src/repositories/sivu/inspection.repository";
import { listarFotosPorInspeccion } from "../../../src/repositories/sivu/photo.repository";

const mockCreateUserScopedClient = createUserScopedClient as unknown as jest.Mock;
const mockAdmin = supabaseAdmin as unknown as { from: jest.Mock; rpc: jest.Mock };
const TOKEN = "token-del-usuario";
const ID = "11111111-1111-1111-1111-111111111111";

/** Cadena `from().select().eq().order()…` que termina en `maybeSingle()` o se resuelve como lista. */
function clienteDeUsuario(resultado: { data: unknown; error: unknown }) {
  const query: Record<string, jest.Mock> & PromiseLike<unknown> = {
    select: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue(resultado),
    then: (resolver: (v: unknown) => unknown) => Promise.resolve(resultado).then(resolver),
  } as never;
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  const from = jest.fn().mockReturnValue(query);
  mockCreateUserScopedClient.mockReturnValue({ from });
  return { from, query };
}

beforeEach(() => jest.clearAllMocks());

describe.each([
  ["obtenerVariablesBorrador", () => obtenerVariablesBorrador(TOKEN, ID), "evaluations", { variables: { a: 1 } }],
  [
    "obtenerVersionArbolDeInspeccion",
    () => obtenerVersionArbolDeInspeccion(TOKEN, ID),
    "tree_data_versions",
    { campos_registrados: ["dap_cm"], dap_cm: 30 },
  ],
  ["obtenerArbolVigente", () => obtenerArbolVigente(TOKEN, ID), "trees", { sector: "Cerro Alegre" }],
  ["obtenerEntradasVigentes", () => obtenerEntradasVigentes(TOKEN, ID), "v_tree_current_inputs", { entradas_vigentes: {} }],
  [
    "obtenerFechaProximaInspeccionVigente",
    () => obtenerFechaProximaInspeccionVigente(TOKEN, ID),
    "v_tree_fechas_vigentes",
    { fecha_proxima_inspeccion: "2027-01-15" },
  ],
] as const)("%s (CC-064 decisión h)", (_nombre, llamar, tabla, fila) => {
  it(`lee ${tabla} con el cliente con la sesión del usuario, no con supabaseAdmin`, async () => {
    const { from } = clienteDeUsuario({ data: fila, error: null });
    await llamar();
    expect(mockCreateUserScopedClient).toHaveBeenCalledWith(TOKEN);
    expect(from).toHaveBeenCalledWith(tabla);
    expect(mockAdmin.from).not.toHaveBeenCalled();
  });
});

describe("listarFotosPorInspeccion (CC-064 decisión i)", () => {
  it("lee las filas de photos con el cliente con la sesión del usuario, no con supabaseAdmin", async () => {
    const { from, query } = clienteDeUsuario({ data: [{ id: "f1", vista: "base" }], error: null });
    await expect(listarFotosPorInspeccion(TOKEN, ID)).resolves.toEqual([{ id: "f1", vista: "base" }]);
    expect(mockCreateUserScopedClient).toHaveBeenCalledWith(TOKEN);
    expect(from).toHaveBeenCalledWith("photos");
    expect(query.eq).toHaveBeenCalledWith("inspection_id", ID);
    expect(mockAdmin.from).not.toHaveBeenCalled();
  });
});

describe("finalizarInspeccion (PR-018 v5.0)", () => {
  it("la función de finalizar se sigue invocando con supabaseAdmin", async () => {
    mockAdmin.rpc.mockResolvedValue({ data: { inspection_id: ID }, error: null });
    await finalizarInspeccion({
      inspectionId: ID,
      usuario: "inspector-1",
      resultado: {},
      ajustes: [],
      fechaProximaInspeccionSugerida: "2027-01-01",
      fechaProximoMonitoreoSugerida: "2026-12-01",
      fechaProximaInspeccion: "2027-01-01",
      fechaProximoMonitoreo: "2026-12-01",
      justificacionAjusteFecha: null,
    });
    expect(mockAdmin.rpc).toHaveBeenCalledWith("fn_finalizar_inspeccion", expect.objectContaining({ p_inspection_id: ID }));
    expect(mockCreateUserScopedClient).not.toHaveBeenCalled();
  });
});
