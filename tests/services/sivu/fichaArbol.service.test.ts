/** B2 — ficha del árbol: composición, historial solo con lo que fue vigente y reglas D-260 a D-262. */
jest.mock("../../../src/services/authorization.service");
jest.mock("../../../src/repositories/sivu/fichaArbol.repository", () => ({
  ...jest.requireActual("../../../src/repositories/sivu/fichaArbol.repository"),
  obtenerArbolFicha: jest.fn(),
  obtenerRasgosEspecie: jest.fn(),
  listarVersionesMedicion: jest.fn(),
}));
jest.mock("../../../src/services/sivu/diagnostico.service", () => ({ diagnosticoDeArbol: jest.fn() }));
jest.mock("../../../src/repositories/sivu/mantenimiento.repository", () => ({ obtenerPresencia: jest.fn() }));
jest.mock("../../../src/services/sivu/incidencia.service", () => ({ listarIncidenciasDeArbol: jest.fn() }));
jest.mock("../../../src/services/sivu/listadoOt.service", () => ({ listarOtsDeArbol: jest.fn() }));
jest.mock("../../../src/services/sivu/habilitacionBiometrica", () => ({ arbolesConEvaluacionCompletaVigente: jest.fn() }));

import { obtenerFichaArbol } from "../../../src/services/sivu/fichaArbol.service";
import { assertProjectAccess } from "../../../src/services/authorization.service";
import { listarVersionesMedicion, obtenerArbolFicha, obtenerRasgosEspecie } from "../../../src/repositories/sivu/fichaArbol.repository";
import { diagnosticoDeArbol } from "../../../src/services/sivu/diagnostico.service";
import { listarIncidenciasDeArbol } from "../../../src/services/sivu/incidencia.service";
import { listarOtsDeArbol } from "../../../src/services/sivu/listadoOt.service";
import { obtenerPresencia } from "../../../src/repositories/sivu/mantenimiento.repository";
import { arbolesConEvaluacionCompletaVigente } from "../../../src/services/sivu/habilitacionBiometrica";

const user = { id: "u1", email: undefined, nombre: null, role: "inspector", activo: true };
const P = "p1";
const T = "t1";

const fila = {
  id: T, tree_code: "A-000346", project_id: P, sector_id: "s1", sector: "Barrio Puerto", ubicacion_descriptiva: "Plaza Victoria",
  utm_este: "256000.00", utm_norte: "6341000.00", ubicacion: { type: "Point", coordinates: [-71.6, -33.04] },
  especie_cientifica: "Acer pseudoplatanus", nombre_comun: "Falso plátano", estado_ciclo_vida: "activo", fecha_registro: "2026-10-26",
  multifustal: false, numero_fustes: null, dap_fustes_cm: null, dap_cm: "20.00", altura_total_m: "9.00",
  diametro_copa_ns_m: null, diametro_copa_eo_m: null, diametro_copa_m: null, copa_no_presenta: null,
  altura_primera_rama_m: null, altura_primera_rama_no_presenta: null, altura_base_copa_viva_m: null, altura_base_copa_viva_no_presenta: null,
  clase_edad: "maduro", rango_edad_estimada_anios: null, vigente_desde_inspection_id: "i2",
};

const vacios = Object.fromEntries(["sector", "ubicacion_descriptiva", "utm_este", "utm_norte", "especie_cientifica", "nombre_comun", "multifustal", "numero_fustes", "dap_fustes_cm", "dap_cm", "altura_total_m", "diametro_copa_ns_m", "diametro_copa_eo_m", "diametro_copa_m", "copa_no_presenta", "altura_primera_rama_m", "altura_primera_rama_no_presenta", "altura_base_copa_viva_m", "altura_base_copa_viva_no_presenta", "clase_edad", "rango_edad_estimada_anios"].map((c) => [c, null]));

const versiones = [
  { ...vacios, id: "v0", inspection_id: null, campos_registrados: null, created_at: "2026-10-26T10:00:00Z", sector: "Barrio Puerto", especie_cientifica: "Acer pseudoplatanus", inspections: null },
  { ...vacios, id: "v1", inspection_id: "i1", campos_registrados: ["dap_cm"], created_at: "2026-10-27T10:00:00Z", dap_cm: "18.00",
    inspections: { codigo_inspeccion: "INS-1", estado_registro: "anulado", fecha_inspeccion: "2026-10-27", work_orders: { estado_ot: "completada", fecha_completada_ot: "2026-10-30" } } },
  { ...vacios, id: "v2", inspection_id: "i2", campos_registrados: ["dap_cm", "altura_total_m", "clase_edad"], created_at: "2026-10-31T10:00:00Z", dap_cm: "20.00", altura_total_m: "9.00", clase_edad: "maduro",
    inspections: { codigo_inspeccion: "INS-2", estado_registro: "finalizado", fecha_inspeccion: "2026-10-31", work_orders: { estado_ot: "completada", fecha_completada_ot: "2026-10-31" } } },
  { ...vacios, id: "v3", inspection_id: "i3", campos_registrados: ["dap_cm"], created_at: "2026-10-31T12:00:00Z", dap_cm: "25.00",
    inspections: { codigo_inspeccion: "INS-3", estado_registro: "finalizado", fecha_inspeccion: "2026-10-31", work_orders: { estado_ot: "en_ejecucion", fecha_completada_ot: null } } },
];

