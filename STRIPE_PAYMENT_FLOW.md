# Stripe Payment Flow - Direct Response Method

## 📋 Overview

This implementation allows the frontend to receive booking data (passengers, QR code, etc.) directly as an API response after Stripe payment succeeds, similar to cash payments. No email or webhook delays!

## 🔄 Complete Payment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     STEP 1: Create Payment Intent                │
└─────────────────────────────────────────────────────────────────┘
                                  ↓
Frontend → POST /api/booking/book-seats
Body: {
  userId, routeId, busId,
  paymentType: "stripe",
  passengers: [...]
}
                                  ↓
Backend creates Stripe Payment Intent with metadata
                                  ↓
Response: {
  clientSecret: "pi_xxx_secret_xxx",
  paymentIntentId: "pi_xxx",
  amount: 120.00,
  bookingsCount: 2
}

┌─────────────────────────────────────────────────────────────────┐
│                    STEP 2: Process Payment                       │
└─────────────────────────────────────────────────────────────────┘
                                  ↓
Frontend uses Stripe.js to confirm payment
stripe.confirmCardPayment(clientSecret, {...})
                                  ↓
User enters card details and submits
                                  ↓
Stripe processes payment
                                  ↓
Payment succeeds → paymentIntent.status = "succeeded"

┌─────────────────────────────────────────────────────────────────┐
│                 STEP 3: Confirm and Get Booking Data            │
└─────────────────────────────────────────────────────────────────┘
                                  ↓
Frontend → POST /api/booking/confirm-stripe-payment
Body: {
  paymentIntentId: "pi_xxx"
}
                                  ↓
Backend:
  1. Verifies payment succeeded with Stripe
  2. Creates passenger records
  3. Updates seat status to BOOKED
  4. Generates QR code
  5. Logs payment transaction
                                  ↓
Response: {
  passengers: [...],
  type: "stripe",
  bookingsCount: 2,
  groupTicketSerial: "TKT-xxx",
  qrCode: {
    data: "data:image/png;base64,...",
    bookingId: "BK-xxx",
    format: "base64"
  },
  paymentIntentId: "pi_xxx"
}
                                  ↓
Frontend displays booking confirmation with QR code!
```

## 🎯 API Endpoints

### 1. Create Payment Intent
**Endpoint:** `POST /api/booking/book-seats`

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_TOKEN",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "userId": "user_id_here",
  "routeId": "route_id_here",
  "busId": "bus_id_here",
  "paymentType": "stripe",
  "passengers": [
    {
      "fullName": "John Doe",
      "gender": "male",
      "dob": "1990-01-01",
      "contactNumber": "+1234567890",
      "DocumentId": "DL123456"
    },
    {
      "fullName": "Jane Doe",
      "gender": "female",
      "dob": "1992-05-15",
      "contactNumber": "+1234567891",
      "DocumentId": "PAS987654"
    }
  ]
}
```

**Success Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "clientSecret": "pi_3ABC123_secret_DEF456",
    "paymentIntentId": "pi_3ABC123",
    "amount": 120.00,
    "bookingsCount": 2
  },
  "message": "Payment intent created successfully"
}
```

### 2. Confirm Payment and Get Booking Data
**Endpoint:** `POST /api/booking/confirm-stripe-payment`

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_TOKEN",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "paymentIntentId": "pi_3ABC123"
}
```

**Success Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "passengers": [
      {
        "_id": "passenger_id_1",
        "profile": "user_id",
        "bookedBy": "USER",
        "seatLabel": "A1",
        "busId": "bus_id",
        "for": "FAMILY",
        "ticketNumber": "TKT-1704067200000-0",
        "groupTicketSerial": "TKT-1704067200000-2",
        "fullName": "John Doe",
        "gender": "male",
        "dob": "1990-01-01",
        "contactNumber": "+1234567890",
        "DocumentId": "DL123456",
        "type": "ONE_WAY",
        "From": "Dallas, TX",
        "To": "Houston, TX",
        "DepartureDate": "2024-01-15T08:00:00.000Z",
        "ReturnDate": "2024-01-20T18:00:00.000Z"
      },
      {
        "_id": "passenger_id_2",
        "profile": "user_id",
        "seatLabel": "A2",
        "fullName": "Jane Doe",
        // ... other fields
      }
    ],
    "type": "stripe",
    "bookingsCount": 2,
    "groupTicketSerial": "TKT-1704067200000-2",
    "qrCode": {
      "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
      "bookingId": "BK-1704067200000-abc123",
      "format": "base64"
    },
    "paymentIntentId": "pi_3ABC123"
  },
  "message": "Booking confirmed successfully"
}
```

**Error Responses:**

Payment not succeeded:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Payment has not succeeded. Status: requires_payment_method"
}
```

