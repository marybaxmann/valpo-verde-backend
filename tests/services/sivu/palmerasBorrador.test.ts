import { crearBorradorInspeccionSchema } from "../../../src/schemas/sivu/inspeccion.schema";
import { CAMPOS_NO_APLICAN_PALMERA, REGLAS_COMPLETITUD } from "../../../src/schemas/sivu/completitudInspeccion";
import { EntradaCompletitud, evaluarCompletitud, vigenteEnVersion } from "../../../src/services/sivu/completitud";
import { componerVariablesCalculo } from "../../../src/services/sivu/finalizacion.service";
import { construirInspectionFormSchema } from "../../../src/services/sivu/inspectionFormSchema.service";

/**
 * CC-082 (PALM-01): borrador, completitud y composición de los campos de
 * palmeras. Superposición: con la versión operativa (3.2) nada cambia ni para
 * árboles ni para palmeras; con la 3.3 se exigen los campos de palmeras y una
 * palmera no responde los de la hoja PALMERAS, sección B.
 */

const CAMPOS_PALMERA = [
  "calidad_copa_palmera", "proporcion_frondas_vivas", "anomalia_cogollo", "indicios_plaga_palmera",
  "estrechamiento_estipite", "angulacion_grave_estipite", "raices_adventicias_altura", "inclinacion_corregida",
];

function variablesArbol(): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  for (const r of REGLAS_COMPLETITUD) {
    if (r.hoja === "REGISTRO_EVALUACION" && r.activacion.op === "siempre") v[r.campo] = false;
  }
  return {
    ...v, angulo_inclinacion: 5, sin_follaje_estacional: false, defoliacion_estimada_pct: 0, clorosis_pct: 0, necrosis_pct: 0,
    zona_objetivo: "bajo_la_copa", tasa_ocupacion_objetivo: "rara", clasificacion_vitalidad: "1_degeneracion",
    copa_faltante_pct: 0, muerte_regresiva_copa_pct: 0, exposicion_luminica_copa_cle: 3,
  };
}

function entrada(tipo_hoja: string | null, variablesRegistradas: Record<string, unknown>, ruleVersion?: "3.2" | "3.4"): EntradaCompletitud {
  const arbolRegistrado = {
    multifustal: false, dap_cm: 40, altura_total_m: 10, diametro_copa_ns_m: 5, diametro_copa_eo_m: 5, copa_no_presenta: false,
    altura_primera_rama_m: 6, altura_base_copa_viva_m: 7, clase_edad: "maduro",
  };
  return {
    tipo: "evaluacion_inicial", subtipo: null, variablesRegistradas, variablesVigentes: {},
    arbolRegistrado, camposRegistradosArbol: Object.keys(arbolRegistrado),
    arbolVigente: {
      sector: "Plaza Victoria", ubicacion_descriptiva: "Plaza Victoria", utm_este: 255385, utm_norte: 6340553,
      especie_cientifica: "Phoenix canariensis", nombre_comun: "Palmera canaria", tipo_hoja,
    },
    inspeccionId: "i", fotos: ["arbol_completo", "base", "tronco", "copa"].map((vista, n) => ({
      id: `f${n}`, inspection_id: "i", storage_path: `f${n}.jpg`, sha256: `h${n}`, vista,
    })),
    ...(ruleVersion && { ruleVersion }),
  };
}

const faltantes = (e: EntradaCompletitud) => evaluarCompletitud(e).campos_faltantes.map((f) => f.campo);

