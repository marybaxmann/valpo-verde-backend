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

describe("catálogo probabilidad_falla_impacto vs las celdas de M02 en MATRICES_CALCULO", () => {
  it("las etiquetas vigentes coinciden con los valores únicos de las 16 celdas de M02", () => {
    const filas = leerExportCsv("MATRICES_CALCULO.csv");
    // M02 ocupa las columnas 7–10 (Muy baja/Baja/Media/Alta) de las filas
    // 5–8 (índices 4–7): Inminente, Probable, Posible, Improbable.
    const celdasM02 = filas.slice(4, 8).flatMap((f) => [f[7], f[8], f[9], f[10]].map((c) => c.trim()));
    const etiquetasEnExcel = new Set(celdasM02);
    const etiquetasCatalogo = entradasVigentesDe("probabilidad_falla_impacto").map((c) => c.etiqueta);
    expect(new Set(etiquetasCatalogo)).toEqual(etiquetasEnExcel);
  });
});

describe("catálogo si_no_no_determinado vs DICCIONARIO_CAMPOS (fila red_subterranea_presente)", () => {
  it("las etiquetas vigentes coinciden con el dominio del Excel", () => {
    const filas = leerExportCsv("DICCIONARIO_CAMPOS.csv").slice(1);
    const fila = filas.find((f) => f[1] === "red_subterranea_presente");
    expect(fila).toBeDefined();
    const dominioExcel = fila![7].split("/").map((s) => s.trim());
    const etiquetasCatalogo = entradasVigentesDe("si_no_no_determinado").map((c) => c.etiqueta);
    expect(etiquetasCatalogo.sort()).toEqual(dominioExcel.sort());
  });
});

describe("catálogo categoria_infraestructura vs la columna Categoría parcial de las reglas IN-* en REGLAS_INDICADORES", () => {
  it("las etiquetas vigentes son exactamente las categorías parciales usadas por las reglas IN-*", () => {
    const filas = leerExportCsv("REGLAS_INDICADORES.csv").slice(1);
    // IN-ALC-04 ("la categoría más severa...") e IN-CAL-06 ("Mínimo
    // Moderada...") describen una regla de combinación, no asignan una
    // categoría propia — se excluyen de la comparación por su ID.
    const etiquetasEnExcel = new Set(
      filas
        .filter((f) => f[0]?.startsWith("IN-") && f[0] !== "IN-ALC-04" && f[0] !== "IN-CAL-06")
        .map((f) => f[5]?.trim()),
    );
    const etiquetasCatalogo = entradasVigentesDe("categoria_infraestructura").map((c) => c.etiqueta);
    expect(new Set(etiquetasCatalogo)).toEqual(etiquetasEnExcel);
  });
});

describe("catálogo clasificacion_infraestructura vs DICCIONARIO_CAMPOS (fila clasificacion_infraestructura)", () => {
  it("las etiquetas vigentes coinciden con el dominio del Excel", () => {
    const filas = leerExportCsv("DICCIONARIO_CAMPOS.csv").slice(1);
    const fila = filas.find((f) => f[1] === "clasificacion_infraestructura");
    expect(fila).toBeDefined();
    const dominioExcel = fila![7].split("/").map((s) => s.trim());
    const etiquetasCatalogo = entradasVigentesDe("clasificacion_infraestructura").map((c) => c.etiqueta);
    expect(etiquetasCatalogo.sort()).toEqual(dominioExcel.sort());
  });
});

describe("catálogo tipo_inspeccion_realizada vs DICCIONARIO_CAMPOS (fila tipo_inspeccion_realizada)", () => {
  it("las etiquetas vigentes coinciden con el dominio del Excel", () => {
    const filas = leerExportCsv("DICCIONARIO_CAMPOS.csv").slice(1);
    const fila = filas.find((f) => f[0] === "INSPECCION" && f[1] === "tipo_inspeccion_realizada");
    expect(fila).toBeDefined();
    const dominioExcel = fila![7].split("/").map((s) => s.trim());
    const etiquetasCatalogo = entradasVigentesDe("tipo_inspeccion_realizada").map((c) => c.etiqueta);
    expect(etiquetasCatalogo.sort()).toEqual(dominioExcel.sort());
  });
});

