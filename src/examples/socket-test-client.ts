/**
 * Simple Socket.io Test Client for Route-based Seat Booking
 * This client tests the socket handlers with proper acknowledgment functions
 * 
 * Note: This is a TypeScript example. To run this, you need to install socket.io-client:
 * npm install socket.io-client
 */

// Uncomment the import when socket.io-client is installed
// import { io, Socket } from 'socket.io-client';

interface TestResponse {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
  data?: any;
}

class SocketTestClient {
  private socket: any; // Using any to avoid import dependency
  private connected: boolean = false;

  constructor(serverUrl: string, token: string) {
    // This would require socket.io-client to be installed
    // this.socket = io(serverUrl, {
    //   auth: { token },
    //   transports: ['websocket', 'polling']
    // });
    
    console.log('SocketTestClient created for:', serverUrl);
    console.log('Note: Install socket.io-client to use this client');
    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;
    
    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Connected to server');
      this.connected = true;
    });

    this.socket.on('disconnect', (reason: any) => {
      console.log('❌ Disconnected:', reason);
      this.connected = false;
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('❌ Connection error:', error.message);
    });

    // Real-time updates
    this.socket.on('seat:status:changed', (data: any) => {
      console.log('🔄 Seat status changed:', data);
    });

    this.socket.on('user:joined', (data: any) => {
      console.log('👤 User joined route:', data);
    });

    this.socket.on('user:left', (data: any) => {
      console.log('👋 User left route:', data);
    });

    this.socket.on('seats:booked', (data: any) => {
      console.log('🎫 Seats booked:', data);
    });

    this.socket.on('seat:expired', (data: any) => {
      console.log('⏰ Seat hold expired:', data);
    });
  }

  /**
   * Test ping with acknowledgment
   */
  async ping(): Promise<TestResponse> {
    return new Promise((resolve) => {
      this.socket.emit('ping', (response: TestResponse) => {
        console.log('🏓 Ping response:', response);
        resolve(response);
      });
    });
  }

  /**
   * Test getting connection info with acknowledgment
   */
  async getInfo(): Promise<TestResponse> {
    return new Promise((resolve) => {
      this.socket.emit('info:get', (response: TestResponse) => {
        console.log('ℹ️ Info response:', response);
        resolve(response);
      });
    });
  }

  /**
   * Test joining a route with acknowledgment
   */
  async joinRoute(routeId: string): Promise<TestResponse> {
    return new Promise((resolve) => {
      this.socket.emit('join:route', { routeId }, (response: TestResponse) => {
        console.log('🚌 Join route response:', response);
        resolve(response);
      });
    });
  }

  /**
   * Test getting seat availability with acknowledgment
   */
  async getSeats(routeId: string): Promise<TestResponse> {
    return new Promise((resolve) => {
      this.socket.emit('seats:get', { routeId }, (response: TestResponse) => {
        console.log('💺 Seats response:', response);
        resolve(response);
      });
    });
  }

  /**
   * Test holding a seat with acknowledgment
   */
  async holdSeat(routeId: string, seatLabel: string): Promise<TestResponse> {
    return new Promise((resolve) => {
      this.socket.emit('seat:hold', { routeId, seatLabel }, (response: TestResponse) => {
        console.log('🔒 Hold seat response:', response);
        resolve(response);
      });
    });
  }

  /**
   * Test releasing a seat with acknowledgment
   */
  async releaseSeat(routeId: string, seatLabel: string): Promise<TestResponse> {
    return new Promise((resolve) => {
      this.socket.emit('seat:release', { routeId, seatLabel }, (response: TestResponse) => {
        console.log('🔓 Release seat response:', response);
        resolve(response);
      });
    });
  }

  /**
   * Test getting current holds with acknowledgment
   */
  async getHolds(): Promise<TestResponse> {
    return new Promise((resolve) => {
      this.socket.emit('holds:get', (response: TestResponse) => {
        console.log('📋 Holds response:', response);
        resolve(response);
      });
    });
  }

  /**
   * Test confirming a booking with acknowledgment
   */
  async confirmBooking(routeId: string, seatLabels: string[], passengers: any[]): Promise<TestResponse> {
    return new Promise((resolve) => {
      this.socket.emit('booking:confirm', {
        routeId,
        seatLabels,
        passengers,
        paymentInfo: { method: 'test' }
      }, (response: TestResponse) => {
        console.log('✅ Booking confirm response:', response);
        resolve(response);
      });
    });
  }

  /**
   * Test leaving a route with acknowledgment
   */
  async leaveRoute(routeId: string): Promise<TestResponse> {
    return new Promise((resolve) => {
      this.socket.emit('leave:route', { routeId }, (response: TestResponse) => {
        console.log('🚪 Leave route response:', response);
        resolve(response);
      });
    });
  }

  /**
   * Run a comprehensive test suite
   */
  async runTests(routeId: string = 'test-route-123') {
    console.log('🧪 Starting Socket.io Test Suite...\n');

    try {
      // Wait for connection
      await this.waitForConnection();

      // Test 1: Ping
      console.log('Test 1: Ping');
      await this.ping();
      console.log('');

      // Test 2: Get Info
      console.log('Test 2: Get Connection Info');
      await this.getInfo();
      console.log('');

      // Test 3: Join Route
      console.log('Test 3: Join Route');
      await this.joinRoute(routeId);
      console.log('');

      // Test 4: Get Seats
      console.log('Test 4: Get Seat Availability');
      await this.getSeats(routeId);
      console.log('');

      // Test 5: Hold Seat
      console.log('Test 5: Hold Seat');
      await this.holdSeat(routeId, '1A');
      console.log('');

      // Test 6: Get Holds
      console.log('Test 6: Get Current Holds');
      await this.getHolds();
      console.log('');

      // Test 7: Release Seat
      console.log('Test 7: Release Seat');
      await this.releaseSeat(routeId, '1A');
      console.log('');

      // Test 8: Leave Route
      console.log('Test 8: Leave Route');
      await this.leaveRoute(routeId);
      console.log('');

      console.log('✅ All tests completed successfully!');

    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }

  /**
   * Wait for socket connection
   */
  private waitForConnection(timeout: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        resolve();
        return;
      }

      const timer = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, timeout);

      this.socket.on('connect', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    this.socket.disconnect();
  }
}

// Example usage
async function runTest() {
  const token = 'your-jwt-token-here'; // Replace with actual JWT token
  const client = new SocketTestClient('http://localhost:9000', token);

  try {
    await client.runTests('route-123');
  } catch (error) {
    console.error('Test execution failed:', error);
  } finally {
    client.disconnect();
  }
}

// Export for use in other files
export { SocketTestClient };

// Run if this file is executed directly
if (require.main === module) {
  runTest().catch(console.error);
}
