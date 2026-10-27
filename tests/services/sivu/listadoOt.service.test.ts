jest.mock("../../../src/repositories/sivu/workOrder.repository", () => ({
  listarOrdenesTrabajo: jest.fn(),
  obtenerArbolesDeOts: jest.fn(),
  obtenerProyectosDeOts: jest.fn(),
  obtenerMiembrosDeProyecto: jest.fn(),
}));
jest.mock("../../../src/services/authorization.service", () => ({
  assertProjectAccess: jest.fn(),
}));

import {
  FiltrosListadoOt,
  OtListadoRow,
  listarOrdenesTrabajo,
  obtenerArbolesDeOts,
  obtenerMiembrosDeProyecto,
  obtenerProyectosDeOts,
} from "../../../src/repositories/sivu/workOrder.repository";
import { assertProjectAccess } from "../../../src/services/authorization.service";
import { listarMisOts, listarOtsDeProyecto } from "../../../src/services/sivu/listadoOt.service";
import { AuthenticatedUser } from "../../../src/types/auth";
import { AppError } from "../../../src/utils/AppError";

const mockListar = listarOrdenesTrabajo as jest.Mock;
const mockArboles = obtenerArbolesDeOts as jest.Mock;
const mockProyectos = obtenerProyectosDeOts as jest.Mock;
const mockMiembros = obtenerMiembrosDeProyecto as jest.Mock;
const mockAccess = assertProjectAccess as jest.Mock;

const TOKEN = "token-del-usuario";
const P1 = "11111111-1111-1111-1111-111111111111";
const P2 = "22222222-2222-2222-2222-222222222222";
const T1 = "33333333-3333-3333-3333-333333333333";

const usuario = (id: string, role: string): AuthenticatedUser => ({ id, email: `${id}@example.invalid`, nombre: id, role, activo: true });
const INSPECTOR = usuario("inspector-1", "inspector");
const INSPECTOR_2 = usuario("inspector-2", "inspector");
const ENCARGADO = usuario("encargado-1", "encargado_mantencion");
const MUNICIPAL = usuario("municipal-1", "usuario_municipal");
const ADMIN = usuario("admin-1", "admin");

function ot(over: Partial<OtListadoRow>): OtListadoRow {
  return {
    id: "ot",
    codigo_ot: "OT-I-000001",
    project_id: P1,
    tree_id: T1,
    tipo_ot: "inspeccion",
    accion_solicitada: "evaluacion_inicial",
    subtipo_accion: null,
    prioridad: "alta",
    estado_ot: "pendiente",
    fecha_creacion_ot: "2026-10-20",
    fecha_accion_programada: null,
    fecha_completada_ot: null,
    responsable_accion_id: INSPECTOR.id,
    requiere_revision_inspector: null,
    ...over,
  };
}

/** Conjunto de OT; el repositorio simulado le aplica los filtros como lo haría la consulta. */
let ots: OtListadoRow[];

function aplicarFiltros(filtros: FiltrosListadoOt): { filas: OtListadoRow[]; total: number } {
  const filtradas = ots.filter(
    (o) =>
      filtros.estados.includes(o.estado_ot) &&
      (!filtros.projectId || o.project_id === filtros.projectId) &&
      (!filtros.responsableId || o.responsable_accion_id === filtros.responsableId) &&
      (!filtros.tipoOt || o.tipo_ot === filtros.tipoOt) &&
      (!filtros.mantenimientoOInspeccionDe ||
        o.tipo_ot === "mantenimiento" ||
        (o.tipo_ot === "inspeccion" && o.responsable_accion_id === filtros.mantenimientoOInspeccionDe))
  );
  return { filas: filtradas.slice(filtros.offset, filtros.offset + filtros.limit), total: filtradas.length };
}

const codigos = (r: { data: Array<{ codigo_ot: string | null }> }) => r.data.map((o) => o.codigo_ot);
const QUERY = { limit: 50, offset: 0 };

