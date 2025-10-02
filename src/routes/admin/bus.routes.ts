import { Router } from "express";
import { checkAdminAuth } from "../../middleware/check-admin-auth.middleware";
import { validateBody } from "../../middleware/validation.middleware";
import { createBusSchema } from "../../validators/adminValidators/bus.validator";
import { createBus, getBuses } from "../../controllers/admin/bus.controller";

const router = Router();

router.post("/create", checkAdminAuth, validateBody(createBusSchema), createBus);
router.get("/", checkAdminAuth, getBuses);

export default router;
