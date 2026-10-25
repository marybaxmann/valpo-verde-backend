jest.mock("../../../src/repositories/sivu/inspection.repository");
jest.mock("../../../src/repositories/sivu/workOrder.repository");
jest.mock("../../../src/services/authorization.service", () => ({
  assertProjectRole: jest.fn(),
}));

import {
  guardarBorradorInspeccion as guardarBorradorInspeccionRepo,
  obtenerInspeccionPorId,
  SQLSTATE_BORRADOR_INSPECCION,
} from "../../../src/repositories/sivu/inspection.repository";
import { obtenerOrdenTrabajoPorId } from "../../../src/repositories/sivu/workOrder.repository";
import { assertProjectRole } from "../../../src/services/authorization.service";
import { crearBorradorInspeccion, guardarBorradorInspeccion } from "../../../src/services/sivu/inspection.service";
import { AuthenticatedUser } from "../../../src/types/auth";
import { CrearBorradorInspeccionBody, GuardarBorradorInspeccionBody } from "../../../src/schemas/sivu/inspeccion.schema";

const mockGuardarBorrador = guardarBorradorInspeccionRepo as jest.Mock;
const mockObtenerInspeccion = obtenerInspeccionPorId as jest.Mock;
const mockObtenerOt = obtenerOrdenTrabajoPorId as jest.Mock;
const mockAssertProjectRole = assertProjectRole as jest.Mock;

function usuario(role: string | null, id = "inspector-1"): AuthenticatedUser {
  return { id, email: "i@example.invalid", nombre: "Inspector de prueba", role, activo: true };
}

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const TREE_ID = "22222222-2222-2222-2222-222222222222";
const WORK_ORDER_ID = "44444444-4444-4444-4444-444444444444";
const INSPECTION_ID = "55555555-5555-5555-5555-555555555555";
const TOKEN = "token-de-prueba";

beforeEach(() => jest.clearAllMocks());