describe("catálogo subtipo_inspeccion vs DICCIONARIO_CAMPOS (fila subtipo_inspeccion)", () => {
  it("cada etiqueta vigente aparece textualmente en la celda del Excel (dominio irregular, no separado por '/')", () => {
    const filas = leerExportCsv("DICCIONARIO_CAMPOS.csv").slice(1);
    const fila = filas.find((f) => f[0] === "INSPECCION" && f[1] === "subtipo_inspeccion");
    expect(fila).toBeDefined();
    const celda = fila![7];
    // Única diferencia aceptada con el Excel (decisión de la responsable, 2026-10-27):
    // la etiqueta se muestra sin guion bajo. Se elimina cuando el Excel se corrija.
    const textoExcel: Record<string, string> = { post_intervencion: "Post_intervención" };
    for (const entrada of entradasVigentesDe("subtipo_inspeccion")) {
      expect(celda).toContain(textoExcel[entrada.codigo] ?? entrada.etiqueta);
    }
  });
});

describe("catálogo forma_alcorque vs DICCIONARIO_CAMPOS (fila forma_alcorque)", () => {
  it("las etiquetas vigentes coinciden con el dominio del Excel", () => {
    const filas = leerExportCsv("DICCIONARIO_CAMPOS.csv").slice(1);
    const fila = filas.find((f) => f[1] === "forma_alcorque");
    expect(fila).toBeDefined();
    const dominioExcel = fila![7].split("/").map((s) => s.trim());
    const etiquetasCatalogo = entradasVigentesDe("forma_alcorque").map((c) => c.etiqueta);
    expect(etiquetasCatalogo.sort()).toEqual(dominioExcel.sort());
  });
});

describe("catálogo tipo_red_aerea vs DICCIONARIO_CAMPOS (fila tipo_red_aerea)", () => {
  it("las etiquetas vigentes coinciden con el dominio del Excel", () => {
    const filas = leerExportCsv("DICCIONARIO_CAMPOS.csv").slice(1);
    const fila = filas.find((f) => f[1] === "tipo_red_aerea");
    expect(fila).toBeDefined();
    const dominioExcel = fila![7].split("/").map((s) => s.trim());
    const etiquetasCatalogo = entradasVigentesDe("tipo_red_aerea").map((c) => c.etiqueta);
    expect(etiquetasCatalogo.sort()).toEqual(dominioExcel.sort());
  });
});

describe.each([
  ["tipo_infraestructura_vertical", "tipo_infraestructura_vertical"],
  ["tipo_tutorado", "tipo_tutorado"],
  ["tipo_red_subterranea", "tipo_red_subterranea"],
])("catálogo %s vs DICCIONARIO_CAMPOS (fila %s; CC-056)", (catalogo, campo) => {
  it("las etiquetas vigentes coinciden con el dominio del Excel", () => {
    const filas = leerExportCsv("DICCIONARIO_CAMPOS.csv").slice(1);
    const fila = filas.find((f) => f[1] === campo);
    expect(fila).toBeDefined();
    const dominioExcel = fila![7].split("/").map((s) => s.trim());
    const etiquetasCatalogo = entradasVigentesDe(catalogo).map((c) => c.etiqueta);
    expect(etiquetasCatalogo.sort()).toEqual(dominioExcel.sort());
  });
});

describe("catálogo clasificacion_prioridad vs DICCIONARIO_CAMPOS (fila clasificacion_prioridad)", () => {
  it("las etiquetas vigentes coinciden con el dominio del Excel", () => {
    const filas = leerExportCsv("DICCIONARIO_CAMPOS.csv").slice(1);
    const fila = filas.find((f) => f[1] === "clasificacion_prioridad");
    expect(fila).toBeDefined();
    const dominioExcel = fila![7].split("/").map((s) => s.trim());
    const etiquetasCatalogo = entradasVigentesDe("clasificacion_prioridad").map((c) => c.etiqueta);
    expect(etiquetasCatalogo.sort()).toEqual(dominioExcel.sort());
  });
});

