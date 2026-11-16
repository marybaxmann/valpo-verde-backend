// Fotos propias de SIVU para la araucaria y el ginkgo (CC-073; D-285,
// D-291, D-292), 2026-11-16. Solo la base de pruebas (gmlbmyreoxgoqrolhyxo).
//
// Fotos de Mari tomadas en Plaza Victoria el 2026-11-11 (frontend, commits
// 98f2940 y b92d499; en 9549d39 siguen iguales). Crédito «SIVU»
// (indicación de la responsable, 2026-11-16: todas las fotos finales serán
// del equipo). El crédito se guarda pero la ficha pública no lo muestra.
//   - Araucaria: referencial y rasgo «Silueta» (la misma foto, como en
//     contenidoEspecie.ts del frontend).
//   - Ginkgo: referencial.
// Uso: node database/cargas/2026-11-16_fotos_sivu.mjs <.env de pruebas> <carpeta con los .webp>
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import dotenv from "dotenv";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const BASE_PRUEBAS = "gmlbmyreoxgoqrolhyxo";
const BUCKET = "conecta-publico";
const USUARIO_CARGA = "2bf463a9-fbad-4288-89aa-fa77acfafd29"; // «Usuario Admin Prueba» (admin, activo)
const CREDITO = "SIVU";

const FOTOS = [
  { especie: "Araucaria angustifolia", ranura: "referencial", archivo: "araucaria-angustifolia.webp" },
  { especie: "Araucaria angustifolia", ranura: "silueta", archivo: "araucaria-angustifolia.webp" },
  { especie: "Ginkgo biloba", ranura: "referencial", archivo: "ginkgo-biloba.webp" },
];

const [envPath, carpeta] = process.argv.slice(2);
if (!envPath || !carpeta) throw new Error("Uso: <.env de pruebas> <carpeta con los .webp>");
const env = dotenv.parse(readFileSync(envPath));
if (new URL(env.SUPABASE_URL).hostname !== `${BASE_PRUEBAS}.supabase.co`) {
  throw new Error(`Base no permitida: la carga solo corre en ${BASE_PRUEBAS}`);
}
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

for (const f of FOTOS) {
  const { data: especie, error: e1 } = await sb.from("species").select("id").eq("especie_cientifica", f.especie).single();
  if (e1) throw new Error(`${f.especie}: ${e1.message}`);
  // Mismo camino que el backend (procesarFotoPublica): orientación, 1600 px, WebP sin metadatos.
  const buf = await sharp(readFileSync(path.join(carpeta, f.archivo)))
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const meta = await sharp(buf).metadata();
  if (meta.exif || meta.icc || meta.xmp || meta.iptc) throw new Error(`${f.archivo}: quedaron metadatos`);
  const ruta = `especies/${randomUUID()}.webp`;
  const { error: eSubir } = await sb.storage.from(BUCKET).upload(ruta, buf, { contentType: "image/webp", upsert: false, cacheControl: "300" });
  if (eSubir) throw new Error(`${f.archivo}: ${eSubir.message}`);
  const { data, error } = await sb.rpc("fn_fijar_foto_especie", {
    p_species_id: especie.id, p_usuario: USUARIO_CARGA, p_ranura: f.ranura,
    p_path: ruta, p_credito: CREDITO, p_temporal: false,
  });
  if (error) {
    await sb.storage.from(BUCKET).remove([ruta]);
    throw new Error(`${f.especie} / ${f.ranura}: ${error.message}`);
  }
  if (data.ruta_anterior) await sb.storage.from(BUCKET).remove([data.ruta_anterior]);
  console.log(`${f.especie} / ${f.ranura} → ${ruta} (${buf.length} bytes, ${meta.width}×${meta.height}; anterior: ${data.ruta_anterior ?? "ninguna"})`);
}
