import { ArbolCarbono } from "../../../../src/services/rules/carbono/calculo";
import { agregarCarbonoIntegrado, calcularCarbonoIntegradoArbol, MODELOS_BIOMASA } from "../../../../src/services/rules/carbono/carbonoIntegrado";

const FECHA = "2026-11-22T00:00:00.000Z";
const arbol = (p: Partial<ArbolCarbono>): ArbolCarbono => ({
  id: Math.random().toString(36).slice(2),
  presente: true,
  evaluacion_completa_vigente: true,
  especie_cientifica: null,
  tipo_hoja: "latifoliada",
  multifustal: false,
  dap_cm: 30,
  altura_total_m: 10,
  ...p,
});

describe("Carbono integrado por árbol (propuesta experimental, 2026-11-22)", () => {
  it("Acer negundo: total con Zhang et al. 2026, W = 0,499(D²H)^0,774 y C = W × 0,5, sin agregar raíces", () => {
    const r = calcularCarbonoIntegradoArbol(arbol({ especie_cientifica: "Acer negundo", dap_cm: 30, altura_total_m: 10 }), FECHA);
    const w = 0.499 * (30 * 30 * 10) ** 0.774;
    expect(r.total!.modelo.id).toBe("ZHANG26-ACNE-DDH");
    expect(r.total!.componente).toBe("total");
    expect(r.total!.biomasa_kg).toBeCloseTo(w, 8);
    expect(r.total!.carbono_kg).toBeCloseTo(w * 0.5, 8);
    expect(r.total!.co2e_kg).toBeCloseTo(w * 0.5 * (44 / 12), 8);
    // El aéreo sale de otro modelo (leñoso) y nunca se suma con el total.
    expect(r.aereo!.componente).toBe("aerea_lenosa");
    expect(r.estado).toBe("exploratorio");
  });

  it("Ulmus minor: Liu y Li (género) se informa como comparación; total con Ulmus pumila de Zhang 2026", () => {
    const r = calcularCarbonoIntegradoArbol(arbol({ especie_cientifica: "Ulmus minor", dap_cm: 30, altura_total_m: 12 }), FECHA);
    const b = 0.044 * 30 ** 2.87 + 0.0075 * 30 ** 2.67 + 0.0029 * 30 ** 2.5;
    expect(r.comparacion.map((c) => c.modelo.id)).toEqual(["LIULI12-ULMUS-D-ULMI"]);
    expect(r.comparacion[0].carbono_kg).toBeCloseTo(b * 0.5, 8);
    expect(r.comparacion[0].componente).toBe("aerea_total");
    expect(r.total!.modelo.id).toBe("ZHANG26-ULPU-DDH-ULMI");
    expect(r.total!.biomasa_kg).toBeCloseTo(0.101 * (30 * 30 * 12) ** 0.935, 8);
  });

  it("Quillaja saponaria: carbono directo de Cruz et al. 2015 sin volver a multiplicar por la fracción de carbono", () => {
    const r = calcularCarbonoIntegradoArbol(arbol({ especie_cientifica: "Quillaja saponaria", dap_cm: 20 }), FECHA);
    expect(r.aereo!.carbono_kg).toBeCloseTo(0.0736 * 20 ** 2.251, 8);
    expect(r.aereo!.modelo.fraccion_carbono).toBeNull();
    expect(r.aereo!.componente).toBe("aerea_total");
    expect(r.total).toBeNull();
  });

  it("Acer negundo sin altura: no hay total (la ecuación necesita H)", () => {
    const r = calcularCarbonoIntegradoArbol(arbol({ especie_cientifica: "Acer negundo", altura_total_m: null }), FECHA);
    expect(r.total).toBeNull();
  });

  it("palmeras, especies sin densidad y árboles sin especie quedan no estimables con su motivo", () => {
    expect(calcularCarbonoIntegradoArbol(arbol({ especie_cientifica: "Phoenix canariensis", tipo_hoja: "palmera" }), FECHA)).toMatchObject({ estado: "no_estimable", motivo: expect.stringMatching(/Prestoea/) });
    expect(calcularCarbonoIntegradoArbol(arbol({ especie_cientifica: "Araucaria heterophylla" }), FECHA).motivo).toMatch(/densidad/);
    expect(calcularCarbonoIntegradoArbol(arbol({ especie_cientifica: null }), FECHA).motivo).toMatch(/no identificada/);
    expect(calcularCarbonoIntegradoArbol(arbol({ especie_cientifica: "Acer negundo", evaluacion_completa_vigente: false }), FECHA).estado).toBe("no_estimable");
  });

  it("multifustal: los modelos de biomasa no lo estiman (la fuente no demuestra el DAP equivalente)", () => {
    const r = calcularCarbonoIntegradoArbol(arbol({ especie_cientifica: "Acer negundo", multifustal: true, dap_fustes_cm: [20, 20], dap_cm: Math.sqrt(800) }), FECHA);
    expect(r.total).toBeNull();
  });

  it("resumen: aprobados y exploratorios separados; aéreo y total no se mezclan", () => {
    const res = agregarCarbonoIntegrado(
      [
        arbol({ especie_cientifica: "Jacaranda mimosifolia", dap_cm: 30, altura_total_m: 10 }),
        arbol({ especie_cientifica: "Acer negundo", dap_cm: 30, altura_total_m: 10 }),
        arbol({ especie_cientifica: "Phoenix canariensis", tipo_hoja: "palmera" }),
      ],
      FECHA
    );
    expect(res.aprobados).toBe(1);
    expect(res.exploratorios).toBe(1);
    expect(res.no_estimables).toBe(1);
    expect(res.aereo.carbono_kg).toBeCloseTo(res.aereo.carbono_kg_aprobado + res.aereo.carbono_kg_exploratorio, 8);
    expect(res.total.arboles).toBe(1);
    expect(res.arboles.every((f) => f.fecha_calculo === FECHA)).toBe(true);
  });

  it("todos los modelos de biomasa son exploratorios y declaran fuente con DOI", () => {
    for (const m of MODELOS_BIOMASA) {
      expect(m.estado).toBe("exploratorio");
      expect(m.doi).toMatch(/^https:\/\/doi\.org\//);
    }
  });
});

describe("Carbono directo por vástago (Cruz et al. 2015)", () => {
  it("quillay multifustal: suma del modelo aplicado a cada vástago", () => {
    const r = calcularCarbonoIntegradoArbol(
      arbol({ especie_cientifica: "Quillaja saponaria", multifustal: true, dap_fustes_cm: [21, 11.6, 8.9], dap_cm: 25.59 }),
      FECHA
    );
    const esperado = [21, 11.6, 8.9].reduce((s, d) => s + 0.0736 * d ** 2.251, 0);
    expect(r.aereo!.modelo.id).toBe("CRUZ15-C6-QUSA-D-VASTAGOS");
    expect(r.aereo!.carbono_kg).toBeCloseTo(esperado, 8);
  });

  it("un vástago fuera del rango (5-41 cm) deja el árbol sin carbono aéreo", () => {
    const r = calcularCarbonoIntegradoArbol(arbol({ especie_cientifica: "Quillaja saponaria", multifustal: true, dap_fustes_cm: [3, 10], dap_cm: 10.44 }), FECHA);
    expect(r.aereo).toBeNull();
  });
});

describe("Belloto del norte con la densidad del género (Valej, 2026-11-22)", () => {
  it("se estima con UGEB y 570 kg/m³ del género, como exploratorio", () => {
    const r = calcularCarbonoIntegradoArbol(arbol({ especie_cientifica: "Beilschmiedia miersii", dap_cm: 56.1, altura_total_m: 23.6 }), FECHA);
    const v = 0.0001967 * 56.1 ** 1.951853 * 23.6 ** 0.664255;
    expect(r.aereo!.modelo.id).toBe("UTD-T9-UGEB-DH-BEMI");
    expect(r.aereo!.carbono_kg).toBeCloseTo(v * 570 * 0.47, 6);
    expect(r.estado).toBe("exploratorio");
  });
});
