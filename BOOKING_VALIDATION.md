# Booking Request Validation

## 📋 Overview

All booking endpoints now use Zod schemas for request body validation. This ensures data integrity and provides clear error messages for invalid requests.

## 🛡️ Validators

### 1. Book Seats Schema (`bookSeatsSchema`)

**Used By:** `POST /api/booking/book-seats`

**Validates:**
- User ID (MongoDB ObjectId)
- Route ID (MongoDB ObjectId)
- Bus ID (MongoDB ObjectId)
- Payment type (cash or stripe)
- Passengers array (1-10 passengers)

#### Schema Definition

```typescript
{
  userId: string;           // MongoDB ObjectId format
  routeId: string;          // MongoDB ObjectId format
  busId: string;            // MongoDB ObjectId format
  paymentType: "cash" | "stripe";
  passengers: Array<{
    fullName: string;       // 1-255 characters
    gender: "male" | "female" | "other" | "prefer_not_say";
    dob: string | Date;     // Date of birth
    contactNumber: string;  // 1-20 characters
    DocumentId: string;     // 1-100 characters
  }>;                       // 1-10 passengers
}
```

#### Validation Rules

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `userId` | string | ✅ Yes | Must be valid MongoDB ObjectId (24 hex chars) |
| `routeId` | string | ✅ Yes | Must be valid MongoDB ObjectId (24 hex chars) |
| `busId` | string | ✅ Yes | Must be valid MongoDB ObjectId (24 hex chars) |
| `paymentType` | string | ✅ Yes | Must be "cash" or "stripe" |
| `passengers` | array | ✅ Yes | Min: 1, Max: 10 passengers |

#### Passenger Object Rules

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `fullName` | string | ✅ Yes | Min: 1, Max: 255 characters |
| `gender` | string | ✅ Yes | Must be: "male", "female", "other", or "prefer_not_say" |
| `dob` | string/Date | ✅ Yes | Valid date format |
| `contactNumber` | string | ✅ Yes | Min: 1, Max: 20 characters |
| `DocumentId` | string | ✅ Yes | Min: 1, Max: 100 characters |

#### Valid Request Example

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
    },
    {
      "fullName": "Jane Smith",
      "gender": "female",
      "dob": "1992-05-20",
      "contactNumber": "+1234567891",
      "DocumentId": "PAS987654321"
    }
  ]
}
```

#### Error Response Examples

**Invalid User ID:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "User ID must be a valid MongoDB ObjectId"
}
```

**Invalid Payment Type:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Payment type must be either 'cash' or 'stripe'"
}
```

**Too Many Passengers:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Maximum 10 passengers allowed per booking"
}
```

**Missing Passenger Data:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Full name is required"
}
```

### 2. Confirm Stripe Payment Schema (`confirmStripePaymentSchema`)

**Used By:** `POST /api/booking/confirm-stripe-payment`

**Validates:**
- Payment Intent ID from Stripe

#### Schema Definition

```typescript
{
  paymentIntentId: string;  // Stripe Payment Intent ID (starts with "pi_")
}
```

#### Validation Rules

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `paymentIntentId` | string | ✅ Yes | Must start with "pi_", Max: 255 characters |

#### Valid Request Example

```json
{
  "paymentIntentId": "pi_3ABC123DEF456GHI789"
}
```

#### Error Response Examples

**Missing Payment Intent ID:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Payment Intent ID is required"
}
```

**Invalid Format:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Payment Intent ID must start with 'pi_'"
}
```

## 🔧 Implementation

### Routes Configuration

```typescript
// src/routes/booking.routes.ts
import { bookSeatsSchema, confirmStripePaymentSchema } from '../validators/bookingValidators';

router.post("/book-seats", 
  checkUserAuth, 
  validateBody(bookSeatsSchema), 
  bookSeats
);

router.post("/confirm-stripe-payment", 
  checkUserAuth, 
  validateBody(confirmStripePaymentSchema), 
  confirmStripePayment
);
```

### Validation Middleware

The `validateBody` middleware automatically:
1. Validates request body against schema
2. Returns 400 error if validation fails
3. Provides detailed error messages
4. Passes validated data to controller

## 💻 Frontend Integration

### TypeScript Types

```typescript
// Booking request type
interface BookSeatsRequest {
  userId: string;
  routeId: string;
  busId: string;
  paymentType: 'cash' | 'stripe';
  passengers: Passenger[];
}

interface Passenger {
  fullName: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_say';
  dob: string;
  contactNumber: string;
  DocumentId: string;
}

// Stripe confirmation request type
interface ConfirmStripePaymentRequest {
  paymentIntentId: string;
}
```

### React Example with Validation

```typescript
import { useState } from 'react';

