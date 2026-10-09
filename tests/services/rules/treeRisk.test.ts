import {
  evaluarR01,
  evaluarR02,
  evaluarR03,
  evaluarM01,
  evaluarR04,
  clasificarComponente,
  evaluarRiesgo,
  TreeRiskVariables,
} from "../../../src/services/rules/treeRisk";

/** Árbol sin ningún defecto observado: todos los indicadores Despreciable. */
function arbolSano(): TreeRiskVariables {
  return {
    levantamiento_plato_radicular: false,
    angulo_inclinacion: 0,
    raices_expuestas: false,
    necrosis_radicular: null,
    raices_cortadas: null,
    cavidad_pudricion_basal: false,
    cavidad_basal_externa: null,
    sl_basal_pct: null,
    t_r_basal: null,

    presenta_cavidad_pudricion_tronco: false,
    cavidad_externa_tronco: null,
    sl_tronco_pct: null,
    t_r_tronco: null,
    presenta_heridas_tronco: false,
    condicion_heridas_tronco: null,
    corteza_muerta_ausente: false,
    presenta_exudaciones: false,
    presenta_fisura_grieta_tronco: false,
    afectacion_fisura_grieta: null,
    direccion_grieta: null,
    troncos_codominantes: false,
    grieta_union_codominante: null,
    corteza_incluida: null,

    ramas_secas: false,
    ramas_secas_pct_copa: null,
    ramas_quebradas: false,
    desequilibrio_copa: false,

    zona_objetivo: "Más allá de 1,5× la altura del árbol",
    tasa_ocupacion_objetivo: "Rara",

    consecuencia_raices_cuello: "Despreciable",
    consecuencia_tronco: "Despreciable",
    consecuencia_copa_ramas: "Despreciable",
  };
}

describe("R01 — raíces y cuello", () => {
  it("árbol sano: puntaje 0, Improbable", () => {
    const r = evaluarR01(arbolSano());
    expect(r.puntaje).toBe(0);
    expect(r.probabilidadFalla).toBe("Improbable");
  });

  it("peor caso: puntaje máximo 9, Inminente", () => {
    const v = arbolSano();
    v.levantamiento_plato_radicular = true;
    v.angulo_inclinacion = 50; // Severa (3)
    v.raices_expuestas = true;
    v.necrosis_radicular = true;
    v.raices_cortadas = true; // Severa (3)
    v.cavidad_pudricion_basal = true;
    v.cavidad_basal_externa = true;
    v.sl_basal_pct = 40; // >=33 -> Severa (3)
    const r = evaluarR01(v);
    expect(r.puntaje).toBe(9);
    expect(r.probabilidadFalla).toBe("Inminente");
  });

  it("cavidad basal sin síntoma externo y t/R no medido -> No determinado", () => {
    const v = arbolSano();
    v.cavidad_pudricion_basal = true;
    v.cavidad_basal_externa = false;
    v.t_r_basal = null;
    const r = evaluarR01(v);
    expect(r.noDeterminado).toBe(true);
    expect(r.puntaje).toBeNull();
    expect(r.probabilidadFalla).toBeNull();
  });

  it("umbral Probable exacto en puntaje 5", () => {
    const v = arbolSano();
    v.levantamiento_plato_radicular = true;
    v.angulo_inclinacion = 20; // Moderada (2)
    v.raices_expuestas = true; // -> Leve (1) por defecto (sin necrosis/cortadas)
    v.cavidad_pudricion_basal = true;
    v.cavidad_basal_externa = true;
    v.sl_basal_pct = 25; // 20<=25<33 -> Moderada (2)
    const r = evaluarR01(v);
    expect(r.puntaje).toBe(5);
    expect(r.probabilidadFalla).toBe("Probable");
  });
});

describe("R02 — tronco", () => {
  it("árbol sano: puntaje 0, Improbable", () => {
    const r = evaluarR02(arbolSano());
    expect(r.puntaje).toBe(0);
    expect(r.probabilidadFalla).toBe("Improbable");
  });

  it("peor caso: puntaje máximo 14 (no 18), Inminente", () => {
    const v = arbolSano();
    v.presenta_cavidad_pudricion_tronco = true;
    v.cavidad_externa_tronco = true;
    v.sl_tronco_pct = 50; // Severa (3)
    v.presenta_heridas_tronco = true;
    v.condicion_heridas_tronco = "Abierta"; // Moderada (2)
    v.corteza_muerta_ausente = true; // Moderada (2)
    v.presenta_exudaciones = true; // Leve (1)
    v.presenta_fisura_grieta_tronco = true;
    v.afectacion_fisura_grieta = "Penetra en madera";
    v.direccion_grieta = "Transversal"; // Severa (3)
    v.troncos_codominantes = true;
    v.grieta_union_codominante = true; // Severa (3)
    const r = evaluarR02(v);
    expect(r.puntaje).toBe(14); // 3+2+2+1+3+3
    expect(r.probabilidadFalla).toBe("Inminente");
  });
});

