/**
 * Recorrido de los endpoints de la ficha pública editable (CC-073) por la
 * capa de servicio, contra la base de pruebas, con las identidades de las
 * cuentas de QA (sin contraseñas: no hay inicio de sesión). Lo único que
 * no cubre es la validación del JWT (auth.middleware) y la RLS de lectura
 * con el JWT de cada usuario: las lecturas van con service_role.
 *
 * Uso: DOTENV_CONFIG_PATH=<.env de pruebas> MOTOR_COMMIT=local npx tsx database/fase6/recorrido_ficha_publica.ts
 * Deja un respaldo de lo que toca en recorrido_ficha_respaldo.json (carpeta temporal del sistema) para
 * restaurarlo después.
 */
import { writeFileSync } from "fs";
import sharp from "sharp";

// Sin sesión real: las lecturas «con el JWT del usuario» van con el cliente
// administrativo (la clave de pruebas no es un JWT que acepte ese cliente).
const R = `${__dirname}/../../src/`;
const rutaSupabase = require.resolve(R + "config/supabase");
const real = require(rutaSupabase);
require.cache[rutaSupabase]!.exports = { ...real, supabaseAdmin: real.supabaseAdmin, createUserScopedClient: () => real.supabaseAdmin };
const { env } = require(R + "config/env");
const { supabaseAdmin } = real;
const svc = require(R + "services/sivu/fichaPublica.service") as typeof import("../../src/services/sivu/fichaPublica.service");
const { contenidoEspecieSchema, fichaPublicaArbolSchema } = require(R + "schemas/sivu/fichaPublica.schema") as typeof import("../../src/schemas/sivu/fichaPublica.schema");

if (!env.SUPABASE_URL.includes("gmlbmyreoxgoqrolhyxo")) throw new Error("Solo en la base de pruebas");

const P = "cddf7c71-6879-4c17-8498-a91d7baaa9b2"; // QA Fase 7
const TREE = "4910c728-32d0-4e26-8ac0-282c5a01be2f"; // A-000352, Acer negundo
const NEGUNDO = "de8f3703-6b2a-486c-8caf-eaca1bb18ac7";
const TOKEN = env.SUPABASE_SERVICE_ROLE_KEY;
const u = (id: string, role: string, nombre: string) => ({ id, email: undefined, nombre, role, activo: true });
const MUNI = u("395decaf-08d4-46d8-9299-d4be55ab8719", "usuario_municipal", "Municipal Fase 7");
const INSP = u("141f83df-f609-4399-bf52-5d8721826097", "inspector", "Inspector Fase 7");
const ENC = u("689c6e09-97e3-4d3a-a76d-19c9f4eb3054", "encargado_mantencion", "Mantención Fase 7");
const ADMIN = u("1efbd9df-bb74-4d66-bdcf-830ddfdff779", "admin", "Admin Fase 7");
const NO_MIEMBRO = u("3d67df75-169e-4b6f-9c92-59599bcc5ed8", "usuario_municipal", "Usuario Municipal Prueba");

let ok = 0;
const fallas: string[] = [];
function caso(nombre: string, cumple: boolean, detalle?: unknown) {
  if (cumple) ok++;
  else fallas.push(`${nombre}: ${JSON.stringify(detalle)}`);
  console.log(`${cumple ? "OK  " : "FALLA"} ${nombre}`);
}
async function status(fn: () => Promise<unknown>): Promise<number> {
  try {
    await fn();
    return 200;
  } catch (e) {
    return (e as { statusCode?: number }).statusCode ?? 500;
  }
}
async function existe(url: string | null | undefined) {
  if (!url) return false;
  return (await fetch(url)).status === 200;
}

