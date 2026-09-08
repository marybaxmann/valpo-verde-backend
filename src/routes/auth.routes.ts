import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { getMe } from "../controllers/auth.controller";

const router = Router();

// No existe POST /auth/login: el login ocurre en el frontend directamente
// contra Supabase Auth. Este backend solo valida el token resultante.
router.get("/me", authMiddleware, getMe);

export default router;
