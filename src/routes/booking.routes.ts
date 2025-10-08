import { Router } from 'express';
import { checkUserAuth } from '../middleware/check-user-auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { bookSeats } from '../controllers/booking.controller';
// import { validationMiddleware } from '../middleware/validation.middleware';

const router = Router();


// router.post("/book-seats", checkUserAuth, validateBody(bookSeatsSchema), bookSeats);
router.post("/book-seats", checkUserAuth, bookSeats);
export default router;