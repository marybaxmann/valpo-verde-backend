/**
 * Estimación reproducible del carbono almacenado por árbol (propuesta
 * experimental, Valej 2026-11-22). SOLO LECTURA: lee los árboles del sector y
 * aplica `agregarCarbonoIntegrado`, el mismo módulo que usa la API. No escribe
 * en la base.
 *
 * Uso (base de pruebas):
 *   set DOTENV_CONFIG_PATH=..\valpo-verde-backend\.env.pruebas
 *   npx tsx scripts/carbono/estimar-piloto.ts "Plazas y eje Pedro Montt" salida.csv
 *
 * Universo: árboles presentes del sector. Se considera «con evaluación
 * vigente» al árbol con DAP vigente (en el Piloto coincide con las 69
 * evaluaciones completas vigentes que usa la API).
 */
import { writeFileSync } from "fs";
import { supabaseAdmin } from "../../src/config/supabase";
import { agregarCarbonoIntegrado, Componente } from "../../src/services/rules/carbono/carbonoIntegrado";

async function main() {
  const [sector = "Plazas y eje Pedro Montt", salida = "carbono-piloto.csv"] = process.argv.slice(2);
  const { data: s, error: e1 } = await supabaseAdmin.from("sectors").select("id").eq("nombre_sector", sector).single();
  if (e1 || !s) throw new Error(`Sector no encontrado: ${sector}`);
  const { data, error } = await supabaseAdmin
    .from("trees")
    .select("id, tree_code, estado_ciclo_vida, especie_cientifica, multifustal, dap_cm, altura_total_m, dap_fustes_cm, species(especie_cientifica, tipo_hoja)")
    .eq("sector_id", s.id)
    .order("tree_code");
  if (error) throw error;
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  const arboles = (data ?? []).map((t: Record<string, unknown>) => {
    const sp = t.species as { especie_cientifica: string | null; tipo_hoja: string | null } | null;
    return {
      id: t.id as string,
      tree_code: t.tree_code as string,
      presente: t.estado_ciclo_vida === "activo",
      evaluacion_completa_vigente: t.dap_cm !== null,
      especie_cientifica: sp?.especie_cientifica ?? (t.especie_cientifica as string | null),
      tipo_hoja: sp?.tipo_hoja ?? null,
      multifustal: t.multifustal as boolean | null,
      dap_cm: num(t.dap_cm),
      altura_total_m: num(t.altura_total_m),
      dap_fustes_cm: ((t.dap_fustes_cm as number[] | null) ?? null)?.map(Number) ?? null,
    };
  });
  const r = agregarCarbonoIntegrado(arboles);

  const c = (x: Componente | null, k: "biomasa_kg" | "carbono_kg" | "co2e_kg") => (x && x[k] !== null ? (x[k] as number).toFixed(2) : "");
  const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const cab = [
    "tree_code", "especie", "dap_cm", "altura_m", "multifustal", "estado",
    "aereo_componente", "aereo_modelo", "aereo_estado", "aereo_biomasa_kg", "aereo_carbono_kg", "aereo_co2e_kg",
    "total_modelo", "total_biomasa_kg", "total_carbono_kg", "total_co2e_kg",
    "comparacion", "variables", "fuentes", "advertencias", "motivo", "fecha_calculo",
  ];
  const filas = r.arboles.map((f) => {
    const a = arboles.find((x) => x.id === f.tree_id)!;
    return [
      f.tree_code, f.especie ?? "no identificada", a.dap_cm ?? "", a.altura_total_m ?? "", a.multifustal ?? "", f.estado,
      f.aereo?.componente ?? "", f.aereo?.modelo.id ?? "", f.aereo?.modelo.estado ?? "", c(f.aereo, "biomasa_kg"), c(f.aereo, "carbono_kg"), c(f.aereo, "co2e_kg"),
      f.total?.modelo.id ?? "", c(f.total, "biomasa_kg"), c(f.total, "carbono_kg"), c(f.total, "co2e_kg"),
      f.comparacion.map((x) => `${x.modelo.id}: ${x.carbono_kg.toFixed(2)} kg C`).join("; "),
      JSON.stringify({ ...(f.aereo?.variables ?? {}), ...(f.total?.variables ?? {}) }),
      [f.aereo?.modelo.fuente, f.total?.modelo.fuente].filter(Boolean).join(" || "),
      [...(f.aereo?.advertencias ?? []), ...(f.total?.advertencias ?? [])].join(" | "),
      f.motivo ?? "", f.fecha_calculo,
    ].map(q).join(",");
  });
  writeFileSync(salida, "﻿" + [cab.join(","), ...filas].join("\n"), "utf8");
  const { arboles: _omitido, ...resumen } = r;
  console.log(JSON.stringify(resumen, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
