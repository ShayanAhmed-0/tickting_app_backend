import { Server as SocketIOServer } from 'socket.io';
import seatBookingService from '../services/seatBooking.service';
import { SocketData, SeatStatusChangeEvent } from '../config/socket';
import { redis, RedisKeys } from '../config/redis';

/**
 * Socket.io event handlers for real-time seat booking using Route model
 */
export class SocketHandlers {
  private io: SocketIOServer;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor(io: SocketIOServer) {
    this.io = io;
    this.startPeriodicCleanup();
  }
  
  /**
   * Start periodic cleanup of expired holds
   */
  private startPeriodicCleanup(): void {
    // Run cleanup every 10 seconds to catch expired seats more frequently
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredHolds();
      } catch (error) {
        console.error('Error during periodic cleanup:', error);
      }
    }, 10000); // 10 seconds
  }

  /**
   * Stop periodic cleanup
   */
  public stopPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clean up expired holds for a specific route
   */
  private async cleanupExpiredHoldsForRoute(routeId: string): Promise<void> {
    try {
      // Get all hold keys for this route
      const holdKeys = await redis.keys(`hold:${routeId}:*`);
      
      for (const holdKey of holdKeys) {
        const holdData = await redis.get(holdKey);
        
        if (holdData) {
          const hold = JSON.parse(holdData);
          
          // Check if hold is expired
          if (Date.now() > hold.expiresAt) {
            // Extract seat label from hold key
            const seatLabel = holdKey.split(':')[2];
            
            // Emit seat expired event
            this.io.to(`route:${routeId}`).emit('seat:expired', {
              seatLabel,
              routeId,
              userId: hold.userId,
              expiredAt: new Date().toISOString()
            });
            
            // Emit seat status change to available
            this.io.to(`route:${routeId}`).emit('seat:status:changed', {
              routeId,
              seatLabel,
              status: 'available',
              userId: hold.userId
            });
            
            console.log(`🕒 Seat ${seatLabel} expired for user ${hold.userId} in route ${routeId}`);
          }
        }
      }
      
      // Call the service cleanup method to actually clean up expired holds
      await seatBookingService.cleanupExpiredHolds();
      
    } catch (error) {
      console.error('Error in cleanupExpiredHoldsForRoute:', error);
    }
  }

  /**
   * Clean up expired holds and emit events
   */
  private async cleanupExpiredHolds(): Promise<void> {
    try {
      // Get all active route rooms
      const rooms = Array.from(this.io.sockets.adapter.rooms.keys())
        .filter(room => room.startsWith('route:'))
        .map(room => room.replace('route:', ''));

      for (const routeId of rooms) {
        // Get all hold keys for this route
        const holdKeys = await redis.keys(`hold:${routeId}:*`);
        
        for (const holdKey of holdKeys) {
          const holdData = await redis.get(holdKey);
          
          if (holdData) {
            const hold = JSON.parse(holdData);
            
            // Check if hold is expired
            if (Date.now() > hold.expiresAt) {
              // Extract seat label from hold key
              const seatLabel = holdKey.split(':')[2];
              
              // Emit seat expired event
              this.io.to(`route:${routeId}`).emit('seat:expired', {
                seatLabel,
                routeId,
                userId: hold.userId,
                expiredAt: new Date().toISOString()
              });
              
              // Emit seat status change to available
              this.io.to(`route:${routeId}`).emit('seat:status:changed', {
                routeId,
                seatLabel,
                status: 'available',
                userId: hold.userId
              });
              
              console.log(`🕒 Seat ${seatLabel} expired for user ${hold.userId} in route ${routeId}`);
            }
          }
        }
      }
      
      // Call the service cleanup method to actually clean up expired holds
      await seatBookingService.cleanupExpiredHolds();
      
    } catch (error) {
      console.error('Error in cleanupExpiredHolds:', error);
    }
  }

  /**
   * Initialize all socket event handlers
   */
  public initializeHandlers(): void {
    this.io.on('connection', (socket) => {
      const socketData = socket.data as SocketData;
      const userId = socketData.userId;
      
      console.log(`User connected: ${userId} (Socket: ${socket.id})`);
      
      // ----------------------------------------
      // Route Room Management
      // ----------------------------------------
      
      // Join route room with acknowledgment
      socket.on('join:route', (data: { routeId: string }, ack: Function) => {
        if (typeof ack !== 'function') {
          console.error('join:route event called without acknowledgment function');
          return;
        }
        this.handleJoinRoute(socket, data, ack);
      });
      
      // Leave route room with acknowledgment
      socket.on('leave:route', (data: { routeId: string }, ack: Function) => {
        if (typeof ack !== 'function') {
          console.error('leave:route event called without acknowledgment function');
          return;
        }
        this.handleLeaveRoute(socket, data, ack);
      });
      
      // Get seat availability with acknowledgment
      socket.on('seats:get', (data: { routeId: string }, ack: Function) => {
        if (typeof ack !== 'function') {
          console.error('seats:get event called without acknowledgment function');
          return;
        }
        this.handleGetSeats(socket, data, ack);
      });
      
      // ----------------------------------------
      // Seat Operations
      // ----------------------------------------
      
      // Hold seat with acknowledgment
      socket.on('seat:hold', (data: { busId: string,routeId: string; seatLabel: string }, ack: Function) => {
        if (typeof ack !== 'function') {
          console.error('seat:hold event called without acknowledgment function');
          return;
        }
        this.handleSeatHold(socket, data, ack);
      });
      
      // Release seat with acknowledgment
      socket.on('seat:release', (data: {busId: string, routeId: string; seatLabel: string }, ack: Function) => {
        if (typeof ack !== 'function') {
          console.error('seat:release event called without acknowledgment function');
          return;
        }
        this.handleSeatRelease(socket, data, ack);
      });
      
      // Get current holds with acknowledgment
      socket.on('holds:get', (data: any, ack?: Function) => {
        // Handle case where client sends data as first parameter
        if (typeof data === 'function' && !ack) {
          // Client sent only acknowledgment function
          this.handleGetHolds(socket, data);
        } else if (typeof ack === 'function') {
          // Client sent data and acknowledgment function
          this.handleGetHolds(socket, ack);
        } else {
          console.error('holds:get event called without acknowledgment function');
          return;
        }
      });
      
      // ----------------------------------------
      // Booking Operations
      // ----------------------------------------
      
      // Confirm booking with acknowledgment
      socket.on('booking:confirm', (data: {
        routeId: string;
        seatLabels: string[];
        passengers: any[];
        paymentInfo?: any
      }, ack: Function) => {
        if (typeof ack !== 'function') {
          console.error('booking:confirm event called without acknowledgment function');
          return;
        }
        this.handleBookingConfirm(socket, data, ack);
      });
      
      // ----------------------------------------
      // Utility Operations
      // ----------------------------------------
      
      // Health check with acknowledgment
      socket.on('ping', (data: any, ack?: Function) => {
        // Handle case where client sends data as first parameter
        if (typeof data === 'function' && !ack) {
          // Client sent only acknowledgment function
          data({
            success: true,
            message: 'pong',
            userId: socketData.userId,
            timestamp: new Date().toISOString()
          });
        } else if (typeof ack === 'function') {
          // Client sent data and acknowledgment function
          ack({
            success: true,
            message: 'pong',
            userId: socketData.userId,
            timestamp: new Date().toISOString()
          });
        } else {
          console.error('ping event called without acknowledgment function');
          return;
        }
      });
      
      // Get connection info with acknowledgment
      socket.on('info:get', (data: any, ack?: Function) => {
        // Handle case where client sends data as first parameter
        if (typeof data === 'function' && !ack) {
          // Client sent only acknowledgment function
          data({
            success: true,
            data: {
              userId: socketData.userId,
              userEmail: socketData.userEmail,
              currentRoute: socketData.currentTrip, // Keep compatibility
              heldSeatsCount: socketData.heldSeats.size,
              connectedAt: socket.conn.request.socket?.destroyed ? new Date().toISOString() : 'connected'
            }
          });
        } else if (typeof ack === 'function') {
          // Client sent data and acknowledgment function
          ack({
            success: true,
            data: {
              userId: socketData.userId,
              userEmail: socketData.userEmail,
              currentRoute: socketData.currentTrip, // Keep compatibility
              heldSeatsCount: socketData.heldSeats.size,
              connectedAt: socket.conn.request.socket?.destroyed ? new Date().toISOString() : 'connected'
            }
          });
        } else {
          console.error('info:get event called without acknowledgment function');
          return;
        }
      });
      
      // ----------------------------------------
      // Event Listeners (Broadcast Only)
      // ----------------------------------------
      
      // Handle disconnect (no acknowledgment needed)
      socket.on('disconnect', async () => {
        await this.handleDisconnect(socket);
      });
      
      // Handle errors (no acknowledgment needed)
      socket.on('error', (error: any) => {
        console.error('Socket error:', error);
      });
    });
  }
  
  /**
   * Handle joining a route room with acknowledgment
   */
  private async handleJoinRoute(socket: any, data: { routeId: string }, ack: Function) {
    try {
      const { routeId } = data;
      const socketData = socket.data as SocketData;
      
      if (!routeId) {
        return ack({
          success: false,
          error: 'Route ID required',
          code: 'INVALID_ROUTE_ID'
        });
      }
      
      // Leave any previous route rooms
      const rooms = Array.from(socket.rooms);
      rooms.forEach((room: string | any) => {
        if (room.startsWith('route:')) {
          socket.leave(room);
        }
      });
      
      // Join new route room
      socket.join(`route:${routeId}`);
      socketData.currentTrip = routeId; // Keep field name for compatibility
      
      console.log(`User ${socketData.userId} joined route ${routeId}`);
      
      // Clean up any expired holds and inconsistent seat states for this route first
      await this.cleanupExpiredHoldsForRoute(routeId);
      await seatBookingService.cleanupInconsistentSeats(routeId);
      
      // Send acknowledgment with seat availability
      const seats = await seatBookingService.getSeatAvailability(routeId, socketData.userId);
      
      ack({
        success: true,
        message: `Successfully joined route ${routeId}`,
        data: {
          routeId,
          seats,
          userCount: this.io.sockets.adapter.rooms.get(`route:${routeId}`)?.size || 1,
          timestamp: new Date().toISOString()
        }
      });
      
      // Broadcast to other users (no acknowledgment needed)
      socket.to(`route:${routeId}`).emit('user:joined', {
        routeId,
        userCount: this.io.sockets.adapter.rooms.get(`route:${routeId}`)?.size || 0,
        userId: socketData.userId
      });
      
    } catch (error) {
      console.error('Error joining route:', error);
      ack({
        success: false,
        error: 'Failed to join route',
        code: 'JOIN_ROUTE_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  /**
   * Handle leaving a route room with acknowledgment
   */
  private async handleLeaveRoute(socket: any, data: { routeId: string }, ack: Function) {
    try {
      const { routeId } = data;
      const socketData = socket.data as SocketData;
      
      if (!routeId) {
        return ack({
          success: false,
          error: 'Route ID required',
          code: 'INVALID_ROUTE_ID'
        });
      }
      
      // Clear all seats held by this user for this specific route
      try {
        const clearResult = await seatBookingService.clearUserSeatsForRoute(socketData.userId, routeId);
        
        if (clearResult.success && clearResult.clearedSeats.length > 0) {
          console.log(`🧹 Cleared ${clearResult.clearedSeats.length} seats for user ${socketData.userId} leaving route ${routeId}`);
          
          // Broadcast seat status changes for cleared seats
          for (const seat of clearResult.clearedSeats) {
            const [_, seatLabel] = seat.split(':');
            this.io.to(`route:${routeId}`).emit('seat:status:changed', {
              routeId: routeId, // Keep field name for compatibility
              seatLabel,
              status: 'available',
              userId: socketData.userId
            });
          }
        }
        
        // Log any errors that occurred during seat clearing
        if (clearResult.errors.length > 0) {
          console.error(`❌ Errors clearing seats for user ${socketData.userId} leaving route ${routeId}:`, clearResult.errors);
        }
        
      } catch (error) {
        console.error('Error clearing seats on leave route:', error);
      }
      
      socket.leave(`route:${routeId}`);
      socketData.currentTrip = undefined;
      
      console.log(`User ${socketData.userId} left route ${routeId}`);
      
      // Send acknowledgment
      ack({
        success: true,
        message: `Successfully left route ${routeId}`,
        data: {
          routeId,
          timestamp: new Date().toISOString()
        }
      });
      
      // Broadcast to other users
      socket.to(`route:${routeId}`).emit('user:left', {
        routeId,
        userCount: this.io.sockets.adapter.rooms.get(`route:${routeId}`)?.size || 0,
        userId: socketData.userId
      });
      
    } catch (error) {
      console.error('Error leaving route:', error);
      ack({
        success: false,
        error: 'Failed to leave route',
        code: 'LEAVE_ROUTE_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  /**
   * Handle getting seat availability with acknowledgment
   */
  private async handleGetSeats(socket: any, data: { routeId: string }, ack: Function) {
    try {
      const { routeId } = data;
      
      if (!routeId) {
        return ack({
          success: false,
          error: 'Route ID required',
          code: 'INVALID_ROUTE_ID'
        });
      }
      
      const socketData = socket.data as SocketData;
      
      // Clean up any expired holds and inconsistent seat states for this route first
      await this.cleanupExpiredHoldsForRoute(routeId);
      await seatBookingService.cleanupInconsistentSeats(routeId);
      
      const seats = await seatBookingService.getSeatAvailability(routeId, socketData.userId);
      
      ack({
        success: true,
        data: {
          routeId,
          seats,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Error getting seats:', error);
      ack({
        success: false,
        error: 'Failed to get seat availability',
        code: 'GET_SEATS_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  /**
   * Handle seat hold with acknowledgment
   */
  private async handleSeatHold(socket: any, data: { busId: string, routeId: string; seatLabel: string }, ack: Function) {
    try {
      const { busId, routeId, seatLabel } = data;
      const socketData = socket.data as SocketData;
      
      if (!routeId || !seatLabel) {
        return ack({
          success: false,
          error: 'Route ID and Seat Label required',
          code: 'INVALID_DATA'
        });
      }
      
      // Attempt to hold the seat
      const result = await seatBookingService.holdSeat(busId, routeId, seatLabel, socketData.userId);
      
      if (result.success) {
        // Track held seat
        socketData.heldSeats.add(`${routeId}:${seatLabel}`);
        
        // Send acknowledgment
        ack({
          success: true,
          message: `Seat ${seatLabel} Selected Successfully`,
          data: {
            routeId,
            seatLabel,
            status: 'selected',
            expiresAt: result.expiresAt,
            extended: result.extended || false,
            timestamp: new Date().toISOString()
          }
        });
        
        // Broadcast to all users in the route room (real-time update)
        const statusChangeEvent: SeatStatusChangeEvent = {
          routeId, // Keep field name for compatibility
          seatLabel,
          status: 'held' as const,
          expiresAt: result.expiresAt,
          userId: socketData.userId
        };
        
        this.io.to(`route:${routeId}`).emit('seat:status:changed', statusChangeEvent);
        
        // Set up auto-release timer
        const timeUntilExpiry = (result.expiresAt || 0) - Date.now();
        setTimeout(async () => {
          const released = await seatBookingService.releaseSeat(busId, routeId, seatLabel, socketData.userId);
          if (released.success) {
            socketData.heldSeats.delete(`${routeId}:${seatLabel}`);
            
            // Get updated seat status and broadcast
            const updatedSeats = await seatBookingService.getSeatAvailability(routeId);
            this.io.to(`route:${routeId}`).emit('seat:status:changed', {
              routeId: routeId, // Keep field name for compatibility
              seatLabel,
              status: updatedSeats[seatLabel] || 'available',
              userId: socketData.userId
            });
            
            // Notify the user who held it (optional)
            socket.emit('seat:expired', { seatLabel, routeId });
          }
        }, timeUntilExpiry);
        
      } else {
        ack({
          success: false,
          error: `Failed to hold seat ${seatLabel}`,
          code: 'HOLD_SEAT_FAILED',
          reason: result.reason
        });
      }
      
    } catch (error) {
      console.error('Error holding seat:', error);
      ack({
        success: false,
        error: 'Failed to hold seat',
        code: 'HOLD_SEAT_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  /**
   * Handle seat release with acknowledgment
   */
  private async handleSeatRelease(socket: any, data: { busId: string, routeId: string; seatLabel: string }, ack: Function) {
    try {
      const { busId, routeId, seatLabel } = data;
      const socketData = socket.data as SocketData;
      
      if (!routeId || !seatLabel) {
        return ack({
          success: false,
          error: 'Route ID and Seat Label required',
          code: 'INVALID_DATA'
        });
      }
      
      const result = await seatBookingService.releaseSeat(busId, routeId, seatLabel, socketData.userId);
      
      if (result.success) {
        socketData.heldSeats.delete(`${routeId}:${seatLabel}`);
        
        ack({
          success: true,
          message: `Successfully released seat ${seatLabel}`,
          data: {
            routeId,
            seatLabel,
            timestamp: new Date().toISOString()
          }
        });
        
        // Get updated seat status for all users in the room
        const updatedSeats = await seatBookingService.getSeatAvailability(routeId);
        
        // Broadcast to all users with updated seat status
        this.io.to(`route:${routeId}`).emit('seat:status:changed', {
          routeId: routeId, // Keep field name for compatibility
          seatLabel,
          status: updatedSeats[seatLabel] || 'available',
          userId: socketData.userId
        });
        
      } else {
        ack({
          success: false,
          error: `Failed to release seat ${seatLabel}`,
          code: 'RELEASE_SEAT_FAILED',
          reason: result.reason
        });
      }
      
    } catch (error) {
      console.error('Error releasing seat:', error);
      ack({
        success: false,
        error: 'Failed to release seat',
        code: 'RELEASE_SEAT_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  /**
   * Handle booking confirmation with acknowledgment
   */
  private async handleBookingConfirm(socket: any, data: { 
    routeId: string; 
    seatLabels: string[]; 
    passengers: any[]; 
    paymentInfo?: any 
  }, ack: Function) {
    try {
      const { routeId, seatLabels, passengers, paymentInfo } = data;
      const socketData = socket.data as SocketData;
      
      if (!routeId || !seatLabels || !Array.isArray(seatLabels) || !passengers || !Array.isArray(passengers)) {
        return ack({
          success: false,
          error: 'Route ID, seat labels, and passengers are required',
          code: 'INVALID_DATA'
        });
      }
      
      const result = await seatBookingService.confirmBooking(
        socketData.userId,
        routeId,
        seatLabels,
        passengers,
        paymentInfo
      );
      
      if (result.success) {
        // Clear held seats from socket data
        seatLabels.forEach(seatLabel => {
          socketData.heldSeats.delete(`${routeId}:${seatLabel}`);
        });
        
        ack({
          success: true,
          message: `Booking confirmed successfully`,
          data: {
            bookingId: result.bookingId,
            routeId,
            seatLabels,
            passengersCount: passengers.length,
            confirmedAt: new Date().toISOString()
          }
        });
        
        // Broadcast to all users in the room
        this.io.to(`route:${routeId}`).emit('seats:booked', {
          seatLabels,
          routeId: routeId, // Keep field name for compatibility
          userId: socketData.userId,
          bookingId: result.bookingId
        });
        
        console.log(`Booking confirmed: ${result.bookingId} for user ${socketData.userId}`);
        
      } else {
        ack({
          success: false,
          error: 'Failed to confirm booking',
          code: 'BOOKING_CONFIRM_FAILED',
          reason: result.reason
        });
      }
      
    } catch (error) {
      console.error('Error confirming booking:', error);
      ack({
        success: false,
        error: 'Failed to confirm booking',
        code: 'BOOKING_CONFIRM_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  /**
   * Handle getting current holds with acknowledgment
   */
  private async handleGetHolds(socket: any, ack: Function) {
    try {
      const socketData = socket.data as SocketData;
      const holds = await seatBookingService.getUserHolds(socketData.userId);
      
      ack({
        success: true,
        data: {
          holds,
          count: holds.length,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Error getting holds:', error);
      ack({
        success: false,
        error: 'Failed to get current holds',
        code: 'GET_HOLDS_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  /**
   * Handle disconnect (no acceptance needed)
   */
  private async handleDisconnect(socket: any) {
    const socketData = socket.data as SocketData;
    console.log(`User disconnected: ${socketData.userId} (Socket: ${socket.id})`);
    
    try {
      // Clear all seats held by this user
      const clearResult = await seatBookingService.clearAllUserSeats(socketData.userId);
      
      if (clearResult.success && clearResult.clearedSeats.length > 0) {
        console.log(`🧹 Cleared ${clearResult.clearedSeats.length} seats for disconnected user ${socketData.userId}`);
        
        // Group cleared seats by route for efficient broadcasting
        const seatsByRoute: Record<string, string[]> = {};
        clearResult.clearedSeats.forEach(seat => {
          const [routeId, seatLabel] = seat.split(':');
          if (!seatsByRoute[routeId]) {
            seatsByRoute[routeId] = [];
          }
          seatsByRoute[routeId].push(seatLabel);
        });
        
        // Broadcast seat status changes for each route
        for (const [routeId, seatLabels] of Object.entries(seatsByRoute)) {
          for (const seatLabel of seatLabels) {
            this.io.to(`route:${routeId}`).emit('seat:status:changed', {
              routeId: routeId, // Keep field name for compatibility
              seatLabel,
              status: 'available',
              userId: socketData.userId
            });
          }
        }
      }
      
      // Log any errors that occurred during seat clearing
      if (clearResult.errors.length > 0) {
        console.error(`❌ Errors clearing seats for user ${socketData.userId}:`, clearResult.errors);
      }
      
    } catch (error) {
      console.error('Error clearing seats on disconnect:', error);
    }
    
    // Notify route rooms about user leaving
    if (socketData.currentTrip) {
      socket.to(`route:${socketData.currentTrip}`).emit('user:left', {
        routeId: socketData.currentTrip,
        userCount: this.io.sockets.adapter.rooms.get(`route:${socketData.currentTrip}`)?.size || 0,
        userId: socketData.userId
      });
    }
  }
}

export default SocketHandlers;