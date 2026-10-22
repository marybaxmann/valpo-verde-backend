import { evaluarM04, M04Input } from "../../../../src/services/rules/engine/m04-infraestructura";

function base(): M04Input {
  return {
    infraestructura_inmediata: false,
    interferencia_redes_servicios: null,
    existe_vereda: null,
    dano_interferencia_vereda: null,
    desnivel_max_vereda_cm: null,
    ancho_max_grieta_vereda_cm: null,
    reduce_circulacion_peatonal: null,
    impide_paso_seguro: null,
    existe_calzada: null,
    dano_interferencia_calzada: null,
    desnivel_max_calzada_cm: null,
    afecta_circulacion_vehicular: null,
    suelo_sellado_impermeabilizado: false,
    indicios_compactacion_superficial: false,
    obstaculos_crecimiento_radicular: false,
    contacto_interferencia_infraestructura_vertical: null,
    dano_fisico_observable_infraestructura_vertical: null,
    compromete_estabilidad_funcionalidad: null,
    red_aerea_presente: null,
    tipo_red_aerea_incluye_electrica: null,
    distancia_copa_red_aerea_m: null,
    dano_interferencia_red_aerea: null,
    red_subterranea_presente: null,
    afectacion_fisica_red_subterranea: null,
    compromete_funcionalidad_red_subterranea: null,
  };
}

describe("IN-GEN-01 — gates", () => {
  it("infraestructura_inmediata = No: vereda, calzada, vertical, aérea y subterránea quedan No aplica; el alcorque se evalúa igual", () => {
    const r = evaluarM04(base());
    expect(r.componentes.vereda.categoria).toBe("no_aplica");
    expect(r.componentes.calzada.categoria).toBe("no_aplica");
    expect(r.componentes.infraestructuraVertical.categoria).toBe("no_aplica");
    expect(r.componentes.redAerea.categoria).toBe("no_aplica");
    expect(r.componentes.redSubterranea.categoria).toBe("no_aplica");
    expect(r.componentes.alcorque.categoria).toBe("sin_afectacion");
  });
  it("interferencia_redes_servicios = No (con infraestructura_inmediata = Sí): solo aérea y subterránea quedan No aplica", () => {
    const r = evaluarM04({ ...base(), infraestructura_inmediata: true, existe_vereda: false, existe_calzada: false, interferencia_redes_servicios: false });
    expect(r.componentes.redAerea.categoria).toBe("no_aplica");
    expect(r.componentes.redSubterranea.categoria).toBe("no_aplica");
    expect(r.componentes.vereda.categoria).toBe("no_aplica"); // existe_vereda = No, independiente del gate
  });
});

describe("IN-VER — Vereda", () => {
  const conInfra = { infraestructura_inmediata: true as const };
  it("IN-VER-01: existe_vereda = No → No aplica", () => {
    const r = evaluarM04({ ...base(), ...conInfra, existe_vereda: false });
    expect(r.componentes.vereda.categoria).toBe("no_aplica");
  });
  it("IN-VER-02: dano_interferencia_vereda = No → Sin afectación", () => {
    const r = evaluarM04({ ...base(), ...conInfra, existe_vereda: true, dano_interferencia_vereda: false });
    expect(r.componentes.vereda.categoria).toBe("sin_afectacion");
  });
  it("IN-VER-03: desnivel > 5,0 cm → Severa", () => {
    const r = evaluarM04({ ...base(), ...conInfra, existe_vereda: true, dano_interferencia_vereda: true, desnivel_max_vereda_cm: 6 });
    expect(r.componentes.vereda.categoria).toBe("severa");
  });
  it("IN-VER-04 (por desnivel): 2,5 ≤ desnivel ≤ 5,0 → Moderada", () => {
    const r = evaluarM04({ ...base(), ...conInfra, existe_vereda: true, dano_interferencia_vereda: true, desnivel_max_vereda_cm: 3 });
    expect(r.componentes.vereda.categoria).toBe("moderada");
  });
  it("IN-VER-04 (por grieta): ancho_max_grieta_vereda_cm ≥ 1 cm → Moderada", () => {
    const r = evaluarM04({ ...base(), ...conInfra, existe_vereda: true, dano_interferencia_vereda: true, ancho_max_grieta_vereda_cm: 1.5 });
    expect(r.componentes.vereda.categoria).toBe("moderada");
  });
  it("IN-VER-05: mediciones no activadas → Leve", () => {
    const r = evaluarM04({ ...base(), ...conInfra, existe_vereda: true, dano_interferencia_vereda: true });
    expect(r.componentes.vereda.categoria).toBe("leve");
  });
  it("IN-VER-06: reduce_circulacion_peatonal = Sí e impide_paso_seguro = Sí → Severa, reemplaza la categoría base", () => {
    const r = evaluarM04({
      ...base(), ...conInfra, existe_vereda: true, dano_interferencia_vereda: true,
      reduce_circulacion_peatonal: true, impide_paso_seguro: true,
    });
    expect(r.componentes.vereda.categoria).toBe("severa");
  });
});