beforeEach(() => {
  jest.clearAllMocks();
  ots = [
    ot({ id: "i1", codigo_ot: "OT-I-000001", responsable_accion_id: INSPECTOR.id }),
    ot({ id: "i2", codigo_ot: "OT-I-000002", responsable_accion_id: INSPECTOR_2.id }),
    ot({ id: "i3", codigo_ot: "OT-I-000003", responsable_accion_id: INSPECTOR.id, estado_ot: "completada", fecha_completada_ot: "2026-10-25" }),
    ot({ id: "i4", codigo_ot: "OT-I-000004", project_id: P2, responsable_accion_id: INSPECTOR.id, estado_ot: "en_ejecucion" }),
    ot({ id: "m1", codigo_ot: "OT-M-000001", tipo_ot: "mantenimiento", accion_solicitada: "poda", subtipo_accion: "sanitaria", responsable_accion_id: ENCARGADO.id }),
    ot({ id: "m2", codigo_ot: "OT-M-000002", project_id: P2, tipo_ot: "mantenimiento", accion_solicitada: "tala_retiro", subtipo_accion: "tala", responsable_accion_id: ENCARGADO.id, requiere_revision_inspector: true }),
    ot({ id: "l1", codigo_ot: "OT-I-000005", tree_id: null, accion_solicitada: "levantamiento", responsable_accion_id: INSPECTOR.id, estado_ot: "programada", fecha_accion_programada: "2026-11-02" }),
  ];
  mockListar.mockImplementation((_token: string, filtros: FiltrosListadoOt) => Promise.resolve(aplicarFiltros(filtros)));
  mockArboles.mockResolvedValue([
    { id: T1, tree_code: "ARB-0001", nombre_comun: "Quillay", especie_cientifica: "Quillaja saponaria", ubicacion_descriptiva: "Plaza", ubicacion: { type: "Point", coordinates: [-71.62, -33.04] } },
  ]);
  mockProyectos.mockImplementation((_t: string, ids: string[]) => Promise.resolve(ids.map((id) => ({ id, nombre_proyecto: `Proyecto ${id.slice(0, 2)}` }))));
  mockMiembros.mockResolvedValue([
    { id: INSPECTOR.id, nombre: "Inspector Uno", rol: "inspector" },
    { id: INSPECTOR_2.id, nombre: "Inspector Dos", rol: "inspector" },
    { id: ENCARGADO.id, nombre: "Encargado Uno", rol: "encargado_mantencion" },
  ]);
  mockAccess.mockResolvedValue(undefined);
});

