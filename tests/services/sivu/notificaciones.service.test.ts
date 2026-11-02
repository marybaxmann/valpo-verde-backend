/** Avisos (CC-051) y recordatorios (#63), con repositorios simulados (sin Supabase; la 033 no está aplicada). */
jest.mock("../../../src/repositories/sivu/notificaciones.repository");
jest.mock("../../../src/repositories/sivu/project.repository", () => ({ findProyectosForMember: jest.fn() }));
jest.mock("../../../src/services/sivu/proximasInspecciones.service", () => ({ listarProximasInspecciones: jest.fn() }));

import {
  insertarRecordatorios,
  listarNotificacionesPropias,
  marcarNotificacionLeida,
  obtenerNotificacionPropia,
} from "../../../src/repositories/sivu/notificaciones.repository";
import { findProyectosForMember } from "../../../src/repositories/sivu/project.repository";
import { listarProximasInspecciones } from "../../../src/services/sivu/proximasInspecciones.service";
import {
  claveRecordatorio,
  generarRecordatorios,
  listarNotificaciones,
  marcarLeida,
  mensajeRecordatorio,
} from "../../../src/services/sivu/notificaciones.service";
import { AuthenticatedUser } from "../../../src/types/auth";

const usuario = (role: string, id = "u1"): AuthenticatedUser => ({ id, email: undefined, nombre: null, role, activo: true });
const MUNICIPAL = usuario("usuario_municipal", "m1");
const INSPECTOR = usuario("inspector", "i1");

const proxima = (id: string, tipo: "inspeccion" | "monitoreo", inicio: string, termino: string | null = null) => ({
  arbol: { id, tree_code: `A-${id}`, especie_cientifica: null, nombre_comun: null, ubicacion_descriptiva: null },
  tipo, inicio, termino, inmediato_y_continuo: false, ajustada: false, nivel_riesgo: null, inspection_id: "x", recordatorio_activo: true,
});

const aviso = (p: Record<string, unknown> = {}) => ({
  id: "n1", user_id: "m1", tipo: "ot_cancelada", work_order_id: "w1", tree_id: "t1",
  mensaje: "La orden de trabajo OT-I-000001 fue cancelada. Motivo: x.", leido_at: null, created_at: "2026-11-02T10:00:00Z", ...p,
});

beforeEach(() => {
  jest.clearAllMocks();
  (insertarRecordatorios as jest.Mock).mockImplementation(async (f: unknown[]) => f.length);
  (listarNotificacionesPropias as jest.Mock).mockResolvedValue({ filas: [aviso()], total: 1, noLeidas: 1 });
});

describe("recordatorios (#63; generación al consultar, provisional)", () => {
  it("solo el Usuario municipal: los demás roles no generan nada", async () => {
    expect(await generarRecordatorios(INSPECTOR, "tok")).toBe(0);
    expect(findProyectosForMember).not.toHaveBeenCalled();
  });

  it("reutiliza B5 con solo_activos en cada proyecto del usuario; uno por árbol, tipo e inicio", async () => {
    (findProyectosForMember as jest.Mock).mockResolvedValue([{ id: "p1" }, { id: "p2" }]);
    (listarProximasInspecciones as jest.Mock).mockImplementation(async (_u: unknown, pid: string) =>
      pid === "p1" ? [proxima("t1", "inspeccion", "2026-11-01", "2026-11-30"), proxima("t1", "monitoreo", "2026-10-15")] : [proxima("t9", "inspeccion", "2026-10-20")]
    );
    const n = await generarRecordatorios(MUNICIPAL, "tok");
    expect(n).toBe(3);
    expect(listarProximasInspecciones).toHaveBeenCalledWith(MUNICIPAL, "p1", "tok", { soloActivos: true });
    const filas = (insertarRecordatorios as jest.Mock).mock.calls[0][0];
    expect(filas.map((f: { clave_unica: string }) => f.clave_unica)).toEqual([
      "recordatorio:t1:inspeccion:2026-11-01",
      "recordatorio:t1:monitoreo:2026-10-15",
      "recordatorio:t9:inspeccion:2026-10-20",
    ]);
    expect(filas.every((f: { user_id: string; tipo: string }) => f.user_id === "m1" && f.tipo === "recordatorio_inspeccion")).toBe(true);
  });

  it("clave y mensaje: sin plazos nuevos, solo el rango de B5", () => {
    const p = proxima("t1", "inspeccion", "2026-11-01", "2026-11-30");
    expect(claveRecordatorio(p)).toBe("recordatorio:t1:inspeccion:2026-11-01");
    expect(mensajeRecordatorio(p)).toBe("El árbol A-t1 tiene la próxima inspección entre el 2026-11-01 y el 2026-11-30.");
    expect(mensajeRecordatorio(proxima("t2", "monitoreo", "2026-10-15"))).toBe("El árbol A-t2 tiene el próximo monitoreo desde el 2026-10-15.");
  });

  it("dos consultas simultáneas: la segunda no duplica (la base ignora la clave repetida)", async () => {
    (findProyectosForMember as jest.Mock).mockResolvedValue([{ id: "p1" }]);
    (listarProximasInspecciones as jest.Mock).mockResolvedValue([proxima("t1", "inspeccion", "2026-11-01")]);
    const vistas = new Set<string>();
    (insertarRecordatorios as jest.Mock).mockImplementation(async (filas: Array<{ user_id: string; clave_unica: string }>) => {
      let creados = 0;
      for (const f of filas) {
        const k = `${f.user_id}|${f.clave_unica}`;
        if (!vistas.has(k)) { vistas.add(k); creados++; }
      }
      return creados;
    });
    const [a, b] = await Promise.all([generarRecordatorios(MUNICIPAL, "tok"), generarRecordatorios(MUNICIPAL, "tok")]);
    expect(a + b).toBe(1);
  });
});

