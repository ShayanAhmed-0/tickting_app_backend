# Individual QR Codes Per Seat

## 🎫 Feature Overview

Each passenger now receives their own unique QR code for their seat. When booking multiple seats, each ticket gets its own scannable QR code instead of one shared code for the entire booking.

## 🔄 Before vs After

### Before (Single QR Code)
```json
{
  "passengers": [
    { "fullName": "John Doe", "seatLabel": "A1", ... },
    { "fullName": "Jane Smith", "seatLabel": "A2", ... }
  ],
  "qrCode": {
    "data": "data:image/png;base64,...",  // One QR for all
    "bookingId": "BK-xxx",
    "format": "base64"
  }
}
```

### After (Individual QR Codes) ✅
```json
{
  "passengers": [
    {
      "fullName": "John Doe",
      "seatLabel": "A1",
      "ticketNumber": "TKT-1704067200000-0",
      "qrCode": {
        "data": "data:image/png;base64,...",  // Unique QR for John
        "bookingId": "BK-1704067200000-abc123",
        "format": "base64"
      }
    },
    {
      "fullName": "Jane Smith",
      "seatLabel": "A2",
      "ticketNumber": "TKT-1704067200000-1",
      "qrCode": {
        "data": "data:image/png;base64,...",  // Unique QR for Jane
        "bookingId": "BK-1704067200000-def456",
        "format": "base64"
      }
    }
  ],
  "groupTicketSerial": "TKT-1704067200000-2",
  "message": "Generated 2 individual QR code(s)"
}
```

## 📊 QR Code Data Structure

Each QR code contains information for ONE passenger:

```json
{
  "bookingId": "BK-1704067200000-abc123",
  "userId": "user_456",
  "routeId": "route_123",
  "busId": "bus_789",
  "groupTicketSerial": "TKT-1704067200000-2",
  "passengers": [
    {
      "fullName": "John Doe",
      "seatLabel": "A1",
      "ticketNumber": "TKT-1704067200000-0",
      "gender": "male",
      "dob": "1990-01-15",
      "contactNumber": "+1234567890",
      "DocumentId": "DL123456"
    }
  ],
  "routeInfo": {
    "from": "Dallas, TX",
    "to": "Houston, TX",
    "departureDate": "2024-01-15T08:00:00.000Z",
    "returnDate": null
  },
  "paymentType": "cash",
  "totalPrice": 60.00,
  "bookingDate": "2024-01-01T10:00:00.000Z"
}
```

## 🎯 Benefits

### 1. **Individual Ticket Management**
Each passenger has their own ticket with unique QR code.

### 2. **Separate Scanning**
Staff can scan each passenger individually at boarding.

### 3. **Better Tracking**
Track which specific passengers have boarded.

### 4. **Flexible Distribution**
Send each passenger their own QR code via email/SMS.

### 5. **Lost Ticket Recovery**
If one QR code is lost, others are unaffected.

### 6. **Group Identification**
All tickets share the same `groupTicketSerial` for group bookings.

## 💻 Frontend Implementation

### React Example - Display Individual QR Codes

