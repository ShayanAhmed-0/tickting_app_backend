import { Router } from "express";
import { checkAdminAuth } from "../../middleware/check-admin-auth.middleware";
import { validateQuery } from "../../middleware/validation.middleware";
import { getRouteSeatReport } from "../../controllers/admin/report.controller";
import { routeSeatReportSchema } from "../../validators/adminValidators/report.validator";

const router = Router();

router.get("/route-seat-report", checkAdminAuth, validateQuery(routeSeatReportSchema), getRouteSeatReport);

export default router;
