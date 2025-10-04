/**
 * Example client implementation using Socket.io acknowledgements
 * This demonstrates the improved request-response pattern with acknowledgements
 */

// Uncomment the import when socket.io-client is installed
// import io from 'socket.io-client';

export class SeatBookingClientWithAck {
  public socket: any;
  private isConnected = false;

  constructor(serverUrl: string = 'http://localhost:5000', authToken: string) {
    // Uncomment when socket.io-client is available
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
      console.log(`👤 ${data.userId} joined trip. ${data.userCount} users now in room`);
      this.updateUserCount(data.userCount);
    });

    this.socket.on('user:left', (data: any) => {
      console.log(`👤 ${data.userId} left trip. ${data.userCount} users remaining`);
      this.updateUserCount(data.userCount);
    });

    this.socket.on('seats:booked', (data: any) => {
      console.log(`📝 Seats permanently booked by ${data.userId}:`, data.seatLabels);
      data.seatLabels.forEach((seatLabel: string) => {
        this.updateSingleSeatStatus({ seatLabel, status: 'booked', tripId: data.tripId });
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
   * Join a trip room with acknowledgment
   * @param tripId Trip ID to join
   * @returns Promise with seat availability data
   */
  public async joinTrip(tripId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('join:trip', { tripId }, (response: any) => {
        if (response.success) {
          console.log(`✅ ${response.message}`);
          console.log('📋 Seats available:', response.data.seats);
          console.log('👥 Users in room:', response.data.userCount);
          this.updateSeatMap(response.data.seats);
          resolve(response.data);
        } else {
          console.error(`❌ Failed to join trip: ${response.error}`);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Leave a trip room with acknowledgment
   * @param tripId Trip ID to leave
   */
  public async leaveTrip(tripId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('leave:trip', { tripId }, (response: any) => {
        if (response.success) {
          console.log(`✅ ${response.message}`);
          resolve(response.data);
        } else {
          console.error(`❌ Failed to leave trip: ${response.error}`);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Get current seat availability with acknowledgment
   * @param tripId Trip ID
   */
  public async getSeats(tripId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('seats:get', { tripId }, (response: any) => {
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
   * @param tripId Trip ID
   * @param seatLabel Seat label to hold
   */
  public async holdSeat(tripId: string, seatLabel: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('seat:hold', { tripId, seatLabel }, (response: any) => {
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
   * @param tripId Trip ID
   * @param seatLabel Seat label to release
   */
  public async releaseSeat(tripId: string, seatLabel: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('seat:release', { tripId, seatLabel }, (response: any) => {
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
   * Get current holds with acknowledgment
   */
  public async getCurrentHolds(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('holds:get', (response: any) => {
        if (response.success) {
          console.log('📌 Current holds:', response.data.holds);
          console.log(`Holding ${response.data.count} seats`);
          resolve(response.data);
        } else {
          console.error(`❌ Failed to get holds: ${response.error}`);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Confirm booking with acknowledgment
   * @param tripId Trip ID
   * @param seatLabels Array of seat labels
   * @param passengers Passenger information
   * @param paymentInfo Payment information
   */
  public async confirmBooking(
    tripId: string, 
    seatLabels: string[], 
    passengers: any[], 
    paymentInfo?: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('booking:confirm', {
        tripId,
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
   * Ping the server with acknowledgment
   */
  public async ping(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('ping', (response: any) => {
        if (response.success) {
          console.log(`🏓 ${response.message} - User: ${response.userId}`);
          resolve(response);
        } else {
          reject(new Error('Ping failed'));
        }
      });
    });
  }

  /**
   * Get connection info with acknowledgment
   */
  public async getConnectionInfo(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('info:get', (response: any) => {
        if (response.success) {
          console.log('ℹ️ Connection Info:', response.data);
          resolve(response.data);
        } else {
          reject(new Error('Failed to get connection info'));
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
 * Example: Complete booking flow using acknowledgments
 */
export async function exampleBookingFlow() {
  const client = new SeatBookingClientWithAck('http://localhost:5000', 'your-jwt-token');

  try {
    // Wait for connection
    await new Promise(resolve => {
      client.socket.on('connect', resolve);
    });

    console.log('🚀 Starting booking flow...');

    // 1. Join trip
    const tripData = await client.joinTrip('trip123');

    // 2. Get current seats
    await client.getSeats('trip123');

    // 3. Hold seats
    console.log('\n🔒 Holding seats...');
    await client.holdSeat('trip123', '1A');
    await client.holdSeat('trip123', '1B');

    // 4. Get current holds
    await client.getCurrentHolds();

    // 5. Confirm booking
    console.log('\n🎫 Confirming booking...');
    const booking = await client.confirmBooking('trip123', ['1A', '1B'], [
      { firstName: 'John', lastName: 'Doe', idType: 'passport', idNumber: '123456' },
      { firstName: 'Jane', lastName: 'Doe', idType: 'passport', idNumber: '789012' }
    ], { paymentId: 'payment123' });

    console.log('🎉 Booking completed successfully!', booking);

    // 6. Get final connection info
    await client.getConnectionInfo();

  } catch (error: any) {
    console.error('❌ Booking flow failed:', error);
  } finally {
    client.disconnect();
  }
}

/**
 * Example: Error handling with acknowledgments
 */
export async function exampleErrorHandling() {
  const client = new SeatBookingClientWithAck('http://localhost:5000', 'invalid-token');

  try {
    // This should fail with acknowledgment
    await client.joinTrip('nonexistent-trip');
  } catch (error: any) {
    console.log('🚨 Expected error caught:', error.message);
  }

  client.disconnect();
}

/**
 * Example: Real-time updates during booking
 */
export function exampleRealTimeUpdates() {
  const client = new SeatBookingClientWithAck('http://localhost:5000', 'your-jwt-token');

  // Listen to real-time broadcasts while performing operations
  client.socket.on('seat:status:changed', (data: any) => {
    console.log(`📡 Real-time update: Seat ${data.seatLabel} → ${data.status}`);
  });

  // Perform operations and see real-time updates
  client.joinTrip('trip123').then(async () => {
    await client.holdSeat('trip123', '1A');
    // You'll see real-time updates for other users automatically
  });

  return client;
}
