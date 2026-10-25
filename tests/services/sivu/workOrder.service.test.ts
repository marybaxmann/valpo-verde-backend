jest.mock("../../../src/repositories/sivu/workOrder.repository");
jest.mock("../../../src/services/authorization.service", () => ({
  assertProjectRole: jest.fn(),
}));

import {
  crearOrdenTrabajoInspeccion as crearOrdenTrabajoInspeccionRepo,
  obtenerOrdenTrabajoPorId,
  obtenerPrioridadVigenteDelArbol,
  transicionarEstadoOt,
  SQLSTATE_CREAR_OT,
  SQLSTATE_TRANSICION_OT,
} from "../../../src/repositories/sivu/workOrder.repository";
import { assertProjectRole } from "../../../src/services/authorization.service";
import { crearOrdenTrabajoInspeccion, transicionarOrdenTrabajo } from "../../../src/services/sivu/workOrder.service";
import { AuthenticatedUser } from "../../../src/types/auth";
import { CrearOrdenTrabajoInspeccionBody, TransicionarOrdenTrabajoBody } from "../../../src/schemas/sivu/workOrder.schema";

const mockCrearOt = crearOrdenTrabajoInspeccionRepo as jest.Mock;
const mockObtenerOt = obtenerOrdenTrabajoPorId as jest.Mock;
const mockPrioridadVigente = obtenerPrioridadVigenteDelArbol as jest.Mock;
const mockTransicionar = transicionarEstadoOt as jest.Mock;
const mockAssertProjectRole = assertProjectRole as jest.Mock;

function usuario(role: string | null, id = "muni-1"): AuthenticatedUser {
  return { id, email: "u@example.invalid", nombre: "Usuario de prueba", role, activo: true };
}

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const TREE_ID = "22222222-2222-2222-2222-222222222222";
const INSPECTOR_ID = "33333333-3333-3333-3333-333333333333";
const WORK_ORDER_ID = "44444444-4444-4444-4444-444444444444";
const TOKEN = "token-de-prueba";

beforeEach(() => jest.clearAllMocks());