```typescript
interface Passenger {
  fullName: string;
  seatLabel: string;
  ticketNumber: string;
  qrCode: {
    data: string;
    bookingId: string;
    format: string;
  };
}

function BookingConfirmation({ bookingData }: Props) {
  const { passengers, groupTicketSerial } = bookingData;

  return (
    <div className="booking-confirmation">
      <h2>Booking Confirmed! ✅</h2>
      
      {groupTicketSerial && (
        <p className="group-serial">
          Group Booking: {groupTicketSerial}
        </p>
      )}

      <div className="tickets">
        {passengers.map((passenger: Passenger, index: number) => (
          <div key={index} className="ticket">
            <h3>Ticket #{index + 1}</h3>
            
            <div className="passenger-info">
              <p><strong>Name:</strong> {passenger.fullName}</p>
              <p><strong>Seat:</strong> {passenger.seatLabel}</p>
              <p><strong>Ticket #:</strong> {passenger.ticketNumber}</p>
            </div>

            <div className="qr-code">
              <img 
                src={passenger.qrCode.data} 
                alt={`QR Code for ${passenger.fullName}`}
                style={{ width: '200px', height: '200px' }}
              />
              <p className="booking-id">
                {passenger.qrCode.bookingId}
              </p>
            </div>

            <button onClick={() => downloadQR(passenger)}>
              Download Ticket
            </button>
            <button onClick={() => emailTicket(passenger)}>
              Email Ticket
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Download Individual Tickets

```typescript
function downloadQR(passenger: Passenger) {
  // Convert base64 to blob
  const base64Data = passenger.qrCode.data.split(',')[1];
  const blob = base64ToBlob(base64Data, 'image/png');
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ticket-${passenger.seatLabel}-${passenger.fullName}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function base64ToBlob(base64: string, type: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type });
}
```

### Email Individual Tickets

```typescript
async function emailTicket(passenger: Passenger) {
  try {
    const response = await fetch('/api/send-ticket-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        email: passenger.contactEmail,
        passengerName: passenger.fullName,
        seatLabel: passenger.seatLabel,
        ticketNumber: passenger.ticketNumber,
        qrCodeData: passenger.qrCode.data
      })
    });

    if (response.ok) {
      alert(`Ticket sent to ${passenger.fullName}'s email`);
    }
  } catch (error) {
    console.error('Error sending email:', error);
  }
}
```

### Print All Tickets

```typescript
function printAllTickets(passengers: Passenger[]) {
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Tickets</title>
      <style>
        @media print {
          .ticket { page-break-after: always; }
        }
        .ticket {
          padding: 20px;
          border: 2px solid #000;
          margin: 20px;
          text-align: center;
        }
        .qr-code img {
          width: 300px;
          height: 300px;
        }
      </style>
    </head>
    <body>
      ${passengers.map(passenger => `
        <div class="ticket">
          <h2>${passenger.fullName}</h2>
          <p>Seat: ${passenger.seatLabel}</p>
          <p>Ticket: ${passenger.ticketNumber}</p>
          <div class="qr-code">
            <img src="${passenger.qrCode.data}" alt="QR Code" />
          </div>
          <p>${passenger.qrCode.bookingId}</p>
        </div>
      `).join('')}
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
}
```

## 📱 Mobile App Integration

### React Native Example

```typescript
import QRCode from 'react-native-qrcode-svg';

function TicketScreen({ passenger }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.name}>{passenger.fullName}</Text>
      <Text style={styles.seat}>Seat: {passenger.seatLabel}</Text>
      
      <View style={styles.qrContainer}>
        <Image 
          source={{ uri: passenger.qrCode.data }}
          style={styles.qrCode}
        />
      </View>
      
      <Text style={styles.ticketNumber}>
        {passenger.ticketNumber}
      </Text>
      
      <TouchableOpacity onPress={() => saveToWallet(passenger)}>
        <Text>Add to Wallet</Text>
      </TouchableOpacity>
    </View>
  );
}
```

## 🔍 Scanning at Boarding

### Scanner App Logic

```typescript
async function scanTicket(qrData: string) {
  try {
    // Parse QR code data
    const ticketData = JSON.parse(qrData);
    
    // Verify ticket
    const response = await fetch('/api/verify-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: ticketData.bookingId,
        ticketNumber: ticketData.passengers[0].ticketNumber
      })
    });

    const result = await response.json();
    
    if (result.valid) {
      // Show passenger info
      const passenger = ticketData.passengers[0];
      showBoardingInfo({
        name: passenger.fullName,
        seat: passenger.seatLabel,
        from: ticketData.routeInfo.from,
        to: ticketData.routeInfo.to
      });
      
      // Mark as boarded
      await markAsBoarded(ticketData.bookingId, passenger.ticketNumber);
    } else {
      showError('Invalid or already used ticket');
    }
  } catch (error) {
    showError('Invalid QR code');
  }
}
```

## 📊 Response Format

### Single Passenger Booking

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "passengers": [
      {
        "_id": "passenger_id_1",
        "fullName": "John Doe",
        "seatLabel": "A1",
        "ticketNumber": "TKT-1704067200000-0",
        "qrCode": {
          "data": "data:image/png;base64,iVBORw0KGgo...",
          "bookingId": "BK-1704067200000-abc123",
          "format": "base64"
        }
      }
    ],
    "type": "cash",
    "bookingsCount": 1,
    "groupTicketSerial": null,
    "message": "Generated 1 individual QR code(s)"
  },
  "message": "Booking confirmed successfully"
}
```

