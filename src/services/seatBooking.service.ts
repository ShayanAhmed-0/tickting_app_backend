import Route from '../models/route.model';
import Booking from '../models/booking.model';
import SeatHold from '../models/seat-hold.model';
import Bus from '../models/bus.model';
import { redis, RedisKeys } from '../config/redis';
import { BookingStatus, PaymentStatus, SeatStatus } from '../models/common/types';
import { SEAT_HOLD_DURATION } from '../config/environment';
import BusModel from '../models/bus.model';
import mongoose from 'mongoose';

/**
 * Service for managing seat bookings with real-time holds using Route model
 */
export class SeatBookingService {
  private readonly SEAT_HOLD_DURATION = Number(SEAT_HOLD_DURATION) || 10 * 60 * 1000; // 10 minutes default
  /**
   * Get seat availability for a route from Redis cache or database
   */
  async getSeatAvailability(routeId: string, userId?: string): Promise<Record<string, string>> {
    try {
      // Always fetch fresh data from database to ensure we get all seats
      // and current hold status
      const seats = await this.fetchSeatsFromDatabase(routeId, userId);
      
      // Update cache with fresh data
      const pipeline = redis.pipeline();
      for (const [seatLabel, status] of Object.entries(seats)) {
        pipeline.hset(RedisKeys.tripSeats(routeId), seatLabel, status);
      }
      pipeline.expire(RedisKeys.tripSeats(routeId), 300);
      await pipeline.exec();
      
      return seats;
    } catch (error) {
      console.error('Error getting seat availability:', error);
      throw error;
    }
  }

  /**
   * Hold a seat with distributed lock mechanism
   */
  async holdSeat(busId: string, routeId: string, seatLabel: string, userId: string): Promise<{ success: boolean; reason?: string; expiresAt?: number; extended?: boolean }> {
    const lockKey = RedisKeys.tripLock(routeId, seatLabel);
    const holdKey = RedisKeys.seatHold(routeId, seatLabel);
    
    try {
      // Try to acquire lock using SET NX (atomic operation)
      const locked = await (redis as any).set(lockKey, '1', 'NX', 'EX', 2);
      
      if (!locked) {
        return { success: false, reason: 'seat_locked' };
      }
      
      // Check if seat is already held or booked
      const existingHold = await redis.get(holdKey);
      
      if (existingHold) {
        const holdData = JSON.parse(existingHold);
        
        // Check if hold is expired
        if (Date.now() < holdData.expiresAt) {
          // Seat is still held by someone
          if (holdData.userId !== userId) {
            return { success: false, reason: 'seat_held' };
          }
          // Same user, extend the hold
          return { success: true, extended: true };
        }
      }
      
      // Check if seat is permanently booked (check database)
      const bus = await BusModel.findById(busId).populate('seatLayout');
      if (!bus) {
        return { success: false, reason: 'bus_not_found' };
      }
      const seat = bus.seatLayout.seats.find((s: any) => s.seatLabel === seatLabel);
      if (!seat) {
        return { success: false, reason: 'seat_not_found' };
      }
      if(seat.status === SeatStatus.HELD) {
        return { success: false, reason: 'seat_held by someone else' };
      }
      if(seat.status === SeatStatus.BOOKED) {
        return { success: false, reason: 'seat_booked' };
      }
      if (!seat.isAvailable) {
        return { success: false, reason: 'seat_booked' };
      }
   
      
      seat.isAvailable = false;
      seat.status = SeatStatus.SELECTED; // Set as SELECTED for the current user
      seat.userId = new mongoose.Types.ObjectId(userId);
      await bus.save();
      
      // Create hold data
      const holdData = {
        userId,
        seatLabel,
        routeId,
        heldAt: Date.now(),
        expiresAt: Date.now() + this.SEAT_HOLD_DURATION
      };
      
      await redis.setex(holdKey, Math.floor(this.SEAT_HOLD_DURATION / 1000), JSON.stringify(holdData));
      
      // Track user's holds
      await redis.sadd(RedisKeys.userHolds(userId), `${routeId}:${seatLabel}`);
      await redis.expire(RedisKeys.userHolds(userId), Math.floor(this.SEAT_HOLD_DURATION / 1000));
      
      // Update seat status in cache
      await redis.hset(RedisKeys.tripSeats(routeId), seatLabel, 'selected');
      
      return { success: true, expiresAt: holdData.expiresAt };
      
    } finally {
      // Release lock
      await redis.del(lockKey);
    }
  }

