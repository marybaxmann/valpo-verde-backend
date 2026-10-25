import { crearBorradorInspeccionSchema, guardarBorradorInspeccionSchema } from "../../../src/schemas/sivu/inspeccion.schema";

const TREE_ID = "11111111-1111-1111-1111-111111111111";

describe("crearBorradorInspeccionSchema (#58)", () => {
  it("acepta una evaluación inicial con variables libres (sin alcance cerrado, CC-040)", () => {
    const resultado = crearBorradorInspeccionSchema.safeParse({
      tipo_inspeccion_realizada: "evaluacion_inicial",
      variables: { raices_expuestas: true, defoliacion_estimada_pct: 10 },
    });
    expect(resultado.success).toBe(true);
  });

  it("evaluación instrumental: rechaza una clave fuera de su alcance (CC-040)", () => {
    const resultado = crearBorradorInspeccionSchema.safeParse({
      tipo_inspeccion_realizada: "evaluacion_instrumental",
      variables: { raices_expuestas: true },
    });
    expect(resultado.success).toBe(false);
  });

  it("evaluación instrumental: acepta las claves de cavidad basal/tronco", () => {
    const resultado = crearBorradorInspeccionSchema.safeParse({
      tipo_inspeccion_realizada: "evaluacion_instrumental",
      variables: { cavidad_pudricion_basal: true, D_diametro_basal_tronco_cm: 40 },
    });
    expect(resultado.success).toBe(true);
  });

  it("evaluación instrumental: rechaza un campo calculado por la plataforma (SL_basal_pct)", () => {
    const resultado = crearBorradorInspeccionSchema.safeParse({
      tipo_inspeccion_realizada: "evaluacion_instrumental",
      variables: { SL_basal_pct: 10 },
    });
    expect(resultado.success).toBe(false);
  });

  it("monitoreo/fitosanitario: acepta sus 5 campos, rechaza uno fuera de alcance", () => {
    const ok = crearBorradorInspeccionSchema.safeParse({
      tipo_inspeccion_realizada: "monitoreo",
      subtipo_inspeccion: "fitosanitario",
      variables: { defoliacion_estimada_pct: 20, presenta_exudaciones: false },
    });
    expect(ok.success).toBe(true);

    const malo = crearBorradorInspeccionSchema.safeParse({
      tipo_inspeccion_realizada: "monitoreo",
      subtipo_inspeccion: "fitosanitario",
      variables: { ramas_quebradas: true },
    });
    expect(malo.success).toBe(false);
  });

  it("monitoreo exige subtipo_inspeccion (D-197)", () => {
    const resultado = crearBorradorInspeccionSchema.safeParse({
      tipo_inspeccion_realizada: "monitoreo",
      variables: {},
    });
    expect(resultado.success).toBe(false);
  });

  it("acepta campos_arbol parcial y rechaza una clave desconocida", () => {
    const ok = crearBorradorInspeccionSchema.safeParse({
      tipo_inspeccion_realizada: "evaluacion_inicial",
      variables: {},
      campos_arbol: { dap_cm: 25.5, sector: "Barrio Puerto" },
      tree_id: TREE_ID,
    });
    expect(ok.success).toBe(true);

    const malo = crearBorradorInspeccionSchema.safeParse({
      tipo_inspeccion_realizada: "evaluacion_inicial",
      variables: {},
      campos_arbol: { campo_inventado: 1 },
    });
    expect(malo.success).toBe(false);
  });

  it("rechaza claves no declaradas a nivel del body (.strict())", () => {
    const resultado = crearBorradorInspeccionSchema.safeParse({
      tipo_inspeccion_realizada: "evaluacion_inicial",
      variables: {},
      work_order_id: "no-debería-venir-en-el-body",
    });
    expect(resultado.success).toBe(false);
  });
});

describe("guardarBorradorInspeccionSchema (#58) — sin tree_id", () => {
  it("acepta el mismo body que crear, sin tree_id", () => {
    const resultado = guardarBorradorInspeccionSchema.safeParse({
      tipo_inspeccion_realizada: "evaluacion_inicial",
      variables: { raices_expuestas: true },
    });
    expect(resultado.success).toBe(true);
  });

  it("rechaza tree_id (no se reenvía en los guardados siguientes)", () => {
    const resultado = guardarBorradorInspeccionSchema.safeParse({
      tipo_inspeccion_realizada: "evaluacion_inicial",
      variables: {},
      tree_id: TREE_ID,
    });
    expect(resultado.success).toBe(false);
  });
});
