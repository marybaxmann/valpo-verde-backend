import {
  ArgsResultadoEvaluacion,
  ensamblarResultadoEvaluacion,
  NucleoEntradas,
  sonIndicadoresArbol,
} from "../../../../src/services/rules/engine/ensamblaje";
import {
  calcularVitalidadPalmera,
  evaluarR01Palmera,
  evaluarR02Palmera,
  evaluarR03Palmera,
  PalmeraInput,
} from "../../../../src/services/rules/engine/palmeras";
import { incluyePalmeras, RULE_VERSION, RULE_VERSION_OPERATIVA } from "../../../../src/services/rules/engine/version";

/** Palmera sin defectos (CC-081): todos los indicadores despreciables. */
function palmeraSana(): PalmeraInput {
  return {
    levantamiento_del_plato_radicular: false,
    angulo_inclinacion: 0,
    raices_expuestas: false,
    necrosis_radicular: null,
    raices_cortadas: false,
    cavidad_pudricion_basal: false,
    cavidad_basal_externa: null,
    cavidad_basal_interna: null,
    anillamiento: false,
    cuerpos_fructiferos_base: false,
    presenta_cavidad_pudricion_tronco: false,
    cavidad_externa_tronco: null,
    cavidad_interna_tronco: null,
    presenta_fisura_grieta_tronco: false,
    afectacion_fisura_grieta: null,
    direccion_grieta: null,
    presenta_heridas_tronco: false,
    cuerpos_fructiferos_tronco: false,
    ramas_secas: false,
    ramas_secas_pct_copa: null,
    ramas_quebradas: false,
    permanece_suspendida: null,
    calidad_copa_palmera: "5",
    proporcion_frondas_vivas: "4",
    anomalia_cogollo: "ninguna",
    indicios_plaga_palmera: ["no"],
    estrechamiento_estipite: "no",
    angulacion_grave_estipite: false,
    raices_adventicias_altura: "no",
    inclinacion_corregida: null,
  };
}

describe("versiones (CC-081)", () => {
  it("la 3.3 es candidata y la plataforma sigue en la 3.2", () => {
    expect(RULE_VERSION).toBe("3.3");
    expect(RULE_VERSION_OPERATIVA).toBe("3.2");
    expect(incluyePalmeras("3.3")).toBe(true);
    for (const v of ["3.0", "3.1", "3.2"] as const) expect(incluyePalmeras(v)).toBe(false);
  });
});

