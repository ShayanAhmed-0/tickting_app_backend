import { Router } from "express";
import { checkAdminAuth } from "../../middleware/check-admin-auth.middleware";
import { validateBody } from "../../middleware/validation.middleware";
import { createSalesOfficeSchema } from "../../validators/adminValidators/sales-office.validator";
import { createSalesOffice, getOffices } from "../../controllers/admin/sales-office.controller";
const router = Router();

router.post("/create", checkAdminAuth, validateBody(createSalesOfficeSchema), createSalesOffice);
router.get("/", checkAdminAuth, getOffices);

export default router;
