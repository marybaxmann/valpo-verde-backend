import {
  CAMPOS_NO_EXIGIDOS,
  CondicionActivacion,
  MARCAS_BD,
  REGLAS_COMPLETITUD,
} from "../../../src/schemas/sivu/completitudInspeccion";
import { CAMPOS_EVALUACION_COMPLETA } from "../../../src/schemas/sivu/alcanceInspeccion";
import { camposArbolBaseSchema } from "../../../src/schemas/sivu/inspeccion.schema";
import { CATALOGO, esCodigoVigente } from "../../../src/services/rules/engine/catalogs";
import { leerExportCsv } from "../../services/rules/engine/testUtils/csvExport";

/**
 * Compara la tabla generada por `scripts/metodologia/obligatoriedad_campos.py`
 * contra DICCIONARIO_CAMPOS (CC-056). Lee el CSV ya exportado
 * (docs/excel/export/), como alcanceInspeccion.test.ts — nunca el .xlsx
 * desde Jest. La fila D-n es el índice del registro en el CSV (el export
 * conserva todas las filas de la hoja).
 *
 * Las traducciones automáticas se vuelven a derivar aquí sin usar el
 * script: el catálogo de una etiqueta se busca por su dominio (columna H
 * del campo que activa la condición), no con el mapa del script.
 */

const HOJAS = new Set(["ARBOLES", "REGISTRO_EVALUACION"]);
const ADICIONES = new Set(["superficie_alcorque_m2_manual"]);

interface FilaDiccionario {
  fila: number;
  hoja: string;
  campo: string;
  d: string;
  h: string;
  i: string;
  k: string;
}

const filasDiccionario: FilaDiccionario[] = leerExportCsv("DICCIONARIO_CAMPOS.csv")
  .map((f, indice) => ({
    fila: indice + 1,
    hoja: f[0],
    campo: f[1]?.trim() ?? "",
    d: f[3]?.trim() ?? "",
    h: f[7]?.trim() ?? "",
    i: f[8]?.trim() ?? "",
    k: f[10]?.trim() ?? "",
  }))
  .filter((f) => f.fila > 1 && HOJAS.has(f.hoja) && f.campo !== "");

const porCampo = new Map(filasDiccionario.map((f) => [f.campo, f]));
const clave = (hoja: string, campo: string) => `${hoja}.${campo}`;
const reglaDe = (campo: string) => REGLAS_COMPLETITUD.find((r) => r.campo === campo);

/** Etiqueta → valor guardado: Sí/No es dominio base (PR-021); si no, el catálogo cuyo dominio coincide con la columna H. */
function valorDe(campo: string, etiqueta: string): boolean | string {
  const disparador = porCampo.get(campo);
  if (!disparador) throw new Error(`${campo} no está en el diccionario`);
  if (disparador.h === "Sí / No") {
    if (etiqueta === "Sí") return true;
    if (etiqueta === "No") return false;
    throw new Error(`${etiqueta} no es Sí ni No`);
  }
  const dominio = new Set(disparador.h.split("/").map((s) => s.trim()));
  const catalogos = [...new Set(CATALOGO.map((c) => c.catalogo))].filter((cat) => {
    const etiquetas = CATALOGO.filter((c) => c.catalogo === cat && c.estado === "vigente").map((c) => c.etiqueta);
    return etiquetas.length === dominio.size && etiquetas.every((e) => dominio.has(e));
  });
  if (catalogos.length !== 1) throw new Error(`${campo}: ${catalogos.length} catálogos con el dominio ${disparador.h}`);
  const entrada = CATALOGO.find((c) => c.catalogo === catalogos[0] && c.etiqueta === etiqueta && c.estado === "vigente");
  if (!entrada) throw new Error(`${campo}: «${etiqueta}» sin código en ${catalogos[0]}`);
  return entrada.codigo;
}

function derivarCondicionSimple(k: string): CondicionActivacion {
  const cuerpo = k.startsWith("Se activa cuando ") ? k.slice("Se activa cuando ".length) : k;
  const conds = cuerpo.split(" o ").map((parte): CondicionActivacion => {
    const m = /^([A-Za-z_][A-Za-z0-9_]*) = (.+)$/.exec(parte.trim());
    if (!m) throw new Error(`condición no simple: ${k}`);
    return { op: "igual", campo: m[1], valor: valorDe(m[1], m[2].trim()) };
  });
  return conds.length === 1 ? conds[0] : { op: "o", condiciones: conds };
}

function camposDe(c: CondicionActivacion): string[] {
  if (c.op === "siempre") return [];
  if ("condiciones" in c) return c.condiciones.flatMap(camposDe);
  return [c.campo];
}

function igualesDe(c: CondicionActivacion): Array<{ campo: string; valor: boolean | string }> {
  if (c.op === "igual") return [{ campo: c.campo, valor: c.valor }];
  if ("condiciones" in c) return c.condiciones.flatMap(igualesDe);
  return [];
}