describe("B3 — OT del proyecto (CC-061, CC-065)", () => {
  it("Usuario municipal: todas las del proyecto, de los dos tipos, sin acciones", async () => {
    const r = await listarOtsDeProyecto(MUNICIPAL, P1, QUERY, TOKEN);
    expect(codigos(r)).toEqual(["OT-I-000001", "OT-I-000002", "OT-M-000001", "OT-I-000005"]);
    expect(r.data.every((o) => o.acciones.length === 0)).toBe(true);
    expect(mockAccess).toHaveBeenCalledWith(MUNICIPAL, P1, TOKEN);
  });

  it("Administrador: todas, sin acciones; filtrables por tipo_ot", async () => {
    const todas = await listarOtsDeProyecto(ADMIN, P1, QUERY, TOKEN);
    expect(todas.total).toBe(4);
    expect(todas.data.every((o) => o.acciones.length === 0)).toBe(true);
    const mantenimiento = await listarOtsDeProyecto(ADMIN, P1, { ...QUERY, tipo_ot: "mantenimiento" }, TOKEN);
    expect(codigos(mantenimiento)).toEqual(["OT-M-000001"]);
  });

  it("Inspector, tipo_ot = inspeccion: solo las suyas como responsable actual (CC-061)", async () => {
    const r = await listarOtsDeProyecto(INSPECTOR, P1, { ...QUERY, tipo_ot: "inspeccion" }, TOKEN);
    expect(codigos(r)).toEqual(["OT-I-000001", "OT-I-000005"]);
  });

  it("Inspector: tras una reasignación deja de ver la OT", async () => {
    ots = ots.map((o) => (o.id === "i1" ? { ...o, responsable_accion_id: INSPECTOR_2.id } : o));
    const r = await listarOtsDeProyecto(INSPECTOR, P1, { ...QUERY, tipo_ot: "inspeccion" }, TOKEN);
    expect(codigos(r)).toEqual(["OT-I-000005"]);
  });

  it("Inspector, tipo_ot = mantenimiento: todas las de Mantenimiento del proyecto, sin acciones (CC-064 a y b)", async () => {
    const r = await listarOtsDeProyecto(INSPECTOR, P1, { ...QUERY, tipo_ot: "mantenimiento" }, TOKEN);
    expect(codigos(r)).toEqual(["OT-M-000001"]);
    expect(r.data[0].acciones).toEqual([]);
  });

  it("Inspector sin tipo_ot: Mantenimiento de todos más sus OT de Inspección", async () => {
    const r = await listarOtsDeProyecto(INSPECTOR, P1, QUERY, TOKEN);
    expect(codigos(r)).toEqual(["OT-I-000001", "OT-M-000001", "OT-I-000005"]);
  });

  it("Encargado, tipo_ot = inspeccion: 403 (CC-061)", async () => {
    await expect(listarOtsDeProyecto(ENCARGADO, P1, { ...QUERY, tipo_ot: "inspeccion" }, TOKEN)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockListar).not.toHaveBeenCalled();
  });

  it("Encargado sin tipo_ot o con mantenimiento: todas las de Mantenimiento, ninguna de Inspección", async () => {
    for (const query of [QUERY, { ...QUERY, tipo_ot: "mantenimiento" as const }]) {
      const r = await listarOtsDeProyecto(ENCARGADO, P1, query, TOKEN);
      expect(codigos(r)).toEqual(["OT-M-000001"]);
    }
  });

  it("sin membresía: 403 y no se consulta nada", async () => {
    mockAccess.mockRejectedValueOnce(new AppError("No tiene acceso a este proyecto", 403));
    await expect(listarOtsDeProyecto(INSPECTOR, P2, QUERY, TOKEN)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockListar).not.toHaveBeenCalled();
  });

  it("estado: por defecto Pendiente, Programada y En ejecución; con el filtro, el historial (CC-064 n)", async () => {
    await listarOtsDeProyecto(MUNICIPAL, P1, QUERY, TOKEN);
    expect(mockListar.mock.calls[0][1].estados).toEqual(["pendiente", "programada", "en_ejecucion"]);
    const historial = await listarOtsDeProyecto(MUNICIPAL, P1, { ...QUERY, estado: ["completada", "cancelada"] }, TOKEN);
    expect(codigos(historial)).toEqual(["OT-I-000003"]);
  });

  it("paginación: pasa limit y offset, y devuelve el total", async () => {
    const r = await listarOtsDeProyecto(MUNICIPAL, P1, { limit: 2, offset: 1 }, TOKEN);
    expect(r).toMatchObject({ total: 4, limit: 2, offset: 1 });
    expect(codigos(r)).toEqual(["OT-I-000002", "OT-M-000001"]);
  });

  it("todas las lecturas con el token del usuario", async () => {
    await listarOtsDeProyecto(MUNICIPAL, P1, QUERY, TOKEN);
    expect(mockListar.mock.calls[0][0]).toBe(TOKEN);
    expect(mockArboles).toHaveBeenCalledWith(TOKEN, [T1]);
    expect(mockProyectos).toHaveBeenCalledWith(TOKEN, [P1]);
    expect(mockMiembros).toHaveBeenCalledWith(TOKEN, P1);
  });
});

