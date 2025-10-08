# Seat Hold Requirement Before Booking

## 🔒 Mandatory Seat Hold Validation

The booking system now **requires** users to hold seats in Redis before they can book them. This ensures proper seat reservation flow and prevents booking conflicts.

## 🔄 Required Booking Flow

```
Step 1: User Selects Seats
         ↓
Step 2: Hold Seats via Socket.IO
        socket.emit('seat:hold', { routeId, seatLabel })
         ↓
Step 3: Seats Held in Redis (10 minutes)
         ↓
Step 4: User Fills Passenger Details
         ↓
Step 5: User Attempts Booking
         ↓
Step 6: Validate Seat Holds in Redis ✅ NEW!
         ↓
Step 7: If Valid → Complete Booking
        If Invalid → Error: "Must hold seats first"
```

## 🛡️ Validation Logic

### Check 1: Hold Exists in Redis
```typescript
const holdKey = RedisKeys.seatHold(routeId, seatLabel);
const holdData = await redis.get(holdKey);

if (!holdData) {
  return "You must hold seats before booking";
}
```

### Check 2: Hold Belongs to User
```typescript
const hold = JSON.parse(holdData);
if (hold.userId !== userId) {
  return "You must hold seats before booking";
}
```

### Check 3: Hold Not Expired
```typescript
if (Date.now() > hold.expiresAt) {
  return "You must hold seats before booking (hold expired)";
}
```

## ❌ Scenarios That Will Fail

### Scenario 1: No Hold in Redis
**Situation:** User tries to book without holding seats first

**Error:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "You must hold seats A1, A2 before booking. Please select and hold the seats first."
}
```

### Scenario 2: Hold Expired
**Situation:** User held seats but waited more than 10 minutes

**Error:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "You must hold seats A1 before booking. Please select and hold the seats first."
}
```

### Scenario 3: Hold Belongs to Another User
**Situation:** Trying to book seats held by someone else

**Error:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "You must hold seats A1 before booking. Please select and hold the seats first."
}
```

### Scenario 4: Mixed - Some Held, Some Not
**Situation:** User held A1 but not A2, tries to book both

**Error:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "You must hold seats A2 before booking. Please select and hold the seats first."
}
```

## ✅ Valid Booking Flow Example

### Step 1: Hold Seats via Socket.IO

```javascript
// Frontend - Hold seat A1
socket.emit('seat:hold', {
  routeId: 'route_123',
  busId: 'bus_456',
  seatLabel: 'A1'
}, (response) => {
  if (response.success) {
    console.log('Seat A1 held successfully');
    console.log('Expires at:', new Date(response.data.expiresAt));
  }
});

// Hold seat A2
socket.emit('seat:hold', {
  routeId: 'route_123',
  busId: 'bus_456',
  seatLabel: 'A2'
}, (response) => {
  if (response.success) {
    console.log('Seat A2 held successfully');
  }
});
```

### Step 2: Book Held Seats

```javascript
// After holding seats, book them
const response = await fetch('/api/booking/book-seats', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    routeId: 'route_123',
    busId: 'bus_456',
    paymentType: 'cash',
    tripType: 'one_way',
    passengers: [
      {
        seatLabel: 'A1',  // Must be held in Redis
        fullName: 'John Doe',
        gender: 'male',
        dob: '1990-01-15',
        contactNumber: '+1234567890',
        DocumentId: 'DL123456'
      },
      {
        seatLabel: 'A2',  // Must be held in Redis
        fullName: 'Jane Smith',
        gender: 'female',
        dob: '1992-05-20',
        contactNumber: '+1234567891',
        DocumentId: 'PAS987654'
      }
    ]
  })
});

// Success! ✅
```

## 🧪 Testing Scenarios

### Test 1: Book Without Holding First ❌

```bash
# Skip holding step
# Directly attempt booking

curl -X POST http://localhost:3000/api/booking/book-seats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{
    "routeId": "route_123",
    "busId": "bus_456",
    "paymentType": "cash",
    "tripType": "one_way",
    "passengers": [{
      "seatLabel": "A1",
      "fullName": "John Doe",
      "gender": "male",
      "dob": "1990-01-15",
      "contactNumber": "+1234567890",
      "DocumentId": "DL123456"
    }]
  }'

# Expected Error:
# {
#   "success": false,
#   "statusCode": 400,
#   "message": "You must hold seats A1 before booking. Please select and hold the seats first."
# }
```

### Test 2: Hold Then Book ✅

```javascript
// Step 1: Hold seat
socket.emit('seat:hold', {
  routeId: 'route_123',
  busId: 'bus_456',
  seatLabel: 'A1'
}, async (holdResponse) => {
  if (holdResponse.success) {
    // Step 2: Book immediately after holding
    const bookResponse = await fetch('/api/booking/book-seats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        routeId: 'route_123',
        busId: 'bus_456',
        paymentType: 'cash',
        tripType: 'one_way',
        passengers: [{
          seatLabel: 'A1',
          fullName: 'John Doe',
          gender: 'male',
          dob: '1990-01-15',
          contactNumber: '+1234567890',
          DocumentId: 'DL123456'
        }]
      })
    });
    
    // Success! ✅
  }
});
```

### Test 3: Hold Expires Before Booking ❌

