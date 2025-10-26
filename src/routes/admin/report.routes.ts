import { Router } from "express";
import { checkAdminAuth } from "../../middleware/check-admin-auth.middleware";
import { validateQuery } from "../../middleware/validation.middleware";
import { getRouteSeatReport, getSalesReport, getDriversReport } from "../../controllers/admin/report.controller";
import { routeSeatReportSchema, salesReportSchema, driversReportSchema } from "../../validators/adminValidators/report.validator";

const router = Router();

router.get("/route-seat-report", checkAdminAuth, validateQuery(routeSeatReportSchema), getRouteSeatReport);

router.get("/sales-report", checkAdminAuth, validateQuery(salesReportSchema), getSalesReport);

router.get("/drivers-report", checkAdminAuth, validateQuery(driversReportSchema), getDriversReport);

export default router;
