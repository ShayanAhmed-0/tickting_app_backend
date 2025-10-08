# Seat Assignment Update

## ✅ Issue Fixed

**Problem:** Passenger data didn't specify which seat belongs to which passenger.

**Solution:** Added `seatLabel` field to each passenger object in the request.

## 📋 Updated Request Format

### Before (Missing Seat Assignment)
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "routeId": "507f1f77bcf86cd799439012",
  "busId": "507f1f77bcf86cd799439013",
  "paymentType": "cash",
  "passengers": [
    {
      "fullName": "John Doe",
      "gender": "male",
      "dob": "1990-01-15",
      "contactNumber": "+1234567890",
      "DocumentId": "DL123456789"
    }
  ]
}
```

### After (With Seat Assignment) ✅
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "routeId": "507f1f77bcf86cd799439012",
  "busId": "507f1f77bcf86cd799439013",
  "paymentType": "cash",
  "passengers": [
    {
      "seatLabel": "A1",
      "fullName": "John Doe",
      "gender": "male",
      "dob": "1990-01-15",
      "contactNumber": "+1234567890",
      "DocumentId": "DL123456789"
    },
    {
      "seatLabel": "A2",
      "fullName": "Jane Smith",
      "gender": "female",
      "dob": "1992-05-20",
      "contactNumber": "+1234567891",
      "DocumentId": "PAS987654"
    }
  ]
}
```

## 🛡️ Validation Rules

### Seat Label Validation

| Rule | Description |
|------|-------------|
| **Required** | ✅ Yes - Must be provided for each passenger |
| **Format** | Uppercase letters and numbers only (e.g., A1, B2, C10) |
| **Length** | Min: 1, Max: 10 characters |
| **Pattern** | Must match regex: `^[A-Z0-9]+$` |

### Valid Examples
- ✅ `A1`
- ✅ `B2`
- ✅ `C10`
- ✅ `D5`
- ✅ `VIP1`

### Invalid Examples
- ❌ `a1` (lowercase)
- ❌ `A-1` (contains hyphen)
- ❌ `A 1` (contains space)
- ❌ `` (empty)
- ❌ `seat1` (contains lowercase)

## 🔄 Changes Made

### 1. Updated Validator (`src/validators/bookingValidators/index.ts`)

Added `seatLabel` field to passenger schema:

```typescript
const passengerSchema = z.object({
  seatLabel: z.string()
    .min(1, "Seat label is required")
    .max(10, "Seat label must be less than 10 characters")
    .regex(/^[A-Z0-9]+$/, "Seat label must contain only uppercase letters and numbers (e.g., A1, B2)"),
  
  fullName: z.string()
    .min(1, "Full name is required")
    .max(255, "Full name must be less than 255 characters"),
  
  // ... other fields
});
```

### 2. Updated Booking Controller (`src/controllers/booking.controller.ts`)

**Before:**
```typescript
const getUserSeats = getSeats.filter((seat) => 
  seat.userId && seat.userId.toString() === userId
);
```

**After:**
```typescript
// Get seat labels from passengers data
const seatLabels = passengers.map((p: any) => p.seatLabel);

// Get the actual seat objects from bus
const getUserSeats = getSeats.filter((seat) => 
  seatLabels.includes(seat.seatLabel)
);

// Validate that all requested seats exist
if (getUserSeats.length !== passengers.length) {
  return ResponseUtil.errorResponse(
    res, 
    STATUS_CODES.BAD_REQUEST, 
    "One or more seats not found or not available"
  );
}
```

**Passenger Creation:**
```typescript
for (let i = 0; i < passengers.length; i++) {
  const passenger = passengers[i];
  
  const create = await PassengerModel.create({
    profile: userId,
    bookedBy: "USER",
    seatLabel: passenger.seatLabel, // ✅ Now from passenger data
    // ... other fields
  });
  passengersDB.push(create);
}
```

### 3. Updated Stripe Payment Controller (`src/controllers/stripe-payment.controller.ts`)

Same changes applied to ensure consistency across payment methods.

## 💡 Benefits

### 1. **Clear Seat-Passenger Mapping**
Each passenger is explicitly assigned to a specific seat:
```json
{
  "seatLabel": "A1",
  "fullName": "John Doe"
}
```

### 2. **Validation at Request Level**
Invalid seat labels are rejected before processing:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Seat label must contain only uppercase letters and numbers (e.g., A1, B2)"
}
```

### 3. **Prevents Seat Mismatch**
System validates that:
- All requested seats exist in the bus
- Number of seats matches number of passengers
- Seats are available for booking

### 4. **Better Error Messages**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "One or more seats not found or not available"
}
```

