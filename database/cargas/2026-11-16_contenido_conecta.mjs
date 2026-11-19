// Carga inicial del contenido ciudadano de las seis especies (CC-073).
// Autorizada por Mari el 2026-11-16, SOLO para la base de pruebas
// (gmlbmyreoxgoqrolhyxo). Se niega a correr contra otra base.
//
// Uso (desde la raíz del backend):
//   node database/cargas/2026-11-16_contenido_conecta.mjs <ruta .env de pruebas> <carpeta src/assets/especies del frontend>
//   node database/cargas/2026-11-16_contenido_conecta.mjs <ruta .env de pruebas> --revertir
//
// Textos y fuentes: 2026-11-16_contenido_conecta.json. Las fotos se
// recodifican como pide la 037: orientación aplicada, 1600 px de lado
// mayor, WebP sin metadatos y ruta aleatoria especies/<uuid>.webp. Orden
// seguro: subir → función → si falla, borrar lo subido; si funciona,
// borrar el archivo anterior que devuelve la función.
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const BASE_PRUEBAS = "gmlbmyreoxgoqrolhyxo";
const BUCKET = "conecta-publico";
const USUARIO_CARGA = "2bf463a9-fbad-4288-89aa-fa77acfafd29"; // «Usuario Admin Prueba» (admin, activo)

const [envPath, arg2] = process.argv.slice(2);
if (!envPath || !arg2) throw new Error("Uso: <.env de pruebas> <carpeta de fotos | --revertir>");
const env = dotenv.parse(readFileSync(envPath));
const url = env.SUPABASE_URL;
if (!url || new URL(url).hostname !== `${BASE_PRUEBAS}.supabase.co`) {
  throw new Error(`Base no permitida: la carga solo corre en ${BASE_PRUEBAS}`);
}
const sb = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const datos = JSON.parse(readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "2026-11-16_contenido_conecta.json"), "utf8"));

async function idEspecie(nombre) {
  const { data, error } = await sb.from("species").select("id").eq("especie_cientifica", nombre).single();
  if (error) throw new Error(`${nombre}: ${error.message}`);
  return data.id;
}

// Límites del diccionario (D-280 a D-290) que la base no controla.
function validar(nombre, c) {
  const largo = (t, max, campo) => { if (t != null && [...t].length > max) throw new Error(`${nombre}: ${campo} supera ${max}`); };
  largo(c.nombre_comun_visualizacion, 60, "nombre"); largo(c.curiosidad, 200, "curiosidad"); largo(c.quien_soy, 160, "quien_soy");
  largo(c.historia_especie, 300, "historia"); largo(c.consejo, 160, "consejo");
  const iconos = c.aportes.map((a) => a.icono);
  if (new Set(iconos).size !== iconos.length) throw new Error(`${nombre}: ícono repetido`);
  c.aportes.forEach((a) => largo(a.titulo, 40, "aporte"));
  c.rasgos.forEach((r) => { largo(r.etiqueta, 20, "rasgo.etiqueta"); largo(r.texto, 120, "rasgo.texto"); });
  if (c.anio_estacional) Object.values(c.anio_estacional).forEach((t) => largo(t, 80, "estación"));
  if (c.ciclo) { largo(c.ciclo.titulo, 30, "ciclo.titulo"); c.ciclo.pasos.forEach((p) => { largo(p.etiqueta, 20, "paso"); largo(p.texto, 60, "paso"); }); }
  for (const b of ["curiosidad", "historia_especie"]) {
    if (c[b] && !c.fuentes.some((f) => f.bloques.includes(b))) throw new Error(`${nombre}: ${b} sin fuente de su bloque`);
  }
  c.fuentes.forEach((f) => { largo(f.tema, 120, "fuente.tema"); largo(f.referencia, 300, "fuente.referencia"); if (f.enlace && !f.enlace.startsWith("https://")) throw new Error("enlace no https"); });
}

async function revertir() {
  const { data: filas, error } = await sb.from("species_public_content").select("species_id, foto_referencial_path, rasgos");
  if (error) throw error;
  const rutas = filas.flatMap((f) => [f.foto_referencial_path, ...f.rasgos.map((r) => r.foto_path)]).filter(Boolean);
  if (rutas.length) { const { error: e } = await sb.storage.from(BUCKET).remove(rutas); if (e) throw e; }
  const { error: e2 } = await sb.from("species_public_content").delete().in("species_id", filas.map((f) => f.species_id));
  if (e2) throw e2;
  console.log(`Revertido: ${filas.length} especies y ${rutas.length} fotos borradas`);
}

async function cargar(carpeta) {
  const ids = {};
  for (const [nombre, c] of Object.entries(datos.especies)) {
    validar(nombre, c);
    ids[nombre] = await idEspecie(nombre);
    const { data, error } = await sb.rpc("fn_guardar_contenido_especie", { p_species_id: ids[nombre], p_usuario: USUARIO_CARGA, p_contenido: c });
    if (error) throw new Error(`${nombre}: ${error.message}`);
    if (data.rutas_a_borrar.length) await sb.storage.from(BUCKET).remove(data.rutas_a_borrar);
    console.log(`Texto: ${nombre}`);
  }
  for (const f of datos.fotos) {
    const buf = await sharp(readFileSync(path.join(carpeta, f.archivo)))
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    const meta = await sharp(buf).metadata();
    if (meta.exif || meta.icc || meta.xmp || meta.iptc) throw new Error(`${f.archivo}: quedaron metadatos`);
    const ruta = `especies/${randomUUID()}.webp`;
    const { error: eSubir } = await sb.storage.from(BUCKET).upload(ruta, buf, { contentType: "image/webp", upsert: false });
    if (eSubir) throw new Error(`${f.archivo}: ${eSubir.message}`);
    const { data, error } = await sb.rpc("fn_fijar_foto_especie", {
      p_species_id: ids[f.especie], p_usuario: USUARIO_CARGA, p_ranura: f.ranura,
      p_path: ruta, p_credito: f.credito, p_temporal: Boolean(f.temporal),
    });
    if (error) { await sb.storage.from(BUCKET).remove([ruta]); throw new Error(`${f.archivo}: ${error.message}`); }
    if (data.ruta_anterior) await sb.storage.from(BUCKET).remove([data.ruta_anterior]);
    console.log(`Foto: ${f.especie} / ${f.ranura} → ${ruta} (${buf.length} bytes, ${meta.width}×${meta.height})`);
  }
}

if (arg2 === "--revertir") await revertir(); else await cargar(arg2);