describe("IN-CAL — Calzada", () => {
  const conInfra = { infraestructura_inmediata: true as const };
  it("IN-CAL-01: existe_calzada = No → No aplica", () => {
    const r = evaluarM04({ ...base(), ...conInfra, existe_calzada: false });
    expect(r.componentes.calzada.categoria).toBe("no_aplica");
  });
  it("IN-CAL-02: dano_interferencia_calzada = No → Sin afectación", () => {
    const r = evaluarM04({ ...base(), ...conInfra, existe_calzada: true, dano_interferencia_calzada: false });
    expect(r.componentes.calzada.categoria).toBe("sin_afectacion");
  });
  it("IN-CAL-03: desnivel > 5,0 cm → Severa", () => {
    const r = evaluarM04({ ...base(), ...conInfra, existe_calzada: true, dano_interferencia_calzada: true, desnivel_max_calzada_cm: 6 });
    expect(r.componentes.calzada.categoria).toBe("severa");
  });
  it("IN-CAL-04: 2,5 ≤ desnivel ≤ 5,0 → Moderada", () => {
    const r = evaluarM04({ ...base(), ...conInfra, existe_calzada: true, dano_interferencia_calzada: true, desnivel_max_calzada_cm: 3 });
    expect(r.componentes.calzada.categoria).toBe("moderada");
  });
  it("IN-CAL-05: medición no activada → Leve", () => {
    const r = evaluarM04({ ...base(), ...conInfra, existe_calzada: true, dano_interferencia_calzada: true });
    expect(r.componentes.calzada.categoria).toBe("leve");
  });
  it("IN-CAL-06: afecta_circulacion_vehicular = Sí sobre una base Leve → pasa a Moderada", () => {
    const r = evaluarM04({ ...base(), ...conInfra, existe_calzada: true, dano_interferencia_calzada: true, afecta_circulacion_vehicular: true });
    expect(r.componentes.calzada.categoria).toBe("moderada");
  });
  it("IN-CAL-06: afecta_circulacion_vehicular = Sí sobre una base Severa → se mantiene Severa (no baja)", () => {
    const r = evaluarM04({
      ...base(), ...conInfra, existe_calzada: true, dano_interferencia_calzada: true,
      desnivel_max_calzada_cm: 6, afecta_circulacion_vehicular: true,
    });
    expect(r.componentes.calzada.categoria).toBe("severa");
  });
});

