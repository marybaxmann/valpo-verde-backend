/**
 * Listados de OT (B3, B4; CC-065): todas las lecturas usan el cliente con
 * la sesión del usuario (PR-018 v6.0), nunca `supabaseAdmin`.
 */
jest.mock("../../../src/config/supabase", () => ({
  createUserScopedClient: jest.fn(),
  supabaseAdmin: { from: jest.fn(), rpc: jest.fn() },
}));

import { createUserScopedClient, supabaseAdmin } from "../../../src/config/supabase";
import {
  listarOrdenesTrabajo,
  obtenerArbolesDeOts,
  obtenerMiembrosDeProyecto,
  obtenerProyectosDeOts,
} from "../../../src/repositories/sivu/workOrder.repository";

const mockCreateUserScopedClient = createUserScopedClient as unknown as jest.Mock;
const mockAdmin = supabaseAdmin as unknown as { from: jest.Mock; rpc: jest.Mock };
const TOKEN = "token-del-usuario";
const P1 = "11111111-1111-1111-1111-111111111111";

function cliente(resultado: { data: unknown; error: unknown; count?: number }) {
  const query: Record<string, jest.Mock> & PromiseLike<unknown> = {
    select: jest.fn(),
    in: jest.fn(),
    eq: jest.fn(),
    or: jest.fn(),
    order: jest.fn(),
    range: jest.fn().mockResolvedValue(resultado),
    then: (resolver: (v: unknown) => unknown) => Promise.resolve(resultado).then(resolver),
  } as never;
  for (const m of ["select", "in", "eq", "or", "order"]) query[m].mockReturnValue(query);
  const from = jest.fn().mockReturnValue(query);
  const rpc = jest.fn().mockResolvedValue(resultado);
  mockCreateUserScopedClient.mockReturnValue({ from, rpc });
  return { from, rpc, query };
}

beforeEach(() => jest.clearAllMocks());

describe("listarOrdenesTrabajo", () => {
  it("B3: work_orders con el JWT del usuario, filtros, orden y rango; devuelve el total", async () => {
    const { from, query } = cliente({ data: [{ id: "ot-1" }], error: null, count: 7 });

    const r = await listarOrdenesTrabajo(TOKEN, {
      projectId: P1,
      tipoOt: "inspeccion",
      responsableId: "inspector-1",
      estados: ["pendiente", "programada"],
      limit: 20,
      offset: 40,
    });

    expect(r).toEqual({ filas: [{ id: "ot-1" }], total: 7 });
    expect(mockCreateUserScopedClient).toHaveBeenCalledWith(TOKEN);
    expect(from).toHaveBeenCalledWith("work_orders");
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining("responsable_accion_id"), { count: "exact" });
    expect(query.in).toHaveBeenCalledWith("estado_ot", ["pendiente", "programada"]);
    expect(query.eq).toHaveBeenCalledWith("project_id", P1);
    expect(query.eq).toHaveBeenCalledWith("tipo_ot", "inspeccion");
    expect(query.eq).toHaveBeenCalledWith("responsable_accion_id", "inspector-1");
    expect(query.order).toHaveBeenNthCalledWith(1, "fecha_accion_programada", { ascending: true, nullsFirst: false });
    expect(query.order).toHaveBeenNthCalledWith(2, "codigo_ot", { ascending: true });
    expect(query.range).toHaveBeenCalledWith(40, 59);
    expect(mockAdmin.from).not.toHaveBeenCalled();
  });

  it("Inspector sin tipo_ot en B3: Mantenimiento de todos o Inspección propia", async () => {
    const { query } = cliente({ data: [], error: null, count: 0 });
    await listarOrdenesTrabajo(TOKEN, { projectId: P1, mantenimientoOInspeccionDe: "inspector-1", estados: ["pendiente"], limit: 50, offset: 0 });
    expect(query.or).toHaveBeenCalledWith(
      "tipo_ot.eq.mantenimiento,and(tipo_ot.eq.inspeccion,responsable_accion_id.eq.inspector-1)"
    );
  });
});

describe("lecturas de apoyo del listado", () => {
  it("árboles con su ubicación (ubicacion::geometry), con el JWT del usuario", async () => {
    const { from, query } = cliente({ data: [], error: null });
    await obtenerArbolesDeOts(TOKEN, ["t1"]);
    expect(from).toHaveBeenCalledWith("trees");
    expect(query.select.mock.calls[0][0]).toContain("ubicacion::geometry");
    expect(query.in).toHaveBeenCalledWith("id", ["t1"]);
    expect(mockAdmin.from).not.toHaveBeenCalled();
  });

  it("proyectos, con el JWT del usuario", async () => {
    const { from } = cliente({ data: [], error: null });
    await obtenerProyectosDeOts(TOKEN, [P1]);
    expect(from).toHaveBeenCalledWith("projects");
    expect(mockAdmin.from).not.toHaveBeenCalled();
  });

  it("sin ids, no consulta", async () => {
    cliente({ data: [], error: null });
    await expect(obtenerArbolesDeOts(TOKEN, [])).resolves.toEqual([]);
    await expect(obtenerProyectosDeOts(TOKEN, [])).resolves.toEqual([]);
    expect(mockCreateUserScopedClient).not.toHaveBeenCalled();
  });

  it("miembros: fn_miembros_proyecto con el JWT del usuario, nunca con supabaseAdmin", async () => {
    const { rpc } = cliente({ data: [{ id: "u1", nombre: "Uno", rol: "inspector" }], error: null });
    await expect(obtenerMiembrosDeProyecto(TOKEN, P1)).resolves.toEqual([{ id: "u1", nombre: "Uno", rol: "inspector" }]);
    expect(mockCreateUserScopedClient).toHaveBeenCalledWith(TOKEN);
    expect(rpc).toHaveBeenCalledWith("fn_miembros_proyecto", { p_project_id: P1 });
    expect(mockAdmin.rpc).not.toHaveBeenCalled();
  });
});
