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

  it.each(["evaluacion_inicial", "reevaluacion", "levantamiento"])(
    "%s: acepta superficie_alcorque_m2_manual con alcorque Irregular (D-125; CC-056)",
    (tipo) => {
      const resultado = crearBorradorInspeccionSchema.safeParse({
        tipo_inspeccion_realizada: tipo,
        variables: { existe_alcorque: true, forma_alcorque: "irregular", superficie_alcorque_m2_manual: 1.8 },
      });
      expect(resultado.success).toBe(true);
    }
  );

  it("evaluación instrumental: rechaza superficie_alcorque_m2_manual (fuera de su alcance, CC-040)", () => {
    const resultado = crearBorradorInspeccionSchema.safeParse({
      tipo_inspeccion_realizada: "evaluacion_instrumental",
      variables: { superficie_alcorque_m2_manual: 1.8 },
    });
    expect(resultado.success).toBe(false);
  });

  it("evaluación inicial: sigue rechazando superficie_alcorque_m2 (la calcula el Sistema, D-125)", () => {
    const resultado = crearBorradorInspeccionSchema.safeParse({
      tipo_inspeccion_realizada: "evaluacion_inicial",
      variables: { superficie_alcorque_m2: 1.8 },
    });
    expect(resultado.success).toBe(false);
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

  it("monitoreo/vitalidad: acepta un código vigente del catálogo (D-169; AM-17)", () => {
    const resultado = crearBorradorInspeccionSchema.safeParse({
      tipo_inspeccion_realizada: "monitoreo",
      subtipo_inspeccion: "vitalidad",
      variables: { clasificacion_vitalidad: "2_estancamiento" },
    });
    expect(resultado.success).toBe(true);
  });

  it("monitoreo/vitalidad: rechaza un valor fuera del dominio del Excel (D-169; AM-17)", () => {
    const resultado = crearBorradorInspeccionSchema.safeParse({
      tipo_inspeccion_realizada: "monitoreo",
      subtipo_inspeccion: "vitalidad",
      variables: { clasificacion_vitalidad: "muy_mal" },
    });
    expect(resultado.success).toBe(false);
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

describe("variables — selección múltiple (D-132, D-139, D-143; CC-056 decisión o)", () => {
  const completa = (variables: Record<string, unknown>) =>
    crearBorradorInspeccionSchema.safeParse({ tipo_inspeccion_realizada: "evaluacion_inicial", variables });

  it("acepta listas de códigos vigentes en los tres campos", () => {
    expect(
      completa({
        tipo_infraestructura_vertical: ["poste", "otro"],
        tipo_red_aerea: ["electrica", "telecomunicaciones"],
        tipo_red_subterranea: ["agua_potable"],
      }).success
    ).toBe(true);
  });

  it("acepta null en un campo de selección múltiple", () => {
    expect(completa({ tipo_red_aerea: null }).success).toBe(true);
  });

  it("rechaza un valor simple, una lista vacía, repetidos o un código que no existe", () => {
    expect(completa({ tipo_red_aerea: "electrica" }).success).toBe(false);
    expect(completa({ tipo_red_aerea: [] }).success).toBe(false);
    expect(completa({ tipo_red_aerea: ["electrica", "electrica"] }).success).toBe(false);
    expect(completa({ tipo_red_subterranea: ["agua"] }).success).toBe(false);
  });

  it("rechaza una lista en un campo que no es de selección múltiple", () => {
    expect(completa({ raices_expuestas: ["si"] }).success).toBe(false);
  });

  it("clasificacion_vitalidad: valida el dominio también en la evaluación completa (CC-056 decisión g)", () => {
    expect(completa({ clasificacion_vitalidad: "2_estancamiento" }).success).toBe(true);
    expect(completa({ clasificacion_vitalidad: "regular" }).success).toBe(false);
  });
});
