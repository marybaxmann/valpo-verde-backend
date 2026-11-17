import { NextFunction, Request, Response } from "express";
import { ZodTypeAny, z } from "zod";
import { AppError } from "../../utils/AppError";
import {
  arbolProyectoParamSchema,
  confirmarSubidaSchema,
  fotoArbolParamSchema,
  inspectionIdParamSchema,
  solicitarSubidaSchema,
  subirFotoArbolSchema,
} from "../../schemas/sivu/fotos.schema";
import { asignarLegacyIdSchema, corregirUbicacionSchema } from "../../schemas/sivu/arboles.schema";
import {
  confirmarSubidaArbol,
  confirmarSubidaInspeccion,
  listarFotosArbol,
  solicitarSubidaArbol,
  solicitarSubidaInspeccion,
  subirFotoArbol,
} from "../../services/sivu/photo.service";
import { asignarLegacyId, corregirUbicacion } from "../../services/sivu/tree.service";

/**
 * Controladores de la 039: fotos de registro del árbol, carga firmada,
 * corrección de ubicación y legacy_id. La ficha pública de Valpo Verde
 * Conecta no se modifica aquí.
 */

function validar<S extends ZodTypeAny>(schema: S, valor: unknown, porDefecto: string): z.infer<S> {
  const r = schema.safeParse(valor);
  if (!r.success) {
    throw new AppError(r.error.issues[0]?.message ?? porDefecto, 400);
  }
  return r.data;
}

type Manejador = (req: Request) => Promise<{ status?: number; data: unknown }>;

function controlador(fn: Manejador) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status, data } = await fn(req);
      res.status(status ?? 200).json({ data });
    } catch (err) {
      next(err);
    }
  };
}

/** GET /api/sivu/projects/:id/trees/:treeId/photos */
export const listarFotosArbolController = controlador(async (req) => {
  const p = validar(arbolProyectoParamSchema, req.params, "Parámetros inválidos");
  return { data: await listarFotosArbol(req.user!, p.id, p.treeId, req.accessToken!) };
});

/** POST /api/sivu/projects/:id/trees/:treeId/photos (multipart, campo «foto») */
export const subirFotoArbolController = controlador(async (req) => {
  const p = validar(arbolProyectoParamSchema, req.params, "Parámetros inválidos");
  const body = validar(subirFotoArbolSchema, req.body, "Datos inválidos");
  if (!req.file) {
    throw new AppError("Falta el archivo de la foto (campo 'foto')", 400);
  }
  const data = await subirFotoArbol(req.user!, p.id, p.treeId, body, { buffer: req.file.buffer, mimetype: req.file.mimetype }, req.accessToken!);
  return { status: 201, data };
});

/** POST /api/sivu/projects/:id/trees/:treeId/photos/upload-url */
export const solicitarSubidaArbolController = controlador(async (req) => {
  const p = validar(arbolProyectoParamSchema, req.params, "Parámetros inválidos");
  const body = validar(solicitarSubidaSchema, req.body, "Datos inválidos");
  return { status: 201, data: await solicitarSubidaArbol(req.user!, p.id, p.treeId, body, req.accessToken!) };
});

/** POST /api/sivu/projects/:id/trees/:treeId/photos/confirm */
export const confirmarSubidaArbolController = controlador(async (req) => {
  const p = validar(arbolProyectoParamSchema, req.params, "Parámetros inválidos");
  const body = validar(confirmarSubidaSchema, req.body, "Datos inválidos");
  return { status: 201, data: await confirmarSubidaArbol(req.user!, p.id, p.treeId, body, req.accessToken!) };
});

/** POST /api/sivu/inspections/:inspectionId/photos/upload-url */
export const solicitarSubidaInspeccionController = controlador(async (req) => {
  const p = validar(inspectionIdParamSchema, req.params, "Parámetros inválidos");
  const body = validar(solicitarSubidaSchema, req.body, "Datos inválidos");
  return { status: 201, data: await solicitarSubidaInspeccion(req.user!, p.inspectionId, body, req.accessToken!) };
});

/** POST /api/sivu/inspections/:inspectionId/photos/confirm */
export const confirmarSubidaInspeccionController = controlador(async (req) => {
  const p = validar(inspectionIdParamSchema, req.params, "Parámetros inválidos");
  const body = validar(confirmarSubidaSchema, req.body, "Datos inválidos");
  return { status: 201, data: await confirmarSubidaInspeccion(req.user!, p.inspectionId, body, req.accessToken!) };
});

/** PATCH /api/sivu/projects/:id/trees/:treeId/ubicacion */
export const corregirUbicacionController = controlador(async (req) => {
  const p = validar(arbolProyectoParamSchema, req.params, "Parámetros inválidos");
  const body = validar(corregirUbicacionSchema, req.body, "Datos inválidos");
  return { data: await corregirUbicacion(req.user!, p.id, p.treeId, body, req.accessToken!) };
});

/** PATCH /api/sivu/projects/:id/trees/:treeId/legacy-id */
export const asignarLegacyIdController = controlador(async (req) => {
  const p = validar(arbolProyectoParamSchema, req.params, "Parámetros inválidos");
  const body = validar(asignarLegacyIdSchema, req.body, "Datos inválidos");
  return { data: await asignarLegacyId(req.user!, p.id, p.treeId, body, req.accessToken!) };
});
