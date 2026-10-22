import { CATALOGO, entradasVigentesDe, esCodigoVigente } from "../../../../src/services/rules/engine/catalogs";
import { leerExportCsv } from "./testUtils/csvExport";

describe("catálogo severidad vs REGLAS_INDICADORES (columna Categoría parcial)", () => {
  it("las etiquetas vigentes son exactamente las categorías parciales del Excel", () => {
    const filas = leerExportCsv("REGLAS_INDICADORES.csv").slice(1); // sin encabezado
    const etiquetasEnExcel = new Set(
      filas
        .map((f) => f[5]?.trim())
        .filter((e) => e === "Despreciable" || e === "Leve" || e === "Moderada" || e === "Severa"),
    );
    const etiquetasCatalogo = entradasVigentesDe("severidad").map((c) => c.etiqueta);
    expect(new Set(etiquetasCatalogo)).toEqual(etiquetasEnExcel);
  });
});

describe("catálogo probabilidad_falla vs DICCIONARIO_CAMPOS (fila probabilidad_falla_raices_cuello)", () => {
  it("las etiquetas vigentes distintas de no_determinado coinciden con el dominio del Excel", () => {
    const filas = leerExportCsv("DICCIONARIO_CAMPOS.csv").slice(1);
    const fila = filas.find((f) => f[1] === "probabilidad_falla_raices_cuello");
    expect(fila).toBeDefined();
    const dominioExcel = fila![7].split("/").map((s) => s.trim());
    const etiquetasCatalogo = entradasVigentesDe("probabilidad_falla")
      .filter((c) => c.codigo !== "no_determinado")
      .map((c) => c.etiqueta);
    expect(etiquetasCatalogo.sort()).toEqual(dominioExcel.sort());
  });
});

describe("catálogo resultado_cavidad_interna vs DICCIONARIO_CAMPOS (fila cavidad_basal_interna)", () => {
  it("las etiquetas vigentes coinciden con el dominio del Excel", () => {
    const filas = leerExportCsv("DICCIONARIO_CAMPOS.csv").slice(1);
    const fila = filas.find((f) => f[1] === "cavidad_basal_interna");
    expect(fila).toBeDefined();
    const dominioExcel = fila![7].split("/").map((s) => s.trim());
    const etiquetasCatalogo = entradasVigentesDe("resultado_cavidad_interna").map((c) => c.etiqueta);
    expect(etiquetasCatalogo.sort()).toEqual(dominioExcel.sort());
  });
});

describe("catálogo condicion_herida vs DICCIONARIO_CAMPOS (fila condicion_heridas_tronco)", () => {
  it("las etiquetas vigentes coinciden con el dominio del Excel", () => {
    const filas = leerExportCsv("DICCIONARIO_CAMPOS.csv").slice(1);
    const fila = filas.find((f) => f[1] === "condicion_heridas_tronco");
    expect(fila).toBeDefined();
    const dominioExcel = fila![7].split("/").map((s) => s.trim());
    const etiquetasCatalogo = entradasVigentesDe("condicion_herida").map((c) => c.etiqueta);
    expect(etiquetasCatalogo.sort()).toEqual(dominioExcel.sort());
  });
});

describe("catálogo afectacion_grieta vs DICCIONARIO_CAMPOS (fila afectacion_fisura_grieta)", () => {
  it("las etiquetas vigentes coinciden con el dominio del Excel", () => {
    const filas = leerExportCsv("DICCIONARIO_CAMPOS.csv").slice(1);
    const fila = filas.find((f) => f[1] === "afectacion_fisura_grieta");
    expect(fila).toBeDefined();
    const dominioExcel = fila![7].split("/").map((s) => s.trim());
    const etiquetasCatalogo = entradasVigentesDe("afectacion_grieta").map((c) => c.etiqueta);
    expect(etiquetasCatalogo.sort()).toEqual(dominioExcel.sort());
  });
});

describe("catálogo direccion_grieta vs DICCIONARIO_CAMPOS (fila direccion_grieta)", () => {
  it("las etiquetas vigentes coinciden con el dominio del Excel", () => {
    const filas = leerExportCsv("DICCIONARIO_CAMPOS.csv").slice(1);
    const fila = filas.find((f) => f[1] === "direccion_grieta");
    expect(fila).toBeDefined();
    const dominioExcel = fila![7].split("/").map((s) => s.trim());
    const etiquetasCatalogo = entradasVigentesDe("direccion_grieta").map((c) => c.etiqueta);
    expect(etiquetasCatalogo.sort()).toEqual(dominioExcel.sort());
  });
});

