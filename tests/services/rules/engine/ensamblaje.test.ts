import {
  AjusteVigente,
  ArgsResultadoEvaluacion,
  ensamblarResultadoEvaluacion,
  ensamblarResultadoVigente,
  NucleoEntradas,
  resolverValorEfectivo,
  validarAlcance,
} from "../../../../src/services/rules/engine/ensamblaje";
import { ClasificacionRiesgoCodigo } from "../../../../src/services/rules/engine/catalogs";

/** Árbol sano: los tres componentes de riesgo en Bajo, infraestructura en Bajo. */
function arbolSano(): NucleoEntradas {
  return {
    // R01 — todo despreciable
    levantamiento_del_plato_radicular: false,
    angulo_inclinacion: 0,
    raices_expuestas: false,
    necrosis_radicular: null,
    raices_cortadas: null,
    cavidad_pudricion_basal: false,
    cavidad_basal_externa: null,
    cavidad_basal_interna: null,
    D_diametro_basal_tronco_cm: null,
    d_diametro_cavidad_basal_cm: null,
    Cc_longitud_abertura_cavidad_cm: null,
    C_circunferencia_basal_cm: null,
    t_pared_residual_basal_cm: null,
    // R02 — todo despreciable
    presenta_cavidad_pudricion_tronco: false,
    cavidad_externa_tronco: null,
    cavidad_interna_tronco: null,
    D_diametro_tronco_cm: null,
    d_diametro_cavidad_tronco_cm: null,
    Cc_longitud_abertura_tronco_cm: null,
    C_circunferencia_tronco_cm: null,
    t_pared_residual_tronco_cm: null,
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
    // R03 — todo despreciable
    ramas_secas: false,
    ramas_secas_pct_copa: null,
    ramas_quebradas: false,
    desequilibrio_copa: false,
    defoliacion_estimada_pct: 0,
    // M04 — sin infraestructura inmediata (alcorque sin_afectacion, el resto no_aplica)
    infraestructura_inmediata: false,
    interferencia_redes_servicios: null,
    existe_vereda: null,
    dano_interferencia_vereda: null,
    presenta_levantamiento_vereda: null,
    presenta_grieta_vereda: null,
    presenta_hundimiento_vereda: null,
    desnivel_max_vereda_cm: null,
    ancho_max_grieta_vereda_cm: null,
    reduce_circulacion_peatonal: null,
    impide_paso_seguro: null,
    existe_calzada: null,
    dano_interferencia_calzada: null,
    levantamiento_calzada: null,
    hundimiento_calzada: null,
    desnivel_max_calzada_cm: null,
    afecta_circulacion_vehicular: null,
    suelo_sellado_impermeabilizado: false,
    indicios_compactacion_superficial: false,
    obstaculos_crecimiento_radicular: false,
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
    // Alcorque (no se usa en la clasificación, solo en calculados.superficie_alcorque_m2)
    forma_alcorque: null,
    largo_alcorque_m: null,
    ancho_alcorque_m: null,
    diametro_alcorque_m: null,
    superficie_alcorque_m2_manual: null,
    // M01 / consecuencia — todo en el extremo más benigno
    zona_objetivo: "bajo_la_copa",
    tasa_ocupacion_objetivo: "rara",
    consecuencia_raices_cuello: "insignificante",
    consecuencia_tronco: "insignificante",
    consecuencia_copa_ramas: "insignificante",
  };
}

function argsEvaluacionSana(): ArgsResultadoEvaluacion {
  return {
    variables: {},
    variablesCalculo: arbolSano(),
    tipoInspeccionRealizada: "evaluacion_inicial",
    fechaInspeccionISO: "2026-10-22",
    motorCommit: "abc1234",
  };
}

