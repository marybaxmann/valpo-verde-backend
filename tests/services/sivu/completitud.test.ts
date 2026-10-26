import { EntradaCompletitud, especieValidaD13, evaluarCompletitud } from "../../../src/services/sivu/completitud";
import { calcularDapEquivalenteCm } from "../../../src/services/rules/engine/variables-calculo";
import { REGLAS_COMPLETITUD } from "../../../src/schemas/sivu/completitudInspeccion";

/**
 * Completitud para finalizar (CC-056). La evaluación completa de base
 * se arma desde la tabla: todo Obligatorio de REGISTRO_EVALUACION con
 * `false` (no activa ningún Condicional «= Sí»), salvo los pocos que
 * necesitan otro valor; los campos de ARBOLES del grupo «solo Inspector»
 * registrados en esta inspección y los de «Inspector / Usuario
 * Municipal» solo vigentes.
 */

function variablesCompletas(): Record<string, unknown> {
  const variables: Record<string, unknown> = {};
  for (const r of REGLAS_COMPLETITUD) {
    if (r.hoja === "REGISTRO_EVALUACION" && r.activacion.op === "siempre") variables[r.campo] = false;
  }
  return {
    ...variables,
    angulo_inclinacion: 5,
    defoliacion_estimada_pct: 0,
    clorosis_pct: 0,
    necrosis_pct: 0,
    zona_objetivo: "bajo_la_copa",
    tasa_ocupacion_objetivo: "rara",
    consecuencia_raices_cuello: "menor",
    consecuencia_tronco: "menor",
    consecuencia_copa_ramas: "menor",
    clasificacion_vitalidad: "1_degeneracion",
    copa_faltante_pct: 0,
    muerte_regresiva_copa_pct: 0,
    exposicion_luminica_copa_cle: 3,
  };
}

function arbolRegistradoCompleto(): Record<string, unknown> {
  return {
    multifustal: false,
    dap_cm: 30,
    altura_total_m: 12,
    diametro_copa_ns_m: 6,
    diametro_copa_eo_m: 5,
    copa_no_presenta: false,
    altura_primera_rama_m: 2.5,
    altura_base_copa_viva_m: 3,
    clase_edad: "maduro",
  };
}

function evaluacionCompleta(overrides: Partial<EntradaCompletitud> = {}): EntradaCompletitud {
  const arbolRegistrado = overrides.arbolRegistrado ?? arbolRegistradoCompleto();
  return {
    tipo: "evaluacion_inicial",
    subtipo: null,
    variablesRegistradas: variablesCompletas(),
    variablesVigentes: {},
    arbolRegistrado,
    camposRegistradosArbol: Object.keys(arbolRegistrado),
    arbolVigente: {
      sector: "Cerro Alegre",
      ubicacion_descriptiva: "Plaza Bismarck",
      utm_este: 255000,
      utm_norte: 6340000,
      especie_cientifica: "Quillaja saponaria",
      nombre_comun: "Quillay",
    },
    vistasFotos: ["arbol_completo", "base", "tronco", "copa"],
    ...overrides,
  };
}

const faltantesDe = (e: EntradaCompletitud) => evaluarCompletitud(e).campos_faltantes.map((f) => f.campo);