describe("listarNotificaciones (CC-051)", () => {
  it("genera recordatorios y lista los propios, con tipo etiquetado y conteo de no leídas", async () => {
    (findProyectosForMember as jest.Mock).mockResolvedValue([]);
    const r = await listarNotificaciones(MUNICIPAL, { solo_no_leidas: false, limit: 50, offset: 0 }, "tok");
    expect(r.data[0]).toEqual(expect.objectContaining({ tipo: { codigo: "ot_cancelada", etiqueta: "Orden de trabajo cancelada" }, leida: false }));
    expect(r).toEqual(expect.objectContaining({ total: 1, no_leidas: 1, recordatorios_generados: 0 }));
  });

  it("si generar recordatorios falla, igual lista los avisos (recordatorios_generados null)", async () => {
    (findProyectosForMember as jest.Mock).mockRejectedValue(new Error("caída"));
    const err = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const r = await listarNotificaciones(MUNICIPAL, { solo_no_leidas: true, limit: 10, offset: 0 }, "tok");
    expect(r.recordatorios_generados).toBeNull();
    expect(listarNotificacionesPropias).toHaveBeenCalledWith("tok", { soloNoLeidas: true, limit: 10, offset: 0 });
    err.mockRestore();
  });
});

describe("marcarLeida (CC-051: único camino de escritura, solo el dueño)", () => {
  it("aviso de otro usuario o inexistente: 404 sin escribir", async () => {
    (obtenerNotificacionPropia as jest.Mock).mockResolvedValue(null);
    await expect(marcarLeida(MUNICIPAL, "n1", "tok")).rejects.toMatchObject({ statusCode: 404 });
    expect(marcarNotificacionLeida).not.toHaveBeenCalled();
  });

  it("marca con el id del usuario autenticado", async () => {
    (obtenerNotificacionPropia as jest.Mock).mockResolvedValue(aviso());
    (marcarNotificacionLeida as jest.Mock).mockResolvedValue(aviso({ leido_at: "2026-11-02T11:00:00Z" }));
    const r = await marcarLeida(MUNICIPAL, "n1", "tok");
    expect(marcarNotificacionLeida).toHaveBeenCalledWith("n1", "m1");
    expect(r.leida).toBe(true);
  });

  it("ya leído: no vuelve a escribir", async () => {
    (obtenerNotificacionPropia as jest.Mock).mockResolvedValue(aviso({ leido_at: "2026-11-02T11:00:00Z" }));
    const r = await marcarLeida(MUNICIPAL, "n1", "tok");
    expect(marcarNotificacionLeida).not.toHaveBeenCalled();
    expect(r.leido_at).toBe("2026-11-02T11:00:00Z");
  });
});