describe("B4 — Mis OT (CC-064 k y n, CC-065)", () => {
  it("Inspector: sus OT de Inspección de todos sus proyectos, con acciones según el estado", async () => {
    const r = await listarMisOts(INSPECTOR, QUERY, TOKEN);
    expect(codigos(r)).toEqual(["OT-I-000001", "OT-I-000004", "OT-I-000005"]);
    expect(Object.fromEntries(r.data.map((o) => [o.codigo_ot, o.acciones]))).toEqual({
      "OT-I-000001": ["programar"],
      "OT-I-000004": ["trabajar"],
      "OT-I-000005": ["iniciar"],
    });
    expect(mockAccess).not.toHaveBeenCalled();
  });

  it("Encargado: sus OT de Mantenimiento de todos sus proyectos, sin acciones (el #61 no existe)", async () => {
    const r = await listarMisOts(ENCARGADO, QUERY, TOKEN);
    expect(codigos(r)).toEqual(["OT-M-000001", "OT-M-000002"]);
    expect(r.data.every((o) => o.acciones.length === 0)).toBe(true);
  });

  it("filtro por proyecto: exige acceso y filtra", async () => {
    const r = await listarMisOts(INSPECTOR, { ...QUERY, project_id: P2 }, TOKEN);
    expect(mockAccess).toHaveBeenCalledWith(INSPECTOR, P2, TOKEN);
    expect(codigos(r)).toEqual(["OT-I-000004"]);
  });

  it("filtro por proyecto sin membresía: 403", async () => {
    mockAccess.mockRejectedValueOnce(new AppError("No tiene acceso a este proyecto", 403));
    await expect(listarMisOts(INSPECTOR, { ...QUERY, project_id: P2 }, TOKEN)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("tipo_ot que no corresponde al rol: lista vacía", async () => {
    expect((await listarMisOts(INSPECTOR, { ...QUERY, tipo_ot: "mantenimiento" }, TOKEN)).data).toEqual([]);
    expect((await listarMisOts(ENCARGADO, { ...QUERY, tipo_ot: "inspeccion" }, TOKEN)).data).toEqual([]);
  });

  it("tras una reasignación, la OT sale de «Mis OT» del responsable anterior", async () => {
    ots = ots.map((o) => (o.id === "i4" ? { ...o, responsable_accion_id: INSPECTOR_2.id } : o));
    expect(codigos(await listarMisOts(INSPECTOR, QUERY, TOKEN))).toEqual(["OT-I-000001", "OT-I-000005"]);
    expect(codigos(await listarMisOts(INSPECTOR_2, QUERY, TOKEN))).toEqual(["OT-I-000002", "OT-I-000004"]);
  });

  it("historial: Completada y Cancelada solo con el filtro", async () => {
    expect(codigos(await listarMisOts(INSPECTOR, { ...QUERY, estado: ["completada"] }, TOKEN))).toEqual(["OT-I-000003"]);
  });
});

describe("respuesta de cada OT (CC-065 punto 5)", () => {
  it("etiquetas de catálogo, árbol con ubicación, proyecto y responsable", async () => {
    const r = await listarOtsDeProyecto(MUNICIPAL, P1, QUERY, TOKEN);
    const ot1 = r.data.find((o) => o.codigo_ot === "OT-I-000001")!;
    expect(ot1).toMatchObject({
      tipo_ot: { codigo: "inspeccion", etiqueta: "Inspección" },
      accion: { codigo: "evaluacion_inicial", etiqueta: "Evaluación inicial" },
      subtipo: null,
      prioridad: { codigo: "alta", etiqueta: "Alta" },
      estado: { codigo: "pendiente", etiqueta: "Pendiente" },
      proyecto: { id: P1, nombre_proyecto: "Proyecto 11" },
      arbol: { id: T1, tree_code: "ARB-0001", nombre_comun: "Quillay", ubicacion: { lng: -71.62, lat: -33.04 } },
      responsable: { id: INSPECTOR.id, nombre: "Inspector Uno" },
    });
  });

  it("responsable que ya no es miembro del proyecto: id preservado, nombre null y fuera_del_proyecto: true (CC-065)", async () => {
    mockMiembros.mockResolvedValue([
      { id: INSPECTOR.id, nombre: "Inspector Uno", rol: "inspector" },
      { id: ENCARGADO.id, nombre: "Encargado Uno", rol: "encargado_mantencion" },
    ]);
    const r = await listarOtsDeProyecto(MUNICIPAL, P1, QUERY, TOKEN);
    const ot2 = r.data.find((o) => o.codigo_ot === "OT-I-000002")!;
    expect(ot2.responsable).toEqual({
      id: INSPECTOR_2.id,
      nombre: null,
      fuera_del_proyecto: true,
    });
  });

  it("OT de Mantenimiento: acción y subtipo con las etiquetas del Excel (D-235, D-236)", async () => {
    const r = await listarMisOts(ENCARGADO, QUERY, TOKEN);
    expect(r.data.map((o) => [o.accion, o.subtipo])).toEqual([
      [{ codigo: "poda", etiqueta: "Poda" }, { codigo: "sanitaria", etiqueta: "Sanitaria" }],
      [{ codigo: "tala_retiro", etiqueta: "Tala_retiro" }, { codigo: "tala", etiqueta: "Tala" }],
    ]);
    expect(r.data[1].requiere_revision_inspector).toBe(true);
  });

  it("OT de Levantamiento: sin árbol; la acción dice «Levantamiento»", async () => {
    const r = await listarOtsDeProyecto(MUNICIPAL, P1, QUERY, TOKEN);
    const lev = r.data.find((o) => o.codigo_ot === "OT-I-000005")!;
    expect(lev.arbol).toBeNull();
    expect(lev.accion).toEqual({ codigo: "levantamiento", etiqueta: "Levantamiento" });
  });
});
