import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import {
  incidenciaParamsSchema,
  listarIncidenciasQuerySchema,
  qrTokenParamSchema,
  reporteCiudadanoSchema,
  revisionIncidenciaSchema,
  seguimientoSchema,
} from "../../schemas/sivu/conecta.schema";
import { proyectoIdParamSchema } from "../../schemas/sivu/proyectos.schema";
import { ARBOL_NO_ENCONTRADO, consultarSeguimiento, crearReporteCiudadano, fichaPublica } from "../../services/sivu/conecta.service";
import { detalleIncidencia, listarIncidencias, revisar } from "../../services/sivu/incidencia.service";
import { generarPlacasQr } from "../../services/sivu/placasQr.service";
import { catalogosVigentes } from "../../services/sivu/diagnostico.service";

const primerMensaje = (r: { error: { issues: Array<{ message: string }> } }) => r.error.issues[0]?.message ?? "Datos inválidos";

/** QR mal formado: misma respuesta que inexistente (CC-062). */
function qrToken(req: Request): string {
  const p = qrTokenParamSchema.safeParse(req.params);
  if (!p.success) throw new AppError(ARBOL_NO_ENCONTRADO, 404);
  return p.data.qrToken;
}

/**
 * GET /api/sivu/conecta/catalogos — público. Solo `tipo_incidencia`
 * (D-180), con la misma forma que B15; el resto de los catálogos sigue
 * detrás de la sesión (GET /api/sivu/catalogs).
 */
export function catalogosPublicosController(_req: Request, res: Response): void {
  res.status(200).json({ data: { tipo_incidencia: catalogosVigentes().tipo_incidencia ?? [] } });
}

/** GET /api/sivu/conecta/arboles/:qrToken — público. */
export async function fichaPublicaController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json({ data: await fichaPublica(qrToken(req)) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/sivu/conecta/arboles/:qrToken/incidencias — público, multipart. */
export async function reporteCiudadanoController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = qrToken(req);
    const body = reporteCiudadanoSchema.safeParse(req.body);
    if (!body.success) throw new AppError(primerMensaje(body), 400);
    const archivos = ((req.files as Express.Multer.File[] | undefined) ?? []).map((f) => ({ buffer: f.buffer, mimetype: f.mimetype }));
    res.status(201).json({ data: await crearReporteCiudadano(token, body.data, archivos) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/sivu/conecta/seguimiento — público; el código va en el cuerpo. */
export async function seguimientoController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = seguimientoSchema.safeParse(req.body ?? {});
    res.status(200).json({ data: await consultarSeguimiento(body.success ? body.data.codigo : undefined) });
  } catch (err) {
    next(err);
  }
}

/** B9 — GET /api/sivu/projects/:id/incidencias */
export async function listarIncidenciasController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = proyectoIdParamSchema.safeParse(req.params);
    if (!params.success) throw new AppError(primerMensaje(params), 400);
    const query = listarIncidenciasQuerySchema.safeParse(req.query);
    if (!query.success) throw new AppError(primerMensaje(query), 400);
    res.status(200).json(await listarIncidencias(req.user!, params.data.id, query.data, req.accessToken!));
  } catch (err) {
    next(err);
  }
}

/** B9 — GET /api/sivu/projects/:id/incidencias/:incidentId */
export async function detalleIncidenciaController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = incidenciaParamsSchema.safeParse(req.params);
    if (!params.success) throw new AppError(primerMensaje(params), 400);
    res.status(200).json({ data: await detalleIncidencia(req.user!, params.data.id, params.data.incidentId, req.accessToken!) });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/sivu/projects/:id/incidencias/:incidentId/revision */
export async function revisarIncidenciaController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = incidenciaParamsSchema.safeParse(req.params);
    if (!params.success) throw new AppError(primerMensaje(params), 400);
    const body = revisionIncidenciaSchema.safeParse(req.body);
    if (!body.success) throw new AppError(primerMensaje(body), 400);
    res.status(200).json({ data: await revisar(req.user!, params.data.id, params.data.incidentId, body.data, req.accessToken!) });
  } catch (err) {
    next(err);
  }
}

/** GET /api/sivu/projects/:id/placas-qr — PDF. */
export async function placasQrController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = proyectoIdParamSchema.safeParse(req.params);
    if (!params.success) throw new AppError(primerMensaje(params), 400);
    const pdf = await generarPlacasQr(req.user!, params.data.id, req.accessToken!);
    res.status(200).set({ "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="placas-qr.pdf"' }).send(pdf);
  } catch (err) {
    next(err);
  }
}
