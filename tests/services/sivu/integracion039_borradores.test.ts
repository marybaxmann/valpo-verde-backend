/**
 * 039 (decisión 5): un borrador guardado con una metodología anterior no pierde
 * los valores de variables retiradas al guardarse con la vigente.
 */
jest.mock("../../../src/repositories/sivu/inspection.repository");
jest.mock("../../../src/repositories/sivu/workOrder.repository");
jest.mock("../../../src/services/authorization.service", () => ({
  assertProjectAccess: jest.fn(),
  assertProjectRole: jest.fn(),
}));

import {
  conservarVariablesRetiradas,
  guardarBorradorInspeccion as guardarRepo,
  obtenerInspeccionPorId,
  obtenerRuleVersionBorrador,
  obtenerVariablesBorrador,
} from "../../../src/repositories/sivu/inspection.repository";
import { obtenerOrdenTrabajoPorId } from "../../../src/repositories/sivu/workOrder.repository";
import { guardarBorradorInspeccion, variablesRetiradas } from "../../../src/services/sivu/inspection.service";
import { AuthenticatedUser } from "../../../src/types/auth";

const INSPECTOR = "inspector-1";
const INSPECTION_ID = "11111111-1111-1111-1111-111111111111";
const usuario = (id: string): AuthenticatedUser => ({ id, email: `${id}@example.invalid`, nombre: "I", role: "inspector", activo: true });

const m = {
  insp: obtenerInspeccionPorId as jest.Mock,
  ot: obtenerOrdenTrabajoPorId as jest.Mock,
  vars: obtenerVariablesBorrador as jest.Mock,
  rule: obtenerRuleVersionBorrador as jest.Mock,
  conservar: conservarVariablesRetiradas as jest.Mock,
  guardar: guardarRepo as jest.Mock,
};

const body = (variables: Record<string, string | number | boolean | null> = {}) => ({
  tipo_inspeccion_realizada: "evaluacion_inicial" as const,
  subtipo_inspeccion: null,
  variables,
});

beforeEach(() => {
  jest.clearAllMocks();
  m.insp.mockResolvedValue({ id: INSPECTION_ID, work_order_id: "w1", tree_id: "t1", inspector: INSPECTOR, estado_registro: "preguardado", fecha_inspeccion: "2026-11-03", fecha_registro: "2026-11-03" });
  m.ot.mockResolvedValue({ id: "w1", project_id: "p1", tipo_ot: "inspeccion", estado_ot: "en_ejecucion", responsable_accion_id: INSPECTOR });
  m.rule.mockResolvedValue("2.1");
  m.guardar.mockResolvedValue({ inspection_id: INSPECTION_ID });
});

describe("variablesRetiradas", () => {
  it("detecta condicion_radicular_entorno (retirada en la 3.0) y no toca las vigentes", () => {
    const r = variablesRetiradas({ condicion_radicular_entorno: "raices_sobresalientes", raices_expuestas: true }, body({ raices_expuestas: true }));
    expect(r).toEqual(["condicion_radicular_entorno"]);
  });

  it("una variable vigente que el cuerpo omite NO se considera retirada (el inspector la vació)", () => {
    expect(variablesRetiradas({ raices_expuestas: true }, body({}))).toEqual([]);
  });

  it("ignora valores nulos", () => {
    expect(variablesRetiradas({ condicion_radicular_entorno: null }, body({}))).toEqual([]);
  });
});

describe("guardarBorradorInspeccion conserva antes de guardar", () => {
  it("copia el valor retirado con su rule_version de origen y luego guarda", async () => {
    m.vars.mockResolvedValue({ condicion_radicular_entorno: "raices_sobresalientes", raices_expuestas: true });
    await guardarBorradorInspeccion(usuario(INSPECTOR), INSPECTION_ID, body({ raices_expuestas: true }) as never, "t");

    expect(m.conservar).toHaveBeenCalledWith(INSPECTION_ID, {
      condicion_radicular_entorno: expect.objectContaining({ valor: "raices_sobresalientes", rule_version_origen: "2.1" }),
    });
    expect(m.conservar.mock.invocationCallOrder[0]).toBeLessThan(m.guardar.mock.invocationCallOrder[0]);
  });

  it("sin variables retiradas no escribe nada extra", async () => {
    m.vars.mockResolvedValue({ raices_expuestas: true });
    await guardarBorradorInspeccion(usuario(INSPECTOR), INSPECTION_ID, body({ raices_expuestas: true }) as never, "t");
    expect(m.conservar).not.toHaveBeenCalled();
  });

  it("un Inspector que no es el responsable recibe 422 sin escrituras", async () => {
    m.vars.mockResolvedValue({ condicion_radicular_entorno: "x" });
    await expect(guardarBorradorInspeccion(usuario("otro"), INSPECTION_ID, body({}) as never, "t"))
      .rejects.toMatchObject({ statusCode: 422 });
    expect(m.conservar).not.toHaveBeenCalled();
    expect(m.guardar).not.toHaveBeenCalled();
  });

  it("una inspección finalizada no se toca", async () => {
    m.insp.mockResolvedValue({ id: INSPECTION_ID, work_order_id: "w1", tree_id: "t1", inspector: INSPECTOR, estado_registro: "finalizado" });
    m.vars.mockResolvedValue({ condicion_radicular_entorno: "x" });
    await expect(guardarBorradorInspeccion(usuario(INSPECTOR), INSPECTION_ID, body({}) as never, "t"))
      .rejects.toMatchObject({ statusCode: 422 });
    expect(m.conservar).not.toHaveBeenCalled();
    expect(m.guardar).not.toHaveBeenCalled();
  });
});