describe("IN-ALC — Alcorque y superficie permeable (se evalúa siempre)", () => {
  it("IN-ALC-01: suelo_sellado_impermeabilizado = Sí → Severa", () => {
    const r = evaluarM04({ ...base(), suelo_sellado_impermeabilizado: true });
    expect(r.componentes.alcorque.categoria).toBe("severa");
  });
  it("IN-ALC-02: indicios_compactacion_superficial = Sí → Moderada", () => {
    const r = evaluarM04({ ...base(), indicios_compactacion_superficial: true });
    expect(r.componentes.alcorque.categoria).toBe("moderada");
  });
  it("IN-ALC-03: obstaculos_crecimiento_radicular = Sí → Leve", () => {
    const r = evaluarM04({ ...base(), obstaculos_crecimiento_radicular: true });
    expect(r.componentes.alcorque.categoria).toBe("leve");
  });
  it("IN-ALC-04: dos condiciones Sí → la más severa (compactación + obstáculos → Moderada)", () => {
    const r = evaluarM04({ ...base(), indicios_compactacion_superficial: true, obstaculos_crecimiento_radicular: true });
    expect(r.componentes.alcorque.categoria).toBe("moderada");
  });
  it("IN-ALC-04: suelo sellado + compactación → la más severa (Severa)", () => {
    const r = evaluarM04({ ...base(), suelo_sellado_impermeabilizado: true, indicios_compactacion_superficial: true });
    expect(r.componentes.alcorque.categoria).toBe("severa");
  });
  it("IN-ALC-05: las tres condiciones = No → Sin afectación (base() ya lo cubre)", () => {
    const r = evaluarM04(base());
    expect(r.componentes.alcorque.categoria).toBe("sin_afectacion");
  });
});

describe("IN-VRT — Infraestructura vertical", () => {
  const conInfra = { infraestructura_inmediata: true as const };
  it("IN-VRT-01: contacto = No → Sin afectación", () => {
    const r = evaluarM04({ ...base(), ...conInfra, contacto_interferencia_infraestructura_vertical: false });
    expect(r.componentes.infraestructuraVertical.categoria).toBe("sin_afectacion");
  });
  it("IN-VRT-02: contacto = Sí, daño = No, compromete = No → Leve", () => {
    const r = evaluarM04({
      ...base(), ...conInfra, contacto_interferencia_infraestructura_vertical: true,
      dano_fisico_observable_infraestructura_vertical: false, compromete_estabilidad_funcionalidad: false,
    });
    expect(r.componentes.infraestructuraVertical.categoria).toBe("leve");
  });
  it("IN-VRT-03: daño = No, compromete = Sí → Moderada", () => {
    const r = evaluarM04({
      ...base(), ...conInfra, contacto_interferencia_infraestructura_vertical: true,
      dano_fisico_observable_infraestructura_vertical: false, compromete_estabilidad_funcionalidad: true,
    });
    expect(r.componentes.infraestructuraVertical.categoria).toBe("moderada");
  });
  it("IN-VRT-04: daño = Sí, compromete = No → Moderada", () => {
    const r = evaluarM04({
      ...base(), ...conInfra, contacto_interferencia_infraestructura_vertical: true,
      dano_fisico_observable_infraestructura_vertical: true, compromete_estabilidad_funcionalidad: false,
    });
    expect(r.componentes.infraestructuraVertical.categoria).toBe("moderada");
  });
  it("IN-VRT-05: daño = Sí, compromete = Sí → Severa", () => {
    const r = evaluarM04({
      ...base(), ...conInfra, contacto_interferencia_infraestructura_vertical: true,
      dano_fisico_observable_infraestructura_vertical: true, compromete_estabilidad_funcionalidad: true,
    });
    expect(r.componentes.infraestructuraVertical.categoria).toBe("severa");
  });
});

