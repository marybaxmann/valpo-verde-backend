import { NextFunction, Request, Response } from "express";
import { listSpecies } from "../services/species.service";

/** GET /api/species — requiere authMiddleware. */
export async function getSpecies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await listSpecies(req.accessToken!));
  } catch (err) {
    next(err);
  }
}