describe("resolverValorEfectivo", () => {
  it("sin ajuste → el valor efectivo es el calculado, sin descarte", () => {
    const r = resolverValorEfectivo<ClasificacionRiesgoCodigo>("clasificacion_riesgo", "bajo", null);
    expect(r.valorEfectivo).toBe("bajo");
    expect(r.ajusteMantenidoId).toBeNull();
    expect(r.ajusteDescartado).toBeNull();
  });
  it("ajuste cuyo valorCalculadoEnElAjuste coincide → gana el ajustado", () => {
    const ajuste: AjusteVigente<ClasificacionRiesgoCodigo> = { valorAjustado: "alto", valorCalculadoEnElAjuste: "bajo", adjustmentId: "adj-1" };
    const r = resolverValorEfectivo<ClasificacionRiesgoCodigo>("clasificacion_riesgo", "bajo", ajuste);
    expect(r.valorEfectivo).toBe("alto");
    expect(r.ajusteMantenidoId).toBe("adj-1");
    expect(r.ajusteDescartado).toBeNull();
  });
  it("ajuste cuyo valorCalculadoEnElAjuste NO coincide → gana el calculado, se registra el descarte", () => {
    const ajuste: AjusteVigente<ClasificacionRiesgoCodigo> = { valorAjustado: "alto", valorCalculadoEnElAjuste: "moderado", adjustmentId: "adj-2" };
    const r = resolverValorEfectivo<ClasificacionRiesgoCodigo>("clasificacion_riesgo", "bajo", ajuste);
    expect(r.valorEfectivo).toBe("bajo");
    expect(r.ajusteMantenidoId).toBeNull();
    expect(r.ajusteDescartado).toEqual({
      campo: "clasificacion_riesgo",
      valorCalculadoAnterior: "moderado",
      valorAjustado: "alto",
      nuevoValorCalculado: "bajo",
      adjustmentId: "adj-2",
      motivo: "el valor recalculado no coincide con el valor calculado sobre el que se hizo el ajuste",
    });
  });

  it("valorAjustado fuera del dominio ('muy_alto') → se descarta sin usarlo nunca, nunca queda null (regresión del hallazgo de la responsable)", () => {
    const ajuste: AjusteVigente<ClasificacionRiesgoCodigo> = {
      valorAjustado: "muy_alto" as unknown as ClasificacionRiesgoCodigo,
      valorCalculadoEnElAjuste: "bajo",
      adjustmentId: "adj-3",
    };
    const r = resolverValorEfectivo<ClasificacionRiesgoCodigo>("clasificacion_riesgo", "bajo", ajuste);
    expect(r.valorEfectivo).toBe("bajo");
    expect(r.ajusteMantenidoId).toBeNull();
    expect(r.ajusteDescartado).toEqual({
      campo: "clasificacion_riesgo",
      valorCalculadoAnterior: "bajo",
      valorAjustado: "muy_alto",
      nuevoValorCalculado: "bajo",
      adjustmentId: "adj-3",
      motivo: "valor ajustado fuera del dominio",
    });
  });

  it("valorAjustado = no_determinado → se descarta: un ajuste nunca resuelve a 'no_determinado' (CC-044)", () => {
    const ajuste: AjusteVigente<ClasificacionRiesgoCodigo> = {
      valorAjustado: "no_determinado",
      valorCalculadoEnElAjuste: "bajo",
      adjustmentId: "adj-4",
    };
    const r = resolverValorEfectivo<ClasificacionRiesgoCodigo>("clasificacion_riesgo", "bajo", ajuste);
    expect(r.valorEfectivo).toBe("bajo");
    expect(r.ajusteDescartado?.motivo).toBe("valor ajustado fuera del dominio");
  });

  it("CC-044: valorCalculado = no_determinado con un ajuste a un valor determinado válido → se mantiene", () => {
    const ajuste: AjusteVigente<ClasificacionRiesgoCodigo> = {
      valorAjustado: "alto",
      valorCalculadoEnElAjuste: "no_determinado",
      adjustmentId: "adj-5",
    };
    const r = resolverValorEfectivo<ClasificacionRiesgoCodigo>("clasificacion_riesgo", "no_determinado", ajuste);
    expect(r.valorEfectivo).toBe("alto");
    expect(r.ajusteMantenidoId).toBe("adj-5");
    expect(r.ajusteDescartado).toBeNull();
  });

  it("CC-044: ajuste hecho sobre no_determinado, recálculo posterior con datos completos y valor distinto → se descarta, requiere revisión", () => {
    const ajuste: AjusteVigente<ClasificacionRiesgoCodigo> = {
      valorAjustado: "alto",
      valorCalculadoEnElAjuste: "no_determinado",
      adjustmentId: "adj-6",
    };
    const r = resolverValorEfectivo<ClasificacionRiesgoCodigo>("clasificacion_riesgo", "moderado", ajuste);
    expect(r.valorEfectivo).toBe("moderado");
    expect(r.ajusteMantenidoId).toBeNull();
    expect(r.ajusteDescartado).toEqual({
      campo: "clasificacion_riesgo",
      valorCalculadoAnterior: "no_determinado",
      valorAjustado: "alto",
      nuevoValorCalculado: "moderado",
      adjustmentId: "adj-6",
      motivo: "el valor recalculado no coincide con el valor calculado sobre el que se hizo el ajuste",
    });
  });

  it("CC-044: ajuste hecho sobre no_determinado, recálculo que sigue no_determinado → se mantiene", () => {
    const ajuste: AjusteVigente<ClasificacionRiesgoCodigo> = {
      valorAjustado: "alto",
      valorCalculadoEnElAjuste: "no_determinado",
      adjustmentId: "adj-7",
    };
    const r = resolverValorEfectivo<ClasificacionRiesgoCodigo>("clasificacion_riesgo", "no_determinado", ajuste);
    expect(r.valorEfectivo).toBe("alto");
    expect(r.ajusteMantenidoId).toBe("adj-7");
    expect(r.ajusteDescartado).toBeNull();
  });

  it("infraestructura: valorAjustado = no_aplica → se descarta (nunca es un valor ajustado válido)", () => {
    const ajuste: AjusteVigente<"bajo" | "moderado" | "alto" | "critico" | "no_aplica"> = {
      valorAjustado: "no_aplica",
      valorCalculadoEnElAjuste: "no_aplica",
      adjustmentId: "adj-8",
    };
    const r = resolverValorEfectivo("clasificacion_infraestructura", "no_aplica", ajuste);
    expect(r.valorEfectivo).toBe("no_aplica");
    expect(r.ajusteDescartado?.motivo).toBe("valor ajustado fuera del dominio");
  });
});