describe("IN-RAE — Red aérea", () => {
  const conRedes = { infraestructura_inmediata: true as const, interferencia_redes_servicios: true as const };
  it("IN-RAE-01: red_aerea_presente = No → No aplica", () => {
    const r = evaluarM04({ ...base(), ...conRedes, red_aerea_presente: false });
    expect(r.componentes.redAerea.categoria).toBe("no_aplica");
  });
  it("IN-RAE-02: incluye Eléctrica y no cumple la distancia de seguridad → Severa", () => {
    const r = evaluarM04({
      ...base(), ...conRedes, red_aerea_presente: true, tipo_red_aerea_incluye_electrica: true,
      distancia_copa_red_aerea_m: 1.5, dano_interferencia_red_aerea: false,
    });
    expect(r.componentes.redAerea.categoria).toBe("severa");
  });
  it("IN-RAE-03: incluye Eléctrica, cumple la distancia, sin daño → Leve", () => {
    const r = evaluarM04({
      ...base(), ...conRedes, red_aerea_presente: true, tipo_red_aerea_incluye_electrica: true,
      distancia_copa_red_aerea_m: 2.5, dano_interferencia_red_aerea: false,
    });
    expect(r.componentes.redAerea.categoria).toBe("leve");
  });
  it("IN-RAE-04: incluye Eléctrica, cumple la distancia, con daño → Moderada", () => {
    const r = evaluarM04({
      ...base(), ...conRedes, red_aerea_presente: true, tipo_red_aerea_incluye_electrica: true,
      distancia_copa_red_aerea_m: 2.5, dano_interferencia_red_aerea: true,
    });
    expect(r.componentes.redAerea.categoria).toBe("moderada");
  });
  it("IN-RAE-05: no incluye Eléctrica, sin daño → Leve", () => {
    const r = evaluarM04({ ...base(), ...conRedes, red_aerea_presente: true, tipo_red_aerea_incluye_electrica: false, dano_interferencia_red_aerea: false });
    expect(r.componentes.redAerea.categoria).toBe("leve");
  });
  it("IN-RAE-06: no incluye Eléctrica, con daño → Moderada", () => {
    const r = evaluarM04({ ...base(), ...conRedes, red_aerea_presente: true, tipo_red_aerea_incluye_electrica: false, dano_interferencia_red_aerea: true });
    expect(r.componentes.redAerea.categoria).toBe("moderada");
  });
});

describe("IN-RSU — Red subterránea", () => {
  const conRedes = { infraestructura_inmediata: true as const, interferencia_redes_servicios: true as const };
  it("IN-RSU-01: presente = No → No aplica", () => {
    const r = evaluarM04({ ...base(), ...conRedes, red_subterranea_presente: "no" });
    expect(r.componentes.redSubterranea.categoria).toBe("no_aplica");
  });
  it("IN-RSU-02: presente = No determinado → No determinado", () => {
    const r = evaluarM04({ ...base(), ...conRedes, red_subterranea_presente: "no_determinado" });
    expect(r.componentes.redSubterranea.categoria).toBe("no_determinado");
  });
  it("IN-RSU-03: compromete_funcionalidad = Sí (con o sin afectación física) → Severa", () => {
    const r = evaluarM04({
      ...base(), ...conRedes, red_subterranea_presente: "si",
      afectacion_fisica_red_subterranea: false, compromete_funcionalidad_red_subterranea: "si",
    });
    expect(r.componentes.redSubterranea.categoria).toBe("severa");
  });
  it("IN-RSU-04: afectación física = Sí, compromete = No → Moderada", () => {
    const r = evaluarM04({
      ...base(), ...conRedes, red_subterranea_presente: "si",
      afectacion_fisica_red_subterranea: true, compromete_funcionalidad_red_subterranea: "no",
    });
    expect(r.componentes.redSubterranea.categoria).toBe("moderada");
  });
  it("IN-RSU-05: afectación física = Sí, compromete = No determinado → Moderada", () => {
    const r = evaluarM04({
      ...base(), ...conRedes, red_subterranea_presente: "si",
      afectacion_fisica_red_subterranea: true, compromete_funcionalidad_red_subterranea: "no_determinado",
    });
    expect(r.componentes.redSubterranea.categoria).toBe("moderada");
    expect(r.componentes.redSubterranea.puntaje).toBe(2); // incluido en P_I/n, a diferencia de no_aplica/no_determinado
  });
  it("IN-RSU-06: afectación física = No, compromete = No → Sin afectación", () => {
    const r = evaluarM04({
      ...base(), ...conRedes, red_subterranea_presente: "si",
      afectacion_fisica_red_subterranea: false, compromete_funcionalidad_red_subterranea: "no",
    });
    expect(r.componentes.redSubterranea.categoria).toBe("sin_afectacion");
  });
  it("IN-RSU-07: afectación física = No, compromete = No determinado → No determinado (D-180: se excluye)", () => {
    const r = evaluarM04({
      ...base(), ...conRedes, red_subterranea_presente: "si",
      afectacion_fisica_red_subterranea: false, compromete_funcionalidad_red_subterranea: "no_determinado",
    });
    expect(r.componentes.redSubterranea.categoria).toBe("no_determinado");
    expect(r.componentes.redSubterranea.puntaje).toBeNull();
  });
});