function BookingForm() {
  const [formData, setFormData] = useState<BookSeatsRequest>({
    userId: '',
    routeId: '',
    busId: '',
    paymentType: 'cash',
    passengers: [{
      fullName: '',
      gender: 'male',
      dob: '',
      contactNumber: '',
      DocumentId: ''
    }]
  });

  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    try {
      const response = await fetch('/api/booking/book-seats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!data.success) {
        // Validation error from server
        setErrors([data.message]);
        return;
      }

      // Success!
      console.log('Booking successful:', data.data);
      
    } catch (error) {
      console.error('Error:', error);
      setErrors(['An error occurred during booking']);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {errors.length > 0 && (
        <div className="errors">
          {errors.map((error, i) => (
            <p key={i} className="error">{error}</p>
          ))}
        </div>
      )}
      
      {/* Form fields */}
    </form>
  );
}
```

### Client-Side Validation (Optional)

You can add client-side validation before sending the request:

```typescript
function validateBookingData(data: BookSeatsRequest): string[] {
  const errors: string[] = [];

  // Validate ObjectIds (24 hex characters)
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  
  if (!objectIdRegex.test(data.userId)) {
    errors.push('Invalid user ID format');
  }
  
  if (!objectIdRegex.test(data.routeId)) {
    errors.push('Invalid route ID format');
  }
  
  if (!objectIdRegex.test(data.busId)) {
    errors.push('Invalid bus ID format');
  }

  // Validate payment type
  if (!['cash', 'stripe'].includes(data.paymentType)) {
    errors.push('Payment type must be cash or stripe');
  }

  // Validate passengers
  if (data.passengers.length === 0) {
    errors.push('At least one passenger is required');
  }
  
  if (data.passengers.length > 10) {
    errors.push('Maximum 10 passengers allowed');
  }

  data.passengers.forEach((passenger, index) => {
    if (!passenger.fullName || passenger.fullName.length === 0) {
      errors.push(`Passenger ${index + 1}: Full name is required`);
    }
    
    if (!['male', 'female', 'other', 'prefer_not_say'].includes(passenger.gender)) {
      errors.push(`Passenger ${index + 1}: Invalid gender`);
    }
    
    if (!passenger.contactNumber) {
      errors.push(`Passenger ${index + 1}: Contact number is required`);
    }
    
    if (!passenger.DocumentId) {
      errors.push(`Passenger ${index + 1}: Document ID is required`);
    }
  });

  return errors;
}

// Usage
const errors = validateBookingData(formData);
if (errors.length > 0) {
  setErrors(errors);
  return;
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
        "fullName": "John Doe",
        "gender": "male",
        "dob": "1990-01-15",
        "contactNumber": "+1234567890",
        "DocumentId": "DL123456789"
      }
    ]
  }'
```

### Invalid Request Test (Missing Field)

```bash
curl -X POST http://localhost:3000/api/booking/book-seats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "routeId": "507f1f77bcf86cd799439012",
    "busId": "507f1f77bcf86cd799439013",
    "paymentType": "cash",
    "passengers": []
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "At least one passenger is required"
}
```

### Invalid Request Test (Wrong Payment Type)

```bash
curl -X POST http://localhost:3000/api/booking/book-seats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "routeId": "507f1f77bcf86cd799439012",
    "busId": "507f1f77bcf86cd799439013",
    "paymentType": "paypal",
    "passengers": [...]
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Payment type must be either 'cash' or 'stripe'"
}
```

## 📊 Validation Benefits

✅ **Data Integrity** - Ensures all required fields are present and valid
✅ **Type Safety** - Validates data types before processing
✅ **Clear Errors** - Provides specific error messages
✅ **Security** - Prevents invalid data from reaching controllers
✅ **Documentation** - Schema serves as API documentation
✅ **Consistency** - Same validation rules across all endpoints

## 🔍 Common Validation Errors

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "User ID must be a valid MongoDB ObjectId" | Invalid ObjectId format | Use 24 hex character string |
| "Payment type must be either 'cash' or 'stripe'" | Invalid payment type | Use "cash" or "stripe" |
| "At least one passenger is required" | Empty passengers array | Add at least one passenger |
| "Maximum 10 passengers allowed per booking" | Too many passengers | Limit to 10 passengers |
| "Full name is required" | Missing passenger name | Provide full name for all passengers |
| "Payment Intent ID must start with 'pi_'" | Invalid Stripe payment ID | Use valid Stripe payment intent ID |

## 🎉 Summary

- ✅ **Two Zod schemas** for booking validation
- ✅ **Comprehensive validation rules** for all fields
- ✅ **Clear error messages** for invalid data
- ✅ **Type-safe** request validation
- ✅ **Easy to extend** with additional rules
- ✅ **Automatic validation** via middleware

All booking endpoints are now protected with robust validation! 🛡️
