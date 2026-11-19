// Fotos referenciales de especie (CC-073; D-291 a D-293), según la
// actualización de la responsable del 2026-11-16. Solo la base de pruebas
// (gmlbmyreoxgoqrolhyxo); se niega a correr contra otra.
//
//   - Arce negundo y Falso plátano: fotos del equipo de SIVU, levantamiento del
//     2026-10-01 en Plaza Victoria (AV_000009/IMG_9984, árbol A-000425, y
//     AV_000007/IMG_9947, árbol A-000423). No temporales.
//   - Crespón: imagen de terceros, temporal hasta tener una foto propia con
//     flores (verano). La base fija su crédito.
//   - Olmo: ya cargado como temporal en 2026-11-16_contenido_conecta.mjs.
//   - Araucaria y Ginkgo: pendientes del texto exacto del crédito.
//
// Las imágenes salen del frontend, commit 9549d39 (rama
// feature/fichas-especies-v5), src/assets/especies/. Uso:
//   node database/cargas/2026-11-16_fotos_referenciales.mjs <.env de pruebas> <carpeta con los .webp>
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import dotenv from "dotenv";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const BASE_PRUEBAS = "gmlbmyreoxgoqrolhyxo";
const BUCKET = "conecta-publico";
const USUARIO_CARGA = "2bf463a9-fbad-4288-89aa-fa77acfafd29"; // «Usuario Admin Prueba» (admin, activo)
// Crédito «SIVU» (2026-11-16): las fotos propias son del equipo y no se
// acreditan a personas; origen en docs/conecta-fotos.md.
const CREDITO_EQUIPO = "SIVU";

const FOTOS = [
  { especie: "Acer negundo", archivo: "acer-negundo.webp", credito: CREDITO_EQUIPO, temporal: false },
  { especie: "Acer pseudoplatanus", archivo: "acer-pseudoplatanus.webp", credito: CREDITO_EQUIPO, temporal: false },
  { especie: "Lagerstroemia indica", archivo: "lagerstroemia-indica.webp", credito: null, temporal: true },
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
    p_species_id: especie.id, p_usuario: USUARIO_CARGA, p_ranura: "referencial",
    p_path: ruta, p_credito: f.credito, p_temporal: f.temporal,
  });
  if (error) {
    await sb.storage.from(BUCKET).remove([ruta]);
    throw new Error(`${f.especie}: ${error.message}`);
  }
  if (data.ruta_anterior) await sb.storage.from(BUCKET).remove([data.ruta_anterior]);
  console.log(`${f.especie} → ${ruta} (${buf.length} bytes, ${meta.width}×${meta.height}, ${f.temporal ? "temporal" : "propia"}; anterior: ${data.ruta_anterior ?? "ninguna"})`);
}