describe("M04 — normalización P_I% (D-180: No aplica y No determinado se excluyen de P_I y n)", () => {
  it("n = 0 (los seis componentes excluidos) → clasificacion_infraestructura = No aplica", () => {
    const r = evaluarM04({
      ...base(),
      infraestructura_inmediata: false, // excluye vereda/calzada/vertical/aérea/subterránea
      suelo_sellado_impermeabilizado: null, indicios_compactacion_superficial: null, obstaculos_crecimiento_radicular: null, // alcorque → no_determinado
    });
    expect(r.puntajeInfraestructura).toBeNull();
    expect(r.pctInfraestructura).toBeNull();
    expect(r.clasificacionInfraestructura).toBe("no_aplica");
  });

  // Los otros cuatro componentes (vereda, calzada, alcorque, vertical) quedan
  // incluidos; aérea y subterránea se excluyen con interferencia_redes_servicios
  // = No, para controlar n = 4 (denominador 3 × 4 = 12) con precisión.
  const conCuatroComponentes = {
    infraestructura_inmediata: true as const,
    interferencia_redes_servicios: false as const,
    existe_vereda: true as const,
    existe_calzada: true as const,
    contacto_interferencia_infraestructura_vertical: false as const, // Sin afectación por defecto
    dano_interferencia_vereda: false as const, // Sin afectación por defecto
    dano_interferencia_calzada: false as const, // Sin afectación por defecto
  };

  it("P_I = 1 de 12 (8,33 %) → Bajo", () => {
    const r = evaluarM04({ ...base(), ...conCuatroComponentes, obstaculos_crecimiento_radicular: true }); // alcorque leve (1)
    expect(r.puntajeInfraestructura).toBe(1);
    expect(r.pctInfraestructura).toBeCloseTo((1 / 12) * 100, 6);
    expect(r.clasificacionInfraestructura).toBe("bajo");
  });
  it("P_I = 2 de 12 (16,67 %) → Moderado (justo sobre el límite de 15 %)", () => {
    const r = evaluarM04({ ...base(), ...conCuatroComponentes, indicios_compactacion_superficial: true }); // alcorque moderada (2)
    expect(r.pctInfraestructura).toBeCloseTo((2 / 12) * 100, 6);
    expect(r.clasificacionInfraestructura).toBe("moderado");
  });
  it("P_I = 4 de 12 (33,33 %) → Moderado (justo bajo el límite de 35 %)", () => {
    const r = evaluarM04({
      ...base(), ...conCuatroComponentes,
      suelo_sellado_impermeabilizado: true, // alcorque severa (3)
      contacto_interferencia_infraestructura_vertical: true, // vertical leve (1)
      dano_fisico_observable_infraestructura_vertical: false, compromete_estabilidad_funcionalidad: false,
    });
    expect(r.puntajeInfraestructura).toBe(4);
    expect(r.pctInfraestructura).toBeCloseTo((4 / 12) * 100, 6);
    expect(r.clasificacionInfraestructura).toBe("moderado");
  });
  it("P_I = 5 de 12 (41,67 %) → Alto (justo sobre el límite de 35 %)", () => {
    const r = evaluarM04({
      ...base(), ...conCuatroComponentes,
      suelo_sellado_impermeabilizado: true, // alcorque severa (3)
      contacto_interferencia_infraestructura_vertical: true, // vertical moderada (2)
      dano_fisico_observable_infraestructura_vertical: false, compromete_estabilidad_funcionalidad: true,
    });
    expect(r.puntajeInfraestructura).toBe(5);
    expect(r.pctInfraestructura).toBeCloseTo((5 / 12) * 100, 6);
    expect(r.clasificacionInfraestructura).toBe("alto");
  });
  it("P_I = 7 de 12 (58,33 %) → Alto (justo bajo el límite de 65 %)", () => {
    const r = evaluarM04({
      ...base(), ...conCuatroComponentes,
      suelo_sellado_impermeabilizado: true, // alcorque severa (3)
      contacto_interferencia_infraestructura_vertical: true, // vertical severa (3)
      dano_fisico_observable_infraestructura_vertical: true, compromete_estabilidad_funcionalidad: true,
      dano_interferencia_vereda: true, // vereda leve (1)
    });
    expect(r.puntajeInfraestructura).toBe(7);
    expect(r.pctInfraestructura).toBeCloseTo((7 / 12) * 100, 6);
    expect(r.clasificacionInfraestructura).toBe("alto");
  });
  it("P_I = 8 de 12 (66,67 %) → Crítico (justo sobre el límite de 65 %)", () => {
    const r = evaluarM04({
      ...base(), ...conCuatroComponentes,
      suelo_sellado_impermeabilizado: true, // alcorque severa (3)
      contacto_interferencia_infraestructura_vertical: true, // vertical severa (3)
      dano_fisico_observable_infraestructura_vertical: true, compromete_estabilidad_funcionalidad: true,
      dano_interferencia_vereda: true, desnivel_max_vereda_cm: 3, // vereda moderada (2)
    });
    expect(r.puntajeInfraestructura).toBe(8);
    expect(r.pctInfraestructura).toBeCloseTo((8 / 12) * 100, 6);
    expect(r.clasificacionInfraestructura).toBe("critico");
  });
  it("P_I = 12 de 12 (100 %) → Crítico (máximo con los cuatro componentes en Severa)", () => {
    const r = evaluarM04({
      ...base(), ...conCuatroComponentes,
      suelo_sellado_impermeabilizado: true, // alcorque severa (3)
      contacto_interferencia_infraestructura_vertical: true, dano_fisico_observable_infraestructura_vertical: true, compromete_estabilidad_funcionalidad: true, // vertical severa (3)
      dano_interferencia_vereda: true, desnivel_max_vereda_cm: 6, // vereda severa (3)
      dano_interferencia_calzada: true, desnivel_max_calzada_cm: 6, // calzada severa (3)
    });
    expect(r.puntajeInfraestructura).toBe(12);
    expect(r.pctInfraestructura).toBe(100);
    expect(r.clasificacionInfraestructura).toBe("critico");
  });
});

