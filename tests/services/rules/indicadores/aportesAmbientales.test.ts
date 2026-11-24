import { areaUnionCopas, coberturaArborea, resumenAportesAmbientales } from "../../../../src/services/rules/indicadores/aportesAmbientales";

const elipse = (ns: number, eo: number) => Math.PI * (ns / 2) * (eo / 2);

describe("areaUnionCopas (propuesta experimental)", () => {
  it("una copa: el área de la elipse, con error < 1 %", () => {
    const a = areaUnionCopas([{ x: 255000, y: 6340000, ns: 6, eo: 4 }]);
    expect(Math.abs(a - elipse(6, 4)) / elipse(6, 4)).toBeLessThan(0.01);
  });

  it("dos copas idénticas en el mismo lugar cuentan una vez", () => {
    const c = { x: 255000, y: 6340000, ns: 5, eo: 5 };
    expect(areaUnionCopas([c, c])).toBeCloseTo(areaUnionCopas([c]), 6);
  });

  it("copas separadas suman sus áreas", () => {
    const a = areaUnionCopas([
      { x: 255000, y: 6340000, ns: 4, eo: 4 },
      { x: 255020, y: 6340000, ns: 4, eo: 4 },
    ]);
    expect(Math.abs(a - 2 * elipse(4, 4)) / (2 * elipse(4, 4))).toBeLessThan(0.01);
  });

  it("copas superpuestas: menos que la suma y más que la mayor", () => {
    const a = areaUnionCopas([
      { x: 255000, y: 6340000, ns: 6, eo: 6 },
      { x: 255003, y: 6340000, ns: 6, eo: 6 },
    ]);
    expect(a).toBeLessThan(2 * elipse(6, 6));
    expect(a).toBeGreaterThan(elipse(6, 6));
  });
});

describe("coberturaArborea (propuesta experimental)", () => {
  const arbol = (id: string, x: number | null, ns: number | null, eo: number | null, noPresenta = false) => ({
    id,
    utm_este: x,
    utm_norte: x === null ? null : 6340000,
    diametro_copa_ns_m: ns,
    diametro_copa_eo_m: eo,
    copa_no_presenta: noPresenta,
  });

  it("calcula el porcentaje con la unión y cuenta aparte lo que no entra", () => {
    const r = coberturaArborea(
      [arbol("a", 255000, 6, 6), arbol("b", 255003, 6, 6), arbol("c", null, 4, 4), arbol("d", 255050, null, null), arbol("e", 255060, null, null, true)],
      10000,
      false
    );
    expect(r.n_con_copa_ubicada).toBe(2);
    expect(r.n_sin_ubicacion).toBe(1);
    expect(r.n_sin_medicion).toBe(1);
    expect(r.n_no_presenta_copa).toBe(1);
    expect(r.superposicion_m2!).toBeGreaterThan(0);
    expect(r.valor).toBeCloseTo((r.area_cubierta_m2! / 10000) * 100, 10);
  });

  it("no se calcula por barrio ni sin superficie", () => {
    expect(coberturaArborea([arbol("a", 255000, 6, 6)], 10000, true).valor).toBeNull();
    expect(coberturaArborea([arbol("a", 255000, 6, 6)], null, false).motivo).toMatch(/superficie/);
  });
});

describe("resumenAportesAmbientales (propuesta experimental)", () => {
  const cobertura = coberturaArborea(
    [{ id: "a", utm_este: 255000, utm_norte: 6340000, diametro_copa_ns_m: 6, diametro_copa_eo_m: 6, copa_no_presenta: false }],
    10000,
    false
  );
  const r = resumenAportesAmbientales({
    presentes: [
      { especie: true, dap: true, altura: true, condicion: true },
      { especie: false, dap: false, altura: false, condicion: false },
    ],
    cobertura,
    carbono: { aprobados: 3, exploratorios: 10, no_estimables: 2, carbono_kg_aprobado: 141, carbono_kg_exploratorio: 900 },
    secuestro: { fundamentadas: 0, simulaciones: 40, no_estimables: 9 },
  });
  const estado = (codigo: string) => r.aportes.find((a) => a.codigo === codigo)!.estado;

  it("trae los cinco aportes del marco", () => {
    expect(r.aportes.map((a) => a.codigo)).toEqual([
      "cobertura_arborea",
      "carbono_almacenado",
      "secuestro_carbono",
      "remocion_contaminantes",
      "interceptacion_precipitaciones",
    ]);
  });

  it("no inventa: contaminantes e interceptación quedan no estimables con lo que falta", () => {
    expect(estado("remocion_contaminantes")).toBe("no_estimable");
    expect(estado("interceptacion_precipitaciones")).toBe("no_estimable");
    expect(r.aportes.find((a) => a.codigo === "remocion_contaminantes")!.falta.join(" ")).toMatch(/área foliar/);
  });

  it("clasifica carbono y secuestro según los resultados recibidos", () => {
    expect(estado("cobertura_arborea")).toBe("calculado");
    expect(estado("carbono_almacenado")).toBe("calculado");
    expect(estado("secuestro_carbono")).toBe("calculado");
  });

  it("cuenta las variables básicas y pide medir los árboles que no las tienen", () => {
    expect(r.variables_basicas).toMatchObject({ arboles_presentes: 2, con_las_cuatro: 1 });
    expect(r.aportes[0].falta[0]).toMatch(/Medir 1 de 2/);
  });
});
