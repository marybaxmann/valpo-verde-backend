/**
 * Indicadores descriptivos (propuesta experimental, 2026-11-21): solo datos
 * medidos y vigentes; los faltantes se excluyen y se cuentan. Árboles ficticios.
 */
import { ArbolDescriptivo, descriptivosArbol, diagnosticoDescriptivo, distribucion, estadistica, porValor } from "../../../../src/services/rules/indicadores/descriptivos";

const arbol = (id: string, p: Partial<ArbolDescriptivo> = {}): ArbolDescriptivo => ({
  id,
  tree_code: id,
  sector: "Barrio El Almendral",
  presente: true,
  evaluacion_completa_vigente: true,
  especie_cientifica: "Ulmus minor",
  especie_en_catalogo: true,
  genero: "Ulmus",
  familia: "Ulmaceae",
  origen_biogeografico: "introducida",
  multifustal: false,
  dap_fustes_cm: null,
  dap_cm: 40,
  altura_total_m: 10,
  diametro_copa_m: 6,
  altura_primera_rama_m: 2.5,
  altura_base_copa_viva_m: 3,
  clase_edad: { codigo: "maduro", etiqueta: "Maduro" },
  cle: 4,
  muerte_regresiva_pct: 0,
  defoliacion_pct: 10,
  clorosis_pct: 0,
  necrosis_pct: 0,
  copa_faltante_pct: 0,
  vitalidad: { codigo: "0_exploracion", etiqueta: "0 Exploración" },
  ...p,
});

describe("funciones estadísticas", () => {
  it("estadística: media, mediana (par e impar), mínimo y máximo, ignorando faltantes", () => {
    expect(estadistica([3, null, 1, 2])).toEqual({ n: 3, media: 2, mediana: 2, minimo: 1, maximo: 3 });
    expect(estadistica([1, 2, 3, 10]).mediana).toBe(2.5);
    expect(estadistica([null, undefined])).toEqual({ n: 0, media: null, mediana: null, minimo: null, maximo: null });
  });
  it("distribución en clases [desde, hasta) con la última abierta", () => {
    expect(distribucion([0, 4.9, 5, 12, 25, null], [0, 5, 10, 15, 20], "m").map((c) => c.n)).toEqual([2, 1, 1, 0, 1]);
  });
  it("conteo por valor registrado", () => {
    expect(porValor([4, 5, 4, null])).toEqual({ n: 3, mediana: 4, valores: [{ valor: 4, n: 2 }, { valor: 5, n: 1 }] });
  });
});

describe("descriptivos de un árbol", () => {
  it("longitud y proporción de copa viva, relación copa/altura y número de fustes", () => {
    const d = descriptivosArbol(arbol("a"));
    expect(d.longitud_copa_viva_m).toBe(7);
    expect(d.proporcion_copa_viva_pct).toBeCloseTo(70, 10);
    expect(d.relacion_copa_altura).toBeCloseTo(0.6, 10);
    expect(d.numero_fustes).toBe(1);
    expect(descriptivosArbol(arbol("m", { multifustal: true, dap_fustes_cm: [10, 12, 8] })).numero_fustes).toBe(3);
  });
  it("sin datos o con base de copa viva sobre la altura total: null, sin rellenar", () => {
    expect(descriptivosArbol(arbol("a", { altura_base_copa_viva_m: null })).proporcion_copa_viva_pct).toBeNull();
    expect(descriptivosArbol(arbol("a", { altura_base_copa_viva_m: 12 })).longitud_copa_viva_m).toBeNull();
    expect(descriptivosArbol(arbol("a", { altura_total_m: null })).relacion_copa_altura).toBeNull();
  });
});

describe("diagnóstico descriptivo del ámbito", () => {
  const arboles = [
    arbol("a1", { altura_total_m: 4, dap_cm: 10, cle: 3 }),
    arbol("a2", { altura_total_m: 12, dap_cm: 50, muerte_regresiva_pct: 10 }),
    arbol("a3", { multifustal: true, dap_fustes_cm: [10, 12], dap_cm: 15.62, altura_base_copa_viva_m: 20 }),
    arbol("a4", { evaluacion_completa_vigente: false, dap_cm: null, altura_total_m: null, especie_cientifica: "Quillaja saponaria", genero: null, familia: null, origen_biogeografico: null, especie_en_catalogo: false }),
    arbol("a5", { presente: false }),
  ];
  const d = diagnosticoDescriptivo(arboles, { a2: "medición a verificar" });

  it("universos: dimensiones con evaluados vigentes; composición con presentes", () => {
    expect(d.universo).toEqual({ presentes: 4, con_evaluacion_vigente: 3 });
    expect(d.dimensiones.altura_m.n).toBe(3);
    expect(d.dimensiones.altura_m.clases.map((c) => c.n)).toEqual([1, 0, 2, 0, 0]);
    expect(d.dimensiones.dap_cm.multifustales_con_dap_equivalente).toBe(1);
    expect(d.composicion.genero.denominador).toBe(4);
    expect(d.composicion.genero.sin_dato).toBe(1);
    expect(d.composicion.genero.grupos[0]).toEqual({ nombre: "Ulmus", arboles: 3, porcentaje: 75 });
  });

  it("condición de copa: conteo por valor registrado, sin índice", () => {
    expect(d.condicion_copa.cle.valores).toEqual([{ valor: 3, n: 1 }, { valor: 4, n: 2 }]);
    expect(d.condicion_copa.vitalidad.categorias[0]).toEqual({ codigo: "0_exploracion", etiqueta: "0 Exploración", n: 3 });
  });

  it("completitud y calidad: faltantes, inconsistencias, catálogo y mediciones en revisión", () => {
    expect(d.completitud.presentes_sin_evaluacion_vigente).toBe(1);
    expect(d.completitud.base_copa_viva_mayor_que_altura).toBe(1);
    expect(d.completitud.presentes_especie_sin_rasgos).toBe(1);
    expect(d.completitud.especies_sin_origen_en_catalogo).toEqual(["Quillaja saponaria"]);
    expect(d.completitud.mediciones_en_revision).toEqual([{ tree_code: "a2", motivo: "medición a verificar" }]);
  });

  it("territorio: un solo sector no es comparable", () => {
    expect(d.territorio.comparable).toBe(false);
    expect(d.territorio.sectores[0]).toEqual(expect.objectContaining({ sector: "Barrio El Almendral", presentes: 4, con_evaluacion_vigente: 3 }));
  });
});
