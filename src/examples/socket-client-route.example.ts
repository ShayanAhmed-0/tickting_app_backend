/**
 * Example client implementation using Route model instead of Trip model
 * This demonstrates the updated seat booking system using Route-based operations
 */

// import io from 'socket.io-client';

export class RouteSeatBookingClient {
  public socket: any;
  private isConnected = false;

  constructor(serverUrl: string = 'http://localhost:5000', authToken: string) {
    // this.socket = io(serverUrl, {
    //   auth: { token: authToken }
    // });
    this.socket = {} as any; // Placeholder
    
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for real-time broadcasts and acknowledgements
   */
  private setupEventListeners(): void {
    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Connected to server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      this.isConnected = false;
    });

    // Real-time broadcast events (no acknowledgements needed)
    this.socket.on('seat:status:changed', (data: any) => {
      console.log(`🔄 Seat ${data.seatLabel} status changed to: ${data.status}`);
      this.updateSingleSeatStatus(data);
    });

    this.socket.on('user:joined', (data: any) => {
      console.log(`👤 ${data.userId} joined route. ${data.userCount} users now in room`);
      this.updateUserCount(data.userCount);
    });

    this.socket.on('user:left', (data: any) => {
      console.log(`👤 ${data.userId} left route. ${data.userCount} users remaining`);
      this.updateUserCount(data.userCount);
    });

    this.socket.on('seats:booked', (data: any) => {
      console.log(`📝 Seats permanently booked by ${data.userId}:`, data.seatLabels);
      data.seatLabels.forEach((seatLabel: string) => {
        this.updateSingleSeatStatus({ seatLabel, status: 'booked', routeId: data.routeId });
      });
    });

    this.socket.on('seat:expired', (data: any) => {
      console.log(`⏰ Your seat hold expired: ${data.seatLabel}`);
      this.showExpiredNotification(data);
    });

