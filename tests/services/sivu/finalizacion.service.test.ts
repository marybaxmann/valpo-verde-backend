jest.mock("../../../src/repositories/sivu/inspection.repository", () => ({
  ...jest.requireActual("../../../src/repositories/sivu/inspection.repository"),
  obtenerInspeccionPorId: jest.fn(),
  obtenerVariablesBorrador: jest.fn(),
  obtenerVersionArbolDeInspeccion: jest.fn(),
  obtenerArbolVigente: jest.fn(),
  obtenerEntradasVigentes: jest.fn(),
  obtenerFechaProximaInspeccionVigente: jest.fn(),
  finalizarInspeccion: jest.fn(),
  guardarBorradorInspeccion: jest.fn(),
}));
jest.mock("../../../src/repositories/sivu/workOrder.repository");
jest.mock("../../../src/repositories/sivu/photo.repository");
jest.mock("../../../src/services/authorization.service", () => ({
  assertProjectRole: jest.fn(),
}));

import { IndicadoresArbol } from "../../../src/services/rules/engine/ensamblaje";
import {
  finalizarInspeccion as finalizarInspeccionRepo,
  guardarBorradorInspeccion,
  obtenerArbolVigente,
  obtenerEntradasVigentes,
  obtenerFechaProximaInspeccionVigente,
  obtenerInspeccionPorId,
  obtenerVariablesBorrador,
  obtenerVersionArbolDeInspeccion,
} from "../../../src/repositories/sivu/inspection.repository";
import { obtenerOrdenTrabajoPorId } from "../../../src/repositories/sivu/workOrder.repository";
import { listarFotosPorInspeccion } from "../../../src/repositories/sivu/photo.repository";
import { assertProjectRole } from "../../../src/services/authorization.service";
import {
  calcularInspeccion,
  componerVariablesCalculo,
  finalizarInspeccion,
  huellaCalculo,
  resolverDatosLcr,
} from "../../../src/services/sivu/finalizacion.service";
import { REGLAS_COMPLETITUD } from "../../../src/schemas/sivu/completitudInspeccion";
import { MOTIVO_CONSERVA_VIGENTE } from "../../../src/services/rules/engine/fechas-sugeridas";
import { AuthenticatedUser } from "../../../src/types/auth";
import { AppError } from "../../../src/utils/AppError";

const mockInspeccion = obtenerInspeccionPorId as jest.Mock;
const mockVariables = obtenerVariablesBorrador as jest.Mock;
const mockVersionArbol = obtenerVersionArbolDeInspeccion as jest.Mock;
const mockArbolVigente = obtenerArbolVigente as jest.Mock;
const mockEntradasVigentes = obtenerEntradasVigentes as jest.Mock;
const mockFechaVigente = obtenerFechaProximaInspeccionVigente as jest.Mock;
const mockFinalizarRpc = finalizarInspeccionRepo as jest.Mock;
const mockGuardarBorrador = guardarBorradorInspeccion as jest.Mock;
const mockOt = obtenerOrdenTrabajoPorId as jest.Mock;
const mockFotos = listarFotosPorInspeccion as jest.Mock;
const mockAssertProjectRole = assertProjectRole as jest.Mock;

const INSPECTOR_ID = "inspector-1";
const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const TREE_ID = "22222222-2222-2222-2222-222222222222";
const WORK_ORDER_ID = "44444444-4444-4444-4444-444444444444";
const INSPECTION_ID = "55555555-5555-5555-5555-555555555555";
const TOKEN = "token-de-prueba";
const FECHA_INSPECCION = "2026-10-26";

function usuario(id = INSPECTOR_ID): AuthenticatedUser {
  return { id, email: "i@example.invalid", nombre: "Inspector de prueba", role: "inspector", activo: true };
}