describe("completitud de palmeras por versión (CC-082)", () => {
  it("vigenteEnVersion compara MAJOR.MINOR", () => {
    expect(vigenteEnVersion({}, "3.0")).toBe(true);
    expect(vigenteEnVersion({ desdeVersion: "3.4" }, "3.2")).toBe(false);
    expect(vigenteEnVersion({ desdeVersion: "3.4" }, "3.4")).toBe(true);
  });

  it("los campos de palmeras se generan con desdeVersion 3.3 y activación tipo_hoja = palmera", () => {
    for (const campo of CAMPOS_PALMERA) {
      const r = REGLAS_COMPLETITUD.find((x) => x.campo === campo)!;
      expect({ campo, desde: r.desdeVersion }).toEqual({ campo, desde: "3.4" });
      expect(JSON.stringify(r.activacion)).toContain('"tipo_hoja","valor":"palmera"');
    }
  });

  it("con la operativa (3.2), un árbol y una palmera se exigen igual que antes", () => {
    expect(faltantes(entrada("latifoliada", variablesArbol()))).toEqual([]);
    expect(faltantes(entrada("palmera", { ...variablesArbol(), clasificacion_vitalidad: undefined }))).toEqual([]);
  });

  it("con la 3.3, un árbol se exige igual que con la 3.2", () => {
    const incompleto = { ...variablesArbol() };
    delete incompleto.ramas_secas;
    expect(faltantes(entrada("latifoliada", incompleto, "3.4"))).toEqual(faltantes(entrada("latifoliada", incompleto, "3.2")));
  });

  it("con la 3.3, una palmera debe responder sus campos y no los de la sección B", () => {
    // angulo_inclinacion = 5 activa inclinacion_corregida; las demás se activan por ser palmera.
    const f = faltantes(entrada("palmera", variablesArbol(), "3.4"));
    expect([...f].sort()).toEqual([...CAMPOS_PALMERA].sort());
    // Sección B: ni la defoliación ni la condición de la herida se exigen a una palmera.
    const conHerida: Record<string, unknown> = { ...variablesArbol(), presenta_heridas_tronco: true, sin_follaje_estacional: false };
    delete conHerida.defoliacion_estimada_pct;
    const fh = faltantes(entrada("palmera", conHerida, "3.4"));
    expect(fh).not.toContain("defoliacion_estimada_pct");
    expect(fh).not.toContain("condicion_heridas_tronco");
    for (const c of fh) expect(CAMPOS_NO_APLICAN_PALMERA).not.toContain(c);
  });

  it("con la 3.3, una palmera completa finaliza", () => {
    const v = {
      ...variablesArbol(), calidad_copa_palmera: "5", proporcion_frondas_vivas: "4", anomalia_cogollo: "ninguna",
      indicios_plaga_palmera: ["no"], estrechamiento_estipite: "no", angulacion_grave_estipite: false,
      raices_adventicias_altura: "no", inclinacion_corregida: "si",
    };
    expect(faltantes(entrada("palmera", v, "3.4"))).toEqual([]);
  });
});

describe("borrador con campos de palmeras (CC-082)", () => {
  const borrador = (variables: Record<string, unknown>) =>
    crearBorradorInspeccionSchema.safeParse({ tipo_inspeccion_realizada: "evaluacion_inicial", variables });

  it("acepta los códigos de sus catálogos y la plaga como selección múltiple", () => {
    expect(borrador({
      calidad_copa_palmera: "6", proporcion_frondas_vivas: "0", anomalia_cogollo: "pudricion",
      indicios_plaga_palmera: ["corona", "base"], estrechamiento_estipite: "no_determinado",
      angulacion_grave_estipite: true, raices_adventicias_altura: "no_aplica_especie", inclinacion_corregida: "no",
    }).success).toBe(true);
  });

  it.each([
    ["calidad_copa_palmera", 5],
    ["anomalia_cogollo", "Pudrición"],
    ["indicios_plaga_palmera", "corona"],
    ["angulacion_grave_estipite", "si"],
    ["raices_adventicias_altura", "sí"],
  ])("rechaza %s = %j", (campo, valor) => {
    expect(borrador({ [campo]: valor }).success).toBe(false);
  });
});

describe("formulario y composición (CC-082)", () => {
  it("el formulario marca la versión de los campos de palmeras y los que no aplican a palmeras", () => {
    const f = construirInspectionFormSchema();
    const calidad = f.variables.find((c) => c.identificador === "calidad_copa_palmera")!;
    expect(calidad).toMatchObject({ desde_version: "3.4", tipo_entrada: "seleccion", seccion: { codigo: "copa_ramas" } });
    expect(f.variables.find((c) => c.identificador === "indicios_plaga_palmera")).toMatchObject({ tipo_entrada: "seleccion_multiple" });
    expect(f.variables.find((c) => c.identificador === "defoliacion_estimada_pct")).toMatchObject({ no_aplica_palmera: true, desde_version: null });
    expect(f.variables.find((c) => c.identificador === "ramas_secas")).toMatchObject({ no_aplica_palmera: false });
  });

  it("con la operativa 3.2 no se agregan claves de palmeras a variables_calculo (ni a palmeras ni a árboles)", () => {
    const registradas = { calidad_copa_palmera: "5", indicios_plaga_palmera: ["no"] };
    for (const tipo_hoja of ["palmera", "latifoliada", null]) {
      const v = componerVariablesCalculo({}, registradas, 40, { tipo_hoja });
      for (const c of CAMPOS_PALMERA) expect(Object.prototype.hasOwnProperty.call(v, c)).toBe(false);
    }
  });
});