describe("tabla de completitud vs DICCIONARIO_CAMPOS (CC-056)", () => {
  it("cada fila de ARBOLES y REGISTRO_EVALUACION está una sola vez, como exigida o como no exigida", () => {
    const enTabla = [
      ...REGLAS_COMPLETITUD.filter((r) => !ADICIONES.has(r.campo)),
      ...CAMPOS_NO_EXIGIDOS,
    ].map((r) => `${clave(r.hoja, r.campo)}@${r.fila}`);
    const enExcel = filasDiccionario.map((f) => `${clave(f.hoja, f.campo)}@${f.fila}`);
    expect(enTabla.length).toBe(new Set(enTabla).size);
    expect(new Set(enTabla)).toEqual(new Set(enExcel));
  });

  it("las columnas D, I y K de cada entrada son las del Excel", () => {
    for (const r of [...REGLAS_COMPLETITUD.filter((r) => !ADICIONES.has(r.campo)), ...CAMPOS_NO_EXIGIDOS]) {
      const f = filasDiccionario.find((x) => x.hoja === r.hoja && x.campo === r.campo)!;
      expect({ campo: r.campo, d: r.quienIngresa, i: r.obligatoriedadExcel, k: r.condicionExcel }).toEqual({
        campo: f.campo,
        d: f.d,
        i: f.i,
        k: f.k,
      });
    }
  });

  it("las traducciones automáticas coinciden con lo que se deriva del Excel", () => {
    const automaticas = REGLAS_COMPLETITUD.filter((r) => r.traduccion === "automatica");
    expect(automaticas.length).toBeGreaterThan(0);
    for (const r of automaticas) {
      const esperada: CondicionActivacion =
        r.obligatoriedadExcel === "Obligatorio" && r.condicionExcel === ""
          ? { op: "siempre" }
          : derivarCondicionSimple(r.condicionExcel);
      expect({ campo: r.campo, activacion: r.activacion }).toEqual({ campo: r.campo, activacion: esperada });
      expect(r.exigencia).toBe("valor");
    }
  });

  it("lo que asigna solo el Sistema y lo Opcional no se exige", () => {
    const soloSistema = new Set(["Sistema", "Sistema / Administrador Plataforma", "Sistema / usuario autorizado"]);
    for (const f of filasDiccionario) {
      if (soloSistema.has(f.d) || f.i === "Opcional") {
        expect({ campo: f.campo, exigido: reglaDe(f.campo) !== undefined }).toEqual({ campo: f.campo, exigido: false });
      }
    }
  });

  it("origen en ARBOLES: solo «Inspector / Usuario Municipal» puede venir de lo vigente; REGISTRO_EVALUACION siempre registrado", () => {
    for (const r of REGLAS_COMPLETITUD) {
      const esperado =
        r.hoja === "ARBOLES" && r.quienIngresa === "Inspector / Usuario Municipal" ? "vigente_o_registrado" : "registrado";
      expect({ campo: r.campo, origen: r.origen }).toEqual({ campo: r.campo, origen: esperado });
    }
    expect(
      REGLAS_COMPLETITUD.filter((r) => r.origen === "vigente_o_registrado")
        .map((r) => r.campo)
        .sort()
    ).toEqual(["especie_cientifica", "nombre_comun", "sector", "ubicacion_descriptiva", "utm_este", "utm_norte"]);
  });

  it("toda condición usa campos del diccionario o marcas de la BD, y códigos vigentes", () => {
    const marcas = new Set<string>(MARCAS_BD);
    for (const r of REGLAS_COMPLETITUD) {
      for (const campo of camposDe(r.activacion)) {
        expect({ regla: r.campo, campo, conocido: porCampo.has(campo) || marcas.has(campo) }).toEqual({
          regla: r.campo,
          campo,
          conocido: true,
        });
      }
      for (const { campo, valor } of igualesDe(r.activacion)) {
        if (typeof valor === "string") {
          const catalogos = [...new Set(CATALOGO.map((c) => c.catalogo))].filter((cat) => esCodigoVigente(cat, valor));
          expect({ regla: r.campo, campo, valor, enAlgunCatalogo: catalogos.length > 0 }).toEqual({
            regla: r.campo,
            campo,
            valor,
            enAlgunCatalogo: true,
          });
        }
      }
    }
  });

  it("todo campo exigido de REGISTRO_EVALUACION cabe en el borrador de la evaluación completa", () => {
    const alcance = new Set<string>(CAMPOS_EVALUACION_COMPLETA);
    const fuera = REGLAS_COMPLETITUD.filter((r) => r.hoja === "REGISTRO_EVALUACION" && !alcance.has(r.campo));
    expect(fuera.map((r) => r.campo)).toEqual([]);
  });

  it("todo campo exigido de ARBOLES (salvo las fotos) cabe en campos_arbol del borrador", () => {
    const claves = new Set(Object.keys(camposArbolBaseSchema.shape));
    const fuera = REGLAS_COMPLETITUD.filter(
      (r) => r.hoja === "ARBOLES" && r.exigencia !== "fotos_d27" && !claves.has(r.campo)
    );
    expect(fuera.map((r) => r.campo)).toEqual([]);
    for (const r of REGLAS_COMPLETITUD.filter((r) => r.marca)) {
      expect(claves.has(r.marca!)).toBe(true);
    }
  });
});

