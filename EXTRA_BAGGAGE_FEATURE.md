# Extra Baggage Feature Implementation

## Overview
This feature allows drivers to charge passengers for extra baggage at check-in time if their baggage exceeds the weight limit. The payment is processed through Stripe and automatically updates the passenger record upon successful payment.

## Implementation Details

### 1. Database Schema
The `Passenger` model already includes the necessary fields:
- `additionalBaggage`: Stores baggage information (e.g., "25kg - $50")
- `scannedForBaggageCount`: Tracks how many times baggage has been scanned
- `extraBaggageIntentId`: Stores the Stripe payment intent ID for extra baggage

### 2. API Endpoint

**POST** `/api/driver/add-baggage`

**Authentication Required**: Driver Auth Token

**Request Body**:
```json
{
  "ticketNumber": "TKT-1729123456789-0",
  "baggageWeight": 25,
  "baggageAmount": 50
}
```

**Response (Success - 200)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Payment intent created for extra baggage. Please complete the payment.",
  "data": {
    "paymentIntent": {
      "id": "pi_xxxxxxxxxxxxx",
      "clientSecret": "pi_xxxxxxxxxxxxx_secret_xxxxxxxxxxxxx",
      "amount": 50,
      "totalAmount": 55,
      "stripeFee": 5
    },
    "passenger": {
      "ticketNumber": "TKT-1729123456789-0",
      "fullName": "John Doe",
      "seatLabel": "1A"
    },
    "baggage": {
      "weight": 25,
      "amount": 50
    }
  }
}
```

**Error Responses**:
- **400**: Validation errors (missing fields, invalid values)
- **404**: Ticket not found or bus not found
- **400**: Bus not assigned to driver
- **400**: Extra baggage already purchased
- **400**: Ticket not valid or cancelled

### 3. Business Logic Flow

1. **Validation**:
   - Validates ticket number, baggage weight, and amount
   - Finds passenger by ticket number
   - Verifies bus belongs to the authenticated driver
   - Checks if extra baggage hasn't already been purchased
   - Validates ticket is valid and not cancelled

2. **Payment Intent Creation**:
   - Calculates total amount with 10% Stripe fee
   - Creates Stripe payment intent with metadata
   - Stores payment intent ID in passenger record

3. **Webhook Handling** (automatic):
   - On payment success: Updates passenger with baggage details
   - On payment failure: Removes payment intent ID to allow retry

### 4. Stripe Webhook Integration

The webhook automatically handles two new event types:

**Extra Baggage Payment Success**:
- Updates passenger's `additionalBaggage` field
- Confirms `extraBaggageIntentId`
- Increments `scannedForBaggageCount`
- Creates payment transaction record

**Extra Baggage Payment Failure**:
- Removes `extraBaggageIntentId` to allow retry
- Creates failed payment transaction record

### 5. Files Modified/Created

**Created**:
- `src/validators/driverValidators/index.ts` - Validation schemas for driver endpoints

**Modified**:
- `src/controllers/driver.controller.ts` - Added `addBaggage` controller
- `src/controllers/stripe-webhook.controller.ts` - Added extra baggage payment handlers
- `src/routes/driver.routes.ts` - Added `/add-baggage` route with validation
- `src/constants/messages.ts` - Added baggage-related constants

### 6. Validation Rules

**Ticket Number**:
- Required
- Max 255 characters

**Baggage Weight**:
- Required
- Must be a positive number
- Max 100 kg

**Baggage Amount**:
- Required
- Must be a positive number
- Max $10,000

### 7. Security Features

- Driver authentication required
- Verifies bus assignment to driver
- Prevents duplicate baggage purchases
- Validates ticket status before allowing payment
- Stripe webhook signature verification

### 8. Payment Flow

1. Driver scans ticket at check-in
2. If baggage exceeds limit, driver calls `/add-baggage` endpoint
3. Backend creates Stripe payment intent
4. Frontend displays payment form with client secret
5. User completes payment through Stripe
6. Stripe webhook notifies backend of payment success
7. Backend updates passenger record automatically
8. Driver receives confirmation

### 9. Testing the Feature

**Prerequisites**:
- Valid driver auth token
- Valid ticket number
- Stripe test API keys configured

**Test Scenarios**:
1. Successful baggage payment
2. Invalid ticket number
3. Bus not assigned to driver
4. Duplicate baggage purchase attempt
5. Cancelled ticket
6. Invalid weight/amount values
7. Payment failure handling

### 10. Future Enhancements

- Email/SMS notifications to passenger
- Push notifications to driver on payment success
- Configurable baggage weight limits
- Dynamic pricing based on weight
- Baggage payment history report
- Refund functionality for baggage charges

## API Integration Example

```typescript
// Frontend example
const addExtraBaggage = async (ticketNumber: string, weight: number, amount: number) => {
  try {
    const response = await fetch('/api/driver/add-baggage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${driverToken}`
      },
      body: JSON.stringify({
        ticketNumber,
        baggageWeight: weight,
        baggageAmount: amount
      })
    });

    const result = await response.json();
    
    if (result.success) {
      // Use result.data.paymentIntent.clientSecret to initialize Stripe payment
      const stripe = await loadStripe('pk_test_...');
      const { error } = await stripe.confirmCardPayment(
        result.data.paymentIntent.clientSecret,
        {
          payment_method: {
            card: cardElement,
          }
        }
      );
      
      if (!error) {
        console.log('Payment successful!');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## Notes

- All amounts are in USD
- Stripe fee is calculated as 10% of the baggage amount
- Payment intent is valid for 24 hours
- Webhook must be configured in Stripe dashboard
- Test with Stripe test cards before production deployment