```javascript
// Step 1: Hold seat
socket.emit('seat:hold', {
  routeId: 'route_123',
  busId: 'bus_456',
  seatLabel: 'A1'
});

// Step 2: Wait more than 10 minutes
await new Promise(resolve => setTimeout(resolve, 11 * 60 * 1000));

// Step 3: Try to book (hold expired)
const response = await fetch('/api/booking/book-seats', {
  method: 'POST',
  body: JSON.stringify({...})
});

// Expected Error:
// "You must hold seats A1 before booking. Please select and hold the seats first."
```

## 💻 Frontend Implementation

### React Hook for Seat Holding

```typescript
import { useState, useEffect } from 'react';
import { useSocket } from './useSocket';

interface HeldSeat {
  seatLabel: string;
  expiresAt: number;
}

export function useSeatHolding(routeId: string, busId: string) {
  const socket = useSocket();
  const [heldSeats, setHeldSeats] = useState<HeldSeat[]>([]);
  const [error, setError] = useState<string | null>(null);

  const holdSeat = async (seatLabel: string): Promise<boolean> => {
    return new Promise((resolve) => {
      socket.emit('seat:hold', {
        routeId,
        busId,
        seatLabel
      }, (response: any) => {
        if (response.success) {
          setHeldSeats(prev => [...prev, {
            seatLabel,
            expiresAt: response.data.expiresAt
          }]);
          resolve(true);
        } else {
          setError(response.error);
          resolve(false);
        }
      });
    });
  };

  const releaseSeat = async (seatLabel: string): Promise<boolean> => {
    return new Promise((resolve) => {
      socket.emit('seat:release', {
        routeId,
        busId,
        seatLabel
      }, (response: any) => {
        if (response.success) {
          setHeldSeats(prev => prev.filter(s => s.seatLabel !== seatLabel));
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  };

  const canBook = (seatLabels: string[]): boolean => {
    const now = Date.now();
    return seatLabels.every(label => {
      const held = heldSeats.find(s => s.seatLabel === label);
      return held && held.expiresAt > now;
    });
  };

  return {
    heldSeats,
    holdSeat,
    releaseSeat,
    canBook,
    error
  };
}
```

### Booking Component with Hold Validation

```typescript
function BookingForm({ routeId, busId }: Props) {
  const { heldSeats, holdSeat, canBook } = useSeatHolding(routeId, busId);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);

  const handleSeatSelect = async (seatLabel: string) => {
    // Hold seat when selected
    const held = await holdSeat(seatLabel);
    if (held) {
      setSelectedSeats(prev => [...prev, seatLabel]);
    } else {
      alert('Failed to hold seat. It may be held by another user.');
    }
  };

  const handleBooking = async () => {
    // Check if all seats are still held
    if (!canBook(selectedSeats)) {
      alert('Some seats are no longer held. Please reselect your seats.');
      return;
    }

    // Proceed with booking
    const response = await fetch('/api/booking/book-seats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        routeId,
        busId,
        paymentType: 'cash',
        tripType: 'one_way',
        passengers: passengers.map((p, i) => ({
          ...p,
          seatLabel: selectedSeats[i]
        }))
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      if (data.message.includes('must hold seats')) {
        alert('Your seat holds have expired. Please reselect your seats.');
        // Refresh seat map
        setSelectedSeats([]);
      } else {
        alert(data.message);
      }
      return;
    }

    // Success!
    showBookingConfirmation(data.data);
  };

  return (
    <div>
      <SeatMap onSeatSelect={handleSeatSelect} />
      <PassengerForm passengers={passengers} onChange={setPassengers} />
      <button 
        onClick={handleBooking}
        disabled={!canBook(selectedSeats)}
      >
        {canBook(selectedSeats) ? 'Book Now' : 'Select and Hold Seats First'}
      </button>
    </div>
  );
}
```

## 🔍 Redis Hold Data Structure

```typescript
// Redis Key: hold:route_123:A1
{
  "userId": "user_456",
  "seatLabel": "A1",
  "routeId": "route_123",
  "heldAt": 1704067200000,
  "expiresAt": 1704067800000  // 10 minutes later
}
```

## ⏰ Hold Duration

- **Default:** 10 minutes (600 seconds)
- **Configurable:** Set via `SEAT_HOLD_DURATION` environment variable
- **Auto-cleanup:** Expired holds are automatically cleaned up

## 🎯 Benefits

### 1. **Prevents Booking Conflicts**
Users must go through proper hold flow before booking.

### 2. **Fair Seat Allocation**
First to hold, first to book principle enforced.

### 3. **Clear User Feedback**
Users know exactly why booking failed and what to do.

### 4. **Consistent State**
Redis holds and database state stay synchronized.

### 5. **Time-Limited Reservations**
Holds expire after 10 minutes, freeing seats for others.

## 📊 Validation Order

```
1. ✅ Seat exists in bus
2. ✅ Seat not held by another user (database)
3. ✅ Seat not already booked (database)
4. ✅ Seat is held by current user (Redis) ⭐ NEW!
5. ✅ Hold is not expired (Redis) ⭐ NEW!
6. ✅ Proceed with booking
```

## 🎉 Summary

- ✅ **Mandatory hold check** before booking
- ✅ **Validates hold exists** in Redis
- ✅ **Validates hold ownership** (belongs to user)
- ✅ **Validates hold expiry** (not expired)
- ✅ **Clear error messages** for each failure
- ✅ **Works with both** cash and Stripe payments
- ✅ **Enforces proper flow** - hold first, then book

Users must now hold seats before booking them! 🔒✨
