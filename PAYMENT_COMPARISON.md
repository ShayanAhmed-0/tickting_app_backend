# Payment Methods Comparison

## 💰 Cash Payment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    CASH PAYMENT (1 STEP)                     │
└─────────────────────────────────────────────────────────────┘

POST /api/booking/book-seats
{
  "paymentType": "cash",
  "userId": "...",
  "routeId": "...",
  "busId": "...",
  "passengers": [...]
}
                    ↓
        Backend Processing:
        1. Create passengers
        2. Update seat status
        3. Generate QR code
                    ↓
Response: {
  "passengers": [...],
  "type": "cash",
  "bookingsCount": 2,
  "groupTicketSerial": "TKT-xxx",
  "qrCode": {
    "data": "data:image/png;base64,...",
    "bookingId": "BK-xxx",
    "format": "base64"
  }
}
                    ↓
        ✅ DONE! Display booking
```

## 💳 Stripe Payment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   STRIPE PAYMENT (3 STEPS)                   │
└─────────────────────────────────────────────────────────────┘

STEP 1: Create Payment Intent
────────────────────────────────
POST /api/booking/book-seats
{
  "paymentType": "stripe",
  "userId": "...",
  "routeId": "...",
  "busId": "...",
  "passengers": [...]
}
                    ↓
Response: {
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "amount": 120.00,
  "bookingsCount": 2
}

STEP 2: Process Payment (Frontend)
────────────────────────────────────
stripe.confirmCardPayment(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name: "..." }
  }
})
                    ↓
        User enters card details
                    ↓
        Stripe processes payment
                    ↓
    paymentIntent.status = "succeeded"

STEP 3: Confirm & Get Booking Data
────────────────────────────────────
POST /api/booking/confirm-stripe-payment
{
  "paymentIntentId": "pi_xxx"
}
                    ↓
        Backend Processing:
        1. Verify payment with Stripe
        2. Create passengers
        3. Update seat status
        4. Generate QR code
                    ↓
Response: {
  "passengers": [...],
  "type": "stripe",
  "bookingsCount": 2,
  "groupTicketSerial": "TKT-xxx",
  "qrCode": {
    "data": "data:image/png;base64,...",
    "bookingId": "BK-xxx",
    "format": "base64"
  },
  "paymentIntentId": "pi_xxx"
}
                    ↓
        ✅ DONE! Display booking
```

## 📊 Side-by-Side Comparison

| Feature | Cash Payment | Stripe Payment |
|---------|--------------|----------------|
| **API Calls** | 1 | 2 (+ Stripe.js) |
| **Response Format** | ✅ Same | ✅ Same |
| **Passengers Data** | ✅ Yes | ✅ Yes |
| **QR Code** | ✅ Base64 | ✅ Base64 |
| **Group Ticket Serial** | ✅ Yes | ✅ Yes |
| **Seat Status Update** | ✅ Immediate | ✅ Immediate |
| **Response Time** | Instant | After payment |
| **Payment Verification** | Manual | Automatic |
| **Idempotent** | No | ✅ Yes |
| **Retry Safe** | No | ✅ Yes |

## 🎯 Key Differences

### Cash Payment
- **Pros:**
  - Single API call
  - Simpler flow
  - No external dependencies
- **Cons:**
  - No payment verification
  - Manual payment collection
  - No automatic refunds

### Stripe Payment
- **Pros:**
  - Automatic payment processing
  - Payment verification
  - Secure card handling
  - Automatic refunds possible
  - Idempotent (safe to retry)
- **Cons:**
  - Requires 2 API calls
  - Depends on Stripe
  - Slightly more complex

## 📝 Response Format (Identical!)

Both payment methods return the **exact same structure**:

```typescript
interface BookingResponse {
  passengers: Array<{
    _id: string;
    profile: string;
    bookedBy: string;
    seatLabel: string;
    busId: string;
    for: string;
    ticketNumber: string;
    groupTicketSerial: string;
    fullName: string;
    gender: string;
    dob: string;
    contactNumber: string;
    DocumentId: string;
    type: string;
    From: string;
    To: string;
    DepartureDate: Date;
    ReturnDate: Date;
  }>;
  type: "cash" | "stripe";
  bookingsCount: number;
  groupTicketSerial: string;
  qrCode: {
    data: string; // base64 image
    bookingId: string;
    format: "base64";
  };
  paymentIntentId?: string; // Only for Stripe
}
```

## 💡 Frontend Implementation

### Cash Payment (Simple)

```javascript
async function bookWithCash(bookingDetails) {
  const response = await fetch('/api/booking/book-seats', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      ...bookingDetails,
      paymentType: 'cash'
    })
  });
  
  const { data } = await response.json();
  // Display QR code and booking details
  displayBooking(data);
}
```

### Stripe Payment (3 Steps)

```javascript
async function bookWithStripe(bookingDetails) {
  // Step 1: Create payment intent
  const intentResponse = await fetch('/api/booking/book-seats', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      ...bookingDetails,
      paymentType: 'stripe'
    })
  });
  
  const { clientSecret, paymentIntentId } = (await intentResponse.json()).data;
  
  // Step 2: Process payment
  const stripe = await loadStripe('pk_test_...');
  const { error, paymentIntent } = await stripe.confirmCardPayment(
    clientSecret,
    { payment_method: { card: cardElement } }
  );
  
  if (error || paymentIntent.status !== 'succeeded') {
    alert('Payment failed');
    return;
  }
  
  // Step 3: Get booking data
  const confirmResponse = await fetch('/api/booking/confirm-stripe-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ paymentIntentId })
  });
  
  const { data } = await confirmResponse.json();
  // Display QR code and booking details (SAME AS CASH!)
  displayBooking(data);
}

// Same display function for both!
function displayBooking(data) {
  console.log('Passengers:', data.passengers);
  console.log('QR Code:', data.qrCode.data);
  console.log('Booking ID:', data.qrCode.bookingId);
  console.log('Group Ticket:', data.groupTicketSerial);
  // Show QR code image
  document.getElementById('qr').src = data.qrCode.data;
}
```

## 🎉 Summary

Both payment methods now return **identical response data**:
- ✅ Passenger records
- ✅ QR code (base64)
- ✅ Group ticket serial
- ✅ Booking details

The only difference is:
- **Cash**: 1 API call
- **Stripe**: 2 API calls (+ Stripe.js for payment)

But the **final response is exactly the same**! 🚀