describe("validarAlcance (CC-040 a, b)", () => {
  it("Evaluación inicial: ningún campo queda fuera de alcance, aunque estén todos presentes", () => {
    const r = validarAlcance("evaluacion_inicial", null, arbolSano() as unknown as Record<string, unknown>);
    expect(r.camposFueraDeAlcance).toEqual([]);
    expect(r.valoresNoPermitidosEnAlcance).toEqual([]);
  });
  it("Evaluación instrumental: un campo de R03 (ajeno a las cavidades) queda fuera de alcance", () => {
    const r = validarAlcance("evaluacion_instrumental", null, { ramas_secas: true, cavidad_pudricion_basal: true });
    expect(r.camposFueraDeAlcance).toContain("ramas_secas");
    expect(r.camposFueraDeAlcance).not.toContain("cavidad_pudricion_basal");
  });
  it("Evaluación instrumental: cavidad_basal_interna = 'requiere_evaluacion_instrumental' queda marcado como valor no permitido (CC-040 b)", () => {
    const r = validarAlcance("evaluacion_instrumental", null, { cavidad_basal_interna: "requiere_evaluacion_instrumental" });
    expect(r.valoresNoPermitidosEnAlcance.length).toBeGreaterThan(0);
    expect(r.valoresNoPermitidosEnAlcance[0]).toMatch(/CC-040 b/);
  });
  it("Monitoreo/Fitosanitario: un campo de R01 queda fuera de alcance", () => {
    const r = validarAlcance("monitoreo", "fitosanitario", { angulo_inclinacion: 10, defoliacion_estimada_pct: 5 });
    expect(r.camposFueraDeAlcance).toContain("angulo_inclinacion");
    expect(r.camposFueraDeAlcance).not.toContain("defoliacion_estimada_pct");
  });
  it("Monitoreo/Vitalidad: solo clasificacion_vitalidad está en alcance, y no hay problemas si es lo único registrado", () => {
    const r = validarAlcance("monitoreo", "vitalidad", { clasificacion_vitalidad: "1" });
    expect(r.camposFueraDeAlcance).toEqual([]);
  });
});

