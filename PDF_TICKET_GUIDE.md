# PDF Ticket Generation Guide

## Overview

The PDF ticket generation feature allows users to download their bus tickets as PDF documents. This feature supports both individual tickets and family/group bookings.

## API Endpoint

```
GET /api/booking/print-ticket/:ticketNumber
```

### Parameters
- `ticketNumber` (required): The ticket number to generate PDF for

### Headers
- `Authorization`: Bearer token for user authentication

### Response
- **Content-Type**: `application/pdf`
- **Content-Disposition**: `attachment; filename="ticket-{ticketNumber}.pdf"`
- **Body**: PDF binary data

## Features

### Single Ticket Generation
- Generates a single PDF ticket for individual bookings
- Includes passenger information, journey details, and QR code placeholder

### Family/Group Ticket Generation
- Automatically detects family bookings using `groupTicketSerial`
- Generates multiple tickets in a single PDF document
- Each family member gets their own ticket page

## PDF Content

Each ticket PDF includes:

### Header
- Company name and contact information
- Ticket title and number

### QR Code Section
- **Actual QR code embedded** with ticket verification data
- Contains complete ticket information for easy scanning
- Includes ticket number, seat, passenger details, and journey info

### Passenger Information
- Full name
- Gender
- Contact number
- Document ID

### Journey Details
- From/To locations
- Seat number
- Departure date
- Return date (for round trips)

### Bus Information
- Bus number
- Driver name (if available)

### Footer
- Terms and conditions
- Generation timestamp
- Copyright information

## Security

- Only ticket owners can generate PDFs for their tickets
- User authentication required
- Access control validation

## Error Handling

- `400 Bad Request`: Missing ticket number
- `403 Forbidden`: Access denied (not ticket owner)
- `404 Not Found`: Ticket or route not found
- `500 Internal Server Error`: PDF generation failed

## Usage Examples

### Generate Single Ticket
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -X GET \
     "http://localhost:3000/api/booking/print-ticket/TKT-1234567890-0" \
     --output ticket.pdf
```

### Generate Family Tickets
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -X GET \
     "http://localhost:3000/api/booking/print-ticket/TKT-1234567890-0" \
     --output family-tickets.pdf
```

## Technical Implementation

### Dependencies
- `pdfkit`: PDF generation library
- `@types/pdfkit`: TypeScript definitions

### Key Components
1. **TicketPDFGenerator**: Main PDF generation class
2. **printTicket Controller**: API endpoint handler
3. **Route**: `/print-ticket/:ticketNumber`

### Database Queries
- Finds ticket by ticket number
- Validates user ownership
- Retrieves family tickets if applicable
- Fetches route and bus information

## Customization

### Company Information
Update the `companyInfo` object in the controller to customize:
- Company name
- Address
- Phone number
- Email

### PDF Styling
Modify the `TicketPDFGenerator` class to customize:
- Colors and fonts
- Layout and spacing
- Header and footer content
- QR code integration

## QR Code Integration

### QR Code Content
The QR codes embedded in PDF tickets contain the following information:
- Ticket number and seat label
- Passenger name and contact information
- Journey details (from, to, departure date)
- Bus number and document ID
- Group ticket serial (for family bookings)
- Generation timestamp
- Verification type identifier

### QR Code Features
- **High-quality PNG format** for clear scanning
- **Error correction level M** for reliable scanning
- **100x100 pixel size** optimized for PDF display
- **Fallback handling** if QR generation fails

## Future Enhancements

1. ✅ **QR Code Integration**: Embed actual QR codes in PDFs
2. **Email Integration**: Send tickets via email
3. **Template System**: Configurable ticket templates
4. **Watermarking**: Add security watermarks
5. **Digital Signatures**: Add digital signatures for authenticity
6. **QR Code Scanning**: Backend API to verify QR codes
