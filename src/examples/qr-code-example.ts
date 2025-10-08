/**
 * Example usage of QR Code functionality in booking system
 * 
 * This example shows how the QR code is generated and what data it contains
 */

import { QRCodeUtils, BookingQRData } from '../utils/QRCode';

// Example of what the QR code data structure looks like
const exampleQRData: BookingQRData = {
  bookingId: "BK-1704067200000-abc123def",
  userId: "user123",
  routeId: "route456",
  busId: "bus789",
  groupTicketSerial: "TKT-1704067200000-3",
  passengers: [
    {
      fullName: "John Doe",
      seatLabel: "A1",
      ticketNumber: "TKT-1704067200000-0",
      gender: "Male",
      dob: "1990-01-01",
      contactNumber: "+1234567890",
      DocumentId: "DL123456789"
    },
    {
      fullName: "Jane Doe",
      seatLabel: "A2",
      ticketNumber: "TKT-1704067200000-1",
      gender: "Female",
      dob: "1992-05-15",
      contactNumber: "+1234567891",
      DocumentId: "PAS987654321"
    }
  ],
  routeInfo: {
    from: "Dallas, TX",
    to: "Houston, TX",
    departureDate: "2024-01-15T08:00:00.000Z",
    returnDate: "2024-01-20T18:00:00.000Z"
  },
  paymentType: "cash",
  totalPrice: 120.00,
  bookingDate: "2024-01-01T10:00:00.000Z"
};

/**
 * How to generate a QR code (this is done automatically in the booking controller)
 */
async function generateExampleQRCode() {
  try {
    // Generate QR code as base64 string
    const qrCodeBase64 = await QRCodeUtils.generateQRCodeAsBase64(exampleQRData);
    
    // Generate QR code as buffer (for saving to file)
    const qrCodeBuffer = await QRCodeUtils.generateQRCodeAsBuffer(exampleQRData);
    
    console.log("QR Code generated successfully!");
    console.log("Base64 length:", qrCodeBase64.length);
    console.log("Buffer size:", qrCodeBuffer.length);
    
    return {
      base64: qrCodeBase64,
      buffer: qrCodeBuffer
    };
  } catch (error) {
    console.error("Error generating QR code:", error);
  }
}

/**
 * How to create booking QR data structure
 */
function createExampleBookingData() {
  const bookingData = QRCodeUtils.createBookingQRData({
    userId: "user123",
    routeId: "route456",
    busId: "bus789",
    passengers: [
      {
        fullName: "John Doe",
        seatLabel: "A1",
        ticketNumber: "TKT-1704067200000-0",
        gender: "Male",
        dob: "1990-01-01",
        contactNumber: "+1234567890",
        DocumentId: "DL123456789"
      }
    ],
    routeInfo: {
      from: "Dallas, TX",
      to: "Houston, TX",
      departureDate: new Date(),
      returnDate: new Date()
    },
    paymentType: "cash",
    totalPrice: 60.00,
    groupTicketSerial: "TKT-1704067200000-1"
  });
  
  return bookingData;
}

export { generateExampleQRCode, createExampleBookingData, exampleQRData };