describe("ensamblarResultadoEvaluacion", () => {
  it("árbol sano: Bajo/Bajo/Baja de punta a punta, sin ajustes", () => {
    const r = ensamblarResultadoEvaluacion(argsEvaluacionSana());
    expect(r.clasificacion_riesgo_calculada).toBe("bajo");
    expect(r.clasificacion_infraestructura_calculada).toBe("bajo");
    expect(r.clasificacion_prioridad_calculada).toBe("baja");
    expect(r.clasificacion_riesgo_ajustada).toBeNull();
    expect(r.rule_version).toBe("2.1");
    expect(r.motor_commit).toBe("abc1234");
    expect(r.ajustesDescartados).toEqual([]);
  });

  it("ajuste de riesgo que coincide con el calculado → se mantiene, y M05 usa el valor ajustado", () => {
    const args = argsEvaluacionSana();
    args.ajustes = { riesgo: { valorAjustado: "extremo", valorCalculadoEnElAjuste: "bajo", adjustmentId: "adj-r1" } };
    const r = ensamblarResultadoEvaluacion(args);
    expect(r.clasificacion_riesgo_calculada).toBe("bajo"); // el calculado no cambia
    expect(r.clasificacion_riesgo_ajustada).toBe("extremo"); // el efectivo es el ajustado
    expect(r.clasificacion_prioridad_calculada).toBe("critica"); // M05(extremo, *) = Crítica siempre
    expect(r.inspeccion.nivelRiesgo).toBe("extremo"); // D-200: nivel_riesgo = riesgo efectivo
  });

  it("ajuste de riesgo que NO coincide con el calculado → se descarta; M05 usa el calculado, no el ajuste viejo", () => {
    const args = argsEvaluacionSana();
    args.ajustes = { riesgo: { valorAjustado: "extremo", valorCalculadoEnElAjuste: "moderado", adjustmentId: "adj-r2" } };
    const r = ensamblarResultadoEvaluacion(args);
    expect(r.clasificacion_riesgo_calculada).toBe("bajo");
    expect(r.clasificacion_riesgo_ajustada).toBeNull(); // descartado
    expect(r.clasificacion_prioridad_calculada).toBe("baja"); // M05(bajo, bajo) = Baja, no "critica"
    expect(r.ajustesDescartados).toHaveLength(1);
    expect(r.ajustesDescartados[0].campo).toBe("clasificacion_riesgo");
  });

  it("el ajuste de prioridad se compara contra el resultado de M05, no contra el de riesgo", () => {
    const args = argsEvaluacionSana();
    // riesgo y infraestructura quedan en Bajo/Bajo → M05 calcula "baja".
    args.ajustes = { prioridad: { valorAjustado: "critica", valorCalculadoEnElAjuste: "baja", adjustmentId: "adj-p1" } };
    const r = ensamblarResultadoEvaluacion(args);
    expect(r.clasificacion_prioridad_calculada).toBe("baja");
    expect(r.clasificacion_prioridad_ajustada).toBe("critica"); // coincidió con el resultado de M05 ("baja"), se mantiene
  });

  it("CC-045 (b): riesgo = no_determinado sin ajuste → ambas fechas sugeridas usan el rango de Extremo, con motivo de precaución (nunca sin fecha)", () => {
    const args = argsEvaluacionSana();
    args.variablesCalculo = { ...args.variablesCalculo, angulo_inclinacion: null }; // rompe R01 → no_determinado
    const r = ensamblarResultadoEvaluacion(args);
    expect(r.clasificacion_riesgo_calculada).toBe("no_determinado");
    expect(r.inspeccion.nivelRiesgo).toBe("no_determinado");
    expect(r.inspeccion.fechaProximaInspeccionSugerida.noDeterminable).toBe(false);
    expect(r.inspeccion.fechaProximaInspeccionSugerida.motivo).toMatch(/CC-045/);
    expect(r.inspeccion.fechaProximoMonitoreoSugerida.noDeterminable).toBe(false);
    expect(r.inspeccion.fechaProximoMonitoreoSugerida.inmediatoYContinuo).toBe(true);
  });

  it("CC-044: riesgo calculado = no_determinado, con un ajuste hecho sobre ese estado → se mantiene y alimenta M05/fechas", () => {
    const args = argsEvaluacionSana();
    args.variablesCalculo = { ...args.variablesCalculo, angulo_inclinacion: null }; // rompe R01 → no_determinado
    args.ajustes = { riesgo: { valorAjustado: "alto", valorCalculadoEnElAjuste: "no_determinado", adjustmentId: "adj-nd1" } };
    const r = ensamblarResultadoEvaluacion(args);
    expect(r.clasificacion_riesgo_calculada).toBe("no_determinado");
    expect(r.clasificacion_riesgo_ajustada).toBe("alto"); // el ajuste sobre no_determinado se mantiene
    expect(r.inspeccion.nivelRiesgo).toBe("alto"); // D-200: usa el efectivo, no el calculado
    expect(r.inspeccion.fechaProximaInspeccionSugerida.noDeterminable).toBe(false); // ya hay fecha, porque el efectivo está determinado
  });

  it("CC-045 (b): riesgo no_determinado ajustado a Bajo → las fechas usan Bajo (24 y 12 meses), no el rango de precaución", () => {
    const args = argsEvaluacionSana();
    args.variablesCalculo = { ...args.variablesCalculo, angulo_inclinacion: null }; // rompe R01 → no_determinado
    args.ajustes = { riesgo: { valorAjustado: "bajo", valorCalculadoEnElAjuste: "no_determinado", adjustmentId: "adj-nd2" } };
    const r = ensamblarResultadoEvaluacion(args);
    expect(r.inspeccion.nivelRiesgo).toBe("bajo");
    expect(r.inspeccion.fechaProximaInspeccionSugerida.fechaInicio).toBe("2028-10-22"); // 24 meses desde 2026-10-22
    expect(r.inspeccion.fechaProximaInspeccionSugerida.motivo).toBeUndefined(); // ya no es el caso de precaución
    expect(r.inspeccion.fechaProximoMonitoreoSugerida.fechaInicio).toBe("2027-10-22"); // 12 meses
  });

  it("calculados incluye superficie_alcorque_m2 y cumplimiento_distancia_seguridad_bt_mt", () => {
    const args = argsEvaluacionSana();
    args.variablesCalculo = {
      ...args.variablesCalculo,
      forma_alcorque: "rectangular",
      largo_alcorque_m: 4,
      ancho_alcorque_m: 2,
    };
    const r = ensamblarResultadoEvaluacion(args);
    expect(r.calculados.superficie_alcorque_m2.valor).toBe(8);
    expect(r.calculados.cumplimiento_distancia_seguridad_bt_mt).toBeNull(); // sin red aérea eléctrica en este caso
  });
});