describe("evaluación completa (Evaluación inicial, Reevaluación, Levantamiento)", () => {
  it.each(["evaluacion_inicial", "reevaluacion", "levantamiento"])("%s: la evaluación de base está completa", (tipo) => {
    expect(evaluarCompletitud(evaluacionCompleta({ tipo }))).toEqual({ completa: true, campos_faltantes: [] });
  });

  it("un Obligatorio sin registrar queda como faltante y la inspección sigue incompleta (CC-054)", () => {
    const variables = variablesCompletas();
    delete variables.raices_expuestas;
    const r = evaluarCompletitud(evaluacionCompleta({ variablesRegistradas: variables }));
    expect(r.completa).toBe(false);
    expect(r.campos_faltantes).toEqual([
      expect.objectContaining({ campo: "raices_expuestas", hoja: "REGISTRO_EVALUACION", fila: 33 }),
    ]);
  });

  it("un Condicional activado sin valor es faltante; desactivado, no", () => {
    expect(faltantesDe(evaluacionCompleta({ variablesRegistradas: { ...variablesCompletas(), raices_expuestas: true } }))).toEqual([
      "necrosis_radicular",
      "raices_cortadas",
    ]);
  });

  it("REGISTRO_EVALUACION: el valor vigente no basta, tiene que registrarse en esta inspección", () => {
    const variables = variablesCompletas();
    delete variables.zona_objetivo;
    const r = evaluarCompletitud(
      evaluacionCompleta({ variablesRegistradas: variables, variablesVigentes: { zona_objetivo: "bajo_la_copa" } })
    );
    expect(r.campos_faltantes).toEqual([
      expect.objectContaining({ campo: "zona_objetivo", motivo: expect.stringMatching(/Debe registrarse en esta inspección/) }),
    ]);
  });

  it("ARBOLES «solo Inspector» (dap_cm) vigente pero no registrado: falta", () => {
    const arbol = arbolRegistradoCompleto();
    delete arbol.dap_cm;
    const e = evaluacionCompleta({ arbolRegistrado: arbol, arbolVigente: { ...evaluacionCompleta().arbolVigente, dap_cm: 30 } });
    expect(faltantesDe(e)).toEqual(["dap_cm"]);
  });

  it("ARBOLES «Inspector / Usuario Municipal» (sector) basta con el vigente; sin valor en ningún lado, falta", () => {
    expect(evaluarCompletitud(evaluacionCompleta()).completa).toBe(true);
    const sinSector = { ...evaluacionCompleta().arbolVigente, sector: null };
    expect(faltantesDe(evaluacionCompleta({ arbolVigente: sinSector }))).toEqual(["sector"]);
  });

  it("D-13: especie vigente «Género sp.» o «No determinado» no permite finalizar", () => {
    for (const especie of ["Schinus sp.", "Schinus sp", "No determinado"]) {
      const arbolVigente = { ...evaluacionCompleta().arbolVigente, especie_cientifica: especie };
      expect(evaluarCompletitud(evaluacionCompleta({ arbolVigente })).campos_faltantes).toEqual([
        expect.objectContaining({ campo: "especie_cientifica", motivo: expect.stringMatching(/D-13/) }),
      ]);
    }
  });

  it("D-13: se verifica sobre el valor que quede (la corrección registrada reemplaza a la vigente)", () => {
    const arbolRegistrado = { ...arbolRegistradoCompleto(), especie_cientifica: "Schinus molle" };
    const arbolVigente = { ...evaluacionCompleta().arbolVigente, especie_cientifica: "Schinus sp." };
    expect(evaluarCompletitud(evaluacionCompleta({ arbolRegistrado, arbolVigente })).completa).toBe(true);
  });

  it("D-27: falta una de las cuatro vistas", () => {
    const r = evaluarCompletitud(evaluacionCompleta({ vistasFotos: ["arbol_completo", "base", "tronco", null] }));
    expect(r.campos_faltantes).toEqual([
      expect.objectContaining({ campo: "fotografias_arbol", motivo: expect.stringMatching(/copa/) }),
    ]);
  });

  it("«Obligatorio responder»: basta la marca *_no_presenta = Sí", () => {
    const arbol = arbolRegistradoCompleto();
    delete arbol.altura_primera_rama_m;
    expect(faltantesDe(evaluacionCompleta({ arbolRegistrado: arbol }))).toEqual(["altura_primera_rama_m"]);
    expect(
      faltantesDe(evaluacionCompleta({ arbolRegistrado: { ...arbol, altura_primera_rama_no_presenta: true } }))
    ).toEqual([]);
  });

  it("sin copa: no se exigen diámetros de copa, copa faltante, muerte regresiva ni exposición lumínica", () => {
    const arbol: Record<string, unknown> = { ...arbolRegistradoCompleto(), copa_no_presenta: true };
    delete arbol.diametro_copa_ns_m;
    delete arbol.diametro_copa_eo_m;
    const variables = variablesCompletas();
    delete variables.copa_faltante_pct;
    delete variables.muerte_regresiva_copa_pct;
    delete variables.exposicion_luminica_copa_cle;
    expect(faltantesDe(evaluacionCompleta({ arbolRegistrado: arbol, variablesRegistradas: variables }))).toEqual([]);
  });

  it("clasificacion_vitalidad se exige en la evaluación completa (CC-056 decisión g)", () => {
    const variables = variablesCompletas();
    delete variables.clasificacion_vitalidad;
    expect(faltantesDe(evaluacionCompleta({ variablesRegistradas: variables }))).toEqual(["clasificacion_vitalidad"]);
  });

  describe("alcorque Irregular (D-125; CC-056 decisión l)", () => {
    const conAlcorque = (extra: Record<string, unknown>) =>
      evaluacionCompleta({
        variablesRegistradas: { ...variablesCompletas(), existe_alcorque: true, dano_interferencia_alcorque: false, ...extra },
      });

    it("sin superficie_alcorque_m2_manual: falta", () => {
      expect(faltantesDe(conAlcorque({ forma_alcorque: "irregular" }))).toEqual(["superficie_alcorque_m2_manual"]);
    });

    it("con superficie_alcorque_m2_manual: completa", () => {
      expect(faltantesDe(conAlcorque({ forma_alcorque: "irregular", superficie_alcorque_m2_manual: 1.8 }))).toEqual([]);
    });

    it("rectangular: exige largo y ancho, no la superficie manual", () => {
      expect(faltantesDe(conAlcorque({ forma_alcorque: "rectangular" }))).toEqual(["largo_alcorque_m", "ancho_alcorque_m"]);
    });
  });

  describe("DAP multifustal y tutorado (D-18, D-149; CC-056 decisión k)", () => {
    function multifustal(dap_fustes_cm: number[]) {
      const dap = calcularDapEquivalenteCm({ numero_fustes: dap_fustes_cm.length, dap_fustes_cm }).valor!;
      const arbol = { ...arbolRegistradoCompleto(), multifustal: true, numero_fustes: dap_fustes_cm.length, dap_fustes_cm, dap_cm: Math.round(dap * 100) / 100 };
      return evaluacionCompleta({ arbolRegistrado: arbol });
    }

    it("DAP equivalente < 10 cm activa presenta_tutorado", () => {
      expect(faltantesDe(multifustal([5, 6]))).toEqual(["presenta_tutorado"]); // 7,81
    });

    it("DAP equivalente ≥ 10 cm no lo activa", () => {
      expect(faltantesDe(multifustal([30, 40]))).toEqual([]);
    });

    it("multifustal = Sí sin fustes ni diámetros: faltan numero_fustes y dap_fustes_cm, no dap_cm", () => {
      const arbol: Record<string, unknown> = { ...arbolRegistradoCompleto(), multifustal: true };
      delete arbol.dap_cm;
      expect(faltantesDe(evaluacionCompleta({ arbolRegistrado: arbol }))).toEqual(["numero_fustes", "dap_fustes_cm"]);
    });
  });

  it("observaciones_infraestructura: se activa con más de un tipo seleccionado (D-147)", () => {
    const variables = {
      ...variablesCompletas(),
      infraestructura_inmediata: true,
      existe_vereda: false,
      existe_calzada: false,
      interferencia_redes_servicios: false,
      contacto_interferencia_infraestructura_vertical: true,
      tipo_infraestructura_vertical: ["poste", "luminaria"],
      dano_fisico_observable_infraestructura_vertical: false,
      compromete_estabilidad_funcionalidad: false,
    };
    expect(faltantesDe(evaluacionCompleta({ variablesRegistradas: variables }))).toEqual(["observaciones_infraestructura"]);
    expect(
      faltantesDe(evaluacionCompleta({ variablesRegistradas: { ...variables, tipo_infraestructura_vertical: ["poste"] } }))
    ).toEqual([]);
  });
});