### Multiple Passengers (Family) Booking

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "passengers": [
      {
        "_id": "passenger_id_1",
        "fullName": "John Doe",
        "seatLabel": "A1",
        "ticketNumber": "TKT-1704067200000-0",
        "groupTicketSerial": "TKT-1704067200000-3",
        "qrCode": {
          "data": "data:image/png;base64,iVBORw0KGgo...",
          "bookingId": "BK-1704067200000-abc123",
          "format": "base64"
        }
      },
      {
        "_id": "passenger_id_2",
        "fullName": "Jane Doe",
        "seatLabel": "A2",
        "ticketNumber": "TKT-1704067200000-1",
        "groupTicketSerial": "TKT-1704067200000-3",
        "qrCode": {
          "data": "data:image/png;base64,ABCDEFGHijk...",
          "bookingId": "BK-1704067200000-def456",
          "format": "base64"
        }
      },
      {
        "_id": "passenger_id_3",
        "fullName": "Jimmy Doe",
        "seatLabel": "A3",
        "ticketNumber": "TKT-1704067200000-2",
        "groupTicketSerial": "TKT-1704067200000-3",
        "qrCode": {
          "data": "data:image/png;base64,XYZ123456789...",
          "bookingId": "BK-1704067200000-ghi789",
          "format": "base64"
        }
      }
    ],
    "type": "cash",
    "bookingsCount": 3,
    "groupTicketSerial": "TKT-1704067200000-3",
    "message": "Generated 3 individual QR code(s)"
  },
  "message": "Booking confirmed successfully"
}
```

## 🎨 Ticket Design Example

```html
<div class="ticket">
  <div class="ticket-header">
    <h2>Bus Ticket</h2>
    <span class="ticket-number">TKT-1704067200000-0</span>
  </div>
  
  <div class="passenger-details">
    <p><strong>Passenger:</strong> John Doe</p>
    <p><strong>Seat:</strong> A1</p>
  </div>
  
  <div class="route-details">
    <p><strong>From:</strong> Dallas, TX</p>
    <p><strong>To:</strong> Houston, TX</p>
    <p><strong>Date:</strong> Jan 15, 2024 08:00 AM</p>
  </div>
  
  <div class="qr-code-section">
    <img src="data:image/png;base64,..." alt="QR Code" />
    <p class="booking-id">BK-1704067200000-abc123</p>
  </div>
  
  <div class="ticket-footer">
    <p class="group-info">Group: TKT-1704067200000-3</p>
    <p class="instructions">Please scan this code at boarding</p>
  </div>
</div>
```

## 🔄 Implementation Details

### Cash Payment
- Generates QR codes immediately after booking
- Each passenger object includes their QR code
- All QR codes returned in single response

### Stripe Payment
- Generates QR codes after payment confirmation
- Same structure as cash payment
- Price per seat calculated from total amount

### Group Bookings
- All tickets share same `groupTicketSerial`
- Each ticket has unique `bookingId`
- Each ticket has unique `ticketNumber`

## 🎉 Summary

- ✅ **Individual QR codes** for each passenger/seat
- ✅ **Unique booking ID** per ticket
- ✅ **Group identification** via groupTicketSerial
- ✅ **Easy distribution** - email/download each ticket separately
- ✅ **Better tracking** - scan each passenger individually
- ✅ **Flexible management** - handle tickets independently
- ✅ **Works with both** cash and Stripe payments

Each passenger now has their own scannable ticket! 🎫✨
