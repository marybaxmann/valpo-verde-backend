/**
 * Error controlado con código HTTP explícito. Se usa en toda la capa de
 * services para que error.middleware.ts sepa qué status responder, en vez
 * de que cada controller tenga que interpretar el tipo de error.
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}
