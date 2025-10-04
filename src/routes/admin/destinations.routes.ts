import { Router } from "express";
import { checkAdminAuth } from "../../middleware/check-admin-auth.middleware";
import { validateBody } from "../../middleware/validation.middleware";
import { createDestinationSchema } from "../../validators/adminValidators/destinations.validator";
import { createDestinations, getDestinations } from "../../controllers/admin/destinations.controller";

const router = Router();

router.post("/create", checkAdminAuth, validateBody(createDestinationSchema), createDestinations);
router.get("/", checkAdminAuth, getDestinations);

export default router;
