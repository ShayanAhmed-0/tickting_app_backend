import { Router } from "express";
import { checkDriverAuth } from "../middleware/check-driver-auth.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { verifyTicket, addBaggage, getPassengersCount } from "../controllers/driver.controller";
import { verifyTicketSchema, addBaggageSchema } from "../validators/driverValidators";

const router = Router();

router.post("/verify-ticket", checkDriverAuth, validateBody(verifyTicketSchema), verifyTicket);
router.post("/add-baggage", checkDriverAuth, validateBody(addBaggageSchema), addBaggage);
router.get("/passengers-count", checkDriverAuth, getPassengersCount);

export default router;