describe("crearBorradorInspeccion (#58; primer guardado)", () => {
  function bodyValido(overrides: Partial<CrearBorradorInspeccionBody> = {}): CrearBorradorInspeccionBody {
    return { tipo_inspeccion_realizada: "evaluacion_inicial", variables: {}, ...overrides };
  }

  it("404 si la OT no existe", async () => {
    mockObtenerOt.mockResolvedValueOnce(null);

    await expect(
      crearBorradorInspeccion(usuario("inspector"), WORK_ORDER_ID, bodyValido(), TOKEN)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("422 si la OT no es de tipo Inspección", async () => {
    mockObtenerOt.mockResolvedValueOnce({ id: WORK_ORDER_ID, project_id: PROJECT_ID, tipo_ot: "mantenimiento" });

    await expect(
      crearBorradorInspeccion(usuario("inspector"), WORK_ORDER_ID, bodyValido(), TOKEN)
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it("usa el árbol de la OT, no el del body, cuando la OT ya tiene uno", async () => {
    mockObtenerOt.mockResolvedValueOnce({
      id: WORK_ORDER_ID,
      project_id: PROJECT_ID,
      tipo_ot: "inspeccion",
      tree_id: TREE_ID,
      accion_solicitada: "evaluacion_inicial",
    });
    mockGuardarBorrador.mockResolvedValueOnce({ inspection_id: "insp-1", evaluation_id: "ev-1", tree_data_version_id: null, estado_registro: "preguardado" });

    await crearBorradorInspeccion(usuario("inspector"), WORK_ORDER_ID, bodyValido(), TOKEN);

    expect(mockGuardarBorrador).toHaveBeenCalledWith(expect.objectContaining({ treeId: TREE_ID, inspectionId: null }));
  });

  it("rechaza tree_id del body si no coincide con el de la OT", async () => {
    mockObtenerOt.mockResolvedValueOnce({
      id: WORK_ORDER_ID,
      project_id: PROJECT_ID,
      tipo_ot: "inspeccion",
      tree_id: TREE_ID,
      accion_solicitada: "evaluacion_inicial",
    });

    await expect(
      crearBorradorInspeccion(
        usuario("inspector"),
        WORK_ORDER_ID,
        bodyValido({ tree_id: "99999999-9999-9999-9999-999999999999" }),
        TOKEN
      )
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(mockGuardarBorrador).not.toHaveBeenCalled();
  });

  it("Levantamiento: exige tree_id en el body (árbol existente; árbol nuevo queda fuera, CC-052)", async () => {
    mockObtenerOt.mockResolvedValueOnce({
      id: WORK_ORDER_ID,
      project_id: PROJECT_ID,
      tipo_ot: "inspeccion",
      tree_id: null,
      accion_solicitada: "levantamiento",
    });

    await expect(
      crearBorradorInspeccion(usuario("inspector"), WORK_ORDER_ID, bodyValido({ tipo_inspeccion_realizada: "levantamiento" }), TOKEN)
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it("Levantamiento con tree_id en el body: lo usa", async () => {
    mockObtenerOt.mockResolvedValueOnce({
      id: WORK_ORDER_ID,
      project_id: PROJECT_ID,
      tipo_ot: "inspeccion",
      tree_id: null,
      accion_solicitada: "levantamiento",
    });
    mockGuardarBorrador.mockResolvedValueOnce({ inspection_id: "insp-1", evaluation_id: "ev-1", tree_data_version_id: null, estado_registro: "preguardado" });

    await crearBorradorInspeccion(
      usuario("inspector"),
      WORK_ORDER_ID,
      bodyValido({ tipo_inspeccion_realizada: "levantamiento", tree_id: TREE_ID }),
      TOKEN
    );

    expect(mockGuardarBorrador).toHaveBeenCalledWith(expect.objectContaining({ treeId: TREE_ID }));
  });

  it("calcula campos_registrados_arbol desde las claves de campos_arbol", async () => {
    mockObtenerOt.mockResolvedValueOnce({
      id: WORK_ORDER_ID,
      project_id: PROJECT_ID,
      tipo_ot: "inspeccion",
      tree_id: TREE_ID,
      accion_solicitada: "evaluacion_inicial",
    });
    mockGuardarBorrador.mockResolvedValueOnce({ inspection_id: "insp-1", evaluation_id: "ev-1", tree_data_version_id: "tdv-1", estado_registro: "preguardado" });

    await crearBorradorInspeccion(
      usuario("inspector"),
      WORK_ORDER_ID,
      bodyValido({ campos_arbol: { dap_cm: 25.5, sector: "Barrio Puerto" } }),
      TOKEN
    );

    expect(mockGuardarBorrador).toHaveBeenCalledWith(
      expect.objectContaining({ camposRegistradosArbol: expect.arrayContaining(["dap_cm", "sector"]) })
    );
  });

  it("SQLSTATE SV058 (fn_save_inspection_draft) → 422", async () => {
    mockObtenerOt.mockResolvedValueOnce({
      id: WORK_ORDER_ID,
      project_id: PROJECT_ID,
      tipo_ot: "inspeccion",
      tree_id: TREE_ID,
      accion_solicitada: "evaluacion_inicial",
    });
    mockGuardarBorrador.mockRejectedValueOnce(new Error("La orden de trabajo no está en ejecución", { cause: SQLSTATE_BORRADOR_INSPECCION }));

    await expect(crearBorradorInspeccion(usuario("inspector"), WORK_ORDER_ID, bodyValido(), TOKEN)).rejects.toMatchObject({
      statusCode: 422,
    });
  });
});

describe("guardarBorradorInspeccion (#58; guardados siguientes)", () => {
  function bodyValido(overrides: Partial<GuardarBorradorInspeccionBody> = {}): GuardarBorradorInspeccionBody {
    return { tipo_inspeccion_realizada: "evaluacion_inicial", variables: {}, ...overrides };
  }

  it("404 si la inspección no existe", async () => {
    mockObtenerInspeccion.mockResolvedValueOnce(null);

    await expect(
      guardarBorradorInspeccion(usuario("inspector"), INSPECTION_ID, bodyValido(), TOKEN)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("lee work_order_id/tree_id/inspector de la fila existente, no del body", async () => {
    mockObtenerInspeccion.mockResolvedValueOnce({
      id: INSPECTION_ID,
      work_order_id: WORK_ORDER_ID,
      tree_id: TREE_ID,
      inspector: "inspector-1",
      estado_registro: "preguardado",
      fecha_inspeccion: "2026-10-25",
      fecha_registro: "2026-10-25",
    });
    mockObtenerOt.mockResolvedValueOnce({ id: WORK_ORDER_ID, project_id: PROJECT_ID, tipo_ot: "inspeccion" });
    mockGuardarBorrador.mockResolvedValueOnce({ inspection_id: INSPECTION_ID, evaluation_id: "ev-1", tree_data_version_id: null, estado_registro: "preguardado" });

    await guardarBorradorInspeccion(usuario("inspector"), INSPECTION_ID, bodyValido({ resultado_general: "Preliminar" }), TOKEN);

    expect(mockGuardarBorrador).toHaveBeenCalledWith(
      expect.objectContaining({ inspectionId: INSPECTION_ID, workOrderId: WORK_ORDER_ID, treeId: TREE_ID })
    );
  });
});