describe("R03 — copa y ramas", () => {
  it("árbol sano: puntaje 0, Improbable", () => {
    const r = evaluarR03(arbolSano());
    expect(r.puntaje).toBe(0);
    expect(r.probabilidadFalla).toBe("Improbable");
  });

  it("peor caso: puntaje máximo 5 (no 9), Inminente", () => {
    const v = arbolSano();
    v.ramas_secas = true;
    v.ramas_secas_pct_copa = 60; // Severa (3)
    v.ramas_quebradas = true; // Leve (1)
    v.desequilibrio_copa = true; // Leve (1)
    const r = evaluarR03(v);
    expect(r.puntaje).toBe(5);
    expect(r.probabilidadFalla).toBe("Inminente");
  });

  it("defoliación no participa en el puntaje (no existe como variable de entrada de R03)", () => {
    // Confirma que evaluarR03 no depende de defoliación/clorosis: el tipo
    // TreeRiskVariables no las incluye como entradas de este componente.
    const r = evaluarR03(arbolSano());
    expect(r.puntaje).toBe(0);
  });
});

describe("M01 — probabilidad de impacto", () => {
  it("bajo la copa + ocupación constante -> Alta", () => {
    expect(
      evaluarM01({ ...arbolSano(), zona_objetivo: "Bajo la copa", tasa_ocupacion_objetivo: "Constante" })
    ).toBe("Alta");
  });

  it("más allá de 1.5x altura + rara -> Muy baja", () => {
    expect(
      evaluarM01({
        ...arbolSano(),
        zona_objetivo: "Más allá de 1,5× la altura del árbol",
        tasa_ocupacion_objetivo: "Rara",
      })
    ).toBe("Muy baja");
  });
});

describe("M02+M03 — clasificación de riesgo por componente", () => {
  it("Inminente + Alta + Severa -> Extremo", () => {
    expect(clasificarComponente("Inminente", "Alta", "Severa")).toBe("Extremo");
  });

  it("Improbable + Alta + Severa -> Bajo (probabilidad de falla domina)", () => {
    expect(clasificarComponente("Improbable", "Alta", "Severa")).toBe("Bajo");
  });

  it("Probable + Media + Significativa -> Moderado (vía intermedio Algo probable)", () => {
    expect(clasificarComponente("Probable", "Media", "Significativa")).toBe("Moderado");
  });

  it("Probable + Alta + Severa -> Alto", () => {
    expect(clasificarComponente("Probable", "Alta", "Severa")).toBe("Alto");
  });
});

describe("R04 — consolidación (el más desfavorable)", () => {
  it("toma el máximo entre los tres componentes", () => {
    expect(evaluarR04(["Bajo", "Alto", "Moderado"])).toBe("Alto");
  });

  it("si algún componente es null (No determinado), el resultado global es null", () => {
    expect(evaluarR04(["Bajo", null, "Moderado"])).toBeNull();
  });

  it("tres Bajo -> Bajo", () => {
    expect(evaluarR04(["Bajo", "Bajo", "Bajo"])).toBe("Bajo");
  });
});

describe("evaluarRiesgo — integración completa", () => {
  it("árbol sano -> riesgo Bajo", () => {
    const r = evaluarRiesgo(arbolSano());
    expect(r.clasificacionRiesgo).toBe("Bajo");
  });

  it("un componente No determinado bloquea el riesgo global (queda null, nunca inventado)", () => {
    const v = arbolSano();
    v.cavidad_pudricion_basal = true;
    v.cavidad_basal_externa = false;
    v.t_r_basal = null; // No determinado en R01
    const r = evaluarRiesgo(v);
    expect(r.clasificacionRaicesCuello).toBeNull();
    expect(r.clasificacionRiesgo).toBeNull();
    // Los otros componentes sí se calculan con normalidad.
    expect(r.clasificacionTronco).toBe("Bajo");
    expect(r.clasificacionCopaRamas).toBe("Bajo");
  });
});
