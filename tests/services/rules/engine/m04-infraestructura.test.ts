import { evaluarM04, M04Input } from "../../../../src/services/rules/engine/m04-infraestructura";

function base(): M04Input {
  return {
    infraestructura_inmediata: false,
    interferencia_redes_servicios: null,
    existe_vereda: null,
    dano_interferencia_vereda: null,
    presenta_levantamiento_vereda: null,
    presenta_grieta_vereda: null,
    presenta_hundimiento_vereda: null,
    desnivel_max_vereda_cm: null,
    ancho_max_grieta_vereda_cm: null,
    numero_grietas_vereda: null,
    longitud_max_grieta_vereda_cm: null,
    ancho_libre_remanente_m: null,
    reduce_circulacion_peatonal: null,
    impide_paso_seguro: null,
    existe_calzada: null,
    dano_interferencia_calzada: null,
    levantamiento_calzada: null,
    hundimiento_calzada: null,
    desnivel_max_calzada_cm: null,
    afecta_circulacion_vehicular: null,
    existe_alcorque: null,
    dano_interferencia_alcorque: null,
    suelo_sellado_impermeabilizado: false,
    indicios_compactacion_superficial: false,
    obstaculos_crecimiento_radicular: false,
    existe_elemento_vertical: true,
    contacto_interferencia_infraestructura_vertical: null,
    dano_fisico_observable_infraestructura_vertical: null,
    compromete_estabilidad_funcionalidad: null,
    red_aerea_presente: null,
    tipo_red_aerea: null,
    distancia_copa_red_aerea_m: null,
    dano_interferencia_red_aerea: null,
    red_subterranea_presente: null,
    afectacion_fisica_red_subterranea: null,
    compromete_funcionalidad_red_subterranea: null,
  };
}

