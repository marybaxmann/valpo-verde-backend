import { NextFunction, Request, Response } from "express";
import multer, { MulterError } from "multer";
import { AppError } from "../utils/AppError";

/**
 * Recepción de archivos (CC-049 punto 4). En memoria, nunca a disco: el
 * backend verifica el contenido real con `sharp` antes de subirlo a
 * Storage, no necesita conservarlo en el filesystem del servidor.
 *
 * `fileSize` en bytes (10 MB) — primera barrera, en el backend; la
 * segunda es `file_size_limit` del bucket (migración 019). Un archivo
 * más grande nunca llega a `sharp` ni a Storage.
 */
const MAX_FOTO_BYTES = 10 * 1024 * 1024;

const uploadFoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FOTO_BYTES, files: 1 },
});

/**
 * Middleware para un único archivo en el campo `foto` del
 * `multipart/form-data`. Traduce el error de Multer (p. ej. archivo
 * demasiado grande) a `AppError` — `error.middleware.ts` solo sabe
 * responder `AppError`, cualquier otro error cae a 500 genérico.
 */
export function subirFotoUnica(req: Request, res: Response, next: NextFunction): void {
  uploadFoto.single("foto")(req, res, (err: unknown) => traducirErrorMulter(err, next));
}

/** Máximo de fotos por reporte ciudadano (D-183 pide al menos una; el máximo, decisión de la responsable, 2026-10-31). */
export const MAX_FOTOS_REPORTE = 3;

const uploadFotosReporte = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FOTO_BYTES, files: MAX_FOTOS_REPORTE },
});

/** Hasta MAX_FOTOS_REPORTE archivos en el campo `fotos` (formulario ciudadano, #62). */
export function subirFotosReporte(req: Request, res: Response, next: NextFunction): void {
  uploadFotosReporte.array("fotos", MAX_FOTOS_REPORTE)(req, res, (err: unknown) => traducirErrorMulter(err, next, MAX_FOTOS_REPORTE));
}

/**
 * Máximo de fotos por ejecución de mantenimiento: D-224 exige al menos una
 * y no fija máximo; 10 es un tope técnico de la solicitud, no una regla.
 */
export const MAX_FOTOS_EJECUCION = 10;

const uploadFotosEjecucion = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FOTO_BYTES, files: MAX_FOTOS_EJECUCION },
});

/** Hasta MAX_FOTOS_EJECUCION archivos en el campo `fotos` (ejecución de mantenimiento, #61). */
export function subirFotosEjecucion(req: Request, res: Response, next: NextFunction): void {
  uploadFotosEjecucion.array("fotos", MAX_FOTOS_EJECUCION)(req, res, (err: unknown) => traducirErrorMulter(err, next, MAX_FOTOS_EJECUCION));
}

function traducirErrorMulter(err: unknown, next: NextFunction, maxFotos = 1): void {
  if (!err) {
    next();
    return;
  }
  if (err instanceof MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      next(new AppError("La foto supera el máximo de 10 MB", 413));
      return;
    }
    if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
      next(new AppError(`Se admiten hasta ${maxFotos} fotos, en el campo «fotos»`, 400));
      return;
    }
    next(new AppError(`Archivo inválido: ${err.message}`, 400));
    return;
  }
  next(err);
}
