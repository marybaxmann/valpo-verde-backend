import {
  ArbolEspecie,
  abundanciaRelativa,
  claveEspecie,
  coberturaTaxonomica,
  diversidadShannon,
  diversidadTaxonomica102030,
  proporcionOrigen,
  riquezaEspecies,
} from "../../../../src/services/rules/indicadores/especies";

let n = 0;
const a = (especie: string | null, p: Partial<ArbolEspecie> = {}): ArbolEspecie => ({
  id: `t${n++}`,
  especie_cientifica: especie,
  genero: null,
  familia: null,
  origen_biogeografico: "no_determinado",
  ...p,
});

describe("claveEspecie — identificación a nivel de especie (Valej, 2026-11-01)", () => {
  it.each([
    ["Acer negundo", "acer negundo"],
    ["  acer   NEGUNDO ", "acer negundo"],
    ["Platanus x hispanica", "platanus × hispanica"],
    ["Platanus × hispanica", "platanus × hispanica"],
    ["Platanus ×hispanica", "platanus × hispanica"],
    ["× Cupressocyparis leylandii", "× cupressocyparis leylandii"],
    ["Acer palmatum var. atropurpureum", "acer palmatum"],
    ["Acer platanoides 'Crimson King'", "acer platanoides"],
    ["Prunus cerasifera subsp. pissardii", "prunus cerasifera"],
  ])("%s → %s", (nombre, clave) => {
    expect(claveEspecie(nombre)).toBe(clave);
  });

  it.each([["Quercus sp."], ["Quercus spp."], ["Quercus sp"], ["Quercus"], ["Acer 'Crimson'"], [""], [null], ["Quercus cf."]])(
    "%s no está determinado a nivel de especie",
    (nombre) => {
      expect(claveEspecie(nombre as string | null)).toBeNull();
    }
  );
});

describe("B19 bloque 2 — indicadores de especies (hoja INDICES, filas 5 a 10)", () => {
  const arboles = [
    a("Acer negundo"),
    a("Acer negundo"),
    a("acer  negundo"),
    a("Acer pseudoplatanus"),
    a("Quercus sp."),
  ];

  it("fila 5: riqueza = especies distintas entre los identificados", () => {
    expect(riquezaEspecies(arboles)).toEqual({ valor: 2, unidad: "especies", n_identificados: 4, n_no_identificados: 1 });
  });

  it("fila 6: abundancia sobre todos los presentes; no identificados aparte; suma 100 %", () => {
    const r = abundanciaRelativa(arboles);
    expect(r.denominador).toBe(5);
    expect(r.especies[0]).toEqual({ especie: "Acer negundo", arboles: 3, porcentaje: 60 });
    expect(r.no_identificados).toEqual({ arboles: 1, porcentaje: 20 });
    expect(r.especies.reduce((s, e) => s + (e.porcentaje ?? 0), 0) + (r.no_identificados.porcentaje ?? 0)).toBeCloseTo(100);
  });

  it("fila 7: Shannon con ln y p_i sobre identificados", () => {
    const r = diversidadShannon(arboles);
    const esperado = -(0.75 * Math.log(0.75) + 0.25 * Math.log(0.25));
    expect(r.valor).toBeCloseTo(esperado);
    expect(r).toEqual(expect.objectContaining({ riqueza: 2, n_identificados: 4, cobertura_identificacion: 80 }));
  });

  it("fila 7: una sola especie da 0; sin identificados, null", () => {
    expect(diversidadShannon([a("Acer negundo"), a("Acer negundo")]).valor).toBe(0);
    expect(diversidadShannon([a("Quercus sp.")]).valor).toBeNull();
  });

  it("fila 8: 10-20-30 por especie, género y familia; sin catálogo, «sin dato» y cumple null", () => {
    const r = diversidadTaxonomica102030([
      ...Array.from({ length: 9 }, () => a("Acer negundo", { genero: "Acer", familia: "Sapindaceae" })),
      a("Lagerstroemia indica"),
    ]);
    expect(r.especie.taxones[0]).toEqual({ taxon: "Acer negundo", arboles: 9, porcentaje: 90, supera_umbral: true });
    expect(r.especie.cumple).toBe(false);
    expect(r.genero.taxones[0].supera_umbral).toBe(true);
    expect(r.genero.sin_dato).toEqual({ arboles: 1, porcentaje: 10 });
    const sinCatalogo = diversidadTaxonomica102030([a("Acer negundo")]);
    expect(sinCatalogo.familia.cumple).toBeNull();
    expect(sinCatalogo.familia.sin_dato.arboles).toBe(1);
  });

  it("filas 9 y 10: nativas + endémicas e introducidas sobre todos los presentes", () => {
    const r = proporcionOrigen([
      a("A b", { origen_biogeografico: "nativa" }),
      a("A c", { origen_biogeografico: "endemica" }),
      a("A d", { origen_biogeografico: "introducida" }),
      a("A e"),
    ]);
    expect(r.nativos).toEqual({ arboles: 2, porcentaje: 50 });
    expect(r.introducidos).toEqual({ arboles: 1, porcentaje: 25 });
    expect(r.origen_no_determinado).toEqual({ arboles: 1, porcentaje: 25 });
  });

  it("filas 9 y 10: sin ningún origen en el catálogo, porcentajes null (no 0 %)", () => {
    const r = proporcionOrigen([a("Acer negundo"), a("Acer negundo")]);
    expect(r.nativos).toEqual({ arboles: 0, porcentaje: null });
    expect(r.introducidos.porcentaje).toBeNull();
    expect(r.origen_no_determinado.arboles).toBe(2);
  });

  it("cobertura taxonómica: provisionales sin dato (null, no 0)", () => {
    const c = coberturaTaxonomica(arboles);
    expect(c).toEqual(expect.objectContaining({ presentes: 5, identificados_especie: 4, porcentaje_identificados: 80, identificaciones_provisionales: null }));
  });
});