beforeEach(() => {
  (assertProjectAccess as jest.Mock).mockResolvedValue(undefined);
  (obtenerArbolFicha as jest.Mock).mockResolvedValue(fila);
  (obtenerRasgosEspecie as jest.Mock).mockResolvedValue({ origen_biogeografico: "introducida", persistencia_follaje: "caducifolia", tipo_hoja: "latifoliada", genero: "Acer", familia: "Sapindaceae" });
  (listarVersionesMedicion as jest.Mock).mockResolvedValue(versiones);
  (diagnosticoDeArbol as jest.Mock).mockResolvedValue({ ultima_finalizada: { inspection_id: "i3" }, vigente: { evento: "ot_completada" } });
  (listarOtsDeArbol as jest.Mock).mockResolvedValue([{ id: "w1" }]);
  (listarIncidenciasDeArbol as jest.Mock).mockResolvedValue([{ id: "inc1" }]);
  (obtenerPresencia as jest.Mock).mockResolvedValue({ estado_presencia: "talado", fecha_cambio_estado_presencia: "2026-11-01" });
  (arbolesConEvaluacionCompletaVigente as jest.Mock).mockImplementation(async (_t: string, _p: string, ids: string[]) => new Set(ids));
});

describe("obtenerFichaArbol (B2)", () => {
  it("verifica el acceso y compone árbol, especie, evaluación, historial, OT e incidencias", async () => {
    const f = await obtenerFichaArbol(user, P, T, "token");

    expect(assertProjectAccess).toHaveBeenCalledWith(user, P, "token");
    expect(f.arbol).toMatchObject({
      tree_code: "A-000346", dap_cm: 20, altura_total_m: 9, utm_este: 256000,
      ubicacion: { lng: -71.6, lat: -33.04 },
      estado_ciclo_vida: { codigo: "activo", etiqueta: "Presente" },
      clase_edad: { codigo: "maduro", etiqueta: expect.any(String) },
    });
    expect(f.sobre_la_especie.origen_biogeografico).toEqual({ codigo: "introducida", etiqueta: "Introducida" });
    expect(f.evaluacion_vigente).toEqual({ evento: "ot_completada" });
    expect(f.ultima_inspeccion_finalizada).toEqual({ inspection_id: "i3" });
    expect(f.ordenes_trabajo).toEqual([{ id: "w1" }]);
    expect(f.incidencias).toEqual([{ id: "inc1" }]);
    expect(f.presencia).toEqual({ codigo: "talado", etiqueta: "Talado", desde: "2026-11-01" });
  });

  it("historial: solo el alta y las finalizadas de OT completadas, la más reciente primero, con los campos que registró cada una", async () => {
    const f = await obtenerFichaArbol(user, P, T, "token");
    expect(f.historial.map((h) => h.inspection_id)).toEqual(["i2", null]);
    expect(f.historial[0]).toMatchObject({ origen: "inspeccion", vigente_desde: "2026-10-31", codigo_inspeccion: "INS-2" });
    expect(Object.keys(f.historial[0].valores).sort()).toEqual(["altura_total_m", "clase_edad", "dap_cm"]);
    expect(f.historial[0].valores.dap_cm).toBe(20);
    expect(f.historial[1]).toMatchObject({ origen: "alta", vigente_desde: "2026-10-26" });
    expect(Object.keys(f.historial[1].valores).sort()).toEqual(["especie_cientifica", "sector"]);
  });

  it("sin especie vigente: origen no determinado y sin persistencia ni tipo de hoja (D-260 a D-262)", async () => {
    (obtenerArbolFicha as jest.Mock).mockResolvedValue({ ...fila, especie_cientifica: null });
    const f = await obtenerFichaArbol(user, P, T, "token");
    expect(f.sobre_la_especie.origen_biogeografico).toEqual({ codigo: "no_determinado", etiqueta: "Origen no determinado" });
    expect(f.sobre_la_especie.persistencia_follaje).toBeNull();
    expect(f.sobre_la_especie.tipo_hoja).toBeNull();
  });

  it.each([
    ["con los dos diámetros (texto de PostgREST)", { diametro_copa_ns_m: "4", diametro_copa_eo_m: "6", copa_no_presenta: null }, Math.PI * 6],
    ["«No presenta copa»: 0 m²", { copa_no_presenta: true }, 0],
    ["con un solo diámetro: null", { diametro_copa_ns_m: 4 }, null],
    ["sin medición: null", {}, null],
  ])("área proyectada de copa del árbol (INDICES fila 13) %s", async (_d, extra, esperado) => {
    (obtenerArbolFicha as jest.Mock).mockResolvedValue({ ...fila, ...extra });
    const f = await obtenerFichaArbol(user, P, T, "token");
    if (esperado === null) expect(f.arbol.area_proyectada_copa_m2).toBeNull();
    else expect(f.arbol.area_proyectada_copa_m2).toBeCloseTo(esperado);
  });

  it("sin evaluación completa válida y vigente: área null aunque haya diámetros, y evaluacion_completa_vigente false", async () => {
    (obtenerArbolFicha as jest.Mock).mockResolvedValue({ ...fila, diametro_copa_ns_m: 4, diametro_copa_eo_m: 6 });
    (arbolesConEvaluacionCompletaVigente as jest.Mock).mockResolvedValue(new Set());
    const f = await obtenerFichaArbol(user, P, T, "token");
    expect(f.evaluacion_completa_vigente).toBe(false);
    expect(f.arbol.area_proyectada_copa_m2).toBeNull();
    expect(arbolesConEvaluacionCompletaVigente).toHaveBeenCalledWith("token", P, [T]);
  });

  describe("estimacion_carbono_aereo_lenoso (CC-069 v1; árboles ficticios, sin Supabase)", () => {
    const JAC = { ...fila, especie_cientifica: "Jacaranda mimosifolia", multifustal: false, dap_cm: "30.00", altura_total_m: "10.00" };

    it("presente, evaluado y con modelo: biomasa, carbono y CO₂e por separado, con el modelo y el método", async () => {
      (obtenerArbolFicha as jest.Mock).mockResolvedValue(JAC);
      (obtenerPresencia as jest.Mock).mockResolvedValue({ estado_presencia: "presente", fecha_cambio_estado_presencia: "2026-10-26" });
      const c = (await obtenerFichaArbol(user, P, T, "token")).estimacion_carbono_aereo_lenoso;
      expect(c.categoria).toBeNull();
      expect(c.valor!.biomasa_aerea_lenosa_kg).toBeCloseTo(234.7122, 4);
      expect(c.valor!.carbono_kg).toBeCloseTo(110.3147, 4);
      expect(c.valor!.co2e_kg).toBeCloseTo(404.4874, 4);
      expect(c.valor!.modelo.id).toBe("UTD-TS7-JAME-DH");
      expect(c.metodo.estado_cc).toMatch(/pendiente de sincronización con el Excel/);
      expect(c.limitaciones.length).toBeGreaterThan(0);
    });

    it("compatibilidad: la ficha solo agrega estimacion_carbono_aereo_lenoso; arbol no cambia", async () => {
      const f = await obtenerFichaArbol(user, P, T, "token");
      expect(Object.keys(f).sort()).toEqual(
        ["arbol", "evaluacion_completa_vigente", "presencia", "sobre_la_especie", "evaluacion_vigente", "ultima_inspeccion_finalizada", "historial", "ordenes_trabajo", "incidencias", "estimacion_carbono_aereo_lenoso"].sort()
      );
      expect(Object.keys(f.arbol)).not.toContain("estimacion_carbono_aereo_lenoso");
    });

    it("talado: fuera del universo (no_presente)", async () => {
      (obtenerArbolFicha as jest.Mock).mockResolvedValue(JAC);
      const c = (await obtenerFichaArbol(user, P, T, "token")).estimacion_carbono_aereo_lenoso;
      expect(c).toEqual(expect.objectContaining({ valor: null, categoria: "fuera_del_universo", motivo: "no_presente" }));
    });

    it("sin evaluación completa vigente: fuera del universo (sin_evaluacion_valida)", async () => {
      (obtenerArbolFicha as jest.Mock).mockResolvedValue(JAC);
      (obtenerPresencia as jest.Mock).mockResolvedValue({ estado_presencia: "presente", fecha_cambio_estado_presencia: "2026-10-26" });
      (arbolesConEvaluacionCompletaVigente as jest.Mock).mockResolvedValue(new Set());
      const c = (await obtenerFichaArbol(user, P, T, "token")).estimacion_carbono_aereo_lenoso;
      expect(c).toEqual(expect.objectContaining({ valor: null, categoria: "fuera_del_universo", motivo: "sin_evaluacion_valida" }));
    });

    it("especie sin modelo aprobado: no estimable (restriccion_modelo, sin_modelo)", async () => {
      // Acer pseudoplatanus tiene modelo desde CC-070; Acer negundo no.
      (obtenerArbolFicha as jest.Mock).mockResolvedValue({ ...fila, especie_cientifica: "Acer negundo" });
      (obtenerPresencia as jest.Mock).mockResolvedValue({ estado_presencia: "presente", fecha_cambio_estado_presencia: "2026-10-26" });
      const c = (await obtenerFichaArbol(user, P, T, "token")).estimacion_carbono_aereo_lenoso;
      expect(c).toEqual(expect.objectContaining({ valor: null, categoria: "restriccion_modelo", motivo: "sin_modelo" }));
    });
  });

  it("árbol de otro proyecto o inexistente: 404", async () => {
    (obtenerArbolFicha as jest.Mock).mockResolvedValue(null);
    await expect(obtenerFichaArbol(user, P, T, "token")).rejects.toMatchObject({ statusCode: 404 });
  });
});