describe("traducciones aprobadas en CC-056", () => {
  const sinCopa = { op: "no_verdadero", campo: "copa_no_presenta" };

  it("clasificacion_vitalidad (D-169): siempre exigida, sin excepción por especie", () => {
    expect(reglaDe("clasificacion_vitalidad")?.activacion).toEqual({ op: "siempre" });
  });

  it("observaciones_infraestructura (D-147): sin el caso «condición Sí con varios elementos»", () => {
    expect(reglaDe("observaciones_infraestructura")?.activacion).toEqual({
      op: "o",
      condiciones: [
        { op: "mas_de_un_valor", campo: "tipo_infraestructura_vertical" },
        { op: "mas_de_un_valor", campo: "tipo_red_aerea" },
        { op: "mas_de_un_valor", campo: "tipo_red_subterranea" },
        { op: "igual", campo: "compromete_funcionalidad_red_subterranea", valor: "no_determinado" },
      ],
    });
  });

  it("«Condicional / Opcional» (D-70, D-71) se trata como Opcional", () => {
    expect(reglaDe("profundidad_grieta_cm")).toBeUndefined();
    expect(reglaDe("ancho_apertura_cm")).toBeUndefined();
  });

  it("superficie_alcorque_m2_manual: exigida con alcorque Irregular (D-125)", () => {
    const r = reglaDe("superficie_alcorque_m2_manual");
    expect(r?.fila).toBe(porCampo.get("superficie_alcorque_m2")?.fila);
    expect(r?.activacion).toEqual({
      op: "y",
      condiciones: [
        { op: "igual", campo: "existe_alcorque", valor: true },
        { op: "igual", campo: "forma_alcorque", valor: "irregular" },
      ],
    });
    expect(reglaDe("superficie_alcorque_m2")).toBeUndefined();
  });

  it("dap_cm (D-18): exigido solo con multifustal = No; con Sí, numero_fustes y dap_fustes_cm", () => {
    expect(reglaDe("dap_cm")?.activacion).toEqual({ op: "igual", campo: "multifustal", valor: false });
    for (const campo of ["numero_fustes", "dap_fustes_cm"]) {
      expect(reglaDe(campo)?.activacion).toEqual({ op: "igual", campo: "multifustal", valor: true });
    }
  });

  it("presenta_tutorado (D-149): dap_cm < 10", () => {
    expect(reglaDe("presenta_tutorado")?.activacion).toEqual({ op: "menor_que", campo: "dap_cm", valor: 10 });
  });

  it("direccion_inclinacion (D-38): angulo_inclinacion > 15", () => {
    expect(reglaDe("direccion_inclinacion")?.activacion).toEqual({ op: "mayor_que", campo: "angulo_inclinacion", valor: 15 });
  });

  it("copa: diámetros, copa faltante y muerte regresiva con copa_no_presenta ≠ true; exposición lumínica además con copa viva", () => {
    for (const campo of ["diametro_copa_ns_m", "diametro_copa_eo_m", "copa_faltante_pct", "muerte_regresiva_copa_pct"]) {
      expect(reglaDe(campo)?.activacion).toEqual(sinCopa);
    }
    expect(reglaDe("exposicion_luminica_copa_cle")?.activacion).toEqual({
      op: "y",
      condiciones: [sinCopa, { op: "no_verdadero", campo: "altura_base_copa_viva_no_presenta" }],
    });
  });

  it("«Obligatorio responder» (D-23, D-24): valor o marca *_no_presenta", () => {
    expect(reglaDe("altura_primera_rama_m")).toMatchObject({
      exigencia: "valor_o_marca",
      marca: "altura_primera_rama_no_presenta",
    });
    expect(reglaDe("altura_base_copa_viva_m")).toMatchObject({
      exigencia: "valor_o_marca",
      marca: "altura_base_copa_viva_no_presenta",
    });
  });

  it("fotografias_arbol (D-27): regla de las cuatro vistas", () => {
    expect(reglaDe("fotografias_arbol")).toMatchObject({ exigencia: "fotos_d27", activacion: { op: "siempre" } });
  });

  it("condiciones «= Otro» (D-133, D-153) con los códigos de los catálogos nuevos", () => {
    expect(reglaDe("otro_tipo_infraestructura_vertical")?.activacion).toEqual({
      op: "igual",
      campo: "tipo_infraestructura_vertical",
      valor: "otro",
    });
    expect(reglaDe("observaciones_tutorado")?.activacion).toEqual({
      op: "o",
      condiciones: [
        { op: "igual", campo: "tipo_tutorado", valor: "otro" },
        { op: "igual", campo: "interferencia_tutorado_arbol", valor: true },
      ],
    });
  });
});
