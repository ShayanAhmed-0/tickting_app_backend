import { Router } from "express";
import { checkAdminAuth } from "../../middleware/check-admin-auth.middleware";
import { validateBody } from "../../middleware/validation.middleware";
import { createDriverSchema } from "../../validators/adminValidators/driver.validator";
import { createDriver } from "../../controllers/admin/driver.controller";

const router = Router();

router.post("/create", checkAdminAuth, validateBody(createDriverSchema), createDriver);

export default router;