describe("crearOrdenTrabajoInspeccion (#58; D-238/D-244)", () => {
  function bodyValido(overrides: Partial<CrearOrdenTrabajoInspeccionBody> = {}): CrearOrdenTrabajoInspeccionBody {
    return {
      tree_id: TREE_ID,
      accion_solicitada: "evaluacion_inicial",
      responsable_accion_id: INSPECTOR_ID,
      ...overrides,
    };
  }

  it("exige usuario_municipal (delega en assertProjectRole)", async () => {
    mockAssertProjectRole.mockRejectedValueOnce(Object.assign(new Error("Requiere rol"), { statusCode: 403 }));

    await expect(
      crearOrdenTrabajoInspeccion(usuario("inspector"), PROJECT_ID, bodyValido(), TOKEN)
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mockAssertProjectRole).toHaveBeenCalledWith(usuario("inspector"), PROJECT_ID, ["usuario_municipal"], TOKEN);
    expect(mockCrearOt).not.toHaveBeenCalled();
  });

  it("usa la prioridad del body si viene (el Usuario municipal puede modificar la propuesta, D-238)", async () => {
    mockCrearOt.mockResolvedValueOnce({ id: "ot-1", estado_ot: "pendiente" });

    await crearOrdenTrabajoInspeccion(usuario("usuario_municipal"), PROJECT_ID, bodyValido({ prioridad: "critica" }), TOKEN);

    expect(mockPrioridadVigente).not.toHaveBeenCalled();
    expect(mockCrearOt).toHaveBeenCalledWith(expect.objectContaining({ prioridad: "critica" }));
  });

  it("propone la prioridad desde la evaluación vigente del árbol si el body no la trae (D-238)", async () => {
    mockPrioridadVigente.mockResolvedValueOnce("alta");
    mockCrearOt.mockResolvedValueOnce({ id: "ot-1", estado_ot: "pendiente" });

    await crearOrdenTrabajoInspeccion(usuario("usuario_municipal"), PROJECT_ID, bodyValido(), TOKEN);

    expect(mockPrioridadVigente).toHaveBeenCalledWith(TREE_ID);
    expect(mockCrearOt).toHaveBeenCalledWith(expect.objectContaining({ prioridad: "alta" }));
  });

  it("sin prioridad en el body y sin evaluación vigente: 422 (no inventa un valor)", async () => {
    mockPrioridadVigente.mockResolvedValueOnce(null);

    await expect(
      crearOrdenTrabajoInspeccion(usuario("usuario_municipal"), PROJECT_ID, bodyValido(), TOKEN)
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(mockCrearOt).not.toHaveBeenCalled();
  });

  it("no propone prioridad para una OT de Levantamiento (sin árbol todavía)", async () => {
    const { tree_id, ...resto } = bodyValido({ accion_solicitada: "levantamiento", observaciones: "Área de prueba" });
    void tree_id;

    await expect(
      crearOrdenTrabajoInspeccion(usuario("usuario_municipal"), PROJECT_ID, resto as CrearOrdenTrabajoInspeccionBody, TOKEN)
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(mockPrioridadVigente).not.toHaveBeenCalled();
  });

  it("SQLSTATE SV060 (fn_create_work_order_inspeccion) → 422", async () => {
    mockCrearOt.mockRejectedValueOnce(new Error("El usuario no es miembro del proyecto", { cause: SQLSTATE_CREAR_OT }));

    await expect(
      crearOrdenTrabajoInspeccion(usuario("usuario_municipal"), PROJECT_ID, bodyValido({ prioridad: "media" }), TOKEN)
    ).rejects.toMatchObject({ statusCode: 422 });
  });
});

describe("transicionarOrdenTrabajo (018g; CC-050)", () => {
  function bodyValido(overrides: Partial<TransicionarOrdenTrabajoBody> = {}): TransicionarOrdenTrabajoBody {
    return { estado: "en_ejecucion", ...overrides };
  }

  it("404 si la OT no existe", async () => {
    mockObtenerOt.mockResolvedValueOnce(null);

    await expect(
      transicionarOrdenTrabajo(usuario("inspector"), WORK_ORDER_ID, bodyValido(), TOKEN)
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(mockAssertProjectRole).not.toHaveBeenCalled();
  });

  it("422 si la OT es de Mantenimiento (CC-050: se implementa en el #61)", async () => {
    mockObtenerOt.mockResolvedValueOnce({ id: WORK_ORDER_ID, project_id: PROJECT_ID, tipo_ot: "mantenimiento" });

    await expect(
      transicionarOrdenTrabajo(usuario("inspector"), WORK_ORDER_ID, bodyValido(), TOKEN)
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it("exige rol Inspector en el proyecto antes de invocar la función SQL", async () => {
    mockObtenerOt.mockResolvedValueOnce({ id: WORK_ORDER_ID, project_id: PROJECT_ID, tipo_ot: "inspeccion" });
    mockAssertProjectRole.mockRejectedValueOnce(Object.assign(new Error("Requiere rol"), { statusCode: 403 }));

    await expect(
      transicionarOrdenTrabajo(usuario("usuario_municipal"), WORK_ORDER_ID, bodyValido(), TOKEN)
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mockTransicionar).not.toHaveBeenCalled();
  });

  it("invoca la transición con el usuario autenticado como responsable", async () => {
    mockObtenerOt.mockResolvedValueOnce({ id: WORK_ORDER_ID, project_id: PROJECT_ID, tipo_ot: "inspeccion" });
    mockTransicionar.mockResolvedValueOnce({ work_order_id: WORK_ORDER_ID, estado_ot: "en_ejecucion" });

    const resultado = await transicionarOrdenTrabajo(usuario("inspector", INSPECTOR_ID), WORK_ORDER_ID, bodyValido(), TOKEN);

    expect(mockTransicionar).toHaveBeenCalledWith({
      workOrderId: WORK_ORDER_ID,
      nuevoEstado: "en_ejecucion",
      fechaAccionProgramada: null,
      usuario: INSPECTOR_ID,
    });
    expect(resultado).toEqual({ work_order_id: WORK_ORDER_ID, estado_ot: "en_ejecucion" });
  });

  it("SQLSTATE SV059 (fn_transition_work_order_estado) → 422", async () => {
    mockObtenerOt.mockResolvedValueOnce({ id: WORK_ORDER_ID, project_id: PROJECT_ID, tipo_ot: "inspeccion" });
    mockTransicionar.mockRejectedValueOnce(new Error("Transición no permitida", { cause: SQLSTATE_TRANSICION_OT }));

    await expect(
      transicionarOrdenTrabajo(usuario("inspector"), WORK_ORDER_ID, bodyValido(), TOKEN)
    ).rejects.toMatchObject({ statusCode: 422 });
  });
});