    this.socket.on('error', (data: any) => {
      console.error('🚨 Socket Error:', data);
    });
  }

  /**
   * Join a route room with acknowledgment
   * @param routeId Route ID to join
   * @returns Promise with seat availability data
   */
  public async joinRoute(routeId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('join:route', { routeId }, (response: any) => {
        if (response.success) {
          console.log(`✅ ${response.message}`);
          console.log('📋 Seats available:', response.data.seats);
          console.log('👥 Users in room:', response.data.userCount);
          this.updateSeatMap(response.data.seats);
          resolve(response.data);
        } else {
          console.error(`❌ Failed to join route: ${response.error}`);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Leave a route room with acknowledgment
   * @param routeId Route ID to leave
   */
  public async leaveRoute(routeId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('leave:route', { routeId }, (response: any) => {
        if (response.success) {
          console.log(`✅ ${response.message}`);
          resolve(response.data);
        } else {
          console.error(`❌ Failed to leave route: ${response.error}`);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Get current seat availability with acknowledgment
   * @param routeId Route ID
   */
  public async getSeats(routeId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('seats:get', { routeId }, (response: any) => {
        if (response.success) {
          console.log('📋 Current seats:', response.data.seats);
          this.updateSeatMap(response.data.seats);
          resolve(response.data);
        } else {
          console.error(`❌ Failed to get seats: ${response.error}`);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Hold a seat with acknowledgment
   * @param routeId Route ID
   * @param seatLabel Seat label to hold
   */
  public async holdSeat(routeId: string, seatLabel: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('seat:hold', { routeId, seatLabel }, (response: any) => {
        if (response.success) {
          console.log(`✅ ${response.message}`);
          console.log(`Expires at: ${new Date(response.data.expiresAt).toLocaleString()}`);
          if (response.data.extended) {
            console.log('🔄 Seat hold refreshed');
          }
          resolve(response.data);
        } else {
          console.error(`❌ Failed to hold seat: ${response.error}`);
          console.log(`Reason: ${response.reason}`);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Release a seat hold with acknowledgment
   * @param routeId Route ID
   * @param seatLabel Seat label to release
   */
  public async releaseSeat(routeId: string, seatLabel: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('seat:release', { routeId, seatLabel }, (response: any) => {
        if (response.success) {
          console.log(`✅ ${response.message}`);
          resolve(response.data);
        } else {
          console.error(`❌ Failed to release seat: ${response.error}`);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Confirm booking with acknowledgment
   * @param routeId Route ID
   * @param seatLabels Array of seat labels
   * @param passengers Passenger information
   * @param paymentInfo Payment information
   */
  public async confirmBooking(
    routeId: string, 
    seatLabels: string[], 
    passengers: any[], 
    paymentInfo?: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('booking:confirm', {
        routeId,
        seatLabels,
        passengers,
        paymentInfo
      }, (response: any) => {
        if (response.success) {
          console.log(`✅ ${response.message}`);
          console.log(`Booking ID: ${response.data.bookingId}`);
          console.log(`Confirmed at: ${response.data.confirmedAt}`);
          console.log(`Passengers: ${response.data.passengersCount}`);
          resolve(response.data);
        } else {
          console.error(`❌ Failed to confirm booking: ${response.error}`);
          console.log(`Reason: ${response.reason}`);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Disconnect from server
   */
  public disconnect(): void {
    this.socket.disconnect();
  }

  // UI update methods (implement based on your UI framework)
  private updateSeatMap(seats: Record<string, string>): void {
    // Update your seat map UI here
    console.log('🎯 Updating seat map:', Object.keys(seats).length, 'seats');
  }

  private updateSingleSeatStatus(data: any): void {
    // Update individual seat status in UI
    console.log(`🎯 Updating seat ${data.seatLabel} to ${data.status}`);
  }

  private updateUserCount(count: number): void {
    // Update user count display
    console.log(`🎯 Users in room: ${count}`);
  }

  private showExpiredNotification(data: any): void {
    // Show expiration notification
    console.log(`⏰ Showing expired notification for seat ${data.seatLabel}`);
  }
}

// Usage Examples:

/**
 * Example: Complete booking flow using Route model
 */
export async function exampleRouteBookingFlow() {
  const client = new RouteSeatBookingClient('http://localhost:5000', 'your-jwt-token');

  try {
    // Wait for connection
    await new Promise(resolve => {
      client.socket.on('connect', resolve);
    });

    console.log('🚀 Starting route booking flow...');

    // 1. Join route
    const routeData = await client.joinRoute('route123');

    // 2. Get current seats
    await client.getSeats('route123');

    // 3. Hold seats
    console.log('\n🔒 Holding seats...');
    await client.holdSeat('route123', '1A');
    await client.holdSeat('route123', '1B');

    // 4. Confirm booking
    console.log('\n🎫 Confirming booking...');
    const booking = await client.confirmBooking('route123', ['1A', '1B'], [
      { firstName: 'John', lastName: 'Doe', idType: 'passport', idNumber: '123456' },
      { firstName: 'Jane', lastName: 'Doe', idType: 'passport', idNumber: '789012' }
    ], { paymentId: 'payment123' });

    console.log('🎉 Booking completed successfully!', booking);

  } catch (error: any) {
    console.error('❌ Booking flow failed:', error);
  } finally {
    client.disconnect();
  }
}

/**
 * Example: Get route information
 */
export async function exampleGetRouteInfo() {
  const client = new RouteSeatBookingClient('http://localhost:5000', 'your-jwt-token');

  try {
    // This would typically come from a routes API endpoint
    const routeId = 'route123';
    
    // Join route to see seats
    await client.joinRoute(routeId);
    
    // Get seat availability
    const seatData = await client.getSeats(routeId);
    
    console.log('📍 Route information:', seatData);

  } catch (error: any) {
    console.error('❌ Failed to get route info:', error);
  } finally {
    client.disconnect();
  }
}

/**
 * REST API Examples
 */
export const restApiExamples = {
  // Get seat availability for a route
  getSeats: 'GET /api/booking/routes/:routeId/seats',
  
  // Hold a seat
  holdSeat: 'POST /api/booking/routes/:routeId/seats/:seatLabel/hold',
  
  // Release seat hold
  releaseSeat: 'DELETE /api/booking/routes/:routeId/seats/:seatLabel/hold',
  
  // Confirm booking
  confirmBooking: 'POST /api/booking/confirm',
  confirmBookingData: {
    routeId: 'route123',
    seatLabels: ['1A', '1B'],
    passengers: [
      { firstName: 'John', lastName: 'Doe', idType: 'passport', idNumber: '123456' },
      { firstName: 'Jane', lastName: 'Doe', idType: 'passport', idNumber: '789012' }
    ],
    paymentInfo: { paymentId: 'payment123' }
  },
  
  // Get current holds
  getHolds: 'GET /api/booking/holds',
  
  // Health check
  healthCheck: 'GET /api/booking/health'
};

/**
 * Socket Events Summary
 */
export const socketEventsSummary = {
  // Client emits (with acknowledgment)
  client: {
    joinRoute: 'join:route',
    leaveRoute: 'leave:route',
    getSeats: 'seats:get',
    holdSeat: 'seat:hold',
    releaseSeat: 'seat:release',
    confirmBooking: 'booking:confirm',
    getHolds: 'holds:get',
    ping: 'ping',
    getInfo: 'info:get'
  },
  
  // Server emits (broadcast - no acknowledgment)
  broadcast: {
    seatStatusChanged: 'seat:status:changed',
    userJoined: 'user:joined',
    userLeft: 'user:left',
    seatsBooked: 'seats:booked',
    seatExpired: 'seat:expired'
  },
  
  // Client receives (acknowledgments)
  acknowledgments: {
    joinRoute: 'Success: joined route with seat availability',
    leaveRoute: 'Success: left route',
    getSeats: 'Success: current seat availability',
    holdSeat: 'Success/Error: seat hold status',
    releaseSeat: 'Success/Error: seat release status',
    confirmBooking: 'Success/Error: booking confirmation',
    ping: 'Success: server pong response',
    getInfo: 'Success: connection information'
  }
};