describe("catálogo clasificacion_vitalidad vs DICCIONARIO_CAMPOS (fila clasificacion_vitalidad, D-169; AM-17)", () => {
  it("las etiquetas vigentes coinciden con el dominio del Excel", () => {
    const filas = leerExportCsv("DICCIONARIO_CAMPOS.csv").slice(1);
    const fila = filas.find((f) => f[1] === "clasificacion_vitalidad");
    expect(fila).toBeDefined();
    const dominioExcel = fila![7].split("/").map((s) => s.trim());
    const etiquetasCatalogo = entradasVigentesDe("clasificacion_vitalidad").map((c) => c.etiqueta);
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

describe("catálogos de OT vs DICCIONARIO_CAMPOS, ORDENES DE TRABAJO (CC-065)", () => {
  const filaOt = (campo: string) => {
    const fila = leerExportCsv("DICCIONARIO_CAMPOS.csv")
      .slice(1)
      .find((f) => f[0] === "ORDENES DE TRABAJO" && f[1] === campo);
    expect(fila).toBeDefined();
    return fila![7];
  };
  const etiquetas = (catalogo: string) => entradasVigentesDe(catalogo).map((c) => c.etiqueta);

  it("tipo_ot = dominio de Tipo_ot (D-234), con los códigos del CHECK de la base", () => {
    expect(etiquetas("tipo_ot").sort()).toEqual(filaOt("Tipo_ot").split("/").map((s) => s.trim()).sort());
    expect(entradasVigentesDe("tipo_ot").map((c) => c.codigo).sort()).toEqual(["inspeccion", "mantenimiento"]);
  });

  it("estado_ot = dominio de estado_ot (D-239), con los códigos del CHECK de la base", () => {
    expect(etiquetas("estado_ot").sort()).toEqual(filaOt("estado_ot").split("/").map((s) => s.trim()).sort());
    expect(entradasVigentesDe("estado_ot").map((c) => c.codigo).sort()).toEqual(
      ["cancelada", "completada", "en_ejecucion", "pendiente", "programada"]
    );
  });

  it("accion_mantenimiento = parte «Mantenimiento» de Accion_solicitada (D-235)", () => {
    const celda = filaOt("Accion_solicitada");
    const parte = celda.slice(celda.indexOf("Mantenimiento:") + "Mantenimiento:".length);
    const dominio = parte.split(";").map((s) => s.trim().replace(/\.$/, "")).filter(Boolean);
    expect(etiquetas("accion_mantenimiento").sort()).toEqual(dominio.sort());
  });

  it("subtipo_mantenimiento = subtipos de cada acción de Mantenimiento en subtipo_accion (D-236)", () => {
    const celda = filaOt("subtipo_accion");
    const acciones = entradasVigentesDe("accion_mantenimiento");
    const conSubtipos = acciones.filter((a) => celda.includes(`${a.etiqueta}:`));
    expect(conSubtipos.map((a) => a.codigo).sort()).toEqual(
      ["descompactacion", "manejo_fitosanitario", "poda", "riego", "tala_retiro"]
    );
    for (const accion of conSubtipos) {
      const desde = celda.indexOf(`${accion.etiqueta}:`) + accion.etiqueta.length + 1;
      const hasta = celda.indexOf(".", desde);
      const dominio = celda.slice(desde, hasta).split(";").map((s) => s.trim());
      const catalogo = entradasVigentesDe("subtipo_mantenimiento").filter((s) => s.padre === accion.codigo);
      expect({ accion: accion.codigo, etiquetas: catalogo.map((s) => s.etiqueta).sort() }).toEqual({
        accion: accion.codigo,
        etiquetas: dominio.sort(),
      });
    }
    // Ningún subtipo sin acción padre de Mantenimiento.
    const padres = new Set(acciones.map((a) => a.codigo));
    expect(entradasVigentesDe("subtipo_mantenimiento").every((s) => s.padre && padres.has(s.padre))).toBe(true);
  });

  it("los códigos que ya fija la base coinciden (tala, retiro_tocon, otra_intervencion)", () => {
    expect(esCodigoVigente("subtipo_mantenimiento", "tala")).toBe(true);
    expect(esCodigoVigente("subtipo_mantenimiento", "retiro_tocon")).toBe(true);
    expect(esCodigoVigente("accion_mantenimiento", "otra_intervencion")).toBe(true);
  });

  it("ninguna etiqueta de OT queda vacía", () => {
    for (const cat of ["tipo_ot", "estado_ot", "accion_mantenimiento", "subtipo_mantenimiento"]) {
      expect(entradasVigentesDe(cat).every((c) => c.etiqueta.trim() !== "")).toBe(true);
    }
  });
});
