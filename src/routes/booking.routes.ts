import { Router } from 'express';
import { checkUserAuth } from '../middleware/check-user-auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { bookSeats } from '../controllers/booking.controller';
import { confirmStripePayment } from '../controllers/stripe-payment.controller';
import { bookSeatsSchema, confirmStripePaymentSchema } from '../validators/bookingValidators';

const router = Router();

// Book seats endpoint with validation
router.post("/book-seats", checkUserAuth, validateBody(bookSeatsSchema), bookSeats);

// Confirm Stripe payment endpoint with validation
router.post("/confirm-stripe-payment", checkUserAuth, validateBody(confirmStripePaymentSchema), confirmStripePayment);

export default router;