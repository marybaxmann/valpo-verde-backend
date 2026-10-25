import { crearOrdenTrabajoInspeccionSchema, transicionarOrdenTrabajoSchema } from "../../../src/schemas/sivu/workOrder.schema";

const TREE_ID = "11111111-1111-1111-1111-111111111111";
const INSPECTOR_ID = "22222222-2222-2222-2222-222222222222";

describe("crearOrdenTrabajoInspeccionSchema (#58; D-238/D-244/CC-036)", () => {
  function bodyValido(overrides: Record<string, unknown> = {}) {
    return {
      tree_id: TREE_ID,
      accion_solicitada: "evaluacion_inicial",
      responsable_accion_id: INSPECTOR_ID,
      ...overrides,
    };
  }

  it("acepta una evaluación inicial válida, con tree_id y sin prioridad (se propone en el service)", () => {
    const resultado = crearOrdenTrabajoInspeccionSchema.safeParse(bodyValido());
    expect(resultado.success).toBe(true);
  });

  it("rechaza tree_id ausente fuera de Levantamiento", () => {
    const { tree_id, ...body } = bodyValido();
    void tree_id;
    const resultado = crearOrdenTrabajoInspeccionSchema.safeParse(body);
    expect(resultado.success).toBe(false);
  });

  it("rechaza tree_id presente en Levantamiento (D-232/AMD-19)", () => {
    const resultado = crearOrdenTrabajoInspeccionSchema.safeParse(
      bodyValido({ accion_solicitada: "levantamiento", tree_id: TREE_ID, observaciones: "Área de prueba" })
    );
    expect(resultado.success).toBe(false);
  });

  it("Levantamiento válido: sin tree_id, con observaciones (D-246)", () => {
    const { tree_id, ...body } = bodyValido({ accion_solicitada: "levantamiento", observaciones: "Área de prueba" });
    void tree_id;
    const resultado = crearOrdenTrabajoInspeccionSchema.safeParse(body);
    expect(resultado.success).toBe(true);
  });

  it("rechaza Levantamiento sin observaciones (D-246)", () => {
    const { tree_id, ...body } = bodyValido({ accion_solicitada: "levantamiento" });
    void tree_id;
    const resultado = crearOrdenTrabajoInspeccionSchema.safeParse(body);
    expect(resultado.success).toBe(false);
  });

  it("rechaza un subtipo que no pertenece a la acción solicitada (D-197)", () => {
    const resultado = crearOrdenTrabajoInspeccionSchema.safeParse(
      bodyValido({ subtipo_accion: "tomografia_sonica" })
    );
    expect(resultado.success).toBe(false);
  });

  it("monitoreo exige un subtipo (nunca null)", () => {
    const resultado = crearOrdenTrabajoInspeccionSchema.safeParse(bodyValido({ accion_solicitada: "monitoreo" }));
    expect(resultado.success).toBe(false);
  });

  it("rechaza una prioridad fuera del dominio de D-238", () => {
    const resultado = crearOrdenTrabajoInspeccionSchema.safeParse(bodyValido({ prioridad: "urgente" }));
    expect(resultado.success).toBe(false);
  });

  it("rechaza claves no declaradas (.strict())", () => {
    const resultado = crearOrdenTrabajoInspeccionSchema.safeParse(bodyValido({ estado_ot: "pendiente" }));
    expect(resultado.success).toBe(false);
  });
});

describe("transicionarOrdenTrabajoSchema (018g; CC-050)", () => {
  it("acepta pasar a Programada con fecha_accion_programada", () => {
    const resultado = transicionarOrdenTrabajoSchema.safeParse({
      estado: "programada",
      fecha_accion_programada: "2026-10-30",
    });
    expect(resultado.success).toBe(true);
  });

  it("rechaza pasar a Programada sin fecha_accion_programada (D-241)", () => {
    const resultado = transicionarOrdenTrabajoSchema.safeParse({ estado: "programada" });
    expect(resultado.success).toBe(false);
  });

  it("acepta pasar a En ejecución sin fecha", () => {
    const resultado = transicionarOrdenTrabajoSchema.safeParse({ estado: "en_ejecucion" });
    expect(resultado.success).toBe(true);
  });

  it("rechaza un estado fuera de las dos transiciones soportadas", () => {
    const resultado = transicionarOrdenTrabajoSchema.safeParse({ estado: "completada" });
    expect(resultado.success).toBe(false);
  });
});
