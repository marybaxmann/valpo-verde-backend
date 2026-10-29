import { crearBorradorInspeccionSchema, guardarBorradorInspeccionSchema } from "../../../src/schemas/sivu/inspeccion.schema";
import { CAMPOS_SI_NO, CATALOGO_SELECCION_UNICA, camposPermitidosPorTipo } from "../../../src/schemas/sivu/alcanceInspeccion";
import { entradasVigentesDe } from "../../../src/services/rules/engine/catalogs";
import { CATALOGO_DE_CAMPO_FORMULARIO } from "../../../src/services/sivu/inspectionFormSchema.service";

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

describe("campos_arbol — DAP (D-16 a D-18; CC-056 decisión n)", () => {
  const conArbol = (campos_arbol: Record<string, unknown>) =>
    crearBorradorInspeccionSchema.safeParse({ tipo_inspeccion_realizada: "evaluacion_inicial", variables: {}, campos_arbol });

  it("acepta multifustal = Sí con número de fustes y diámetros coincidentes, sin dap_cm", () => {
    expect(conArbol({ multifustal: true, numero_fustes: 3, dap_fustes_cm: [10, 12, 14] }).success).toBe(true);
  });

  it("acepta multifustal = Sí con fustes todavía sin diámetros (borrador a medias)", () => {
    expect(conArbol({ multifustal: true, numero_fustes: 3 }).success).toBe(true);
  });

  it("acepta multifustal = No con dap_cm a mano", () => {
    expect(conArbol({ multifustal: false, dap_cm: 25 }).success).toBe(true);
  });

  it("rechaza que el número de fustes no coincida con la cantidad de diámetros (D-17)", () => {
    const r = conArbol({ multifustal: true, numero_fustes: 3, dap_fustes_cm: [10, 12] });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/debe coincidir con numero_fustes/);
  });

  it("rechaza diámetros sin numero_fustes (D-17)", () => {
    expect(conArbol({ multifustal: true, dap_fustes_cm: [10, 12] }).success).toBe(false);
  });

  it("rechaza numero_fustes < 2 (D-16)", () => {
    expect(conArbol({ multifustal: true, numero_fustes: 1, dap_fustes_cm: [10] }).success).toBe(false);
  });

  it("rechaza dap_cm enviado con multifustal = Sí (D-18: lo calcula la plataforma)", () => {
    expect(conArbol({ multifustal: true, numero_fustes: 2, dap_fustes_cm: [10, 12], dap_cm: 15 }).success).toBe(false);
  });

  it("rechaza fustes sin multifustal = Sí en el mismo guardado", () => {
    expect(conArbol({ numero_fustes: 2, dap_fustes_cm: [10, 12] }).success).toBe(false);
    expect(conArbol({ multifustal: false, numero_fustes: 2, dap_fustes_cm: [10, 12] }).success).toBe(false);
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

describe("variables — selección única (PR-021; B16)", () => {
  const completa = (variables: Record<string, unknown>) =>
    crearBorradorInspeccionSchema.safeParse({ tipo_inspeccion_realizada: "evaluacion_inicial", variables });
  const campos = Object.entries(CATALOGO_SELECCION_UNICA);

  it("cada catálogo asignado existe y tiene entradas vigentes", () => {
    for (const [, catalogo] of campos) expect(entradasVigentesDe(catalogo).length).toBeGreaterThan(0);
  });

  it("el formulario de B16 ofrece las opciones de cada campo con el mismo catálogo", () => {
    for (const [campo, catalogo] of campos) expect(CATALOGO_DE_CAMPO_FORMULARIO[campo]).toBe(catalogo);
  });

  it.each(campos)("%s: acepta cada código vigente de %s, y null", (campo, catalogo) => {
    for (const { codigo } of entradasVigentesDe(catalogo)) {
      expect(completa({ [campo]: codigo }).success).toBe(true);
    }
    expect(completa({ [campo]: null }).success).toBe(true);
  });

  it.each(campos)("%s: rechaza la etiqueta, un número, un booleano y un código inexistente", (campo, catalogo) => {
    const { codigo, etiqueta } = entradasVigentesDe(catalogo)[0];
    if (etiqueta !== codigo) expect(completa({ [campo]: etiqueta }).success).toBe(false);
    expect(completa({ [campo]: 1 }).success).toBe(false);
    expect(completa({ [campo]: true }).success).toBe(false);
    expect(completa({ [campo]: "codigo_inexistente" }).success).toBe(false);
  });

  it("el error indica el campo y el catálogo", () => {
    const resultado = completa({ materialidad_vereda: "Baldosa" });
    expect(resultado.success).toBe(false);
    if (resultado.success) return;
    expect(resultado.error.issues[0].path).toEqual(["variables", "materialidad_vereda"]);
    expect(resultado.error.issues[0].message).toContain("materialidad_vereda");
  });
});

describe("variables — Sí / No como booleano (PR-021; B16)", () => {
  const completa = (variables: Record<string, unknown>) =>
    crearBorradorInspeccionSchema.safeParse({ tipo_inspeccion_realizada: "evaluacion_inicial", variables });
  const campos = [...CAMPOS_SI_NO];

  it("sale de la columna H del Excel: 52 campos de REGISTRO_EVALUACION, todos en el alcance de la evaluación completa", () => {
    const alcance = new Set<string>(camposPermitidosPorTipo("evaluacion_inicial", null)!);
    expect(campos.filter((c) => alcance.has(c))).toHaveLength(campos.length);
    expect(campos).toHaveLength(52);
  });

  it.each(campos)("%s: acepta true, false y null; rechaza \"Sí\", \"si\" y 1", (campo) => {
    expect(completa({ [campo]: true }).success).toBe(true);
    expect(completa({ [campo]: false }).success).toBe(true);
    expect(completa({ [campo]: null }).success).toBe(true);
    expect(completa({ [campo]: "Sí" }).success).toBe(false);
    expect(completa({ [campo]: "si" }).success).toBe(false);
    expect(completa({ [campo]: 1 }).success).toBe(false);
  });
});
