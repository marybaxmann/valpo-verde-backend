import { AuthenticatedUser } from "./auth";

declare global {
  namespace Express {
    interface Request {
      /**
       * Presente únicamente en rutas protegidas por auth.middleware.ts.
       * No asumir que existe en rutas públicas.
       */
      user?: AuthenticatedUser;
    }
  }
}

export {};