describe("inspecciones parciales (CC-040; CC-056 punto 2)", () => {
  function parcial(tipo: string, subtipo: string | null, variablesRegistradas: Record<string, unknown>, extra: Partial<EntradaCompletitud> = {}) {
    return evaluarCompletitud({
      tipo,
      subtipo,
      variablesRegistradas,
      variablesVigentes: {},
      arbolRegistrado: {},
      camposRegistradosArbol: [],
      arbolVigente: { especie_cientifica: "Schinus sp." },
      vistasFotos: [],
      ...extra,
    });
  }

  it("Instrumental con las dos cavidades = No: completa (D-39; fila 28)", () => {
    expect(
      parcial("evaluacion_instrumental", "resistografia", { cavidad_pudricion_basal: false, presenta_cavidad_pudricion_tronco: false })
    ).toEqual({ completa: true, campos_faltantes: [] });
  });

  it("Instrumental con cavidad basal = Sí: exige su cadena de condicionales", () => {
    const r = parcial("evaluacion_instrumental", null, { cavidad_pudricion_basal: true, presenta_cavidad_pudricion_tronco: false });
    expect(r.campos_faltantes.map((f) => f.campo)).toEqual([
      "cavidad_basal_externa",
      "cavidad_basal_interna",
      "D_diametro_basal_tronco_cm",
    ]);
  });

  it("no exige ARBOLES, fotos ni D-13 (especie vigente «sp.»)", () => {
    expect(
      parcial("evaluacion_instrumental", null, { cavidad_pudricion_basal: false, presenta_cavidad_pudricion_tronco: false }).completa
    ).toBe(true);
  });

  it("Monitoreo Vitalidad: exige clasificacion_vitalidad", () => {
    expect(parcial("monitoreo", "vitalidad", {}).campos_faltantes.map((f) => f.campo)).toEqual(["clasificacion_vitalidad"]);
    expect(parcial("monitoreo", "vitalidad", { clasificacion_vitalidad: "0_exploracion" }).completa).toBe(true);
  });

  it("Monitoreo Fitosanitario: muerte_regresiva_copa_pct se activa con la copa vigente del árbol", () => {
    const base = { defoliacion_estimada_pct: 10, clorosis_pct: 0, necrosis_pct: 0, presenta_exudaciones: false };
    expect(parcial("monitoreo", "fitosanitario", base).campos_faltantes.map((f) => f.campo)).toEqual([
      "muerte_regresiva_copa_pct",
    ]);
    expect(parcial("monitoreo", "fitosanitario", base, { arbolVigente: { copa_no_presenta: true } }).completa).toBe(true);
  });

  it("la condición de activación usa el valor vigente si esta inspección no lo registró", () => {
    // Monitoreo Estructural: angulo_inclinacion es Obligatorio, pero la
    // activación de direccion_inclinacion se evalúa con el valor que quede.
    const r = parcial("monitoreo", "estructural", {}, { variablesVigentes: { angulo_inclinacion: 20 } });
    const campos = r.campos_faltantes.map((f) => f.campo);
    expect(campos).toContain("angulo_inclinacion");
    expect(campos).toContain("direccion_inclinacion");
  });

  it("tipo/subtipo sin alcance: error interno, no un faltante", () => {
    expect(() => parcial("monitoreo", null, {})).toThrow(/sin alcance/);
  });
});

describe("especieValidaD13 (D-13; CC-056 decisión r)", () => {
  it.each(["Acacia sp.", "Acacia sp", "Acacia sp. ", "  Acacia sp.", "Acacia spp.", "Acacia spp", "Acacia SPP. ", "No determinado", " no determinado "])(
    "rechaza «%s»",
    (especie) => {
      expect(especieValidaD13(especie)).toBe(false);
    }
  );

  it.each(["Quillaja saponaria", "Acacia caven", " Schinus molle "])("acepta «%s»", (especie) => {
    expect(especieValidaD13(especie)).toBe(true);
  });

  it("acepta un epíteto que termina en «sp» dentro de otra palabra (caso sintético: no conozco una especie real así)", () => {
    expect(especieValidaD13("Genero crispp")).toBe(true);
    expect(especieValidaD13("Genero cuspidatasp")).toBe(true);
  });

  it("en la evaluación completa, «Acacia sp. » con espacio final no permite finalizar", () => {
    const arbolVigente = { ...evaluacionCompleta().arbolVigente, especie_cientifica: "Acacia sp. " };
    expect(faltantesDe(evaluacionCompleta({ arbolVigente }))).toEqual(["especie_cientifica"]);
  });
});
