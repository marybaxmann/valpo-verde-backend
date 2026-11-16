import { NextFunction, Request, Response } from "express";
import { ZodTypeAny, z } from "zod";
import { AppError } from "../../utils/AppError";
import {
  arbolFichaParamsSchema,
  contenidoEspecieSchema,
  especieContenidoParamsSchema,
  especieFotoParamsSchema,
  fichaPublicaArbolSchema,
  fotoEspecieBodySchema,
} from "../../schemas/sivu/fichaPublica.schema";
import {
  editarContenidoEspecie,
  editarFichaArbol,
  fijarFotoContenidoEspecie,
  fijarFotoFichaArbol,
  quitarFotoContenidoEspecie,
  quitarFotoFichaArbol,
  verContenidoEspecie,
  verFichaArbol,
} from "../../services/sivu/fichaPublica.service";

/** Ficha pública editable (CC-073; PR-022 v3.0). */

function validar<S extends ZodTypeAny>(schema: S, valor: unknown): z.infer<S> {
  const r = schema.safeParse(valor);
  if (!r.success) {
    const issue = r.error.issues[0];
    const ruta = issue?.path.length ? `${issue.path.join(".")}: ` : "";
    throw new AppError(issue ? `${ruta}${issue.message}` : "Datos inválidos", 400);
  }
  return r.data;
}

const archivo = (req: Request) => (req.file as Express.Multer.File | undefined)?.buffer;

/** GET /api/sivu/projects/:id/species/:speciesId/contenido-publico */
export async function verContenidoEspecieController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const p = validar(especieContenidoParamsSchema, req.params);
    res.status(200).json({ data: await verContenidoEspecie(req.user!, p.id, p.speciesId, req.accessToken!) });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/sivu/projects/:id/species/:speciesId/contenido-publico */
export async function editarContenidoEspecieController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const p = validar(especieContenidoParamsSchema, req.params);
    const body = validar(contenidoEspecieSchema, req.body);
    res.status(200).json({ data: await editarContenidoEspecie(req.user!, p.id, p.speciesId, body, req.accessToken!) });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/sivu/projects/:id/species/:speciesId/contenido-publico/fotos/:ranura — multipart. */
export async function fijarFotoEspecieController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const p = validar(especieFotoParamsSchema, req.params);
    const body = validar(fotoEspecieBodySchema, req.body ?? {});
    res.status(200).json({ data: await fijarFotoContenidoEspecie(req.user!, p.id, p.speciesId, p.ranura, body, archivo(req), req.accessToken!) });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/sivu/projects/:id/species/:speciesId/contenido-publico/fotos/:ranura */
export async function quitarFotoEspecieController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const p = validar(especieFotoParamsSchema, req.params);
    await quitarFotoContenidoEspecie(req.user!, p.id, p.speciesId, p.ranura, req.accessToken!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** GET /api/sivu/projects/:id/trees/:treeId/ficha-publica */
export async function verFichaArbolController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const p = validar(arbolFichaParamsSchema, req.params);
    res.status(200).json({ data: await verFichaArbol(req.user!, p.id, p.treeId, req.accessToken!) });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/sivu/projects/:id/trees/:treeId/ficha-publica */
export async function editarFichaArbolController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const p = validar(arbolFichaParamsSchema, req.params);
    const body = validar(fichaPublicaArbolSchema, req.body);
    res.status(200).json({ data: await editarFichaArbol(req.user!, p.id, p.treeId, body, req.accessToken!) });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/sivu/projects/:id/trees/:treeId/ficha-publica/foto — multipart. */
export async function fijarFotoArbolController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const p = validar(arbolFichaParamsSchema, req.params);
    res.status(200).json({ data: await fijarFotoFichaArbol(req.user!, p.id, p.treeId, archivo(req), req.accessToken!) });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/sivu/projects/:id/trees/:treeId/ficha-publica/foto */
export async function quitarFotoArbolController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const p = validar(arbolFichaParamsSchema, req.params);
    await quitarFotoFichaArbol(req.user!, p.id, p.treeId, req.accessToken!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
