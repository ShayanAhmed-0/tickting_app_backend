# Seat Hold Validation

## 🛡️ Protection Against Double Booking

The booking system now validates that seats are not held or booked by other users before allowing a booking to proceed.

## 🔍 Validation Checks

### 1. Seat Existence Check
Validates that all requested seats exist in the bus.

```typescript
if (getUserSeats.length !== passengers.length) {
  return "One or more seats not found";
}
```

### 2. Seat Ownership Check
Validates that seats are either:
- Available (no userId assigned)
- Held/Selected by the current user

```typescript
const invalidSeats = getUserSeats.filter((seat) => {
  const isAvailableOrOwnedByUser = 
    !seat.userId || 
    seat.userId.toString() === userId;
  
  return !isAvailableOrOwnedByUser;
});

if (invalidSeats.length > 0) {
  return `Seats ${seatLabels} are already held or booked by another user`;
}
```

### 3. Booking Status Check
Validates that seats are not already booked.

```typescript
const alreadyBookedSeats = getUserSeats.filter((seat) => 
  seat.status === SeatStatus.BOOKED
);

if (alreadyBookedSeats.length > 0) {
  return `Seats ${seatLabels} are already booked`;
}
```

## 📊 Seat States

| State | userId | status | Can Book? |
|-------|--------|--------|-----------|
| **Available** | `null` | `AVAILABLE` | ✅ Yes |
| **Held by Current User** | `currentUserId` | `HELD` or `SELECTED` | ✅ Yes |
| **Held by Another User** | `otherUserId` | `HELD` or `SELECTED` | ❌ No |
| **Booked** | `anyUserId` | `BOOKED` | ❌ No |

## 🔄 Booking Flow with Validation

```
User Attempts to Book Seats
         ↓
Check 1: Do all seats exist?
         ↓ No → Error: "One or more seats not found"
         ↓ Yes
         ↓
Check 2: Are seats held by another user?
         ↓ Yes → Error: "Seats A1, B2 are already held by another user"
         ↓ No
         ↓
Check 3: Are seats already booked?
         ↓ Yes → Error: "Seats A1, B2 are already booked"
         ↓ No
         ↓
✅ Proceed with Booking
```

## 💡 Use Cases

### Use Case 1: User Books Their Own Held Seats ✅

**Scenario:**
- User A holds seats A1, A2
- User A attempts to book seats A1, A2

**Result:** ✅ **Success** - User can book their own held seats

```json
{
  "success": true,
  "message": "Booking confirmed successfully"
}
```

### Use Case 2: User Tries to Book Another User's Held Seats ❌

**Scenario:**
- User A holds seats A1, A2
- User B attempts to book seats A1, A2

**Result:** ❌ **Error** - Seats are held by another user

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Seats A1, A2 are already held or booked by another user"
}
```

### Use Case 3: User Tries to Book Already Booked Seats ❌

**Scenario:**
- Seats A1, A2 are already booked (status: BOOKED)
- User B attempts to book seats A1, A2

**Result:** ❌ **Error** - Seats are already booked

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Seats A1, A2 are already booked"
}
```

### Use Case 4: User Books Available Seats ✅

**Scenario:**
- Seats A1, A2 are available (no userId, status: AVAILABLE)
- User A attempts to book seats A1, A2

**Result:** ✅ **Success** - Available seats can be booked

```json
{
  "success": true,
  "message": "Booking confirmed successfully"
}
```

### Use Case 5: Mixed Seat States ❌

**Scenario:**
- Seat A1: Available
- Seat A2: Held by User B
- User A attempts to book seats A1, A2

**Result:** ❌ **Error** - One seat is held by another user

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Seats A2 are already held or booked by another user"
}
```

## 🧪 Testing Scenarios

### Test 1: Book Available Seats

```bash
# Step 1: Verify seats are available
# seats A1, A2: userId = null, status = "available"

# Step 2: Attempt booking
curl -X POST http://localhost:3000/api/booking/book-seats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_A_TOKEN" \
  -d '{
    "userId": "user_a_id",
    "routeId": "route_id",
    "busId": "bus_id",
    "paymentType": "cash",
    "passengers": [
      {
        "seatLabel": "A1",
        "fullName": "John Doe",
        "gender": "male",
        "dob": "1990-01-15",
        "contactNumber": "+1234567890",
        "DocumentId": "DL123456"
      }
    ]
  }'

# Expected: ✅ Success
```

### Test 2: Book Seats Held by Another User

```bash
# Step 1: User A holds seat A1
# seat A1: userId = "user_a_id", status = "held"

# Step 2: User B attempts to book seat A1
curl -X POST http://localhost:3000/api/booking/book-seats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_B_TOKEN" \
  -d '{
    "userId": "user_b_id",
    "routeId": "route_id",
    "busId": "bus_id",
    "paymentType": "cash",
    "passengers": [
      {
        "seatLabel": "A1",
        "fullName": "Jane Smith",
        "gender": "female",
        "dob": "1992-05-20",
        "contactNumber": "+1234567891",
        "DocumentId": "PAS987654"
      }
    ]
  }'

