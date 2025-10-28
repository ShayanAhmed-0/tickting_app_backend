import { Router } from "express";
// import { createServices } from "../../controllers/admin/misc.controller";
import { getDashboard } from "../../controllers/admin/misc.controller";
import { checkAdminAuth } from "../../middleware/check-admin-auth.middleware";
import { handleMediaFiles, handleMediaFilesLocal } from "../../utils/Mutlipart";
import { checkUserAuth } from "../../middleware/check-user-auth.middleware";

const router = Router();

// router.post("/create-services", checkUserAuth, handleMediaFilesLocal.fields([
//     { name: "icon", maxCount: 1 },
// ]), createServices);
router.get("/dashboard", checkAdminAuth, getDashboard);

export default router;