describe("ensamblarResultadoVigente", () => {
  it("sin ajustes: requiere_revision_ajuste = false y ajustes_descartados = []", () => {
    const r = ensamblarResultadoVigente({ variablesCalculo: arbolSano(), motorCommit: "abc1234" });
    expect(r.requiere_revision_ajuste).toBe(false);
    expect(r.ajustes_descartados).toEqual([]);
    expect(r.adjustment_ids).toEqual([]);
  });

  it("un ajuste descartado: queda en ajustes_descartados y requiere_revision_ajuste = true", () => {
    const r = ensamblarResultadoVigente({
      variablesCalculo: arbolSano(),
      ajustes: { infraestructura: { valorAjustado: "critico", valorCalculadoEnElAjuste: "alto", adjustmentId: "adj-i1" } },
      motorCommit: "abc1234",
    });
    expect(r.requiere_revision_ajuste).toBe(true);
    expect(r.ajustes_descartados).toHaveLength(1);
    expect(r.ajustes_descartados[0].campo).toBe("clasificacion_infraestructura");
    expect(r.clasificacion_infraestructura_ajustada).toBeNull();
  });

  it("un ajuste vigente (coincide): queda en adjustment_ids, no en ajustes_descartados", () => {
    const r = ensamblarResultadoVigente({
      variablesCalculo: arbolSano(),
      ajustes: { riesgo: { valorAjustado: "moderado", valorCalculadoEnElAjuste: "bajo", adjustmentId: "adj-r9" } },
      motorCommit: "abc1234",
    });
    expect(r.requiere_revision_ajuste).toBe(false);
    expect(r.adjustment_ids).toEqual(["adj-r9"]);
    expect(r.clasificacion_riesgo_ajustada).toBe("moderado");
  });

  describe("CC-045 (a) — ajustes cuando el recálculo lo dispara una inspección anulada", () => {
    it("se anula la inspección que tenía el ajuste → la vigente vuelve a la clasificación anterior (el calculado, sin ajuste)", () => {
      const r = ensamblarResultadoVigente({
        variablesCalculo: arbolSano(),
        ajustes: { riesgo: { valorAjustado: "extremo", valorCalculadoEnElAjuste: "bajo", adjustmentId: "adj-anulado", inspectionId: "insp-anulada" } },
        inspeccionAnuladaId: "insp-anulada",
        motorCommit: "abc1234",
      });
      expect(r.clasificacion_riesgo_ajustada).toBeNull(); // el ajuste de la inspección anulada nunca aplica
      expect(r.clasificacion_riesgo_calculada).toBe("bajo");
      expect(r.adjustment_ids).toEqual([]);
      expect(r.ajustes_descartados).toEqual([]); // no es un descarte por CC-040 (d): simplemente se ignora
      expect(r.requiere_revision_ajuste).toBe(false);
    });

    it("se anula una inspección sin ajuste propio → reaparece el ajuste anterior, porque su valor calculado coincide", () => {
      const r = ensamblarResultadoVigente({
        variablesCalculo: arbolSano(),
        ajustes: {
          riesgo: { valorAjustado: "moderado", valorCalculadoEnElAjuste: "bajo", adjustmentId: "adj-anterior", inspectionId: "insp-anterior" },
        },
        inspeccionAnuladaId: "insp-sin-ajuste", // no coincide con el inspectionId del ajuste: no se filtra
        motorCommit: "abc1234",
      });
      expect(r.clasificacion_riesgo_ajustada).toBe("moderado");
      expect(r.adjustment_ids).toEqual(["adj-anterior"]);
      expect(r.requiere_revision_ajuste).toBe(false);
    });

    it("el ajuste anterior reaparecido ya no coincide con el valor recalculado → se descarta, con la marca de revisión", () => {
      const r = ensamblarResultadoVigente({
        variablesCalculo: arbolSano(), // clasificacion_riesgo_calculada = "bajo"
        ajustes: {
          riesgo: { valorAjustado: "moderado", valorCalculadoEnElAjuste: "alto", adjustmentId: "adj-anterior-2", inspectionId: "insp-anterior-2" },
        },
        inspeccionAnuladaId: "insp-sin-ajuste-2",
        motorCommit: "abc1234",
      });
      expect(r.clasificacion_riesgo_ajustada).toBeNull();
      expect(r.clasificacion_riesgo_calculada).toBe("bajo");
      expect(r.ajustes_descartados).toHaveLength(1);
      expect(r.ajustes_descartados[0].adjustmentId).toBe("adj-anterior-2");
      expect(r.requiere_revision_ajuste).toBe(true);
    });
  });
});