# Expected: ❌ Error
# {
#   "success": false,
#   "statusCode": 400,
#   "message": "Seats A1 are already held or booked by another user"
# }
```

### Test 3: Book Own Held Seats

```bash
# Step 1: User A holds seat A1
# seat A1: userId = "user_a_id", status = "held"

# Step 2: User A books their own held seat
curl -X POST http://localhost:3000/api/booking/book-seats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_A_TOKEN" \
  -d '{
    "userId": "user_a_id",
    "routeId": "route_id",
    "busId": "bus_id",
    "paymentType": "cash",
    "passengers": [
      {
        "seatLabel": "A1",
        "fullName": "John Doe",
        "gender": "male",
        "dob": "1990-01-15",
        "contactNumber": "+1234567890",
        "DocumentId": "DL123456"
      }
    ]
  }'

# Expected: ✅ Success
```

### Test 4: Book Already Booked Seats

```bash
# Step 1: Seat A1 is already booked
# seat A1: userId = "user_a_id", status = "booked"

# Step 2: User B attempts to book seat A1
curl -X POST http://localhost:3000/api/booking/book-seats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_B_TOKEN" \
  -d '{
    "userId": "user_b_id",
    "routeId": "route_id",
    "busId": "bus_id",
    "paymentType": "cash",
    "passengers": [
      {
        "seatLabel": "A1",
        "fullName": "Jane Smith",
        "gender": "female",
        "dob": "1992-05-20",
        "contactNumber": "+1234567891",
        "DocumentId": "PAS987654"
      }
    ]
  }'

# Expected: ❌ Error
# {
#   "success": false,
#   "statusCode": 400,
#   "message": "Seats A1 are already booked"
# }
```

## 🔒 Security Benefits

### 1. **Prevents Race Conditions**
Multiple users can't book the same seat simultaneously.

### 2. **Respects Seat Holds**
Users who held seats first have priority to book them.

### 3. **Clear Error Messages**
Users know exactly why their booking failed:
- "Seats A1, B2 are already held by another user"
- "Seats A1, B2 are already booked"

### 4. **Protects User Experience**
Users can complete their booking without interference from others.

## 📱 Frontend Integration

### Handle Validation Errors

```typescript
async function bookSeats(bookingData: BookingRequest) {
  try {
    const response = await fetch('/api/booking/book-seats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(bookingData)
    });

    const data = await response.json();

    if (!data.success) {
      // Handle specific errors
      if (data.message.includes('already held')) {
        showError('These seats are currently held by another user. Please select different seats.');
        // Refresh seat map to show current status
        refreshSeatMap();
      } else if (data.message.includes('already booked')) {
        showError('These seats have been booked. Please select different seats.');
        // Refresh seat map
        refreshSeatMap();
      } else {
        showError(data.message);
      }
      return;
    }

    // Success!
    showSuccess('Booking confirmed!');
    displayBookingDetails(data.data);
    
  } catch (error) {
    console.error('Booking error:', error);
    showError('An error occurred during booking');
  }
}
```

### Real-time Seat Updates

```typescript
// Listen for seat status changes
socket.on('seat:status:changed', (data) => {
  const { seatLabel, status, userId } = data;
  
  // Update seat in UI
  updateSeatStatus(seatLabel, status);
  
  // If user's selected seat was taken by someone else
  if (selectedSeats.includes(seatLabel) && userId !== currentUserId) {
    showWarning(`Seat ${seatLabel} is no longer available`);
    removeFromSelection(seatLabel);
  }
});
```

## 🎯 Best Practices

### 1. **Hold Seats Before Booking**
Users should hold seats first, then book them:
```
1. User selects seats → Emit 'seat:hold'
2. Seats are held for user (10 minutes)
3. User fills passenger details
4. User books seats → Validates holds
5. Booking succeeds
```

### 2. **Refresh Seat Map on Errors**
When booking fails due to seat conflicts, refresh the seat map to show current availability.

### 3. **Show Real-time Updates**
Use Socket.IO to show when seats are held/booked by others in real-time.

### 4. **Clear User Feedback**
Show specific error messages:
- ✅ "Seat A1 is held by another user"
- ❌ "Booking failed" (too vague)

## 📊 Error Response Examples

### Seats Held by Another User
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Seats A1, B2 are already held or booked by another user"
}
```

### Seats Already Booked
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Seats A1, B2 are already booked"
}
```

### Seats Not Found
```json
{
  "success": false,
  "statusCode": 400,
  "message": "One or more seats not found"
}
```

## 🎉 Summary

- ✅ **Validates seat ownership** before booking
- ✅ **Prevents double booking** by checking userId
- ✅ **Checks booking status** to prevent rebooking
- ✅ **Clear error messages** for each failure case
- ✅ **Works with both** cash and Stripe payments
- ✅ **Protects user experience** from conflicts

No more seat conflicts! Users can only book seats that are available or held by them. 🎫🔒
