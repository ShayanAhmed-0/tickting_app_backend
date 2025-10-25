import { Router } from "express";
import { checkAdminAuth } from "../../middleware/check-admin-auth.middleware";
import { validateQuery } from "../../middleware/validation.middleware";
import { getRouteSeatReport, getSalesReport } from "../../controllers/admin/report.controller";
import { routeSeatReportSchema, salesReportSchema } from "../../validators/adminValidators/report.validator";

const router = Router();

router.get("/route-seat-report", checkAdminAuth, validateQuery(routeSeatReportSchema), getRouteSeatReport);

router.get("/sales-report", checkAdminAuth, validateQuery(salesReportSchema), getSalesReport);

export default router;
