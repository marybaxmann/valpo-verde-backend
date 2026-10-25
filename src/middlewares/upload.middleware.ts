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
  uploadFoto.single("foto")(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        next(new AppError("La foto supera el máximo de 10 MB", 413));
        return;
      }
      next(new AppError(`Archivo inválido: ${err.message}`, 400));
      return;
    }
    next(err);
  });
}