  /**
   * Release a seat hold
   */
  async releaseSeat(busId: string, routeId: string, seatLabel: string, userId: string): Promise<{ success: boolean; reason?: string }> {
    const holdKey = RedisKeys.seatHold(routeId, seatLabel);
    const existingHold = await redis.get(holdKey);
    
    if (!existingHold) {
      return { success: false, reason: 'no_hold' };
    }
    
    const holdData = JSON.parse(existingHold);
    
    // Verify the user owns this hold
    if (holdData.userId !== userId) {
      return { success: false, reason: 'not_owner' };
    }
    
    // Delete hold
    await redis.del(holdKey);
    await redis.srem(RedisKeys.userHolds(userId), `${routeId}:${seatLabel}`);
    
    // Update seat status
    const bus = await BusModel.findById(busId).populate('seatLayout');
    if (!bus) {
      return { success: false, reason: 'bus_not_found' };
    }
    const seat = bus.seatLayout.seats.find((s: any) => s.seatLabel === seatLabel);
    if (!seat) {
      return { success: false, reason: 'seat_not_found' };
    }
    seat.userId = null;
    seat.isAvailable = true;
    seat.status = SeatStatus.AVAILABLE;
    await bus.save();
    await redis.hset(RedisKeys.tripSeats(routeId), seatLabel, 'available');
    
    return { success: true };
  }

  /**
   * Confirm booking and convert holds to permanent bookings
   */
  async confirmBooking(userId: string, routeId: string, seatLabels: string[], passengers: any[], paymentInfo?: any): Promise<{ success: boolean; bookingId?: string; reason?: string }> {
    try {
      // Verify all seats are held by this user
      const verifications = await Promise.all(
        seatLabels.map(async (seatLabel) => {
          const holdKey = RedisKeys.seatHold(routeId, seatLabel);
          const holdData = await redis.get(holdKey);
          
          if (!holdData) return false;
          
          const hold = JSON.parse(holdData);
          return hold.userId === userId && Date.now() < hold.expiresAt;
        })
      );
      
      if (verifications.includes(false)) {
        return { success: false, reason: 'invalid_holds' };
      }
      
      // Get route information with populated bus data
      const route = await Route.findById(routeId).populate('bus origin destination');
      if (!route) {
        return { success: false, reason: 'route_not_found' };
      }
      
      // Calculate total amount
      const totalAmount = this.calculateBookingAmount(route, seatLabels);
      
      // Generate booking reference
      const bookingRef = await this.generateBookingReference();
      
      // Create booking in database
      const booking = new Booking({
        bookingRef,
        route: routeId,
        user: userId,
        passengers: passengers.map((passenger, index) => ({
          ...passenger,
          seatLabel: seatLabels[index],
          seatIndex: this.getSeatIndex(route.bus, seatLabels[index])
        })),
        totalAmount,
        currency: 'MXN',
        paymentStatus: PaymentStatus.PENDING,
        paymentReference: paymentInfo?.paymentId,
        bookingStatus: BookingStatus.CONFIRMED,
        createdByCashier: false,
        hold: null
      });
      
      await booking.save();
      
      // Delete holds and update seats as booked
      const pipeline = redis.pipeline();
      for (const seatLabel of seatLabels) {
        pipeline.del(RedisKeys.seatHold(routeId, seatLabel));
        pipeline.hset(RedisKeys.tripSeats(routeId), seatLabel, 'booked');
      }
      await pipeline.exec();
      
      return { success: true, bookingId: (booking._id as any).toString() };
      
    } catch (error) {
      console.error('Error confirming booking:', error);
      return { success: false, reason: 'server_error' };
    }
  }

  /**
   * Fetch seat data from database based on route's bus
   */
  private async fetchSeatsFromDatabase(routeId: string, userId?: string): Promise<Record<string, string>> {
    const route = await Route.findById(routeId).populate('bus');
    if (!route) {
      throw new Error('Route not found');
    }
    
    const seats: Record<string, string> = {};
    
    // Get existing bookings for this route to determine seat status
    const existingBookings = await Booking.find({ 
      route: routeId,
      bookingStatus: { $in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] }
    });
    
    // Initialize all bus seats as available
    const bus = route.bus as any; // Type assertion for populated bus
    if (bus.seatLayout && bus.seatLayout.seats) {
      bus.seatLayout.seats.forEach((seat: any) => {
        if (seat.seatLabel) {
          seats[seat.seatLabel] = 'available';
        }
      });
      console.log(`📋 Initialized ${Object.keys(seats).length} seats from bus layout for route ${routeId}`);
    } else {
      console.warn(`⚠️ No seat layout found for bus in route ${routeId}`);
    }
    
    // Mark booked seats as booked
    existingBookings.forEach(booking => {
      booking.passengers.forEach((passenger: any) => {
        if (passenger.seatLabel) {
          seats[passenger.seatLabel] = 'booked';
        }
      });
    });
    console.log(`📚 Found ${existingBookings.length} existing bookings for route ${routeId}`);
    