## 📝 Frontend Integration

### React Example

```typescript
interface Passenger {
  seatLabel: string;  // ✅ Now required
  fullName: string;
  gender: string;
  dob: string;
  contactNumber: string;
  DocumentId: string;
}

function BookingForm() {
  const [passengers, setPassengers] = useState<Passenger[]>([
    {
      seatLabel: '',  // User selects seat
      fullName: '',
      gender: 'male',
      dob: '',
      contactNumber: '',
      DocumentId: ''
    }
  ]);

  const handleSeatSelect = (index: number, seatLabel: string) => {
    const updated = [...passengers];
    updated[index].seatLabel = seatLabel;
    setPassengers(updated);
  };

  return (
    <form>
      {passengers.map((passenger, index) => (
        <div key={index}>
          {/* Seat Selection */}
          <select 
            value={passenger.seatLabel}
            onChange={(e) => handleSeatSelect(index, e.target.value)}
          >
            <option value="">Select Seat</option>
            <option value="A1">Seat A1</option>
            <option value="A2">Seat A2</option>
            <option value="B1">Seat B1</option>
          </select>

          {/* Passenger Details */}
          <input 
            placeholder="Full Name"
            value={passenger.fullName}
            onChange={(e) => {
              const updated = [...passengers];
              updated[index].fullName = e.target.value;
              setPassengers(updated);
            }}
          />
          {/* ... other fields */}
        </div>
      ))}
    </form>
  );
}
```

### Seat Map Integration

```typescript
function SeatMap({ selectedSeats, onSeatSelect }: Props) {
  const handleSeatClick = (seatLabel: string) => {
    // Add seat to passenger assignment
    onSeatSelect(seatLabel);
  };

  return (
    <div className="seat-map">
      {seats.map(seat => (
        <button
          key={seat.seatLabel}
          className={`seat ${selectedSeats.includes(seat.seatLabel) ? 'selected' : ''}`}
          onClick={() => handleSeatClick(seat.seatLabel)}
        >
          {seat.seatLabel}
        </button>
      ))}
    </div>
  );
}
```

## 🧪 Testing

### Valid Request Test

```bash
curl -X POST http://localhost:3000/api/booking/book-seats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "routeId": "507f1f77bcf86cd799439012",
    "busId": "507f1f77bcf86cd799439013",
    "paymentType": "cash",
    "passengers": [
      {
        "seatLabel": "A1",
        "fullName": "John Doe",
        "gender": "male",
        "dob": "1990-01-15",
        "contactNumber": "+1234567890",
        "DocumentId": "DL123456789"
      },
      {
        "seatLabel": "A2",
        "fullName": "Jane Smith",
        "gender": "female",
        "dob": "1992-05-20",
        "contactNumber": "+1234567891",
        "DocumentId": "PAS987654"
      }
    ]
  }'
```

### Invalid Seat Label Test

```bash
curl -X POST http://localhost:3000/api/booking/book-seats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "routeId": "507f1f77bcf86cd799439012",
    "busId": "507f1f77bcf86cd799439013",
    "paymentType": "cash",
    "passengers": [
      {
        "seatLabel": "a1",
        "fullName": "John Doe",
        "gender": "male",
        "dob": "1990-01-15",
        "contactNumber": "+1234567890",
        "DocumentId": "DL123456789"
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Seat label must contain only uppercase letters and numbers (e.g., A1, B2)"
}
```

## 📊 Response Format

The response now clearly shows seat-passenger mapping:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "passengers": [
      {
        "_id": "passenger_id_1",
        "seatLabel": "A1",
        "fullName": "John Doe",
        "ticketNumber": "TKT-1704067200000-0",
        // ... other fields
      },
      {
        "_id": "passenger_id_2",
        "seatLabel": "A2",
        "fullName": "Jane Smith",
        "ticketNumber": "TKT-1704067200000-1",
        // ... other fields
      }
    ],
    "type": "cash",
    "bookingsCount": 2,
    "groupTicketSerial": "TKT-1704067200000-2",
    "qrCode": {
      "data": "data:image/png;base64,...",
      "bookingId": "BK-xxx",
      "format": "base64"
    }
  },
  "message": "Booking confirmed successfully"
}
```

## 🎉 Summary

- ✅ **Seat assignment** now explicit in passenger data
- ✅ **Validation** ensures valid seat labels (A1, B2, etc.)
- ✅ **Clear mapping** between passengers and seats
- ✅ **Better error handling** for invalid/unavailable seats
- ✅ **Consistent** across cash and Stripe payments
- ✅ **Type-safe** with Zod validation

Each passenger is now clearly assigned to a specific seat! 🎫
