# Route Model Migration

## 🔄 Migration from Trip Model to Route Model

The seat booking system has been successfully migrated from using the **Trip model** to the **Route model** as requested. Here's a comprehensive overview of the changes made:

## 📊 Model Structure Comparison

### Trip Model (Previous)
```typescript
interface ITrip {
  route: ObjectId;           // Reference to route
  bus: ObjectId;            // Reference to bus
  driver?: ObjectId;
  departAt: Date;           // Specific departure time
  arriveAtEstimated?: Date;
  seatsSnapshot: SeatSnapshot[]; // Seat booking states
  capacity: number;
  availableSeatsCount: number;
  status: TripStatus;
  office?: ObjectId;
  pricingOverrides: PricingOverride[];
}
```

### Route Model (Current)
```typescript
interface IRoute {
  name: string;
  origin: ObjectId;          // Starting destination
  destination: ObjectId;     // Ending destination  
  bus: ObjectId;            // Bus assigned to route
  dayTime: Array<{
    day: DaysEnums,
    time: Date
  }>;                       // Schedule information
  intermediateStops: ObjectId[]; // Stop points
  isActive: boolean;
}
```

## 🔧 **Key Changes Made:**

### **1. Service Layer Updates (`src/services/seatBooking.service.ts`)**

#### Before (Trip-based):
```typescript
async getSeatAvailability(tripId: string): Promise<Record<string, string>> {
  const trip = await Trip.findById(tripId).populate('bus');
  // Use trip.seatsSnapshot for seat states
}
```

#### After (Route-based):
```typescript
async getSeatAvailability(routeId: string): Promise<Record<string, string>> {
  const route = await Route.findById(routeId).populate('bus');
  const existingBookings = await Booking.find({ 
    route: routeId,
    bookingStatus: { $in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] }
  });
  // Determine seat states from existing bookings
}
```

### **2. Socket Event Updates (`src/handlers/socket.handlers.ts`)**

#### Before (Trip Events):
```typescript
socket.on('join:trip', (data: { tripId: string }, ack: Function) => {
  socket.join(`trip:${tripId}`);
});

socket.on('seat:hold', (data: { tripId: string; seatLabel: string }, ack: Function) => {
  seatBookingService.holdSeat(tripId, seatLabel, userId);
});
```

#### After (Route Events):
```typescript
socket.on('join:route', (data: { routeId: string }, ack: Function) => {
  socket.join(`route:${routeId}`);
});

socket.on('seat:hold', (data: { routeId: string; seatLabel: string }, ack: Function) => {
  seatBookingService.holdSeat(routeId, seatLabel, userId);
});
```

### **3. REST API Endpoint Updates**

#### Before (Trip Endpoints):
```bash
GET /api/booking/trips/:tripId/seats
POST /api/booking/trips/:tripId/seats/:seatLabel/hold
DELETE /api/booking/trips/:tripId/seats/:seatLabel/hold
```

#### After (Route Endpoints):
```bash
GET /api/booking/routes/:routeId/seats
POST /api/booking/routes/:routeId/seats/:seatLabel/hold
DELETE /api/booking/routes/:routeId/seats/:seatLabel/hold
```

### **4. Redis Key Structure Updates**

#### Before:
```typescript
const RedisKeys = {
  seatHold: (tripId: string, seatLabel: string) => `hold:${tripId}:${seatLabel}`,
  tripSeats: (tripId: string) => `seats:${tripId}`,
  tripLock: (tripId: string, seatLabel: string) => `lock:${tripId}:${seatLabel}`,
};
```

#### After:
```typescript
const RedisKeys = {
  seatHold: (routeId: string, seatLabel: string) => `hold:${routeId}:${seatLabel}`,
  tripSeats: (routeId: string) => `seats:${routeId}`, // Keep name for compatibility
  tripLock: (routeId: string, seatLabel: string) => `lock:${routeId}:${seatLabel}`,
};
```

## 🎯 **Benefits of Route-Based Approach:**

### **1. Simplified Data Model**
- **Routes** represent **permanent configurations** (origin, destination, bus, schedule)
- **Bookings** reference routes directly instead of specific trip instances
- **Eliminates complexity** of managing trip instances for each departure

### **2. Better Business Logic Alignment**
- Routes are **business entities** that customers understand
- Seat availability is **route-based** rather than trip-instance-based
- **Schedule information** is embedded in the route model

### **3. Flexible Scheduling**
- Routes can have **multiple departure times** (`dayTime` array)
- **Intermediate stops** are properly modeled
- **Dynamic pricing** can be applied at route level

### **4. Improved Scalability**
- **Single route** handles **multiple daily departures**
- **Reduced data redundancy** across trip instances
- **Simplified queries** for seat availability

## 📋 **Updated Event Structure**

### **Socket Events Now Using Route IDs:**

#### **Client → Server (With Acknowledgments):**
- `join:route` - Join route room
- `leave:route` - Leave route room
- `seats:get` - Get current seat availability
- `seat:hold` - Hold a seat
- `seat:release` - Release seat hold
- `booking:confirm` - Confirm booking
- `holds:get` - Get current holds
- `ping` - Health check
- `info:get` - Get connection info

#### **Server → Client (Broadcasts):**
- `seat:status:changed` - Real-time seat status updates
- `user:joined` - User joined route room
- `user:left` - User left route room
- `seats:booked` - Seats permanently booked
- `seat:expired` - Seat hold expired

## 🔗 **Booking Model Integration**

The **Booking model already supports routes** with this structure:
```typescript
interface IBooking {
  bookingRef: string;
  trip: ObjectId;        // Still kept for compatibility
  route?: ObjectId;      // ✅ Already exists - now primary reference
  user?: ObjectId;
  passengers: Passenger[];
  // ... other fields
}
```

**Key Points:**
- ✅ **Route field already exists** in Booking model
- ✅ **No migration needed** for existing booking data
- ✅ **Trip field maintained** for backward compatibility
- ✅ **Route becomes primary reference** for new bookings

## 📖 **Usage Examples**

### **Client Implementation:**
```typescript
const client = new RouteSeatBookingClient('http://localhost:5000', 'jwt-token');

// Join route instead of trip
await client.joinRoute('route123');

// Hold seats on route
await client.holdSeat('route123', '1A');

// Confirm booking using route
await client.confirmbooking('route123', ['1A'], passengers, paymentInfo);
```

### **REST API Calls:**
```bash
# Get seat availability for route
curl -X GET /api/booking/routes/route123/seats

# Hold a seat
curl -X POST /api/booking/routes/route123/seats/1A/hold \
  -H "Authorization: Bearer jwt-token"

# Confirm booking
curl -X POST /api/booking/confirm \
  -H "Content-Type: application/json" \
  -d '{"routeId": "route123", "seatLabels": ["1A"], "passengers": [...]}'
```

## 🎊 **Migration Summary:**

✅ **Route model now primary** for seat booking operations  
✅ **Backward compatibility maintained** with existing booking data  
✅ **Socket events updated** to use routeId instead of tripId  
✅ **REST endpoints updated** to use route-based URLs  
✅ **Redis keys updated** for route-based caching  
✅ **Seat availability calculation** now based on route bookings  
✅ **Booking confirmation** now creates bookings directly on routes  

The system now properly aligns with business logic where **customers book seats on routes** rather than specific trip instances, making the booking process more intuitive and the data model more maintainable! 🚀