/** Evaluación completa con todo en «No» (riesgo bajo), como en completitud.test.ts. */
function variablesCompletas(): Record<string, unknown> {
  const variables: Record<string, unknown> = {};
  for (const r of REGLAS_COMPLETITUD) {
    if (r.hoja === "REGISTRO_EVALUACION" && r.activacion.op === "siempre") variables[r.campo] = false;
  }
  return {
    ...variables,
    adelgazamiento_insuficiente_tronco: false,
    cuerpos_fructiferos_tronco: false,
    anillamiento: false,
    cuerpos_fructiferos_base: false,
    raices_cortadas: false,
    angulo_inclinacion: 5,
    sin_follaje_estacional: false,
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

const ARBOL_REGISTRADO = {
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

const ARBOL_VIGENTE = {
  sector: "Cerro Alegre",
  ubicacion_descriptiva: "Plaza Bismarck",
  utm_este: 255000,
  utm_norte: 6340000,
  especie_cientifica: "Quillaja saponaria",
  nombre_comun: "Quillay",
  copa_no_presenta: false,
};

interface Escenario {
  tipo?: string;
  subtipo?: string | null;
  variables?: Record<string, unknown> | null;
  vigentes?: Record<string, unknown>;
  fechaVigente?: string | null;
  fechaInspeccion?: string;
  vistas?: Array<string | null>;
  ot?: Record<string, unknown>;
  estadoRegistro?: string;
}

function preparar(e: Escenario = {}) {
  mockInspeccion.mockResolvedValue({
    id: INSPECTION_ID,
    work_order_id: WORK_ORDER_ID,
    tree_id: TREE_ID,
    inspector: INSPECTOR_ID,
    estado_registro: e.estadoRegistro ?? "preguardado",
    tipo_inspeccion_realizada: e.tipo ?? "evaluacion_inicial",
    subtipo_inspeccion: e.subtipo ?? null,
    fecha_inspeccion: e.fechaInspeccion ?? FECHA_INSPECCION,
  });
  mockOt.mockResolvedValue({
    id: WORK_ORDER_ID,
    project_id: PROJECT_ID,
    tree_id: TREE_ID,
    tipo_ot: "inspeccion",
    accion_solicitada: e.tipo ?? "evaluacion_inicial",
    estado_ot: "en_ejecucion",
    responsable_accion_id: INSPECTOR_ID,
    ...e.ot,
  });
  mockAssertProjectRole.mockResolvedValue(undefined);
  mockVariables.mockResolvedValue(e.variables === undefined ? variablesCompletas() : e.variables);
  mockVersionArbol.mockResolvedValue({ campos: ARBOL_REGISTRADO, camposRegistrados: Object.keys(ARBOL_REGISTRADO) });
  mockArbolVigente.mockResolvedValue(ARBOL_VIGENTE);
  mockEntradasVigentes.mockResolvedValue(e.vigentes ?? {});
  mockFechaVigente.mockResolvedValue(e.fechaVigente ?? null);
  mockFotos.mockResolvedValue((e.vistas ?? ["arbol_completo", "base", "tronco", "copa"]).map((vista, n) => ({ vista, id: `id-${n}`, inspection_id: INSPECTION_ID, storage_path: `foto-${n}`, sha256: null })));
  mockFinalizarRpc.mockResolvedValue({
    inspection_id: INSPECTION_ID,
    evaluation_id: "ev-1",
    estado_registro: "finalizado",
    species_id: null,
  });
}

async function huellaActual(): Promise<string> {
  return (await calcularInspeccion(usuario(), INSPECTION_ID, {}, TOKEN)).huella;
}

beforeEach(() => jest.clearAllMocks());

describe("POST /calcular (#59/#72; CC-054)", () => {
  it("rechaza porcentajes registrados con copa ausente y no permite cerrar el borrador", async () => {
    preparar({ variables: { ...variablesCompletas(), sin_follaje_estacional: null, defoliacion_estimada_pct: 20 } });
    const arbol = { ...ARBOL_REGISTRADO, copa_no_presenta: true };
    mockVersionArbol.mockResolvedValue({ campos: arbol, camposRegistrados: Object.keys(arbol) });

    const calculo = await calcularInspeccion(usuario(), INSPECTION_ID, {}, TOKEN);
    expect((calculo.resultado.indicadores as IndicadoresArbol).defoliacion).toMatchObject({ categoria: null, noDeterminado: true });
    expect(calculo.valores_no_permitidos).toContainEqual(expect.stringContaining("defoliacion_estimada_pct"));
    expect(calculo.puede_finalizar).toBe(false);
    await expect(finalizarInspeccion(usuario(), INSPECTION_ID, { huella: calculo.huella }, TOKEN))
      .rejects.toMatchObject({ statusCode: 422 });
    expect(mockFinalizarRpc).not.toHaveBeenCalled();
  });

  it.each([{}, { sin_follaje_estacional: null }])("no usa una casilla vigente para activar un porcentaje nuevo (%p)", async (casilla) => {
    const variables = variablesCompletas();
    delete variables.sin_follaje_estacional;
    preparar({
      variables: { ...variables, ...casilla, defoliacion_estimada_pct: 20 },
      vigentes: { sin_follaje_estacional: false },
    });
    const calculo = await calcularInspeccion(usuario(), INSPECTION_ID, {}, TOKEN);
    expect((calculo.resultado.indicadores as IndicadoresArbol).defoliacion).toMatchObject({ categoria: null, noDeterminado: true });
    expect(calculo.puede_finalizar).toBe(false);
  });

  it("distingue el receso confirmado de la copa ausente y conserva los resultados válidos", async () => {
    preparar({
      variables: {
        ...variablesCompletas(),
        sin_follaje_estacional: true,
        defoliacion_estimada_pct: null,
        clorosis_pct: null,
        necrosis_pct: null,
      },
    });
    const receso = await calcularInspeccion(usuario(), INSPECTION_ID, {}, TOKEN);
    expect((receso.resultado.indicadores as IndicadoresArbol).defoliacion).toMatchObject({ categoria: "no_aplica", reglaId: "CR-DEF-06" });
    expect(receso.puede_finalizar).toBe(true);

    preparar({ variables: { ...variablesCompletas(), defoliacion_estimada_pct: 20 } });
    const sinReceso = await calcularInspeccion(usuario(), INSPECTION_ID, {}, TOKEN);
    expect((sinReceso.resultado.indicadores as IndicadoresArbol).defoliacion).toMatchObject({ categoria: "leve", reglaId: "CR-DEF-02" });
    expect(sinReceso.puede_finalizar).toBe(true);
  });

  it("permite dos fotos sin etiqueta y distingue la advertencia del bloqueo D-27", async () => {
    preparar({ vistas: [null, null] });
    const suficiente = await calcularInspeccion(usuario(), INSPECTION_ID, {}, TOKEN);
    expect(suficiente).toMatchObject({
      puede_finalizar: true,
      fotos_validas_d27: 2,
      vistas_recomendadas_faltantes: ["arbol_completo", "base", "tronco", "copa"],
    });

    preparar({ vistas: [null] });
    const insuficiente = await calcularInspeccion(usuario(), INSPECTION_ID, {}, TOKEN);
    expect(insuficiente.puede_finalizar).toBe(false);
    expect(insuficiente.campos_faltantes).toEqual([expect.objectContaining({ campo: "fotografias_arbol" })]);
    const cierre = await finalizarInspeccion(usuario(), INSPECTION_ID, { huella: insuficiente.huella }, TOKEN);
    expect(cierre.finalizada).toBe(false);
    expect(mockFinalizarRpc).not.toHaveBeenCalled();
  });

  it("dos fotos de vista detalle no suman al minimo de una inspeccion visual", async () => {
    preparar({ vistas: ["detalle", null, "detalle"] });
    const calculo = await calcularInspeccion(usuario(), INSPECTION_ID, {}, TOKEN);
    expect(calculo).toMatchObject({ puede_finalizar: false, fotos_validas_d27: 1 });
    expect(calculo.campos_faltantes).toContainEqual(expect.objectContaining({ campo: "fotografias_arbol" }));
  });

  it("finaliza la instrumental sin fotos y sus fotos opcionales no cambian el calculo", async () => {
    const escenario = {
      tipo: "evaluacion_instrumental", subtipo: "resistografia",
      variables: { cavidad_pudricion_basal: false, presenta_cavidad_pudricion_tronco: false },
    };
    preparar({ ...escenario, vistas: [] });
    const sinFotos = await calcularInspeccion(usuario(), INSPECTION_ID, {}, TOKEN);
    expect(sinFotos).toMatchObject({ puede_finalizar: true, fotos_validas_d27: null });
    preparar({ ...escenario, vistas: ["base", "detalle"] });
    const conFotos = await calcularInspeccion(usuario(), INSPECTION_ID, {}, TOKEN);
    expect(conFotos.resultado).toEqual(sinFotos.resultado);
    expect(conFotos.huella).toBe(sinFotos.huella);
    preparar({ ...escenario, vistas: [] });
    await expect(finalizarInspeccion(usuario(), INSPECTION_ID, { huella: sinFotos.huella }, TOKEN))
      .resolves.toMatchObject({ finalizada: true });
  });

  it("calcula sin escribir nada y permite finalizar una evaluación completa", async () => {
    preparar();
    const r = await calcularInspeccion(usuario(), INSPECTION_ID, {}, TOKEN);

    expect(r.puede_finalizar).toBe(true);
    expect(r.campos_faltantes).toEqual([]);
    expect(r.nivel_riesgo).toBe("bajo");
    expect(r.resultado.motor_commit).toBe("test-motor-commit");
    expect(r.huella).toMatch(/^[0-9a-f]{64}$/);
    expect(r.fechas_sugeridas.fecha_proxima_inspeccion).toMatchObject({ fecha: "2028-10-26", rango_inicio: "2028-10-26" });
    expect(mockFinalizarRpc).not.toHaveBeenCalled();
    expect(mockGuardarBorrador).not.toHaveBeenCalled();
  });

  it("lee con el JWT del usuario todo lo que entra en la respuesta y en la huella (PR-018 v5.0, CC-064 decisión h)", async () => {
    preparar();
    await calcularInspeccion(usuario(), INSPECTION_ID, {}, TOKEN);

    expect(mockVariables).toHaveBeenCalledWith(TOKEN, INSPECTION_ID);
    expect(mockVersionArbol).toHaveBeenCalledWith(TOKEN, INSPECTION_ID);
    expect(mockArbolVigente).toHaveBeenCalledWith(TOKEN, TREE_ID);
    expect(mockEntradasVigentes).toHaveBeenCalledWith(TOKEN, TREE_ID);
    expect(mockFechaVigente).toHaveBeenCalledWith(TOKEN, TREE_ID);
    expect(mockFotos).toHaveBeenCalledWith(TOKEN, INSPECTION_ID);
  });

  it("informa los campos faltantes sin escribir nada", async () => {
    const variables = variablesCompletas();
    delete variables.zona_objetivo;
    preparar({ variables });
    const r = await calcularInspeccion(usuario(), INSPECTION_ID, {}, TOKEN);

    expect(r.puede_finalizar).toBe(false);
    expect(r.campos_faltantes.map((f) => f.campo)).toEqual(["zona_objetivo"]);
    expect(mockFinalizarRpc).not.toHaveBeenCalled();
  });

  it("muestra el efecto de un ajuste sin guardarlo", async () => {
    preparar();
    const r = await calcularInspeccion(
      usuario(),
      INSPECTION_ID,
      { ajustes: { clasificacion_riesgo: { valor_ajustado: "alto", justificacion_ajuste_clasificacion: "Copa sobre juego infantil" } } },
      TOKEN
    );
    expect(r.resultado.clasificacion_riesgo_calculada).toBe("bajo");
    expect(r.resultado.clasificacion_riesgo_ajustada).toBe("alto");
    expect(r.nivel_riesgo).toBe("alto");
    expect(mockFinalizarRpc).not.toHaveBeenCalled();
  });

  it("422 si la inspección todavía no tiene borrador", async () => {
    preparar({ variables: null });
    await expect(calcularInspeccion(usuario(), INSPECTION_ID, {}, TOKEN)).rejects.toMatchObject({ statusCode: 422 });
  });
});

describe("autorización de /calcular y /finalizar (como photo.service.ts)", () => {
  const llamar = {
    calcular: () => calcularInspeccion(usuario(), INSPECTION_ID, {}, TOKEN),
    finalizar: () => finalizarInspeccion(usuario(), INSPECTION_ID, { huella: "0".repeat(64) }, TOKEN),
  };

  describe.each(Object.entries(llamar))("%s", (_nombre, llamada) => {
    it("404 si la inspección no existe", async () => {
      preparar();
      mockInspeccion.mockResolvedValue(null);
      await expect(llamada()).rejects.toMatchObject({ statusCode: 404 });
    });

    it("404 si la OT no existe", async () => {
      preparar();
      mockOt.mockResolvedValue(null);
      await expect(llamada()).rejects.toMatchObject({ statusCode: 404 });
    });

    it("422 si la OT no es de Inspección", async () => {
      preparar({ ot: { tipo_ot: "mantenimiento" } });
      await expect(llamada()).rejects.toMatchObject({ statusCode: 422 });
    });

    it("403 si el usuario no es Inspector del proyecto", async () => {
      preparar();
      mockAssertProjectRole.mockRejectedValue(new AppError("No autorizado", 403));
      await expect(llamada()).rejects.toMatchObject({ statusCode: 403 });
    });

    it("403 si no es el responsable asignado de la OT", async () => {
      preparar({ ot: { responsable_accion_id: "otro-inspector" } });
      await expect(llamada()).rejects.toMatchObject({ statusCode: 403 });
    });

    it("422 si la OT no está En ejecución", async () => {
      preparar({ ot: { estado_ot: "programada" } });
      await expect(llamada()).rejects.toMatchObject({ statusCode: 422 });
    });

    it("422 si la inspección no está en Preguardado", async () => {
      preparar({ estadoRegistro: "finalizado" });
      await expect(llamada()).rejects.toMatchObject({ statusCode: 422 });
    });
  });

  it("no llama a la función SQL cuando la autorización falla", async () => {
    preparar({ ot: { responsable_accion_id: "otro-inspector" } });
    await expect(llamar.finalizar()).rejects.toBeInstanceOf(AppError);
    expect(mockFinalizarRpc).not.toHaveBeenCalled();
  });
});

describe("POST /finalizar (#59/#72; CC-054, CC-055, CC-056)", () => {
  it("falta un campo: 200 con finalizada = false, sigue en Preguardado y no llama a la función", async () => {
    const variables = variablesCompletas();
    delete variables.clasificacion_vitalidad;
    preparar({ variables });
    const huella = await huellaActual();

    const r = await finalizarInspeccion(usuario(), INSPECTION_ID, { huella }, TOKEN);

    expect(r).toEqual({
      finalizada: false,
      estado_registro: "preguardado",
      campos_faltantes: [expect.objectContaining({ campo: "clasificacion_vitalidad" })],
    });
    expect(mockFinalizarRpc).not.toHaveBeenCalled();
  });

  it("409 si el borrador cambió después de /calcular", async () => {
    preparar();
    const huella = await huellaActual();
    mockVariables.mockResolvedValue({ ...variablesCompletas(), angulo_inclinacion: 12 });

    await expect(finalizarInspeccion(usuario(), INSPECTION_ID, { huella }, TOKEN)).rejects.toMatchObject({ statusCode: 409 });
    expect(mockFinalizarRpc).not.toHaveBeenCalled();
  });

  it("409 si un valor vigente del árbol cambió después de /calcular", async () => {
    const variables = variablesCompletas();
    delete variables.consecuencia_tronco; // el valor sale de lo vigente
    preparar({ variables, vigentes: { consecuencia_tronco: "menor" } });
    const huella = await huellaActual();
    mockEntradasVigentes.mockResolvedValue({ consecuencia_tronco: "severa" });

    await expect(finalizarInspeccion(usuario(), INSPECTION_ID, { huella }, TOKEN)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("finaliza con ajustes y fecha ajustada: una sola llamada, con las fechas y los ajustes resueltos", async () => {
    preparar();
    const huella = await huellaActual();

    const r = await finalizarInspeccion(
      usuario(),
      INSPECTION_ID,
      {
        huella,
        ajustes: { clasificacion_riesgo: { valor_ajustado: "alto", justificacion_ajuste_clasificacion: "Copa sobre juego infantil" } },
        fecha_proxima_inspeccion: "2027-01-10",
        justificacion_ajuste_fecha: "Coordinación con poda municipal",
      },
      TOKEN
    );

    expect(mockFinalizarRpc).toHaveBeenCalledTimes(1);
    // /finalizar repite las lecturas con el JWT del usuario (CC-064 decisión h).
    expect(mockVariables).toHaveBeenLastCalledWith(TOKEN, INSPECTION_ID);
    expect(mockEntradasVigentes).toHaveBeenLastCalledWith(TOKEN, TREE_ID);
    expect(mockFotos).toHaveBeenLastCalledWith(TOKEN, INSPECTION_ID);
    const input = mockFinalizarRpc.mock.calls[0][0];
    expect(input).toMatchObject({
      inspectionId: INSPECTION_ID,
      usuario: INSPECTOR_ID,
      fechaProximaInspeccion: "2027-01-10",
      justificacionAjusteFecha: "Coordinación con poda municipal",
    });
    // Riesgo efectivo Alto: sugeridas desde Alto (1 a 3 meses / 2 a 4 semanas; se guarda el inicio).
    expect(input.fechaProximaInspeccionSugerida).toBe("2026-11-26");
    expect(input.fechaProximoMonitoreoSugerida).toBe(input.fechaProximoMonitoreo);
    expect(input.resultado).toMatchObject({
      clasificacion_riesgo_calculada: "bajo",
      clasificacion_riesgo_ajustada: "alto",
      motor_commit: "test-motor-commit",
      rule_version: expect.any(String),
    });
    expect(input.resultado).not.toHaveProperty("variables");
    expect(input.ajustes).toEqual([
      {
        campo: "clasificacion_riesgo",
        valor_calculado: "bajo",
        valor_ajustado: "alto",
        justificacion_ajuste_clasificacion: "Copa sobre juego infantil",
      },
    ]);
    expect(r).toMatchObject({ finalizada: true, estado_registro: "finalizado", fecha_proxima_inspeccion: "2027-01-10" });
  });

  it("ajuste de prioridad: valor_calculado es la prioridad recalculada con el riesgo ajustado (M05)", async () => {
    preparar();
    const huella = await huellaActual();
    await finalizarInspeccion(
      usuario(),
      INSPECTION_ID,
      {
        huella,
        ajustes: {
          clasificacion_riesgo: { valor_ajustado: "extremo", justificacion_ajuste_clasificacion: "Rama suspendida" },
          clasificacion_prioridad: { valor_ajustado: "media", justificacion_ajuste_clasificacion: "Ya intervenida" },
        },
      },
      TOKEN
    );
    const { resultado, ajustes } = mockFinalizarRpc.mock.calls[0][0];
    expect(resultado.clasificacion_prioridad_ajustada).toBe("media");
    expect(ajustes).toEqual([
      expect.objectContaining({ campo: "clasificacion_riesgo", valor_calculado: "bajo", valor_ajustado: "extremo" }),
      expect.objectContaining({
        campo: "clasificacion_prioridad",
        valor_calculado: resultado.clasificacion_prioridad_calculada,
        valor_ajustado: "media",
      }),
    ]);
    expect(resultado.clasificacion_prioridad_calculada).not.toBe("media");
  });

  it("ajuste inválido: igual al valor calculado → 422, sin llamar a la función", async () => {
    preparar();
    const huella = await huellaActual();
    await expect(
      finalizarInspeccion(
        usuario(),
        INSPECTION_ID,
        { huella, ajustes: { clasificacion_riesgo: { valor_ajustado: "bajo", justificacion_ajuste_clasificacion: "x" } } },
        TOKEN
      )
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(mockFinalizarRpc).not.toHaveBeenCalled();
  });

  it("fecha distinta de la sugerida sin justificación → 400 (D-204)", async () => {
    preparar();
    const huella = await huellaActual();
    await expect(
      finalizarInspeccion(usuario(), INSPECTION_ID, { huella, fecha_proximo_monitoreo: "2027-03-01" }, TOKEN)
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mockFinalizarRpc).not.toHaveBeenCalled();
  });

  it("justificación sin cambio de fecha → 422 (D-204; CC-055)", async () => {
    preparar();
    const huella = await huellaActual();
    await expect(
      finalizarInspeccion(usuario(), INSPECTION_ID, { huella, justificacion_ajuste_fecha: "sin motivo" }, TOKEN)
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it("SV064 de fn_finalizar_inspeccion → 422; 23514 → 400", async () => {
    preparar();
    const huella = await huellaActual();
    mockFinalizarRpc.mockRejectedValueOnce(new Error("La orden de trabajo no está En ejecución", { cause: "SV064" }));
    await expect(finalizarInspeccion(usuario(), INSPECTION_ID, { huella }, TOKEN)).rejects.toMatchObject({ statusCode: 422 });

    mockFinalizarRpc.mockRejectedValueOnce(new Error("viola chk_...", { cause: "23514" }));
    await expect(finalizarInspeccion(usuario(), INSPECTION_ID, { huella }, TOKEN)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("especie inválida al incorporarla al catálogo (23514) → 400 en palabras simples (B-4)", async () => {
    preparar();
    const huella = await huellaActual();
    mockFinalizarRpc.mockRejectedValueOnce(
      new Error('new row for relation "species" violates check constraint "chk_species_especie_cientifica_valida"', { cause: "23514" })
    );
    const error = await finalizarInspeccion(usuario(), INSPECTION_ID, { huella }, TOKEN).catch((e) => e);
    expect(error.statusCode).toBe(400);
    expect(error.message).not.toContain("chk_");
    expect(error.message).toContain("nombre completo de una especie");
  });

  it("riesgo No determinado (CC-045 b): fechas de Extremo con el motivo de precaución, y se puede finalizar", async () => {
    preparar({
      variables: {
        ...variablesCompletas(),
        cavidad_pudricion_basal: true,
        cavidad_basal_externa: false,
        cavidad_basal_interna: "requiere_evaluacion_instrumental",
        D_diametro_basal_tronco_cm: 40,
      },
    });
    const calculo = await calcularInspeccion(usuario(), INSPECTION_ID, {}, TOKEN);
    expect(calculo.nivel_riesgo).toBe("no_determinado");
    expect(calculo.puede_finalizar).toBe(true);
    expect(calculo.fechas_sugeridas.fecha_proxima_inspeccion).toEqual({
      fecha: "2026-11-02",
      rango_inicio: "2026-11-02",
      rango_fin: "2026-11-23",
      inmediato_y_continuo: false,
      motivo: expect.stringMatching(/precaución.*CC-045 b/),
    });
    expect(calculo.fechas_sugeridas.fecha_proximo_monitoreo).toMatchObject({
      fecha: FECHA_INSPECCION,
      inmediato_y_continuo: true,
      motivo: expect.stringMatching(/precaución/),
    });

    const r = await finalizarInspeccion(usuario(), INSPECTION_ID, { huella: calculo.huella }, TOKEN);
    expect(r.finalizada).toBe(true);
    expect(mockFinalizarRpc).toHaveBeenCalledWith(
      expect.objectContaining({ fechaProximaInspeccionSugerida: "2026-11-02", fechaProximoMonitoreoSugerida: FECHA_INSPECCION })
    );
  });

  it("noDeterminable (fecha de inspección inválida): error interno, no AppError", async () => {
    preparar({ fechaInspeccion: "no-es-fecha" });
    const promesa = calcularInspeccion(usuario(), INSPECTION_ID, {}, TOKEN);
    await expect(promesa).rejects.toThrow(/no determinable/);
    await expect(calcularInspeccion(usuario(), INSPECTION_ID, {}, TOKEN)).rejects.not.toBeInstanceOf(AppError);
  });
});

describe("Monitoreo con fecha vigente (CC-055)", () => {
  const fitosanitario = {
    sin_follaje_estacional: false,
    defoliacion_estimada_pct: 5,
    clorosis_pct: 0,
    necrosis_pct: 0,
    muerte_regresiva_copa_pct: 0,
    presenta_exudaciones: false,
  };

  it("la sugerida conserva la fecha vigente cuando es anterior a la calculada, y así se finaliza", async () => {
    const vigentes = variablesCompletas();
    preparar({ tipo: "monitoreo", subtipo: "fitosanitario", variables: fitosanitario, vigentes, fechaVigente: "2027-01-15" });
    const calculo = await calcularInspeccion(usuario(), INSPECTION_ID, {}, TOKEN);

    expect(calculo.puede_finalizar).toBe(true);
    expect(calculo.fecha_proxima_inspeccion_vigente).toBe("2027-01-15");
    expect(calculo.fechas_sugeridas.fecha_proxima_inspeccion).toMatchObject({ fecha: "2027-01-15", motivo: MOTIVO_CONSERVA_VIGENTE });

    await finalizarInspeccion(usuario(), INSPECTION_ID, { huella: calculo.huella }, TOKEN);
    expect(mockFinalizarRpc).toHaveBeenCalledWith(
      expect.objectContaining({ fechaProximaInspeccionSugerida: "2027-01-15", fechaProximaInspeccion: "2027-01-15" })
    );
  });

  it("un cambio de la fecha vigente invalida la huella (409)", async () => {
    preparar({ tipo: "monitoreo", subtipo: "fitosanitario", variables: fitosanitario, vigentes: variablesCompletas(), fechaVigente: "2027-01-15" });
    const huella = await huellaActual();
    mockFechaVigente.mockResolvedValue("2026-12-01");
    await expect(finalizarInspeccion(usuario(), INSPECTION_ID, { huella }, TOKEN)).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe("composición y huella", () => {
  it("variables_calculo: registrado sobre vigente, null si no hay, solo las claves del núcleo", () => {
    const v = componerVariablesCalculo(
      { zona_objetivo: "rara_vez", consecuencia_tronco: "menor", clasificacion_vitalidad: "muerto" },
      { zona_objetivo: "bajo_la_copa", observaciones_copa: "texto" },
      30
    ) as unknown as Record<string, unknown>;
    expect(Object.keys(v)).toHaveLength(91);
    expect(v.dap_cm).toBe(30);
    expect(v.zona_objetivo).toBe("bajo_la_copa");
    expect(v.consecuencia_tronco).toBe("menor");
    expect(v.raices_expuestas).toBeNull();
    expect(v).not.toHaveProperty("observaciones_copa");
    expect(v).not.toHaveProperty("clasificacion_vitalidad");
  });

  it("la huella no depende del orden de las claves y sí de cada dato", () => {
    const base = { tipo: "evaluacion_inicial", subtipo: null, fechaInspeccion: FECHA_INSPECCION, fechaVigente: null };
    const a = componerVariablesCalculo({}, { zona_objetivo: "bajo_la_copa", tasa_ocupacion_objetivo: "rara" }, null);
    const b = componerVariablesCalculo({}, { tasa_ocupacion_objetivo: "rara", zona_objetivo: "bajo_la_copa" }, null);
    expect(huellaCalculo({ ...base, variablesCalculo: a })).toBe(huellaCalculo({ ...base, variablesCalculo: b }));
    expect(huellaCalculo({ ...base, variablesCalculo: a })).not.toBe(
      huellaCalculo({ ...base, variablesCalculo: a, fechaVigente: "2027-01-01" })
    );
  });
});

describe("ajuste de probabilidad de falla y datos de LCR (CC-071)", () => {
  it("/finalizar envía el ajuste con su valor calculado y no agrega columnas al resultado", async () => {
    preparar();
    const huella = await huellaActual();
    const { resultado: calculo } = await calcularInspeccion(usuario(), INSPECTION_ID, {}, TOKEN);
    const valorAjustado = calculo.probabilidad_falla_tronco === "inminente" ? "probable" : "inminente";
    await finalizarInspeccion(
      usuario(),
      INSPECTION_ID,
      { huella, ajustes: { probabilidad_falla_tronco: { valor_ajustado: valorAjustado, justificacion_ajuste_clasificacion: "Fisura activa" } } },
      TOKEN
    );
    const { resultado, ajustes } = mockFinalizarRpc.mock.calls[0][0];
    expect(ajustes).toEqual([
      {
        campo: "probabilidad_falla_tronco",
        valor_calculado: calculo.probabilidad_falla_tronco,
        valor_ajustado: valorAjustado,
        justificacion_ajuste_clasificacion: "Fisura activa",
      },
    ]);
    expect(resultado).not.toHaveProperty("probabilidad_falla_tronco_ajustada");
  });

  it("un ajuste de probabilidad igual al calculado se rechaza (422)", async () => {
    preparar();
    const { resultado: calculo } = await calcularInspeccion(usuario(), INSPECTION_ID, {}, TOKEN);
    await expect(
      calcularInspeccion(
        usuario(),
        INSPECTION_ID,
        {
          ajustes: {
            probabilidad_falla_tronco: {
              valor_ajustado: calculo.probabilidad_falla_tronco as "improbable",
              justificacion_ajuste_clasificacion: "x",
            },
          },
        },
        TOKEN
      )
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it("resolverDatosLcr: lo registrado gana a lo vigente; tipo_hoja viene del árbol; texto numérico se convierte", () => {
    expect(
      resolverDatosLcr(
        { campos: { altura_punta_viva_m: 9 }, camposRegistrados: ["altura_punta_viva_m"] },
        { altura_punta_viva_m: "7.5", altura_base_copa_viva_m: "3", altura_total_m: "10", tipo_hoja: "palmera" }
      )
    ).toEqual({ altura_punta_viva_m: 9, altura_base_copa_viva_m: 3, altura_total_m: 10, tipo_hoja: "palmera" });
  });

  it("un cambio de altura de punta viva cambia la huella", () => {
    const base = { tipo: "evaluacion_inicial", subtipo: null, fechaInspeccion: FECHA_INSPECCION, fechaVigente: null };
    const a = componerVariablesCalculo({}, {}, null, { altura_punta_viva_m: 9 });
    const b = componerVariablesCalculo({}, {}, null, { altura_punta_viva_m: 8 });
    expect(huellaCalculo({ ...base, variablesCalculo: a })).not.toBe(huellaCalculo({ ...base, variablesCalculo: b }));
  });
});


describe("insumos dendrom?tricos de consecuencia en 3.2", () => {
  const version = jest.requireActual("../../../src/services/rules/engine/version");

  beforeEach(() => {
    jest.replaceProperty(version, "RULE_VERSION_OPERATIVA", "3.2");
    preparar();
  });

  afterEach(() => jest.restoreAllMocks());

  it.each([
    [true, [8, 9], "significativa", "menor", "insignificante"],
    [true, null, "significativa", null, null],
    [false, null, "significativa", "significativa", "menor"],
  ])("resuelve los campos de la inspecci?n y del ?rbol vigente (multifustal=%s, fustes=%j)", async (
    multifustal, fustes, raices, tronco, copa,
  ) => {
    mockVersionArbol.mockResolvedValue({
      campos: { multifustal, dap_fustes_cm: fustes, dap_cm: 12 },
      camposRegistrados: ["multifustal", "dap_fustes_cm", "dap_cm"],
    });
    mockArbolVigente.mockResolvedValue({ ...ARBOL_VIGENTE, multifustal: true, dap_fustes_cm: [40, 40], numero_fustes: 2, dap_cm: 56.57 });
    const { resultado } = await calcularInspeccion(usuario(), INSPECTION_ID, {}, TOKEN);
    expect(resultado.calculados.consecuencias).toMatchObject({
      raicesCuello: { calculada: raices }, tronco: { calculada: tronco }, copaRamas: { calculada: copa },
    });
    if (multifustal && fustes === null) {
      expect(resultado.clasificacion_tronco).toBe("no_determinado");
      expect(resultado.clasificacion_copa_ramas).toBe("no_determinado");
    }
  });
});