describe("R01-P · Base y raíces", () => {
  it("palmera sana: Improbable con puntaje 0", () => {
    expect(evaluarR01Palmera(palmeraSana())).toMatchObject({ puntaje: 0, probabilidadFalla: "improbable" });
  });

  it("plato levantado con inclinación no corregida: piso Inminente, aunque falte otro dato", () => {
    const r = evaluarR01Palmera({ ...palmeraSana(), levantamiento_del_plato_radicular: true, angulo_inclinacion: 20, inclinacion_corregida: "no", anillamiento: null });
    expect(r).toMatchObject({ puntaje: null, probabilidadFalla: "inminente" });
  });

  it.each([
    [0, null],
    [20, "si"],
    [20, "no_determinado"],
  ] as const)("plato levantado con ángulo %s e inclinación corregida %s: piso Probable", (angulo, corregida) => {
    const r = evaluarR01Palmera({ ...palmeraSana(), levantamiento_del_plato_radicular: true, angulo_inclinacion: angulo, inclinacion_corregida: corregida });
    expect(r.probabilidadFalla).toBe("probable");
  });

  it("inclinación sin umbral de grados: 60° corregida = 0; 5° no corregida = 2 (PB-INC)", () => {
    expect(evaluarR01Palmera({ ...palmeraSana(), angulo_inclinacion: 60, inclinacion_corregida: "si" }).indicadores.inclinacion).toMatchObject({ puntaje: 0, reglaId: "PB-INC-02" });
    expect(evaluarR01Palmera({ ...palmeraSana(), angulo_inclinacion: 5, inclinacion_corregida: "no" }).indicadores.inclinacion).toMatchObject({ puntaje: 2, reglaId: "PB-INC-03" });
  });

  it("inclinación sin valor de corrección deja el componente No determinado (PB-INC)", () => {
    const r = evaluarR01Palmera({ ...palmeraSana(), angulo_inclinacion: 10, inclinacion_corregida: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.motivo).toContain("inclinacion_corregida");
  });

  it("cavidad basal confirmada vale 2 sin SL ni t/R; con hongos y plaga en la base no se cuentan dos veces", () => {
    const r = evaluarR01Palmera({
      ...palmeraSana(), cavidad_pudricion_basal: true, cavidad_basal_externa: true, cavidad_basal_interna: "no",
      cuerpos_fructiferos_base: true, indicios_plaga_palmera: ["base"],
    });
    expect(r.indicadores.cavidadBasal).toMatchObject({ puntaje: 2, reglaId: "PB-CAV-02" });
    expect(r.indicadores.hongos).toMatchObject({ puntaje: 0, reglaId: "PB-HON-03" });
    expect(r.indicadores.plaga).toMatchObject({ puntaje: 0, reglaId: "PB-PLA-03" });
    expect(r).toMatchObject({ puntaje: 2, probabilidadFalla: "posible" });
  });

  it("cavidad interna que requiere instrumento: No determinado (PB-CAV-03)", () => {
    const r = evaluarR01Palmera({ ...palmeraSana(), cavidad_pudricion_basal: true, cavidad_basal_externa: false, cavidad_basal_interna: "requiere_evaluacion_instrumental" });
    expect(r.indicadores.cavidadBasal.reglaId).toBe("PB-CAV-03");
    expect(r.probabilidadFalla).toBe("no_determinado");
  });

  it("puntaje máximo 10 (convención de árboles) y banda Probable desde 4", () => {
    const r = evaluarR01Palmera({
      ...palmeraSana(), angulo_inclinacion: 10, inclinacion_corregida: "no", raices_expuestas: true, necrosis_radicular: true, raices_cortadas: true,
      anillamiento: true, cuerpos_fructiferos_base: true, indicios_plaga_palmera: ["base"],
    });
    // 2 + 3 + 0 + 1 + 1 + 1 (sin cavidad, hongos y plaga suman)
    expect(r).toMatchObject({ puntaje: 8, probabilidadFalla: "probable" });
  });
});

describe("R02-P · Estípite", () => {
  it("grieta transversal que penetra: piso Inminente aunque otro indicador falte (PE-GRI-03)", () => {
    const r = evaluarR02Palmera({
      ...palmeraSana(), presenta_fisura_grieta_tronco: true, afectacion_fisura_grieta: "penetra_en_madera", direccion_grieta: "transversal",
      estrechamiento_estipite: null,
    });
    expect(r).toMatchObject({ puntaje: null, probabilidadFalla: "inminente" });
  });

  it("grieta longitudinal 2 sin la regla de 1/3 del DAP; herida 2 (no cicatriza): suma 4 = Probable", () => {
    const r = evaluarR02Palmera({
      ...palmeraSana(), presenta_fisura_grieta_tronco: true, afectacion_fisura_grieta: "penetra_en_madera", direccion_grieta: "longitudinal",
      presenta_heridas_tronco: true,
    });
    expect(r.indicadores.grietas.reglaId).toBe("PE-GRI-02");
    expect(r.indicadores.heridas).toMatchObject({ puntaje: 2, reglaId: "PE-HER-02" });
    expect(r).toMatchObject({ puntaje: 4, probabilidadFalla: "probable" });
  });

  it("grieta solo de la capa cortical: 0 (PE-GRI-01)", () => {
    const r = evaluarR02Palmera({ ...palmeraSana(), presenta_fisura_grieta_tronco: true, afectacion_fisura_grieta: "solo_corteza" });
    expect(r).toMatchObject({ puntaje: 0, probabilidadFalla: "improbable" });
  });

  it("estrechamiento y angulación valen 2 cada uno; estrechamiento No determinado bloquea (PE-EST-03)", () => {
    expect(evaluarR02Palmera({ ...palmeraSana(), estrechamiento_estipite: "si", angulacion_grave_estipite: true })).toMatchObject({ puntaje: 4, probabilidadFalla: "probable" });
    const nd = evaluarR02Palmera({ ...palmeraSana(), estrechamiento_estipite: "no_determinado" });
    expect(nd.indicadores.estrechamiento.reglaId).toBe("PE-EST-03");
    expect(nd.probabilidadFalla).toBe("no_determinado");
  });

  it("raíces adventicias en altura: alerta sin puntaje y sin bloquear (PE-RAD-01)", () => {
    const r = evaluarR02Palmera({ ...palmeraSana(), raices_adventicias_altura: "si" });
    expect(r.indicadores.raicesAdventicias).toMatchObject({ puntaje: 0, reglaId: "PE-RAD-01" });
    expect(r.indicadores.raicesAdventicias.alerta).toBeDefined();
    expect(evaluarR02Palmera({ ...palmeraSana(), raices_adventicias_altura: null }).probabilidadFalla).toBe("improbable");
  });

  it("puntaje máximo 12 (convención de árboles)", () => {
    const sinCavidad = evaluarR02Palmera({
      ...palmeraSana(), presenta_fisura_grieta_tronco: true, afectacion_fisura_grieta: "penetra_en_madera", direccion_grieta: "longitudinal",
      presenta_heridas_tronco: true, estrechamiento_estipite: "si", angulacion_grave_estipite: true, cuerpos_fructiferos_tronco: true,
      indicios_plaga_palmera: ["estipite"],
    });
    expect(sinCavidad.puntaje).toBe(10); // 2+2+2+2+1+1; con cavidad, hongos y plaga no suman: también 10
  });
});

describe("R03-P · Corona", () => {
  it("pieza quebrada suspendida: Inminente (PC-FQU-03)", () => {
    expect(evaluarR03Palmera({ ...palmeraSana(), ramas_quebradas: true, permanece_suspendida: true, anomalia_cogollo: null }).probabilidadFalla).toBe("inminente");
  });

  it.each(["pudricion", "colapso", "ausencia"] as const)("cogollo con %s: piso Probable (PC-COG-02)", (anomalia) => {
    expect(evaluarR03Palmera({ ...palmeraSana(), anomalia_cogollo: anomalia, ramas_secas: null }).probabilidadFalla).toBe("probable");
  });

  it("desviación del cogollo es solo observación (PC-COG-01)", () => {
    expect(evaluarR03Palmera({ ...palmeraSana(), anomalia_cogollo: "desviacion" })).toMatchObject({ puntaje: 0, probabilidadFalla: "improbable" });
  });

  it.each([
    [5, false, ["no"], 1, "posible"],
    [30, true, ["no"], 3, "probable"],
    [60, false, ["corona"], 4, "probable"],
  ] as const)("frondas secas %s %% + quebradas %s + plaga %j = %s (%s)", (pct, quebradas, plaga, puntaje, pf) => {
    const r = evaluarR03Palmera({
      ...palmeraSana(), ramas_secas: true, ramas_secas_pct_copa: pct, ramas_quebradas: quebradas,
      permanece_suspendida: quebradas ? false : null, indicios_plaga_palmera: [...plaga],
    });
    expect(r).toMatchObject({ puntaje, probabilidadFalla: pf });
  });

  it("plaga No determinado deja el componente No determinado, como en los árboles (PC-PLA-03)", () => {
    const r = evaluarR03Palmera({ ...palmeraSana(), indicios_plaga_palmera: ["no_determinado"] });
    expect(r.indicadores.plaga.reglaId).toBe("PC-PLA-03");
    expect(r.probabilidadFalla).toBe("no_determinado");
  });

  it("plaga «No» combinada con una ubicación: fuera de dominio", () => {
    expect(evaluarR03Palmera({ ...palmeraSana(), indicios_plaga_palmera: ["no", "corona"] }).probabilidadFalla).toBe("no_determinado");
  });
});

describe("vitalidad de palmera (D-310)", () => {
  it.each([
    ["5", "4", 4],
    ["2", "6", "no_determinado"],
    [null, "3", null],
    ["7", "3", null],
  ] as const)("calidad %s y proporción %s → %s", (c, p, esperado) => {
    expect(calcularVitalidadPalmera({ calidad_copa_palmera: c as never, proporcion_frondas_vivas: p as never })).toBe(esperado);
  });
});

// ---------------------------------------------------------------------
// Ensamblaje y regresión de árboles
// ---------------------------------------------------------------------

function nucleoBase(): NucleoEntradas {
  return {
    ...palmeraSana(),
    D_diametro_basal_tronco_cm: null, d_diametro_cavidad_basal_cm: null, Cc_longitud_abertura_cavidad_cm: null,
    C_circunferencia_basal_cm: null, t_pared_residual_basal_cm: null,
    D_diametro_tronco_cm: null, d_diametro_cavidad_tronco_cm: null, Cc_longitud_abertura_tronco_cm: null,
    C_circunferencia_tronco_cm: null, t_pared_residual_tronco_cm: null,
    condicion_heridas_tronco: null, corteza_muerta_ausente: false, presenta_exudaciones: false,
    afectacion_fisura_grieta: null, direccion_grieta: null, longitud_max_grieta_cm: null, dap_cm: 40,
    troncos_codominantes: false, grieta_union_codominante: null, corteza_incluida: null,
    adelgazamiento_insuficiente_tronco: false,
    desequilibrio_copa: false, defoliacion_estimada_pct: 0, sin_follaje_estacional: false, muerte_regresiva_copa_pct: 0,
    infraestructura_inmediata: false, interferencia_redes_servicios: null,
    existe_vereda: null, dano_interferencia_vereda: null, presenta_levantamiento_vereda: null, presenta_grieta_vereda: null,
    presenta_hundimiento_vereda: null, desnivel_max_vereda_cm: null, ancho_max_grieta_vereda_cm: null, numero_grietas_vereda: null,
    longitud_max_grieta_vereda_cm: null, ancho_libre_remanente_m: null, existe_alcorque: null, dano_interferencia_alcorque: null,
    existe_elemento_vertical: null, reduce_circulacion_peatonal: null, impide_paso_seguro: null, existe_calzada: null,
    dano_interferencia_calzada: null, levantamiento_calzada: null, hundimiento_calzada: null, desnivel_max_calzada_cm: null,
    afecta_circulacion_vehicular: null, suelo_sellado_impermeabilizado: false, indicios_compactacion_superficial: false,
    obstaculos_crecimiento_radicular: false, contacto_interferencia_infraestructura_vertical: null,
    dano_fisico_observable_infraestructura_vertical: null, compromete_estabilidad_funcionalidad: null,
    red_aerea_presente: null, tipo_red_aerea: null, distancia_copa_red_aerea_m: null, dano_interferencia_red_aerea: null,
    red_subterranea_presente: null, afectacion_fisica_red_subterranea: null, compromete_funcionalidad_red_subterranea: null,
    forma_alcorque: null, largo_alcorque_m: null, ancho_alcorque_m: null, diametro_alcorque_m: null, superficie_alcorque_m2_manual: null,
    zona_objetivo: "bajo_la_copa", tasa_ocupacion_objetivo: "constante",
    consecuencia_raices_cuello: null, consecuencia_tronco: null, consecuencia_copa_ramas: null,
  } as NucleoEntradas;
}

function args(variablesCalculo: NucleoEntradas, ruleVersion: "3.2" | "3.3"): ArgsResultadoEvaluacion {
  return {
    ruleVersion, variables: {}, variablesCalculo, tipoInspeccionRealizada: "evaluacion_inicial",
    fechaInspeccionISO: "2026-11-21", motorCommit: "test",
  };
}

describe("ensamblaje con palmeras (CC-081)", () => {
  it("una palmera con la 3.3 usa R01-P a R03-P, consecuencia por DAP y vitalidad de palmera", () => {
    const r = ensamblarResultadoEvaluacion(args({
      ...nucleoBase(), tipo_hoja: "palmera", presenta_heridas_tronco: true, estrechamiento_estipite: "si",
    }, "3.3"));
    expect(sonIndicadoresArbol(r.indicadores)).toBe(false);
    expect(r.probabilidad_falla_tronco).toBe("probable"); // 2 + 2
    expect(r.puntaje_tronco).toBe(4);
    expect(r.calculados.consecuencias?.tronco.calculada).toBe("severa"); // DAP 40 cm
    expect(r.calculados.consecuencias?.copaRamas.calculada).toBe("significativa");
    expect((r.calculados as { vitalidad_palmera?: unknown }).vitalidad_palmera).toBe(4);
    expect(r.rule_version).toBe("3.3");
  });

  it("una palmera con la 3.2 operativa sigue por las reglas de árboles (sin cambios hasta publicar)", () => {
    const r = ensamblarResultadoEvaluacion(args({ ...nucleoBase(), tipo_hoja: "palmera" }, "3.2"));
    expect(sonIndicadoresArbol(r.indicadores)).toBe(true);
    expect("vitalidad_palmera" in r.calculados).toBe(false);
  });
});

/** Generador determinista (mulberry32) para la regresión. */
function aleatorio(semilla: number) {
  let a = semilla;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("regresión: los árboles dan lo mismo con la 3.3 que con la 3.2 (CC-081, superposición)", () => {
  it("600 árboles aleatorios: resultado idéntico salvo rule_version", () => {
    const r = aleatorio(81);
    const elegir = <T,>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
    const bool = () => (r() < 0.06 ? null : r() < 0.6);
    const resultados = new Set<string>();
    for (let i = 0; i < 600; i++) {
      const cavB = elegir([true, false] as const);
      const cavT = elegir([true, false] as const);
      const entrada: NucleoEntradas = {
        ...nucleoBase(),
        tipo_hoja: elegir([null, undefined, "latifoliada", "acicular", "escuamiforme"] as const) ?? undefined,
        levantamiento_del_plato_radicular: bool(),
        angulo_inclinacion: elegir([0, 10, 20, 35, 50, null] as const),
        raices_expuestas: bool(), necrosis_radicular: bool(), raices_cortadas: bool(),
        cavidad_pudricion_basal: cavB, cavidad_basal_externa: cavB ? elegir([true, false] as const) : null,
        cavidad_basal_interna: cavB ? elegir(["si", "no", "requiere_evaluacion_instrumental"] as const) : null,
        D_diametro_basal_tronco_cm: 60, d_diametro_cavidad_basal_cm: elegir([10, 30, 45] as const),
        Cc_longitud_abertura_cavidad_cm: elegir([10, 40, 80] as const), C_circunferencia_basal_cm: 190,
        t_pared_residual_basal_cm: elegir([null, 5, 12] as const),
        anillamiento: bool(), cuerpos_fructiferos_base: bool(),
        presenta_cavidad_pudricion_tronco: cavT, cavidad_externa_tronco: cavT ? elegir([true, false] as const) : null,
        cavidad_interna_tronco: cavT ? elegir(["si", "no", "requiere_evaluacion_instrumental"] as const) : null,
        D_diametro_tronco_cm: 40, d_diametro_cavidad_tronco_cm: elegir([8, 20, 30] as const),
        Cc_longitud_abertura_tronco_cm: elegir([10, 40] as const), C_circunferencia_tronco_cm: 125,
        t_pared_residual_tronco_cm: elegir([null, 4, 9] as const),
        presenta_heridas_tronco: bool(), condicion_heridas_tronco: elegir(["abierta", "en_proceso_de_cierre", "cerrada", null] as const),
        presenta_fisura_grieta_tronco: bool(), afectacion_fisura_grieta: elegir(["solo_corteza", "penetra_en_madera", null] as const),
        direccion_grieta: elegir(["longitudinal", "transversal", null] as const), longitud_max_grieta_cm: elegir([5, 30, null] as const),
        dap_cm: elegir([8, 20, 40, 70] as const), troncos_codominantes: bool(), adelgazamiento_insuficiente_tronco: bool(),
        cuerpos_fructiferos_tronco: bool(), ramas_secas: bool(), ramas_secas_pct_copa: elegir([5, 30, 60, null] as const),
        ramas_quebradas: bool(), permanece_suspendida: bool(),
        tasa_ocupacion_objetivo: elegir(["rara", "ocasional", "frecuente", "constante"] as const),
      } as NucleoEntradas;
      const v32 = ensamblarResultadoEvaluacion(args(entrada, "3.2"));
      const v33 = ensamblarResultadoEvaluacion(args(entrada, "3.3"));
      expect({ ...v33, rule_version: "x" }).toEqual({ ...v32, rule_version: "x" });
      resultados.add(v32.clasificacion_riesgo_calculada);
    }
    // La muestra cubre todos los niveles de riesgo, no solo No determinado.
    expect([...resultados].sort()).toEqual(["alto", "bajo", "extremo", "moderado", "no_determinado"]);
  });
});
