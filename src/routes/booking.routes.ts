import { Router } from 'express';
import BookingController from '../controllers/booking.controller';
import { checkUserAuth } from '../middleware/check-user-auth.middleware';
// import { validationMiddleware } from '../middleware/validation.middleware';

const router = Router();

/**
 * Public endpoints (no auth required for basic seat availability)
 */
router.get('/routes/:routeId/seats', BookingController.getSeatAvailability);
router.get('/health', BookingController.healthCheck);

/**
 * Protected endpoints (require authentication)
 */
router.post('/routes/:routeId/seats/:seatLabel/hold', 
  checkUserAuth, 
  BookingController.holdSeat
);

router.delete('/routes/:routeId/seats/:seatLabel/hold', 
  checkUserAuth, 
  BookingController.releaseSeat
);

router.post('/confirm', 
  checkUserAuth, 
  BookingController.confirmBooking
);

router.get('/holds', 
  checkUserAuth, 
  BookingController.getCurrentHolds
);

export default router;
