/**
 * Test client for seat clearing functionality
 * This client demonstrates the seat clearing behavior on disconnect and leave route
 */

import { io, Socket } from 'socket.io-client';

interface SocketData {
  userId: string;
  userEmail: string;
  currentTrip?: string;
  heldSeats: Set<string>;
}

class SeatClearTestClient {
  private socket: Socket | null = null;
  private userId: string;
  private routeId: string;

  constructor(userId: string, routeId: string) {
    this.userId = userId;
    this.routeId = routeId;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io('http://localhost:3000', {
        auth: {
          token: 'test-token', // Replace with actual auth token
          userId: this.userId
        }
      });

      this.socket.on('connect', () => {
        console.log(`✅ Connected as user ${this.userId}`);
        this.setupEventListeners();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Connection failed:', error);
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 Disconnected from server');
      });
    });
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Listen for seat status changes
    this.socket.on('seat:status:changed', (data) => {
      console.log('🪑 Seat status changed:', {
        routeId: data.routeId,
        seatLabel: data.seatLabel,
        status: data.status,
        userId: data.userId,
        timestamp: new Date().toISOString()
      });
    });

    // Listen for user events
    this.socket.on('user:joined', (data) => {
      console.log('👤 User joined:', data);
    });

    this.socket.on('user:left', (data) => {
      console.log('👋 User left:', data);
    });

    // Listen for seat expired events
    this.socket.on('seat:expired', (data) => {
      console.log('⏰ Seat expired:', data);
    });

    // Listen for seats booked events
    this.socket.on('seats:booked', (data) => {
      console.log('🎫 Seats booked:', data);
    });
  }

  async joinRoute(): Promise<void> {
    if (!this.socket) throw new Error('Socket not connected');

    return new Promise((resolve, reject) => {
      this.socket!.emit('join:route', { routeId: this.routeId }, (response: any) => {
        if (response.success) {
          console.log(`✅ Joined route ${this.routeId}`);
          console.log('📊 Seat availability:', response.data.seats);
          resolve();
        } else {
          console.error('❌ Failed to join route:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  async holdSeat(seatLabel: string, busId: string): Promise<boolean> {
    if (!this.socket) throw new Error('Socket not connected');

    return new Promise((resolve) => {
      this.socket!.emit('seat:hold', { 
        busId, 
        routeId: this.routeId, 
        seatLabel 
      }, (response: any) => {
        if (response.success) {
          console.log(`✅ Held seat ${seatLabel}`);
          console.log('⏰ Expires at:', new Date(response.data.expiresAt).toISOString());
          resolve(true);
        } else {
          console.error(`❌ Failed to hold seat ${seatLabel}:`, response.error);
          resolve(false);
        }
      });
    });
  }

  async releaseSeat(seatLabel: string, busId: string): Promise<boolean> {
    if (!this.socket) throw new Error('Socket not connected');

    return new Promise((resolve) => {
      this.socket!.emit('seat:release', { 
        busId, 
        routeId: this.routeId, 
        seatLabel 
      }, (response: any) => {
        if (response.success) {
          console.log(`✅ Released seat ${seatLabel}`);
          resolve(true);
        } else {
          console.error(`❌ Failed to release seat ${seatLabel}:`, response.error);
          resolve(false);
        }
      });
    });
  }

  async leaveRoute(): Promise<void> {
    if (!this.socket) throw new Error('Socket not connected');

    return new Promise((resolve, reject) => {
      this.socket!.emit('leave:route', { routeId: this.routeId }, (response: any) => {
        if (response.success) {
          console.log(`✅ Left route ${this.routeId}`);
          resolve();
        } else {
          console.error('❌ Failed to leave route:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  async getCurrentHolds(): Promise<any[]> {
    if (!this.socket) throw new Error('Socket not connected');

    return new Promise((resolve) => {
      this.socket!.emit('holds:get', (response: any) => {
        if (response.success) {
          console.log('📋 Current holds:', response.data.holds);
          resolve(response.data.holds);
        } else {
          console.error('❌ Failed to get holds:', response.error);
          resolve([]);
        }
      });
    });
  }

  async getSeatAvailability(): Promise<any> {
    if (!this.socket) throw new Error('Socket not connected');

    return new Promise((resolve) => {
      this.socket!.emit('seats:get', { routeId: this.routeId }, (response: any) => {
        if (response.success) {
          console.log('🪑 Seat availability:', response.data.seats);
          resolve(response.data.seats);
        } else {
          console.error('❌ Failed to get seats:', response.error);
          resolve({});
        }
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Test scenarios
  async runDisconnectTest(): Promise<void> {
    console.log('\n🧪 Running Disconnect Test...');
    
    try {
      await this.connect();
      await this.joinRoute();
      
      // Hold a seat
      const busId = 'test-bus-id'; // Replace with actual bus ID
      const held = await this.holdSeat('A1', busId);
      
      if (held) {
        console.log('⏳ Waiting 3 seconds before disconnecting...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('🔌 Disconnecting (this should trigger seat clearing)...');
        this.disconnect();
      }
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }

  async runLeaveRouteTest(): Promise<void> {
    console.log('\n🧪 Running Leave Route Test...');
    
    try {
      await this.connect();
      await this.joinRoute();
      
      // Hold a seat
      const busId = 'test-bus-id'; // Replace with actual bus ID
      const held = await this.holdSeat('A2', busId);
      
      if (held) {
        console.log('⏳ Waiting 3 seconds before leaving route...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('🚪 Leaving route (this should trigger seat clearing)...');
        await this.leaveRoute();
        
        // Wait a bit then disconnect
        await new Promise(resolve => setTimeout(resolve, 2000));
        this.disconnect();
      }
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }
}

// Example usage
async function runTests() {
  const userId = 'test-user-' + Date.now();
  const routeId = 'your-route-id'; // Replace with actual route ID
  
  const client = new SeatClearTestClient(userId, routeId);
  
  // Run disconnect test
  await client.runDisconnectTest();
  
  // Wait between tests
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Run leave route test
  await client.runLeaveRouteTest();
}

// Uncomment to run tests
// runTests().catch(console.error);

export default SeatClearTestClient;