describe("Campos faltantes → no_determinado por componente (el motor nunca rellena ni supone)", () => {
  it("infraestructura_inmediata = null → no_determinado en los 5 componentes que gatea (alcorque no se ve afectado)", () => {
    const r = evaluarM04({ ...base(), infraestructura_inmediata: null });
    expect(r.componentes.vereda.categoria).toBe("no_determinado");
    expect(r.componentes.calzada.categoria).toBe("no_determinado");
    expect(r.componentes.infraestructuraVertical.categoria).toBe("no_determinado");
    expect(r.componentes.redAerea.categoria).toBe("no_determinado");
    expect(r.componentes.redSubterranea.categoria).toBe("no_determinado");
    expect(r.componentes.alcorque.categoria).toBe("sin_afectacion");
  });
  it("desnivel_max_vereda_cm = NaN (con dano = Sí) → no_determinado, nunca se clasifica", () => {
    const r = evaluarM04({ ...base(), infraestructura_inmediata: true, existe_vereda: true, dano_interferencia_vereda: true, desnivel_max_vereda_cm: NaN });
    expect(r.componentes.vereda.categoria).toBe("no_determinado");
  });
  it("desnivel_max_vereda_cm ≤ 0 (si se informa) → no_determinado", () => {
    const r = evaluarM04({ ...base(), infraestructura_inmediata: true, existe_vereda: true, dano_interferencia_vereda: true, desnivel_max_vereda_cm: 0 });
    expect(r.componentes.vereda.categoria).toBe("no_determinado");
  });
  it("distancia_copa_red_aerea_m faltante (con tipo eléctrico) → no_determinado", () => {
    const r = evaluarM04({
      ...base(), infraestructura_inmediata: true, interferencia_redes_servicios: true,
      red_aerea_presente: true, tipo_red_aerea_incluye_electrica: true, dano_interferencia_red_aerea: false,
    });
    expect(r.componentes.redAerea.categoria).toBe("no_determinado");
  });
});