Missing payment intent ID:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Payment Intent ID is required"
}
```

## 💻 Frontend Integration

### React/TypeScript Example

```typescript
import { loadStripe } from '@stripe/stripe-js';
import { useState } from 'react';

const stripePromise = loadStripe('pk_test_your_publishable_key');

interface BookingData {
  passengers: any[];
  type: string;
  bookingsCount: number;
  groupTicketSerial: string;
  qrCode: {
    data: string;
    bookingId: string;
    format: string;
  };
  paymentIntentId: string;
}

function BookingComponent() {
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);

  const handleStripePayment = async (bookingDetails: any) => {
    setLoading(true);
    
    try {
      // STEP 1: Create payment intent
      const response = await fetch('/api/booking/book-seats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${yourAuthToken}`
        },
        body: JSON.stringify({
          userId: 'user_id',
          routeId: 'route_id',
          busId: 'bus_id',
          paymentType: 'stripe',
          passengers: bookingDetails.passengers
        })
      });

      const { data } = await response.json();
      const { clientSecret, paymentIntentId } = data;

      // STEP 2: Confirm payment with Stripe
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe not loaded');

      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement, // Your Stripe card element
            billing_details: {
              name: bookingDetails.passengers[0].fullName
            }
          }
        }
      );

      if (error) {
        console.error('Payment failed:', error.message);
        alert(`Payment failed: ${error.message}`);
        setLoading(false);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        // STEP 3: Confirm booking and get data
        const confirmResponse = await fetch('/api/booking/confirm-stripe-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${yourAuthToken}`
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntentId
          })
        });

        const confirmData = await confirmResponse.json();
        
        if (confirmData.success) {
          // SUCCESS! Display booking data
          setBookingData(confirmData.data);
          console.log('Booking confirmed:', confirmData.data);
          
          // Display QR code
          const qrCodeImage = confirmData.data.qrCode.data;
          // Show success page with QR code and booking details
        } else {
          alert('Failed to confirm booking');
        }
      }

    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred during booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {bookingData ? (
        <div className="booking-success">
          <h2>Booking Confirmed! ✅</h2>
          <p>Booking ID: {bookingData.qrCode.bookingId}</p>
          <p>Group Ticket: {bookingData.groupTicketSerial}</p>
          <p>Passengers: {bookingData.bookingsCount}</p>
          
          {/* Display QR Code */}
          <img 
            src={bookingData.qrCode.data} 
            alt="Booking QR Code"
            style={{ width: '300px', height: '300px' }}
          />
          
          {/* Display passenger details */}
          <div>
            <h3>Passengers:</h3>
            {bookingData.passengers.map((passenger, index) => (
              <div key={index}>
                <p>{passenger.fullName} - Seat {passenger.seatLabel}</p>
                <p>Ticket: {passenger.ticketNumber}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button onClick={() => handleStripePayment(bookingDetails)} disabled={loading}>
          {loading ? 'Processing...' : 'Pay with Stripe'}
        </button>
      )}
    </div>
  );
}
```

### Vanilla JavaScript Example

```javascript
async function handleStripePayment(bookingDetails) {
  try {
    // STEP 1: Create payment intent
    const response = await fetch('/api/booking/book-seats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + yourAuthToken
      },
      body: JSON.stringify({
        userId: 'user_id',
        routeId: 'route_id',
        busId: 'bus_id',
        paymentType: 'stripe',
        passengers: bookingDetails.passengers
      })
    });

    const result = await response.json();
    const { clientSecret, paymentIntentId } = result.data;

    // STEP 2: Confirm payment with Stripe
    const stripe = Stripe('pk_test_your_publishable_key');
    const { error, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: cardElement,
          billing_details: { name: bookingDetails.passengers[0].fullName }
        }
      }
    );

    if (error) {
      alert('Payment failed: ' + error.message);
      return;
    }

    if (paymentIntent.status === 'succeeded') {
      // STEP 3: Confirm booking and get data
      const confirmResponse = await fetch('/api/booking/confirm-stripe-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + yourAuthToken
        },
        body: JSON.stringify({ paymentIntentId: paymentIntentId })
      });

      const bookingData = await confirmResponse.json();
      
      if (bookingData.success) {
        // Display QR code and booking details
        document.getElementById('qr-code').src = bookingData.data.qrCode.data;
        document.getElementById('booking-id').textContent = bookingData.data.qrCode.bookingId;
        // ... display other details
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## ✨ Key Features

### 1. **Idempotency Protection**
The confirm endpoint checks if booking already exists for a payment intent:
- Prevents duplicate bookings
- Returns existing data if already processed
- Safe to call multiple times

### 2. **Same Response Format**
Stripe payments return the exact same data structure as cash payments:
```json
{
  "passengers": [...],
  "type": "stripe",
  "bookingsCount": 2,
  "groupTicketSerial": "TKT-xxx",
  "qrCode": {
    "data": "base64...",
    "bookingId": "BK-xxx",
    "format": "base64"
  }
}
```

### 3. **Immediate Response**
No waiting for webhooks or emails - get booking data immediately after payment!

### 4. **QR Code Included**
QR code is generated and returned in base64 format, ready to display

### 5. **Error Handling**
Comprehensive error messages for all failure scenarios

## 🔒 Security Features

- ✅ **Payment Verification**: Retrieves payment intent from Stripe to verify status
- ✅ **Authentication**: Requires user authentication token
- ✅ **Idempotency**: Prevents duplicate bookings
- ✅ **Metadata Validation**: Verifies all required data is present

## 🎯 Comparison: Cash vs Stripe

| Feature | Cash Payment | Stripe Payment |
|---------|-------------|----------------|
| **Endpoint** | `/api/booking/book-seats` | `/api/booking/book-seats` + `/api/booking/confirm-stripe-payment` |
| **Steps** | 1 API call | 3 steps (create intent → pay → confirm) |
| **Response** | Immediate | Immediate after payment |
| **Data Format** | Same | Same |
| **QR Code** | ✅ Included | ✅ Included |
| **Passengers** | ✅ Included | ✅ Included |
| **Seat Update** | ✅ Immediate | ✅ Immediate |

## 🐛 Troubleshooting

### Payment succeeded but confirm fails
**Solution:** Call confirm endpoint again with same `paymentIntentId`. It will return existing booking data.

### "Payment has not succeeded" error
**Cause:** Payment is still processing or failed
**Solution:** Check payment status in Stripe Dashboard

### Missing metadata error
**Cause:** Payment intent created without proper metadata
**Solution:** Ensure `/book-seats` endpoint is called with all required fields

### Duplicate bookings
**Solution:** The system prevents this automatically by checking existing transactions

## 📊 Database Records Created

After successful confirmation:

1. **Passenger Records** - One per seat/passenger
2. **Payment Transaction** - Stripe payment record
3. **Bus Seat Updates** - Status changed to BOOKED

## 🎉 Benefits of This Approach

1. ✅ **Immediate Response** - No webhook delays
2. ✅ **Same UX** - Identical to cash payment flow
3. ✅ **QR Code Ready** - Display immediately
4. ✅ **No Email Required** - Direct API response
5. ✅ **Idempotent** - Safe to retry
6. ✅ **Verified Payment** - Double-checks with Stripe
7. ✅ **Complete Data** - All booking info in one response

## 🚀 Production Checklist

- [ ] Add `STRIPE_SECRET_KEY` to production environment
- [ ] Use production Stripe keys (pk_live_xxx, sk_live_xxx)
- [ ] Test with real cards in production
- [ ] Set up webhook endpoint as backup (optional)
- [ ] Add monitoring/logging for payment confirmations
- [ ] Implement retry logic on frontend
- [ ] Add loading states during payment
- [ ] Handle network errors gracefully
- [ ] Test idempotency by calling confirm multiple times
- [ ] Verify QR codes scan correctly

Perfect! Now you get the same response format for both cash and Stripe payments! 🎊
