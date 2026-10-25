import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import {
  buscarEspeciesQuerySchema,
  completarEspecieSchema,
  especieIdParamSchema,
  renombrarEspecieSchema,
} from "../../schemas/sivu/especies.schema";
import { proyectoIdParamSchema } from "../../schemas/sivu/proyectos.schema";
import { buscarEspecies, completarEspecie, renombrarEspecie } from "../../services/sivu/species.service";

/** GET /api/sivu/projects/:id/species?nombre=... — búsqueda (#73) */
export async function buscarEspeciesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedParams = proyectoIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(parsedParams.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    }

    const parsedQuery = buscarEspeciesQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      throw new AppError(parsedQuery.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    }

    const data = await buscarEspecies(req.user!, parsedParams.data.id, parsedQuery.data.nombre, req.accessToken!);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/sivu/projects/:id/species/:speciesId — completar (#73) */
export async function completarEspecieController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedParams = proyectoIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(parsedParams.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    }

    const parsedSpeciesId = especieIdParamSchema.safeParse({ id: req.params.speciesId });
    if (!parsedSpeciesId.success) {
      throw new AppError(parsedSpeciesId.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    }

    const parsedBody = completarEspecieSchema.safeParse(req.body);
    if (!parsedBody.success) {
      throw new AppError(parsedBody.error.issues[0]?.message ?? "Datos inválidos", 400);
    }

    const data = await completarEspecie(
      req.user!,
      parsedParams.data.id,
      parsedSpeciesId.data.id,
      parsedBody.data,
      req.accessToken!
    );
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/sivu/projects/:id/species/:speciesId/nombre — corregir (#73) */
export async function renombrarEspecieController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedParams = proyectoIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(parsedParams.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    }

    const parsedSpeciesId = especieIdParamSchema.safeParse({ id: req.params.speciesId });
    if (!parsedSpeciesId.success) {
      throw new AppError(parsedSpeciesId.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    }

    const parsedBody = renombrarEspecieSchema.safeParse(req.body);
    if (!parsedBody.success) {
      throw new AppError(parsedBody.error.issues[0]?.message ?? "Datos inválidos", 400);
    }

    const data = await renombrarEspecie(
      req.user!,
      parsedParams.data.id,
      parsedSpeciesId.data.id,
      parsedBody.data,
      req.accessToken!
    );
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}