describe("catálogo zona_objetivo vs DICCIONARIO_CAMPOS (fila zona_objetivo)", () => {
  it("las etiquetas vigentes coinciden con el dominio del Excel", () => {
    const filas = leerExportCsv("DICCIONARIO_CAMPOS.csv").slice(1);
    const fila = filas.find((f) => f[1] === "zona_objetivo");
    expect(fila).toBeDefined();
    const dominioExcel = fila![7].split("/").map((s) => s.trim());
    const etiquetasCatalogo = entradasVigentesDe("zona_objetivo").map((c) => c.etiqueta);
    expect(etiquetasCatalogo.sort()).toEqual(dominioExcel.sort());
  });
});

describe("catálogo tasa_ocupacion vs DICCIONARIO_CAMPOS (fila tasa_ocupacion_objetivo)", () => {
  it("las etiquetas vigentes coinciden con el dominio del Excel", () => {
    const filas = leerExportCsv("DICCIONARIO_CAMPOS.csv").slice(1);
    const fila = filas.find((f) => f[1] === "tasa_ocupacion_objetivo");
    expect(fila).toBeDefined();
    const dominioExcel = fila![7].split("/").map((s) => s.trim());
    const etiquetasCatalogo = entradasVigentesDe("tasa_ocupacion").map((c) => c.etiqueta);
    expect(etiquetasCatalogo.sort()).toEqual(dominioExcel.sort());
  });
});

describe("catálogo probabilidad_impacto vs DICCIONARIO_CAMPOS (fila probabilidad_impacto)", () => {
  it("las etiquetas vigentes coinciden con el dominio del Excel", () => {
    const filas = leerExportCsv("DICCIONARIO_CAMPOS.csv").slice(1);
    const fila = filas.find((f) => f[1] === "probabilidad_impacto");
    expect(fila).toBeDefined();
    const dominioExcel = fila![7].split("/").map((s) => s.trim());
    const etiquetasCatalogo = entradasVigentesDe("probabilidad_impacto").map((c) => c.etiqueta);
    expect(etiquetasCatalogo.sort()).toEqual(dominioExcel.sort());
  });
});

describe("catálogo consecuencia vs DICCIONARIO_CAMPOS (fila consecuencia_raices_cuello)", () => {
  it("las etiquetas vigentes coinciden con el dominio del Excel", () => {
    const filas = leerExportCsv("DICCIONARIO_CAMPOS.csv").slice(1);
    const fila = filas.find((f) => f[1] === "consecuencia_raices_cuello");
    expect(fila).toBeDefined();
    const dominioExcel = fila![7].split("/").map((s) => s.trim());
    const etiquetasCatalogo = entradasVigentesDe("consecuencia").map((c) => c.etiqueta);
    expect(etiquetasCatalogo.sort()).toEqual(dominioExcel.sort());
  });
});

describe("catálogo clasificacion_riesgo vs DICCIONARIO_CAMPOS (fila clasificacion_raices_cuello)", () => {
  it("las etiquetas vigentes distintas de no_determinado coinciden con el dominio del Excel", () => {
    const filas = leerExportCsv("DICCIONARIO_CAMPOS.csv").slice(1);
    const fila = filas.find((f) => f[1] === "clasificacion_raices_cuello");
    expect(fila).toBeDefined();
    const dominioExcel = fila![7].split("/").map((s) => s.trim());
    const etiquetasCatalogo = entradasVigentesDe("clasificacion_riesgo")
      .filter((c) => c.codigo !== "no_determinado")
      .map((c) => c.etiqueta);
    expect(etiquetasCatalogo.sort()).toEqual(dominioExcel.sort());
  });
});

describe("esCodigoVigente", () => {
  it("true para un código vigente conocido", () => {
    expect(esCodigoVigente("resultado_cavidad_interna", "si")).toBe(true);
  });
  it("false para un código que no existe en ese catálogo", () => {
    expect(esCodigoVigente("resultado_cavidad_interna", "tal_vez")).toBe(false);
  });
  it("false para un código que existe, pero en otro catálogo", () => {
    expect(esCodigoVigente("resultado_cavidad_interna", "abierta")).toBe(false);
  });
});

describe("integridad del registro", () => {
  it("todos los códigos son snake_case ASCII, únicos dentro de su catálogo (PR-021)", () => {
    const vistos = new Set<string>();
    for (const entrada of CATALOGO) {
      expect(entrada.codigo).toMatch(/^[a-z0-9_]+$/);
      const clave = `${entrada.catalogo}:${entrada.codigo}`;
      expect(vistos.has(clave)).toBe(false);
      vistos.add(clave);
    }
  });
});
