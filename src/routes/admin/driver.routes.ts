import { Router } from "express";
import { checkAdminAuth } from "../../middleware/check-admin-auth.middleware";
import { validateBody } from "../../middleware/validation.middleware";
import { createDriverSchema } from "../../validators/adminValidators/driver.validator";
import { createDriver, getDrivers } from "../../controllers/admin/driver.controller";

const router = Router();

router.post("/create", checkAdminAuth, validateBody(createDriverSchema), createDriver);
router.get("/", checkAdminAuth, getDrivers);

export default router;