# Realtime Seat Booking System

This implementation provides a complete real-time seat booking system for your bus ticketing application using Socket.io and Redis.

## Features

- **Real-time seat holds**: Users can hold seats for 10 minutes before they expire
- **Live seat status updates**: All connected clients receive immediate updates when seats are held/released/booked
- **Distributed locks**: Prevents race conditions when multiple users try to hold the same seat
- **Redis caching**: Fast seat availability lookups with database fallback
- **REST API fallback**: Standard HTTP endpoints for seat operations
- **Automatic cleanup**: Expired holds are automatically released

## Architecture

### Socket.io Events

#### Client → Server Events
- `join:trip` - Join a trip room to receive seat updates
- `leave:trip` - Leave a trip room
- `seat:hold` - Hold a seat
- `seat:release` - Release a held seat
- `booking:confirm` - Confirm booking and convert holds to permanent bookings
- `holds:get` - Get current holds for the user

#### Server → Client Events
- `seats:availability` - Current seat map for a trip
- `seat:status:changed` - Real-time seat status updates
- `seat:hold:success` - Seat hold confirmation
- `seat:hold:failed` - Seat hold failure
- `seat:release:success` - Seat release confirmation
- `booking:success` - Booking confirmation
- `booking:failed` - Booking failure
- `seats:booked` - Broadcast when seats are permanently booked

## Usage Examples

### Client Implementation (JavaScript)

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token-here'
  }
});

// Join a trip
socket.emit('join:trip', { tripId: 'trip123' });

// Listen for seat availability
socket.on('seats:availability', (data) => {
  console.log('Trip seats:', data.seats);
});

// Hold a seat
socket.emit('seat:hold', { 
  tripId: 'trip123', 
  seatLabel: '1A' 
});

// Listen for hold success
socket.on('seat:hold:success', (data) => {
  console.log('Seat held until:', new Date(data.expiresAt));
});

// Listen for real-time status changes
socket.on('seat:status:changed', (data) => {
  console.log(`Seat ${data.seatLabel} is now ${data.status}`);
});

// Confirm booking
socket.emit('booking:confirm', {
  tripId: 'trip123',
  seatLabels: ['1A', '1B'],
  passengers: [
    { firstName: 'John', lastName: 'Doe', idType: 'passport', idNumber: '123456' },
    { firstName: 'Jane', lastName: 'Doe', idType: 'passport', idNumber: '789012' }
  ],
  paymentInfo: { paymentId: 'payment123' }
});
```

### REST API Endpoints

```bash
# Get seat availability
GET /api/booking/trips/:tripId/seats

# Hold a seat
POST /api/booking/trips/:tripId/seats/:seatLabel/hold
Authorization: Bearer <jwt-token>

# Release seat hold
DELETE /api/booking/trips/:tripId/seats/:seatLabel/hold
Authorization: Bearer <jwt-token>

# Confirm booking
POST /api/booking/confirm
Authorization: Bearer <jwt-token>
Content-Type: application/json
{
  "tripId": "trip123",
  "seatLabels": ["1A", "1B"],
  "passengers": [...],
  "paymentInfo": {...}
}

# Get current holds
GET /api/booking/holds
Authorization: Bearer <jwt-token>

# Health check
GET /api/booking/health
```

## Environment Variables

Add to your `.env` file:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
CLIENT_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret
```

## Redis Keys Structure

- `hold:tripId:seatLabel` - Seat hold data (expires in 10 minutes)
- `seats:tripId` - Cached seat availability map (expires in 5 minutes)
- `user:holds:userId` - Set of user's current seat holds
- `lock:tripId:seatLabel` - Distributed lock for seat operations

## Database Integration

The system integrates with your existing models:

- **Trip**: Updates `seatsSnapshot` and `availableSeatsCount`
- **Booking**: Creates new bookings with passenger and seat information
- **SeatHold**: Tracks temporary seat holds (with TTL for automatic cleanup)
- **Bus**: Contains seat layout information

## Configuration

### Seat Hold Duration
Currently set to 10 minutes. Modify in `src/services/seatBooking.service.ts`:

```typescript
private readonly SEAT_HOLD_DURATION = 10 * 60 * 1000; // 10 minutes
```

### Redis Cache Duration
Seat availability is cached for 5 minutes. Modify in the `getSeatAvailability` method.

## Monitoring

The system includes comprehensive logging:

- User connection/disconnection events
- Seat hold/release operations
- Booking confirmations
- Error conditions

## Error Handling

Common error responses:
- `seat_locked` - Seat is currently being processed
- `seat_held` - Seat is held by another user
- `seat_booked` - Seat is permanently booked
- `invalid_data` - Missing or invalid request data
- `server_error` - Internal server error

## Performance Considerations

- Redis is used for fast lookups and distributed locks
- Seat availability is cached to reduce database queries
- Automatic cleanup prevents Redis memory bloat
- Socket.io rooms allow targeted broadcasting

## Security

- JWT authentication required for all socket connections
- User ownership verification for seat operations
- Input validation and sanitization
- Rate limiting (can be added at the gateway level)
