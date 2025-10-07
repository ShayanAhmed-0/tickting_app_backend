/**
 * Example client implementation for real-time seat booking
 * This file demonstrates how to use the Socket.io client to interact with the seat booking system
 */

// import io from 'socket.io-client';

// Example usage
export class SeatBookingClient {
  private socket: any;
  private isConnected = false;

  constructor(serverUrl: string = 'http://localhost:5000', authToken: string) {
    // this.socket = io(serverUrl, {
    this.socket = {} as any; // Placeholder for socket.io-client

    this.setupEventListeners();
  }

  /**
   * Setup all event listeners
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

    // Seat availability events
    this.socket.on('seats:availability', (data: any) => {
      console.log('📋 Seat availability for trip:', data.routeId);
      console.log('Available seats:', data.seats);
      this.updateSeatMap(data.seats);
    });

    this.socket.on('seat:status:changed', (data: any) => {
      console.log(`🔄 Seat ${data.seatLabel} status changed to: ${data.status}`);
      this.updateSingleSeatStatus(data.seatLabel, data.status);
    });

    // Seat hold events
    this.socket.on('seat:hold:success', (data: any) => {
      console.log(`✅ Successfully held seat ${data.seatLabel}`);
      console.log(`Expires at: ${new Date(data.expiresAt)}`);
      this.showSeatHoldSuccess(data);
    });

    this.socket.on('seat:hold:failed', (data: any) => {
      console.log(`❌ Failed to hold seat ${data.seatLabel}: ${data.reason}`);
      this.showSeatHoldError(data);
    });

    this.socket.on('seat:expired', (data: any) => {
      console.log(`⏰ Seat ${data.seatLabel} hold expired`);
      this.showSeatExpired(data);
    });

    this.socket.on('seat:release:success', (data: any) => {
      console.log(`🆓 Successfully released seat ${data.seatLabel}`);
      this.updateSingleSeatStatus(data.seatLabel, 'available');
    });

    // Booking events
    this.socket.on('booking:success', (data: any) => {
      console.log(`🎫 Booking confirmed! Booking ID: ${data.bookingId}`);
      console.log(`Seats booked:`, data.seatLabels);
      this.showBookingSuccess(data);
    });

    this.socket.on('booking:failed', (data: any) => {
      console.log(`❌ Booking failed: ${data.reason}`);
      this.showBookingError(data);
    });

    this.socket.on('seats:booked', (data: any) => {
      console.log(`📝 Seats permanently booked:`, data.seatLabels);
      data.seatLabels.forEach((seatLabel: string) => {
        this.updateSingleSeatStatus(seatLabel, 'booked');
      });
    });

    // User events
    this.socket.on('user:joined', (data: any) => {
      console.log(`👤 User joined room. ${data.userCount} users now in trip ${data.routeId}`);
    });

    this.socket.on('user:left', (data: any) => {
      console.log(`👤 User left room. ${data.userCount} users remaining in trip ${data.routeId}`);
    });

    // Error handling
    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
    });

    // Current holds
    this.socket.on('holds:list', (holds: any[]) => {
      console.log('📌 Current holds:', holds);
      this.displayCurrentHolds(holds);
    });
  }

  /**
   * Join a trip room to receive updates
   */
  public joinTrip(tripId: string): void {
    console.log(`🚌 Joining trip ${tripId}`);
    this.socket.emit('join:trip', { tripId });
  }

  /**
   * Leave a trip room
   */
  public leaveTrip(tripId: string): void {
    console.log(`🚌 Leaving trip ${tripId}`);
    this.socket.emit('leave:trip', { tripId });
  }

  /**
   * Hold a seat
   */
  public holdSeat(tripId: string, seatLabel: string): void {
    console.log(`🔒 Attempting to hold seat ${seatLabel}`);
    this.socket.emit('seat:hold', { tripId, seatLabel });
  }

  /**
   * Release a seat hold
   */
  public releaseSeat(tripId: string, seatLabel: string): void {
    console.log(`🔓 Releasing seat ${seatLabel}`);
    this.socket.emit('seat:release', { tripId, seatLabel });
  }

  /**
   * Confirm booking
   */
  public confirmBooking(tripId: string, seatLabels: string[], passengers: any[], paymentInfo?: any): void {
    console.log(`🎫 Confirming booking for seats:`, seatLabels);
    this.socket.emit('booking:confirm', {
      tripId,
      seatLabels,
      passengers,
      paymentInfo
    });
  }

  /**
   * Get current holds
   */
  public getCurrentHolds(): void {
    this.socket.emit('holds:get');
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
    console.log('Updating seat map:', seats);
  }

  private updateSingleSeatStatus(seatLabel: string, status: string): void {
    // Update individual seat status in UI
    console.log(`Updating seat ${seatLabel} to ${status}`);
  }

  private showSeatHoldSuccess(data: any): void {
    // Show success notification
    console.log('Showing seat hold success notification');
  }

  private showSeatHoldError(data: any): void {
    // Show error notification
    console.log('Showing seat hold error notification');
  }

  private showSeatExpired(data: any): void {
    // Show expiration notification
    console.log('Showing seat expired notification');
  }

  private showBookingSuccess(data: any): void {
    // Show booking success modal/page
    console.log('Showing booking success');
  }

  private showBookingError(data: any): void {
    // Show booking error
    console.log('Showing booking error');
  }

  private displayCurrentHolds(holds: any[]): void {
    // Display current holds list
    console.log('Displaying current holds');
  }
}

// Usage example:
/*
const client = new SeatBookingClient('http://localhost:5000', 'your-jwt-token');

// Wait for connection
if (client.isConnected) {
  // Join a trip
  client.joinTrip('trip123');
  
  // Hold a seat after a delay (to see seat availability first)
  setTimeout(() => {
    client.holdSeat('trip123', '1A');
  }, 2000);
  
  // Confirm booking after another delay
  setTimeout(() => {
    client.confirmBooking('trip123', ['1A'], [
      { firstName: 'John', lastName: 'Doe', idType: 'passport', idNumber: '123456' }
    ], { paymentId: 'payment123' });
  }, 5000);
}
*/
