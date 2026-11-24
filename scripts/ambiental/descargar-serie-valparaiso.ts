/**
 * PROPUESTA EXPERIMENTAL (2026-11-23). Descarga la serie horaria de 2025 de
 * Valparaíso que usan la remoción de contaminantes y la interceptación de
 * precipitaciones (src/services/rules/indicadores/aportesFoliares.ts) y la
 * guarda compacta en src/data/ambiental/valparaiso-2025.json.
 *
 * Fuentes (sin clave, licencia CC BY 4.0):
 * - Open-Meteo Historical Weather API (reanálisis ERA5 / ERA5-Land):
 *   precipitación (mm), evapotranspiración de referencia FAO-56 (mm) y
 *   radiación de onda corta (W/m²), horarias.
 * - Open-Meteo Air Quality API (CAMS global): PM10, NO2, O3, SO2 y CO
 *   (µg/m³), horarios. Son concentraciones modeladas, no de estaciones SINCA.
 *
 * Uso: npx tsx scripts/ambiental/descargar-serie-valparaiso.ts
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";

const LAT = -33.046;
const LON = -71.62;
const DESDE = "2025-01-01";
const HASTA = "2025-12-31";
const ZONA = "America/Santiago";

async function json(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return (await r.json()) as { latitude: number; longitude: number; hourly: Record<string, Array<number | null>> };
}

const redondear = (v: Array<number | null>, d: number) => v.map((x) => (x === null ? null : Number(x.toFixed(d))));

async function main() {
  const base = `latitude=${LAT}&longitude=${LON}&start_date=${DESDE}&end_date=${HASTA}&timezone=${encodeURIComponent(ZONA)}`;
  const clima = await json(`https://archive-api.open-meteo.com/v1/archive?${base}&hourly=precipitation,et0_fao_evapotranspiration,shortwave_radiation`);
  const aire = await json(`https://air-quality-api.open-meteo.com/v1/air-quality?${base}&hourly=pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide`);
  const n = clima.hourly.time.length;
  if (aire.hourly.time.length !== n) throw new Error("Las series de clima y aire no tienen el mismo largo.");
  const salida = {
    descripcion: "Serie horaria de Valparaíso, 2025 (propuesta experimental). Generada por scripts/ambiental/descargar-serie-valparaiso.ts.",
    ubicacion: { latitud: LAT, longitud: LON, celda_clima: [clima.latitude, clima.longitude], celda_aire: [aire.latitude, aire.longitude] },
    periodo: { desde: DESDE, hasta: HASTA, zona: ZONA, horas: n },
    fuentes: [
      "Open-Meteo Historical Weather API (ERA5/ERA5-Land, Copernicus/ECMWF), CC BY 4.0: https://open-meteo.com/en/docs/historical-weather-api",
      "Open-Meteo Air Quality API (CAMS global, Copernicus), CC BY 4.0: https://open-meteo.com/en/docs/air-quality-api",
    ],
    unidades: { precipitacion: "mm/h", et0: "mm/h", radiacion: "W/m2", contaminantes: "ug/m3" },
    inicio: clima.hourly.time[0],
    precipitacion: redondear(clima.hourly.precipitation, 2),
    et0: redondear(clima.hourly.et0_fao_evapotranspiration, 3),
    radiacion: redondear(clima.hourly.shortwave_radiation, 0),
    pm10: redondear(aire.hourly.pm10, 1),
    no2: redondear(aire.hourly.nitrogen_dioxide, 1),
    o3: redondear(aire.hourly.ozone, 1),
    so2: redondear(aire.hourly.sulphur_dioxide, 1),
    co: redondear(aire.hourly.carbon_monoxide, 0),
  };
  const destino = join(__dirname, "..", "..", "src", "data", "ambiental", "valparaiso-2025.json");
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, JSON.stringify(salida));
  const suma = (v: Array<number | null>) => v.reduce<number>((s, x) => s + (x ?? 0), 0);
  console.log(`Guardado ${destino}: ${n} horas; precipitación anual ${suma(salida.precipitacion).toFixed(1)} mm.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
