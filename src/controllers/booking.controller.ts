import { Request, Response } from 'express';
import seatBookingService from '../services/seatBooking.service';
import { checkUserAuth } from '../middleware/check-user-auth.middleware';

/**
 * Booking Controller for seat-related operations
 */
export class BookingController {
  
  /**
   * Get seat availability for a route
   * GET /api/routes/:routeId/seats
   */
  public getSeatAvailability = async (req: Request, res: Response) => {
    try {
      const { routeId } = req.params;
      
      if (!routeId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Route ID is required' 
        });
      }
      
      const seats = await seatBookingService.getSeatAvailability(routeId);
      
      res.json({
        success: true,
        data: {
          routeId,
          seats,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Error fetching seat availability:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch seat availability'
      });
    }
  };

  /**
   * Hold a seat (REST fallback)
   * POST /api/trips/:tripId/seats/:seatLabel/hold
   */
  public holdSeat = async (req: Request, res: Response) => {
    try {
      const { tripId, seatLabel,busId } = req.params;
      const userId = (req as any).user?.id; // From auth middleware
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      const result = await seatBookingService.holdSeat(busId, tripId, seatLabel, userId);
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            tripId,
            seatLabel,
            expiresAt: result.expiresAt,
            extended: result.extended || false
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.reason
        });
      }
      
    } catch (error) {
      console.error('Error holding seat:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to hold seat'
      });
    }
  };

  /**
   * Release a seat hold (REST fallback)
   * DELETE /api/routes/:routeId/seats/:seatLabel/hold
   */
  public releaseSeat = async (req: Request, res: Response) => {
    try {
      const { routeId, seatLabel, busId } = req.params;
      const userId = (req as any).user?.id; // From auth middleware
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      const result = await seatBookingService.releaseSeat(busId, routeId, seatLabel, userId);
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            routeId,
            seatLabel,
            released: true
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.reason
        });
      }
      
    } catch (error) {
      console.error('Error releasing seat:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to release seat'
      });
    }
  };

  /**
   * Confirm booking
   * POST /api/bookings/confirm
   */
  public confirmBooking = async (req: Request, res: Response) => {
    try {
      const { routeId, seatLabels, passengers, paymentInfo } = req.body;
      const userId = (req as any).user?.id; // From auth middleware
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      const result = await seatBookingService.confirmBooking(
        userId,
        routeId,
        seatLabels,
        passengers,
        paymentInfo
      );
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            bookingId: result.bookingId,
            routeId,
            seatLabels,
            confirmedAt: new Date().toISOString()
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.reason
        });
      }
      
    } catch (error) {
      console.error('Error confirming booking:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm booking'
      });
    }
  };

  /**
   * Get user's current holds
   * GET /api/bookings/holds
   */
  public getCurrentHolds = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id; // From auth middleware
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      const holds = await seatBookingService.getUserHolds(userId);
      
      res.json({
        success: true,
        data: {
          holds,
          count: holds.length,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Error getting holds:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get current holds'
      });
    }
  };

  /**
   * Health check for seat booking service
   * GET /api/bookings/health
   */
  public healthCheck = async (req: Request, res: Response) => {
    try {
      // Test Redis connection
      await seatBookingService.getSeatAvailability('test');
      
      res.json({
        success: true,
        message: 'Seat booking service is healthy',
        timestamp: new Date().toISOString(),
        services: {
          redis: 'connected',
          database: 'connected'
        }
      });
      
    } catch (error) {
      res.status(503).json({
        success: false,
        message: 'Seat booking service is unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

export default new BookingController();