describe("IN-GEN-01 — gates", () => {
  it("infraestructura_inmediata = No: los seis componentes quedan No aplica, también el alcorque (IF-18)", () => {
    const r = evaluarM04(base());
    expect(Object.values(r.componentes).every((c) => c.categoria === "no_aplica")).toBe(true);
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
  // Con dano_interferencia_vereda = Sí, los tres activadores y los dos
  // campos de IN-VER-06 son obligatorios; esta base los deja en "No" /
  // sin override, para que cada test solo cambie lo que le interesa.
  const danoSinActivadores = {
    ...conInfra,
    existe_vereda: true as const,
    dano_interferencia_vereda: true as const,
    presenta_levantamiento_vereda: false as const,
    presenta_hundimiento_vereda: false as const,
    presenta_grieta_vereda: false as const,
    reduce_circulacion_peatonal: false as const,
    impide_paso_seguro: false as const,
  };

  it("IN-VER-01: existe_vereda = No → No aplica", () => {
    const r = evaluarM04({ ...base(), ...conInfra, existe_vereda: false });
    expect(r.componentes.vereda.categoria).toBe("no_aplica");
  });
  it("IN-VER-02: dano_interferencia_vereda = No → Sin afectación", () => {
    const r = evaluarM04({ ...base(), ...conInfra, existe_vereda: true, dano_interferencia_vereda: false });
    expect(r.componentes.vereda.categoria).toBe("sin_afectacion");
  });
  it("IN-VER-03: presenta_levantamiento_vereda = Sí y desnivel > 5,0 cm → Severa", () => {
    const r = evaluarM04({ ...base(), ...danoSinActivadores, presenta_levantamiento_vereda: true, desnivel_max_vereda_cm: 6 });
    expect(r.componentes.vereda.categoria).toBe("severa");
  });
  it("IN-VER-04 (por desnivel): presenta_hundimiento_vereda = Sí y 2,5 ≤ desnivel ≤ 5,0 → Moderada", () => {
    const r = evaluarM04({ ...base(), ...danoSinActivadores, presenta_hundimiento_vereda: true, desnivel_max_vereda_cm: 3 });
    expect(r.componentes.vereda.categoria).toBe("moderada");
  });

  it("IN-VER-05: ningún activador (levantamiento/hundimiento/grieta = No) → Leve", () => {
    const r = evaluarM04({ ...base(), ...danoSinActivadores });
    expect(r.componentes.vereda.categoria).toBe("leve");
  });
  it("IN-VER-06: reduce_circulacion_peatonal = Sí e impide_paso_seguro = Sí → Severa", () => {
    const r = evaluarM04({ ...base(), ...danoSinActivadores, reduce_circulacion_peatonal: true, impide_paso_seguro: true, ancho_libre_remanente_m: 2 });
    expect(r.componentes.vereda.categoria).toBe("severa");
    expect(r.componentes.vereda.reglaId).toBe("IN-VER-06");
  });

  it("presenta_levantamiento_vereda = Sí pero desnivel_max_vereda_cm sin valor → no_determinado (no se trata como 'no cumple')", () => {
    const r = evaluarM04({ ...base(), ...danoSinActivadores, presenta_levantamiento_vereda: true });
    expect(r.componentes.vereda.categoria).toBe("no_determinado");
    expect(r.componentes.vereda.motivo).toMatch(/desnivel_max_vereda_cm/);
  });
  it("presenta_grieta_vereda = Sí pero ancho_max_grieta_vereda_cm sin valor → no_determinado", () => {
    const r = evaluarM04({ ...base(), ...danoSinActivadores, presenta_grieta_vereda: true });
    expect(r.componentes.vereda.categoria).toBe("no_determinado");
    expect(r.componentes.vereda.motivo).toMatch(/ancho_max_grieta_vereda_cm/);
  });
  const grietas = (n: number | null, ancho: number | null, largo: number | null) => ({
    ...danoSinActivadores, presenta_grieta_vereda: true as const,
    numero_grietas_vereda: n, ancho_max_grieta_vereda_cm: ancho, longitud_max_grieta_vereda_cm: largo,
  });
  it.each<[number, number, number, string, string]>([
    [1, 0.9, 30, "leve", "IN-VER-07"],
    [1, 1, 30, "moderada", "IN-VER-09"],
    [1, 0.9, 31, "moderada", "IN-VER-09"],
    [2, 1, 60, "moderada", "IN-VER-09"],
    [2, 0.9, 61, "moderada", "IN-VER-09"],
    [2, 1, 61, "severa", "IN-VER-08"],
  ])("grietas: N=%p, ancho=%p, largo=%p → %s (%s)", (n, w, l, categoria, regla) => {
    const c = evaluarM04({ ...base(), ...grietas(n, w, l) }).componentes.vereda;
    expect(c.categoria).toBe(categoria);
    expect(c.reglaId).toBe(regla);
  });
  it.each([[null, 1, 30], [1, 1, null], [0, 1, 30], [1.5, 1, 30]])("grietas sin dato válido (%p, %p, %p) → no_determinado", (n, w, l) => {
    expect(evaluarM04({ ...base(), ...grietas(n, w, l) }).componentes.vereda.categoria).toBe("no_determinado");
  });
  it.each<[number, string, string]>([
    [1.2, "leve", "IN-VER-05"],
    [1.19, "moderada", "IN-VER-10"],
    [0.9, "moderada", "IN-VER-10"],
    [0.89, "severa", "IN-VER-11"],
    [0, "severa", "IN-VER-11"],
  ])("ancho libre %p m con paso reducido → %s (%s)", (ancho, categoria, regla) => {
    const c = evaluarM04({ ...base(), ...danoSinActivadores, reduce_circulacion_peatonal: true, ancho_libre_remanente_m: ancho }).componentes.vereda;
    expect(c.categoria).toBe(categoria);
    expect(c.reglaId).toBe(regla);
  });
  it("una vereda angosta de origen no sube si el daño no reduce el paso", () => {
    expect(evaluarM04({ ...base(), ...danoSinActivadores, ancho_libre_remanente_m: 0.5 }).componentes.vereda.categoria).toBe("leve");
  });
  it("paso reducido sin ancho medido → no_determinado", () => {
    expect(evaluarM04({ ...base(), ...danoSinActivadores, reduce_circulacion_peatonal: true }).componentes.vereda.motivo).toMatch(/ancho_libre_remanente_m/);
  });
  it("el resultado es la categoría más severa entre desnivel, grietas y paso", () => {
    const c = evaluarM04({ ...base(), ...grietas(1, 0.5, 10), presenta_levantamiento_vereda: true, desnivel_max_vereda_cm: 6 }).componentes.vereda;
    expect(c.categoria).toBe("severa");
  });
  it("presenta_levantamiento_vereda sin valor (con dano = Sí) → no_determinado, no se ignora", () => {
    const r = evaluarM04({ ...base(), ...conInfra, existe_vereda: true, dano_interferencia_vereda: true });
    expect(r.componentes.vereda.categoria).toBe("no_determinado");
    expect(r.componentes.vereda.motivo).toMatch(/presenta_levantamiento_vereda/);
  });
  it("reduce_circulacion_peatonal sin valor (con dano = Sí) → no_determinado, no se ignora", () => {
    const r = evaluarM04({
      ...base(), ...conInfra, existe_vereda: true, dano_interferencia_vereda: true,
      presenta_levantamiento_vereda: false, presenta_hundimiento_vereda: false, presenta_grieta_vereda: false,
    });
    expect(r.componentes.vereda.categoria).toBe("no_determinado");
    expect(r.componentes.vereda.motivo).toMatch(/reduce_circulacion_peatonal/);
  });
});

describe("IN-CAL — Calzada", () => {
  const conInfra = { infraestructura_inmediata: true as const };
  const danoSinActivadores = {
    ...conInfra,
    existe_calzada: true as const,
    dano_interferencia_calzada: true as const,
    levantamiento_calzada: false as const,
    hundimiento_calzada: false as const,
    afecta_circulacion_vehicular: false as const,
  };

  it("IN-CAL-01: existe_calzada = No → No aplica", () => {
    const r = evaluarM04({ ...base(), ...conInfra, existe_calzada: false });
    expect(r.componentes.calzada.categoria).toBe("no_aplica");
  });
  it("IN-CAL-02: dano_interferencia_calzada = No → Sin afectación", () => {
    const r = evaluarM04({ ...base(), ...conInfra, existe_calzada: true, dano_interferencia_calzada: false });
    expect(r.componentes.calzada.categoria).toBe("sin_afectacion");
  });
  it("IN-CAL-03: levantamiento_calzada = Sí y desnivel > 5,0 cm → Severa", () => {
    const r = evaluarM04({ ...base(), ...danoSinActivadores, levantamiento_calzada: true, desnivel_max_calzada_cm: 6 });
    expect(r.componentes.calzada.categoria).toBe("severa");
  });
  it("IN-CAL-04: hundimiento_calzada = Sí y 2,5 ≤ desnivel ≤ 5,0 → Moderada", () => {
    const r = evaluarM04({ ...base(), ...danoSinActivadores, hundimiento_calzada: true, desnivel_max_calzada_cm: 3 });
    expect(r.componentes.calzada.categoria).toBe("moderada");
  });
  it("IN-CAL-05: ni levantamiento ni hundimiento activados → Leve", () => {
    const r = evaluarM04({ ...base(), ...danoSinActivadores });
    expect(r.componentes.calzada.categoria).toBe("leve");
  });
  it("IN-CAL-06: afecta_circulacion_vehicular = Sí sobre una base Leve → pasa a Moderada", () => {
    const r = evaluarM04({ ...base(), ...danoSinActivadores, afecta_circulacion_vehicular: true });
    expect(r.componentes.calzada.categoria).toBe("moderada");
  });
  it("IN-CAL-06: afecta_circulacion_vehicular = Sí sobre una base Severa → se mantiene Severa (no baja)", () => {
    const r = evaluarM04({
      ...base(), ...danoSinActivadores, levantamiento_calzada: true, desnivel_max_calzada_cm: 6, afecta_circulacion_vehicular: true,
    });
    expect(r.componentes.calzada.categoria).toBe("severa");
  });

  it("levantamiento_calzada = Sí pero desnivel_max_calzada_cm sin valor → no_determinado", () => {
    const r = evaluarM04({ ...base(), ...danoSinActivadores, levantamiento_calzada: true });
    expect(r.componentes.calzada.categoria).toBe("no_determinado");
    expect(r.componentes.calzada.motivo).toMatch(/desnivel_max_calzada_cm/);
  });
  it("afecta_circulacion_vehicular sin valor (con dano = Sí) → no_determinado, no se ignora", () => {
    const r = evaluarM04({ ...base(), ...conInfra, existe_calzada: true, dano_interferencia_calzada: true, levantamiento_calzada: false, hundimiento_calzada: false });
    expect(r.componentes.calzada.categoria).toBe("no_determinado");
    expect(r.componentes.calzada.motivo).toMatch(/afecta_circulacion_vehicular/);
  });
});

describe("IN-ALC — Alcorque", () => {
  const con = { infraestructura_inmediata: true as const, existe_alcorque: true as const };
  it("IN-GEN-01: sin infraestructura inmediata el alcorque no se evalúa", () => {
    expect(evaluarM04({ ...base(), suelo_sellado_impermeabilizado: true }).componentes.alcorque.categoria).toBe("no_aplica");
  });
  it("IN-ALC-01: sin alcorque → No aplica", () => {
    expect(evaluarM04({ ...base(), infraestructura_inmediata: true, existe_alcorque: false }).componentes.alcorque.categoria).toBe("no_aplica");
  });
  it.each<[Partial<M04Input>, string]>([
    [{ dano_interferencia_alcorque: false }, "sin_afectacion"],
    [{ dano_interferencia_alcorque: false, obstaculos_crecimiento_radicular: true }, "leve"],
    [{ dano_interferencia_alcorque: false, indicios_compactacion_superficial: true }, "leve"],
    [{ dano_interferencia_alcorque: false, suelo_sellado_impermeabilizado: true }, "moderada"],
    [{ dano_interferencia_alcorque: true }, "leve"],
    [{ dano_interferencia_alcorque: true, obstaculos_crecimiento_radicular: true }, "moderada"],
    [{ dano_interferencia_alcorque: true, suelo_sellado_impermeabilizado: true, indicios_compactacion_superficial: true }, "moderada"],
  ])("caso %# → %s (nunca Severa)", (cambios, categoria) => {
    expect(evaluarM04({ ...base(), ...con, ...cambios }).componentes.alcorque.categoria).toBe(categoria);
  });
  it("dato faltante → no_determinado", () => {
    expect(evaluarM04({ ...base(), ...con, dano_interferencia_alcorque: null }).componentes.alcorque.categoria).toBe("no_determinado");
    expect(evaluarM04({ ...base(), ...con, dano_interferencia_alcorque: false, suelo_sellado_impermeabilizado: null }).componentes.alcorque.categoria).toBe("no_determinado");
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
      ...base(), ...conRedes, red_aerea_presente: true, tipo_red_aerea: ["electrica"],
      distancia_copa_red_aerea_m: 1.5, dano_interferencia_red_aerea: false,
    });
    expect(r.componentes.redAerea.categoria).toBe("severa");
  });
  it("IN-RAE-03: incluye Eléctrica, cumple la distancia, sin daño → Leve", () => {
    const r = evaluarM04({
      ...base(), ...conRedes, red_aerea_presente: true, tipo_red_aerea: ["electrica"],
      distancia_copa_red_aerea_m: 2.5, dano_interferencia_red_aerea: false,
    });
    expect(r.componentes.redAerea.categoria).toBe("leve");
  });
  it("IN-RAE-04: incluye Eléctrica, cumple la distancia, con daño → Moderada", () => {
    const r = evaluarM04({
      ...base(), ...conRedes, red_aerea_presente: true, tipo_red_aerea: ["electrica"],
      distancia_copa_red_aerea_m: 2.5, dano_interferencia_red_aerea: true,
    });
    expect(r.componentes.redAerea.categoria).toBe("moderada");
  });
  it("IN-RAE-05: no incluye Eléctrica (Telecomunicaciones), sin daño → Leve", () => {
    const r = evaluarM04({ ...base(), ...conRedes, red_aerea_presente: true, tipo_red_aerea: ["telecomunicaciones"], dano_interferencia_red_aerea: false });
    expect(r.componentes.redAerea.categoria).toBe("leve");
  });
  it("IN-RAE-06: no incluye Eléctrica (Alumbrado público), con daño → Moderada", () => {
    const r = evaluarM04({ ...base(), ...conRedes, red_aerea_presente: true, tipo_red_aerea: ["alumbrado_publico"], dano_interferencia_red_aerea: true });
    expect(r.componentes.redAerea.categoria).toBe("moderada");
  });
  it("distancia_copa_red_aerea_m sin valor (con Eléctrica) → no_determinado", () => {
    const r = evaluarM04({ ...base(), ...conRedes, red_aerea_presente: true, tipo_red_aerea: ["electrica"], dano_interferencia_red_aerea: false });
    expect(r.componentes.redAerea.categoria).toBe("no_determinado");
  });

  describe("CC-043 — Función no determinada en tipo_red_aerea (decisión de la responsable, 2026-10-22, opción B)", () => {
    it("solo 'Función no determinada' (sin Eléctrica) → no_determinado, motivo CC-043", () => {
      const r = evaluarM04({ ...base(), ...conRedes, red_aerea_presente: true, tipo_red_aerea: ["funcion_no_determinada"], dano_interferencia_red_aerea: false });
      expect(r.componentes.redAerea.categoria).toBe("no_determinado");
      expect(r.componentes.redAerea.motivo).toMatch(/CC-043/);
    });
    it("'Eléctrica' + 'Función no determinada' → se aplican IN-RAE-02 a 04 igual (no queda no_determinado)", () => {
      const r = evaluarM04({
        ...base(), ...conRedes, red_aerea_presente: true, tipo_red_aerea: ["electrica", "funcion_no_determinada"],
        distancia_copa_red_aerea_m: 2.5, dano_interferencia_red_aerea: false,
      });
      expect(r.componentes.redAerea.categoria).toBe("leve");
    });
    it("'Telecomunicaciones' + 'Función no determinada' (sin Eléctrica) → no_determinado, motivo CC-043", () => {
      const r = evaluarM04({
        ...base(), ...conRedes, red_aerea_presente: true, tipo_red_aerea: ["telecomunicaciones", "funcion_no_determinada"], dano_interferencia_red_aerea: false,
      });
      expect(r.componentes.redAerea.categoria).toBe("no_determinado");
      expect(r.componentes.redAerea.motivo).toMatch(/CC-043/);
    });
    it("código desconocido en tipo_red_aerea → no_determinado, nunca se trata como una opción válida", () => {
      const r = evaluarM04({ ...base(), ...conRedes, red_aerea_presente: true, tipo_red_aerea: ["satelital" as never], dano_interferencia_red_aerea: false });
      expect(r.componentes.redAerea.categoria).toBe("no_determinado");
      expect(r.componentes.redAerea.motivo).toMatch(/código no reconocido/);
    });
    it("lista vacía → no_determinado, no se asume ningún tipo", () => {
      const r = evaluarM04({ ...base(), ...conRedes, red_aerea_presente: true, tipo_red_aerea: [], dano_interferencia_red_aerea: false });
      expect(r.componentes.redAerea.categoria).toBe("no_determinado");
      expect(r.componentes.redAerea.motivo).toMatch(/lista vacía/);
    });
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
  it("IN-RSU-07: afectación física = No, compromete = No determinado → No determinado (D-170: se excluye)", () => {
    const r = evaluarM04({
      ...base(), ...conRedes, red_subterranea_presente: "si",
      afectacion_fisica_red_subterranea: false, compromete_funcionalidad_red_subterranea: "no_determinado",
    });
    expect(r.componentes.redSubterranea.categoria).toBe("no_determinado");
    expect(r.componentes.redSubterranea.puntaje).toBeNull();
  });
});

describe("reglaId — el ID de REGLAS_INDICADORES (o del gate IN-GEN-01) que produjo cada componente", () => {
  it("IN-GEN-01 (gate) → no_aplica con reglaId IN-GEN-01; el campo faltante en sí → reglaId null", () => {
    expect(evaluarM04(base()).componentes.vereda.reglaId).toBe("IN-GEN-01");
    expect(evaluarM04({ ...base(), infraestructura_inmediata: null }).componentes.vereda.reglaId).toBeNull();
  });
  it("IN-VER-01 a 06", () => {
    const conInfra = { infraestructura_inmediata: true as const };
    expect(evaluarM04({ ...base(), ...conInfra, existe_vereda: false }).componentes.vereda.reglaId).toBe("IN-VER-01");
    expect(evaluarM04({ ...base(), ...conInfra, existe_vereda: true, dano_interferencia_vereda: false }).componentes.vereda.reglaId).toBe("IN-VER-02");
    const danoSinActivadores = {
      ...conInfra, existe_vereda: true as const, dano_interferencia_vereda: true as const,
      presenta_levantamiento_vereda: false as const, presenta_hundimiento_vereda: false as const, presenta_grieta_vereda: false as const,
      reduce_circulacion_peatonal: false as const, impide_paso_seguro: false as const,
    };
    expect(evaluarM04({ ...base(), ...danoSinActivadores, presenta_levantamiento_vereda: true, desnivel_max_vereda_cm: 6 }).componentes.vereda.reglaId).toBe("IN-VER-03");
    expect(evaluarM04({ ...base(), ...danoSinActivadores, presenta_hundimiento_vereda: true, desnivel_max_vereda_cm: 3 }).componentes.vereda.reglaId).toBe("IN-VER-04");
    expect(evaluarM04({ ...base(), ...danoSinActivadores }).componentes.vereda.reglaId).toBe("IN-VER-05");
    expect(evaluarM04({ ...base(), ...danoSinActivadores, reduce_circulacion_peatonal: true, impide_paso_seguro: true, ancho_libre_remanente_m: 2 }).componentes.vereda.reglaId).toBe("IN-VER-06");
  });
  it("IN-CAL-01 a 06", () => {
    const conInfra = { infraestructura_inmediata: true as const };
    expect(evaluarM04({ ...base(), ...conInfra, existe_calzada: false }).componentes.calzada.reglaId).toBe("IN-CAL-01");
    expect(evaluarM04({ ...base(), ...conInfra, existe_calzada: true, dano_interferencia_calzada: false }).componentes.calzada.reglaId).toBe("IN-CAL-02");
    const danoSinActivadores = {
      ...conInfra, existe_calzada: true as const, dano_interferencia_calzada: true as const,
      levantamiento_calzada: false as const, hundimiento_calzada: false as const, afecta_circulacion_vehicular: false as const,
    };
    expect(evaluarM04({ ...base(), ...danoSinActivadores, levantamiento_calzada: true, desnivel_max_calzada_cm: 6 }).componentes.calzada.reglaId).toBe("IN-CAL-03");
    expect(evaluarM04({ ...base(), ...danoSinActivadores, hundimiento_calzada: true, desnivel_max_calzada_cm: 3 }).componentes.calzada.reglaId).toBe("IN-CAL-04");
    expect(evaluarM04({ ...base(), ...danoSinActivadores }).componentes.calzada.reglaId).toBe("IN-CAL-05");
    expect(evaluarM04({ ...base(), ...danoSinActivadores, afecta_circulacion_vehicular: true }).componentes.calzada.reglaId).toBe("IN-CAL-06");
  });
  it("IN-ALC-01 a 06", () => {
    const con = { infraestructura_inmediata: true as const, existe_alcorque: true as const };
    const regla = (c: Partial<M04Input>) => evaluarM04({ ...base(), ...con, dano_interferencia_alcorque: false, ...c }).componentes.alcorque.reglaId;
    expect(regla({ existe_alcorque: false })).toBe("IN-ALC-01");
    expect(regla({})).toBe("IN-ALC-02");
    expect(regla({ obstaculos_crecimiento_radicular: true })).toBe("IN-ALC-03");
    expect(regla({ suelo_sellado_impermeabilizado: true })).toBe("IN-ALC-04");
    expect(regla({ dano_interferencia_alcorque: true })).toBe("IN-ALC-05");
    expect(regla({ dano_interferencia_alcorque: true, suelo_sellado_impermeabilizado: true })).toBe("IN-ALC-06");
  });
  it("IN-VRT-01 a 06", () => {
    expect(evaluarM04({ ...base(), infraestructura_inmediata: true, existe_elemento_vertical: false }).componentes.infraestructuraVertical.reglaId).toBe("IN-VRT-06");
    const conInfra = { infraestructura_inmediata: true as const };
    expect(evaluarM04({ ...base(), ...conInfra, contacto_interferencia_infraestructura_vertical: false }).componentes.infraestructuraVertical.reglaId).toBe("IN-VRT-01");
    expect(
      evaluarM04({ ...base(), ...conInfra, contacto_interferencia_infraestructura_vertical: true, dano_fisico_observable_infraestructura_vertical: false, compromete_estabilidad_funcionalidad: false }).componentes.infraestructuraVertical.reglaId,
    ).toBe("IN-VRT-02");
    expect(
      evaluarM04({ ...base(), ...conInfra, contacto_interferencia_infraestructura_vertical: true, dano_fisico_observable_infraestructura_vertical: false, compromete_estabilidad_funcionalidad: true }).componentes.infraestructuraVertical.reglaId,
    ).toBe("IN-VRT-03");
    expect(
      evaluarM04({ ...base(), ...conInfra, contacto_interferencia_infraestructura_vertical: true, dano_fisico_observable_infraestructura_vertical: true, compromete_estabilidad_funcionalidad: false }).componentes.infraestructuraVertical.reglaId,
    ).toBe("IN-VRT-04");
    expect(
      evaluarM04({ ...base(), ...conInfra, contacto_interferencia_infraestructura_vertical: true, dano_fisico_observable_infraestructura_vertical: true, compromete_estabilidad_funcionalidad: true }).componentes.infraestructuraVertical.reglaId,
    ).toBe("IN-VRT-05");
  });
  it("IN-RAE-01 a 06", () => {
    const conRedes = { infraestructura_inmediata: true as const, interferencia_redes_servicios: true as const };
    expect(evaluarM04({ ...base(), ...conRedes, red_aerea_presente: false }).componentes.redAerea.reglaId).toBe("IN-RAE-01");
    expect(
      evaluarM04({ ...base(), ...conRedes, red_aerea_presente: true, tipo_red_aerea: ["electrica"], distancia_copa_red_aerea_m: 1.5, dano_interferencia_red_aerea: false }).componentes.redAerea.reglaId,
    ).toBe("IN-RAE-02");
    expect(
      evaluarM04({ ...base(), ...conRedes, red_aerea_presente: true, tipo_red_aerea: ["electrica"], distancia_copa_red_aerea_m: 2.5, dano_interferencia_red_aerea: false }).componentes.redAerea.reglaId,
    ).toBe("IN-RAE-03");
    expect(
      evaluarM04({ ...base(), ...conRedes, red_aerea_presente: true, tipo_red_aerea: ["electrica"], distancia_copa_red_aerea_m: 2.5, dano_interferencia_red_aerea: true }).componentes.redAerea.reglaId,
    ).toBe("IN-RAE-04");
    expect(
      evaluarM04({ ...base(), ...conRedes, red_aerea_presente: true, tipo_red_aerea: ["telecomunicaciones"], dano_interferencia_red_aerea: false }).componentes.redAerea.reglaId,
    ).toBe("IN-RAE-05");
    expect(
      evaluarM04({ ...base(), ...conRedes, red_aerea_presente: true, tipo_red_aerea: ["alumbrado_publico"], dano_interferencia_red_aerea: true }).componentes.redAerea.reglaId,
    ).toBe("IN-RAE-06");
  });
  it("IN-RSU-01 a 07; CC-043 (Función no determinada sin Eléctrica) → reglaId null", () => {
    const conRedes = { infraestructura_inmediata: true as const, interferencia_redes_servicios: true as const };
    expect(evaluarM04({ ...base(), ...conRedes, red_subterranea_presente: "no" }).componentes.redSubterranea.reglaId).toBe("IN-RSU-01");
    expect(evaluarM04({ ...base(), ...conRedes, red_subterranea_presente: "no_determinado" }).componentes.redSubterranea.reglaId).toBe("IN-RSU-02");
    expect(
      evaluarM04({ ...base(), ...conRedes, red_subterranea_presente: "si", afectacion_fisica_red_subterranea: false, compromete_funcionalidad_red_subterranea: "si" }).componentes.redSubterranea.reglaId,
    ).toBe("IN-RSU-03");
    expect(
      evaluarM04({ ...base(), ...conRedes, red_subterranea_presente: "si", afectacion_fisica_red_subterranea: true, compromete_funcionalidad_red_subterranea: "no" }).componentes.redSubterranea.reglaId,
    ).toBe("IN-RSU-04");
    expect(
      evaluarM04({ ...base(), ...conRedes, red_subterranea_presente: "si", afectacion_fisica_red_subterranea: true, compromete_funcionalidad_red_subterranea: "no_determinado" }).componentes.redSubterranea.reglaId,
    ).toBe("IN-RSU-05");
    expect(
      evaluarM04({ ...base(), ...conRedes, red_subterranea_presente: "si", afectacion_fisica_red_subterranea: false, compromete_funcionalidad_red_subterranea: "no" }).componentes.redSubterranea.reglaId,
    ).toBe("IN-RSU-06");
    expect(
      evaluarM04({ ...base(), ...conRedes, red_subterranea_presente: "si", afectacion_fisica_red_subterranea: false, compromete_funcionalidad_red_subterranea: "no_determinado" }).componentes.redSubterranea.reglaId,
    ).toBe("IN-RSU-07");
    expect(
      evaluarM04({ ...base(), ...conRedes, red_aerea_presente: true, tipo_red_aerea: ["funcion_no_determinada"], dano_interferencia_red_aerea: false }).componentes.redAerea.reglaId,
    ).toBeNull();
  });
});

describe("M04 — peor componente (D-170: No aplica y No determinado se excluyen)", () => {
  const conTodos = {
    infraestructura_inmediata: true as const,
    interferencia_redes_servicios: false as const,
    existe_vereda: true as const,
    dano_interferencia_vereda: false as const,
    existe_calzada: true as const,
    dano_interferencia_calzada: false as const,
    existe_alcorque: false as const,
    contacto_interferencia_infraestructura_vertical: false as const,
  };
  const verticalLeve = { contacto_interferencia_infraestructura_vertical: true as const, dano_fisico_observable_infraestructura_vertical: false as const, compromete_estabilidad_funcionalidad: false as const };
  const verticalModerada = { ...verticalLeve, compromete_estabilidad_funcionalidad: true as const };
  const verticalSevera = { ...verticalModerada, dano_fisico_observable_infraestructura_vertical: true as const };
  const calzadaSevera = { dano_interferencia_calzada: true as const, levantamiento_calzada: true as const, hundimiento_calzada: false as const, desnivel_max_calzada_cm: 6, afecta_circulacion_vehicular: false as const };

  it("sin componentes evaluados → No aplica", () => {
    const r = evaluarM04(base());
    expect(r.clasificacionInfraestructura).toBe("no_aplica");
    expect(r.componentesNoDeterminados).toEqual([]);
  });
  it("todo Sin afectación → Bajo", () => {
    expect(evaluarM04({ ...base(), ...conTodos }).clasificacionInfraestructura).toBe("bajo");
  });
  it("peor componente Leve → Bajo", () => {
    expect(evaluarM04({ ...base(), ...conTodos, ...verticalLeve }).clasificacionInfraestructura).toBe("bajo");
  });
  it("peor componente Moderada → Moderado", () => {
    expect(evaluarM04({ ...base(), ...conTodos, ...verticalModerada }).clasificacionInfraestructura).toBe("moderado");
  });
  it("una Severa no se diluye con otros componentes sanos → Alto", () => {
    expect(evaluarM04({ ...base(), ...conTodos, ...verticalSevera }).clasificacionInfraestructura).toBe("alto");
  });
  it("dos Severas → Crítico", () => {
    expect(evaluarM04({ ...base(), ...conTodos, ...verticalSevera, ...calzadaSevera }).clasificacionInfraestructura).toBe("critico");
  });
  it("varias Moderadas no suben el resultado", () => {
    const r = evaluarM04({ ...base(), ...conTodos, ...verticalModerada, existe_alcorque: true, dano_interferencia_alcorque: true, obstaculos_crecimiento_radicular: true });
    expect(r.componentes.alcorque.categoria).toBe("moderada");
    expect(r.clasificacionInfraestructura).toBe("moderado");
  });
  it("P_I y P_I% ya no se calculan", () => {
    const r = evaluarM04({ ...base(), ...conTodos, ...verticalSevera });
    expect(r.puntajeInfraestructura).toBeNull();
    expect(r.pctInfraestructura).toBeNull();
  });
  it("IF-21: un componente No determinado se excluye y marca el resultado como parcial", () => {
    const r = evaluarM04({ ...base(), ...conTodos, interferencia_redes_servicios: true, red_aerea_presente: false, red_subterranea_presente: "no_determinado" });
    expect(r.clasificacionInfraestructura).toBe("bajo");
    expect(r.componentesNoDeterminados).toEqual(["redSubterranea"]);
  });
  it("IF-21: todos los componentes No determinados → No aplica, parcial", () => {
    const r = evaluarM04({ ...base(), infraestructura_inmediata: null });
    expect(r.clasificacionInfraestructura).toBe("no_aplica");
    expect(r.componentesNoDeterminados).toHaveLength(6);
  });
});

describe("IN-SIT — Condición del sitio", () => {
  it.each<[Partial<M04Input>, string, string]>([
    [{}, "sin_restriccion", "IN-SIT-01"],
    [{ obstaculos_crecimiento_radicular: true }, "leve", "IN-SIT-02"],
    [{ indicios_compactacion_superficial: true }, "moderada", "IN-SIT-03"],
    [{ suelo_sellado_impermeabilizado: true }, "severa", "IN-SIT-04"],
    [{ obstaculos_crecimiento_radicular: true, indicios_compactacion_superficial: true }, "moderada", "IN-SIT-05"],
    [{ obstaculos_crecimiento_radicular: true, suelo_sellado_impermeabilizado: true }, "severa", "IN-SIT-05"],
  ])("caso %#, también sin infraestructura inmediata", (cambios, categoria, regla) => {
    const r = evaluarM04({ ...base(), ...cambios });
    expect(r.condicionSitio.categoria).toBe(categoria);
    expect(r.condicionSitio.reglaId).toBe(regla);
    expect(r.clasificacionInfraestructura).toBe("no_aplica");
  });
  it("dato faltante → sin categoría, con motivo", () => {
    const r = evaluarM04({ ...base(), suelo_sellado_impermeabilizado: null });
    expect(r.condicionSitio.categoria).toBeNull();
    expect(r.condicionSitio.motivo).toMatch(/suelo_sellado_impermeabilizado/);
  });
  it("IN-VRT y sitio no suben la clasificación sin alcorque", () => {
    const r = evaluarM04({ ...base(), infraestructura_inmediata: true, existe_vereda: false, existe_calzada: false, existe_alcorque: false, interferencia_redes_servicios: false, contacto_interferencia_infraestructura_vertical: false, suelo_sellado_impermeabilizado: true });
    expect(r.condicionSitio.categoria).toBe("severa");
    expect(r.clasificacionInfraestructura).toBe("bajo");
  });
});

describe("Campos faltantes → no_determinado por componente (el motor nunca rellena ni supone)", () => {
  it("infraestructura_inmediata = null → no_determinado en los seis componentes", () => {
    const r = evaluarM04({ ...base(), infraestructura_inmediata: null });
    expect(Object.values(r.componentes).every((c) => c.categoria === "no_determinado")).toBe(true);
  });
  it("desnivel_max_vereda_cm = NaN (con presenta_levantamiento_vereda = Sí) → no_determinado, nunca se clasifica", () => {
    const r = evaluarM04({
      ...base(), infraestructura_inmediata: true, existe_vereda: true, dano_interferencia_vereda: true,
      presenta_levantamiento_vereda: true, presenta_hundimiento_vereda: false, presenta_grieta_vereda: false,
      reduce_circulacion_peatonal: false, impide_paso_seguro: false, desnivel_max_vereda_cm: NaN,
    });
    expect(r.componentes.vereda.categoria).toBe("no_determinado");
    expect(r.componentes.vereda.motivo).toMatch(/no es un número finito/);
  });
  it("desnivel_max_vereda_cm ≤ 0 (si se informa, con el activador en Sí) → no_determinado", () => {
    const r = evaluarM04({
      ...base(), infraestructura_inmediata: true, existe_vereda: true, dano_interferencia_vereda: true,
      presenta_levantamiento_vereda: true, presenta_hundimiento_vereda: false, presenta_grieta_vereda: false,
      reduce_circulacion_peatonal: false, impide_paso_seguro: false, desnivel_max_vereda_cm: 0,
    });
    expect(r.componentes.vereda.categoria).toBe("no_determinado");
    expect(r.componentes.vereda.motivo).toMatch(/debe ser > 0/);
  });
  it("distancia_copa_red_aerea_m faltante (con tipo Eléctrica) → no_determinado", () => {
    const r = evaluarM04({
      ...base(), infraestructura_inmediata: true, interferencia_redes_servicios: true,
      red_aerea_presente: true, tipo_red_aerea: ["electrica"], dano_interferencia_red_aerea: false,
    });
    expect(r.componentes.redAerea.categoria).toBe("no_determinado");
  });
});
