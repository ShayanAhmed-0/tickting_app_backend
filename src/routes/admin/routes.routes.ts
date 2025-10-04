import { Router } from "express";
import { checkAdminAuth } from "../../middleware/check-admin-auth.middleware";
import { validateBody } from "../../middleware/validation.middleware";
import { createRouteSchema } from "../../validators/adminValidators/routes.validator";
import { createRoute, getRoutes } from "../../controllers/admin/routes.controller";

const router = Router();

router.post("/create", checkAdminAuth, validateBody(createRouteSchema), createRoute);
router.get("/", checkAdminAuth, getRoutes);

export default router;
