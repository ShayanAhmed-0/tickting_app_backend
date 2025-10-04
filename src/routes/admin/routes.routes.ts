import { Router } from "express";
import { checkAdminAuth } from "../../middleware/check-admin-auth.middleware";
import { validateBody } from "../../middleware/validation.middleware";
import { createRouteSchema } from "../../validators/adminValidators/routes.validator";
import { createRoute, getRoutes, getRouteFilterOptions, searchRoutes, getRouteById } from "../../controllers/admin/routes.controller";

const router = Router();

router.post("/create", checkAdminAuth, validateBody(createRouteSchema), createRoute);
router.get("/", checkAdminAuth, getRoutes);
router.get("/id/:id", checkAdminAuth, getRouteById);
router.get("/filter-options", checkAdminAuth, getRouteFilterOptions);
router.get("/search", checkAdminAuth, searchRoutes);

export default router;