(async () => {
  // Respaldo
  const { data: spcAntes } = await supabaseAdmin.from("species_public_content").select("*").eq("species_id", NEGUNDO).single();
  const { data: tpcAntes } = await supabaseAdmin.from("tree_public_content").select("*").eq("tree_id", TREE).maybeSingle();
  writeFileSync(`${require("os").tmpdir()}/recorrido_ficha_respaldo.json`, JSON.stringify({ spcAntes, tpcAntes }, null, 1));
  caso("respaldo: el árbol no tenía ficha propia", tpcAntes === null, tpcAntes);

  const foto = await sharp({ create: { width: 2400, height: 1800, channels: 3, background: "#4a7" } })
    .withMetadata({ exif: { IFD0: { Make: "Telefono", Copyright: "prueba" } } })
    .jpeg()
    .toBuffer();

  // --- Contenido de la especie
  const visto = await svc.verContenidoEspecie(INSP, P, NEGUNDO, TOKEN);
  caso("GET contenido: el Inspector miembro lo ve", visto?.nombre_comun_visualizacion === "Arce negundo", visto);
  caso("GET contenido: la foto del rasgo sale como URL pública", await existe(visto?.rasgos[0]?.foto?.url), visto?.rasgos[0]);

  const cuerpo = contenidoEspecieSchema.parse({
    nombre_comun_visualizacion: visto!.nombre_comun_visualizacion,
    articulo_nombre: visto!.articulo_nombre,
    curiosidad: visto!.curiosidad,
    aportes: visto!.aportes,
    quien_soy: visto!.quien_soy,
    rasgos: visto!.rasgos.map((r) => ({ id: r.id, etiqueta: r.etiqueta, texto: r.texto })),
    anio_estacional: visto!.anio_estacional,
    ciclo: visto!.ciclo,
    historia_especie: visto!.historia_especie,
    consejo: visto!.consejo,
    fuentes: visto!.fuentes,
  });
  caso("PUT contenido: el Inspector recibe 403", (await status(() => svc.editarContenidoEspecie(INSP, P, NEGUNDO, cuerpo, TOKEN))) === 403);
  caso("PUT contenido: el Encargado recibe 403", (await status(() => svc.editarContenidoEspecie(ENC, P, NEGUNDO, cuerpo, TOKEN))) === 403);
  caso("PUT contenido: municipal no miembro recibe 403", (await status(() => svc.editarContenidoEspecie(NO_MIEMBRO, P, NEGUNDO, cuerpo, TOKEN))) === 403);
  const guardado = await svc.editarContenidoEspecie(MUNI, P, NEGUNDO, cuerpo, TOKEN);
  caso("PUT contenido: el municipal miembro guarda el mismo contenido", guardado?.curiosidad === visto?.curiosidad && guardado?.updated_by === MUNI.id, guardado?.updated_by);
  caso("PUT contenido: la foto del rasgo que sigue se conserva", guardado?.rasgos[0]?.foto?.url === visto?.rasgos[0]?.foto?.url);
  {
    // El crédito no sale por la API (no se muestra en la plataforma): se lee de la base.
    const { data: fila } = await supabaseAdmin.from("species_public_content").select("rasgos").eq("species_id", NEGUNDO).single();
    caso("PUT contenido: la foto del rasgo conserva su crédito guardado (requiere la 038)", fila?.rasgos?.[0]?.credito === "SIVU", fila?.rasgos?.[0]);
    caso("GET/PUT contenido: la edición no muestra créditos", !JSON.stringify(guardado).includes("credito"), guardado);
  }
  const guardadoAdmin = await svc.editarContenidoEspecie(ADMIN, P, NEGUNDO, cuerpo, TOKEN);
  caso("PUT contenido: el Administrador (no miembro) también edita", guardadoAdmin?.updated_by === ADMIN.id);

  // --- Foto referencial: solo si la especie no tiene una. Este bloque la
  // pone y la quita (borra el archivo): con una foto real cargada, la perdería.
  if (visto?.foto_referencial) {
    console.log("OMITIDO: fotos de la especie — el negundo ya tiene foto referencial; este bloque la borraría");
  } else {
  const conRef = await svc.fijarFotoContenidoEspecie(MUNI, P, NEGUNDO, "referencial", { temporal: false }, foto, TOKEN);
  const urlRef = conRef?.foto_referencial?.url;
  const { data: filaRef } = await supabaseAdmin.from("species_public_content").select("credito_foto_referencial").eq("species_id", NEGUNDO).single();
  caso("PUT foto referencial: se publica y queda guardada como «SIVU»", filaRef?.credito_foto_referencial === "SIVU" && (await existe(urlRef)), filaRef);
  const bajada = Buffer.from(await (await fetch(urlRef!)).arrayBuffer());
  const meta = await sharp(bajada).metadata();
  caso("PUT foto referencial: WebP de 1600 px sin metadatos", meta.format === "webp" && meta.width === 1600 && !meta.exif && !meta.icc, { format: meta.format, width: meta.width, exif: !!meta.exif });
  caso("PUT foto: temporal en un rasgo → 400", (await status(() => svc.fijarFotoContenidoEspecie(MUNI, P, NEGUNDO, "hoja", { temporal: true }, foto, TOKEN))) === 400);
  caso("PUT foto: rasgo inexistente → 404 y no queda archivo", (await status(() => svc.fijarFotoContenidoEspecie(MUNI, P, NEGUNDO, "no-existe", { temporal: false }, foto, TOKEN))) === 404);
  await svc.quitarFotoContenidoEspecie(MUNI, P, NEGUNDO, "referencial", TOKEN);
  const sinRef = await svc.verContenidoEspecie(MUNI, P, NEGUNDO, TOKEN);
  // En el bucket, no por la URL pública: la CDN puede seguir sirviendo la copia unos minutos.
  const { data: especies } = await supabaseAdmin.storage.from("conecta-publico").list("especies", { limit: 1000 });
  const nombreRef = urlRef!.split("/conecta-publico/")[1];
  caso("DELETE foto referencial: se quita y el archivo se borra del bucket", sinRef?.foto_referencial === null && !(especies ?? []).some((o: { name: string }) => `especies/${o.name}` === nombreRef), especies);
  }

  // --- Ficha del árbol
  const vistaFicha = await svc.verFichaArbol(INSP, P, TREE, TOKEN);
  caso("GET ficha árbol: sin fila, interruptores en No y vista previa", vistaFicha.ficha.mostrar_dap === false && vistaFicha.vista_previa.nombre_visualizacion === "Arce negundo", vistaFicha.ficha);
  caso("GET ficha árbol: árbol de otro proyecto → 404", (await status(() => svc.verFichaArbol(MUNI, "18b647e8-7b5e-44a4-ac02-a5a6a2b4f7d8", TREE, TOKEN))) === 404);
  const bodyArbol = fichaPublicaArbolSchema.parse({
    mostrar_dap: true,
    mostrar_altura_total: true,
    historia: "Prueba del recorrido: se borra al terminar.",
    textos_personalizados: { consejo: { texto: "Prueba de consejo personalizado.", fuente: null } },
  });
  caso("PUT ficha árbol: el Inspector recibe 403", (await status(() => svc.editarFichaArbol(INSP, P, TREE, bodyArbol, TOKEN))) === 403);
  const conFicha = await svc.editarFichaArbol(MUNI, P, TREE, bodyArbol, TOKEN);
  caso(
    "PUT ficha árbol: guarda; la vista previa muestra historia y consejo personalizado, y ninguna medida sin valor",
    conFicha.vista_previa.ejemplar.historia === bodyArbol.historia &&
      conFicha.vista_previa.contenido_especie?.consejo === "Prueba de consejo personalizado." &&
      JSON.stringify(conFicha.vista_previa.medidas) === JSON.stringify(Object.fromEntries(Object.entries({ dap_cm: vistaFicha.medidas_vigentes.dap_cm, altura_total_m: vistaFicha.medidas_vigentes.altura_total_m }).filter(([, v]) => v !== null).map(([k]) => [k, conFicha.vista_previa.medidas[k]]))),
    conFicha.vista_previa
  );
  const conFoto = await svc.fijarFotoFichaArbol(MUNI, P, TREE, foto, TOKEN);
  const urlArbol = conFoto.ficha.foto?.url;
  caso("PUT foto árbol: pasa a ser la foto principal (ejemplar)", conFoto.vista_previa.foto_principal?.tipo === "ejemplar" && (await existe(urlArbol)), conFoto.vista_previa.foto_principal);
  caso("PUT foto árbol: ruta aleatoria, sin código del árbol", /\/arboles\/[0-9a-f-]{36}\.webp$/.test(urlArbol ?? "") && !(urlArbol ?? "").includes("A-000352"));
  const cache = (await fetch(urlArbol!)).headers.get("cache-control");
  caso("PUT foto árbol: caché pública de 5 minutos", /max-age=300\b/.test(cache ?? ""), cache);
  await svc.quitarFotoFichaArbol(MUNI, P, TREE, TOKEN);
  const sinFoto = await svc.verFichaArbol(MUNI, P, TREE, TOKEN);
  const nombre = urlArbol!.split("/conecta-publico/")[1];
  const { data: listado } = await supabaseAdmin.storage.from("conecta-publico").list("arboles");
  caso("DELETE foto árbol: se quita y el archivo se borra del bucket", sinFoto.ficha.foto === null && !(listado ?? []).some((o: { name: string }) => `arboles/${o.name}` === nombre), listado);

  console.log(`\n${ok} OK, ${fallas.length} fallas`);
  fallas.forEach((f) => console.log("  ", f));
})().catch((e) => {
  console.error("ERROR", e);
  process.exit(1);
});
