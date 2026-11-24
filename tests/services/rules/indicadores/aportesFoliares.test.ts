import {
  agregarAportesFoliares,
  areaFoliarArbol,
  areaFoliarCopaAbierta,
  ArbolFoliar,
  intercepcionArbol,
  remocionArbol,
} from "../../../../src/services/rules/indicadores/aportesFoliares";

const nowak = (h: number, d: number, s: number) => Math.exp(-4.3309 + 0.2942 * h + 0.7312 * d + 5.7217 * s - 0.0148 * ((Math.PI * d * (h + d)) / 2));

const arbol = (cambios: Partial<ArbolFoliar> = {}): ArbolFoliar => ({
  id: "a",
  tree_code: "A-1",
  especie_cientifica: "Acer negundo",
  tipo_hoja: "latifoliada",
  persistencia_follaje: "perennifolia",
  genero: "Acer",
  altura_total_m: 7,
  altura_base_copa_viva_m: 2,
  altura_primera_rama_m: 2,
  diametro_copa_ns_m: 6,
  diametro_copa_eo_m: 6,
  copa_no_presenta: false,
  muerte_regresiva_pct: 0,
  ...cambios,
});

describe("área foliar (Nowak 1996, propuesta experimental)", () => {
  it("dentro del rango aplica la ecuación tal cual", () => {
    expect(areaFoliarCopaAbierta(5, 6, 0.83).area_foliar_m2).toBeCloseTo(nowak(5, 6, 0.83), 10);
  });

  it("H/D > 2: ecuación con H/D = 2 × (H/D)/2 (Nowak 2024)", () => {
    const r = areaFoliarCopaAbierta(9, 3, 0.83);
    expect(r.area_foliar_m2).toBeCloseTo(nowak(6, 3, 0.83) * (3 / 2), 8);
    expect(r.ajustes[0]).toMatch(/H\/D = 2/);
  });

  it("H/D < 0,5: ecuación con H/D = 0,5 × 0,5/(H/D) (Nowak 2024)", () => {
    const r = areaFoliarCopaAbierta(2, 8, 0.83);
    expect(r.area_foliar_m2).toBeCloseTo(nowak(2, 4, 0.83) * (0.5 / 0.25), 8);
  });

  it("copa mayor que el rango: LAI del árbol máximo sobre el área de copa", () => {
    const r = areaFoliarCopaAbierta(10, 16, 0.83);
    const f = Math.min(12 / 10, 14 / 16);
    const lai = nowak(10 * f, 16 * f, 0.83) / ((Math.PI * (16 * f) ** 2) / 4);
    expect(r.area_foliar_m2).toBeCloseTo(lai * ((Math.PI * 16 * 16) / 4), 6);
  });

  it("descuenta la copa faltante (o la muerte regresiva sin ese dato) y usa 0,91 en coníferas que no son pinos", () => {
    const sano = areaFoliarArbol(arbol()).area_foliar_m2!;
    expect(areaFoliarArbol(arbol({ muerte_regresiva_pct: 25 })).area_foliar_m2!).toBeCloseTo(sano * 0.75, 8);
    expect(areaFoliarArbol(arbol({ muerte_regresiva_pct: 25, copa_faltante_pct: 10 })).area_foliar_m2!).toBeCloseTo(sano * 0.9, 8);
    expect(areaFoliarArbol(arbol({ tipo_hoja: "acicular", genero: "Araucaria" })).factor_sombra).toBe(0.91);
    expect(areaFoliarArbol(arbol({ tipo_hoja: "acicular", genero: "Pinus" })).factor_sombra).toBe(0.83);
  });

  it("no inventa: palmeras, sin copa y sin base de copa quedan sin área foliar", () => {
    expect(areaFoliarArbol(arbol({ tipo_hoja: "palmera" })).motivo).toBe("palmera");
    expect(areaFoliarArbol(arbol({ copa_no_presenta: true })).motivo).toBe("sin_copa");
    expect(areaFoliarArbol(arbol({ altura_base_copa_viva_m: null, altura_primera_rama_m: null })).motivo).toBe("falta_altura_copa");
    expect(areaFoliarArbol(arbol({ altura_base_copa_viva_m: 8 })).motivo).toBe("copa_invalida");
  });
});

describe("remoción e interceptación (serie horaria 2025, propuesta experimental)", () => {
  it("crecen con el índice foliar y la caducifolia remueve menos", () => {
    const a = remocionArbol(2, 30, false);
    const b = remocionArbol(4, 30, false);
    expect(b.o3).toBeGreaterThan(a.o3);
    expect(b.pm10).toBeCloseTo(a.pm10 * 2, 6);
    expect(remocionArbol(4, 30, true).o3).toBeLessThan(b.o3);
  });

  it("la interceptación es positiva y menor que la lluvia sobre la copa", () => {
    const i = intercepcionArbol(4, 30, false);
    expect(i.intercepcion_m3).toBeGreaterThan(0);
    expect(i.intercepcion_m3).toBeLessThan(i.lluvia_sobre_copa_m3);
  });

  it("el agregado cuenta los árboles sin área foliar con su motivo", () => {
    const r = agregarAportesFoliares([arbol(), arbol({ id: "b", tipo_hoja: "palmera" })]);
    expect(r.cobertura).toMatchObject({ arboles: 2, con_area_foliar: 1, motivos: { palmera: 1 } });
    expect(r.remocion_contaminantes.total_kg!).toBeGreaterThan(0);
    expect(r.intercepcion_precipitaciones.porcentaje_interceptado!).toBeGreaterThan(0);
  });
});

describe("LAI acotado (supuesto exploratorio)", () => {
  it("una copa muy alta y angosta no supera LAI 18 y queda marcada", () => {
    const r = areaFoliarArbol(arbol({ altura_total_m: 26.3, altura_base_copa_viva_m: 3.8, diametro_copa_ns_m: 9.2, diametro_copa_eo_m: 3.9 }));
    expect(r.lai).toBeCloseTo(18, 8);
    expect(r.ajustes.some((x) => x.startsWith("LAI acotado"))).toBe(true);
    expect(agregarAportesFoliares([{ ...arbol({ altura_total_m: 26.3, altura_base_copa_viva_m: 3.8, diametro_copa_ns_m: 9.2, diametro_copa_eo_m: 3.9 }) }]).cobertura.lai_acotado).toEqual(["A-1"]);
  });
});