    // Check Redis for held seats and update their status
    let heldCount = 0;
    let selectedCount = 0;
    for (const seatLabel of Object.keys(seats)) {
      const holdKey = RedisKeys.seatHold(routeId, seatLabel);
      const holdData = await redis.get(holdKey);
      
      if (holdData) {
        const hold = JSON.parse(holdData);
        // Check if hold is still valid (not expired)
        if (Date.now() < hold.expiresAt) {
          // Differentiate between seats held by current user vs others
          if (userId && hold.userId === userId) {
            seats[seatLabel] = 'selected';
            selectedCount++;
          } else {
            seats[seatLabel] = 'held';
            heldCount++;
          }
        }
      }
    }
    console.log(`🔒 Found ${heldCount} held seats and ${selectedCount} selected seats for route ${routeId}`);
    
    console.log(`✅ Returning ${Object.keys(seats).length} total seats for route ${routeId}:`, seats);
    return seats;
  }

  /**
   * Check if seat is permanently booked in database
   */
  private async isSeatBooked(routeId: string, seatLabel: string): Promise<boolean> {
    const booking = await Booking.findOne({
      route: routeId,
      'passengers.seatLabel': seatLabel,
      bookingStatus: { $in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] }
    });
    
    return booking !== null;
  }

  /**
   * Get user's current holds
   */
  async getUserHolds(userId: string): Promise<any[]> {
    const holds = await redis.smembers(RedisKeys.userHolds(userId));
    const holdDetails = [];
    
    for (const hold of holds) {
      const [routeId, seatLabel] = hold.split(':');
      const holdKey = RedisKeys.seatHold(routeId, seatLabel);
      const holdData = await redis.get(holdKey);
      
      if (holdData) {
        holdDetails.push(JSON.parse(holdData));
      }
    }
    
    return holdDetails;
  }

  /**
   * Calculate booking amount based on route pricing
   */
  private calculateBookingAmount(route: any, seatLabels: string[]): number {
    // Base price per seat - you can implement dynamic pricing based on route, stops, etc.
    return seatLabels.length * 150; // Example: $150 MXN per seat
    
    // Example advanced pricing logic:
    // const basePrice = route.defaultPrice || 150;
    // const intermediateStopCount = route.intermediateStops.length;
    // const pricingMultiplier = 1 + (intermediateStopCount * 0.1); // 10% per stop
    // return seatLabels.length * basePrice * pricingMultiplier;
  }

  /**
   * Generate unique booking reference
   */
  private async generateBookingReference(): Promise<string> {
    const prefix = 'LM';
    const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${date}-${random}`;
  }

  /**
   * Get seat index from bus seat layout
   */
  private getSeatIndex(route: any, seatLabel: string): number {
    const bus = route.bus as any;
    if (bus.seatLayout && bus.seatLayout.seats) {
      const seatSnapshot = bus.seatLayout.seats.find((s: any) => s.seatLabel === seatLabel);
      return seatSnapshot?.seatIndex || 0;
    }
    return 0;
  }

  /**
   * Clean up expired holds
   */
  async cleanupExpiredHolds(): Promise<void> {
    const now = Date.now();
    const keys = await redis.keys('hold:*');
    
    for (const key of keys) {
      const holdData = await redis.get(key);
      if (holdData) {
        const hold = JSON.parse(holdData);
        if (now > hold.expiresAt) {
          await redis.del(key);
          
          // Update seat status back to available
          await redis.hset(RedisKeys.tripSeats(hold.routeId), hold.seatLabel, 'available');
          
          // Remove from user holds set
          await redis.srem(RedisKeys.userHolds(hold.userId), `${hold.routeId}:${hold.seatLabel}`);
        }
      }
    }
  }

  /**
   * Get route information with schedule
   */
  async getRouteInfo(routeId: string): Promise<any> {
    try {
      const route = await Route.findById(routeId)
        .populate('origin destination intermediateStops bus')
        .lean();
      
      if (!route) {
        throw new Error('Route not found');
      }
      
      return {
        id: route._id,
        name: route.name,
        origin: route.origin,
        destination: route.destination,
        intermediateStops: route.intermediateStops,
        bus: route.bus,
        dayTime: route.dayTime.map(dt => ({
          day: dt.day,
          time: dt.time.toTimeString().slice(0, 5) // Format as HH:MM
        })),
        isActive: route.isActive
      };
    } catch (error) {
      console.error('Error getting route info:', error);
      throw error;
    }
  }
}

export default new SeatBookingService();