import { AuthenticatedUser } from "./auth";

declare global {
  namespace Express {
    interface Request {
      /**
       * Presente únicamente en rutas protegidas por auth.middleware.ts.
       * No asumir que existe en rutas públicas.
       */
      user?: AuthenticatedUser;
      /**
       * JWT crudo ya validado por auth.middleware.ts. Presente únicamente
       * en rutas protegidas, igual que `user`. Se usa para instanciar un
       * cliente de Supabase alcanzado (scoped) al usuario, de modo que
       * RLS se evalúe con su identidad en vez de con `service_role`.
       */
      accessToken?: string;
    }
  }
}

export {};
