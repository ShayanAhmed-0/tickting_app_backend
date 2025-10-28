# Route Seat Report PDF Generation

## Overview
This document describes the route seat report PDF generation feature that creates a bus seating chart PDF showing all passengers and their seat assignments.

## API Endpoint

### Get Route Seat Report (PDF Download)

**Endpoint:** `GET /api/admin/reports/route-seat-report-download`

**Query Parameters:**
- `routeId` (required): MongoDB ObjectId of the route
- `date` (required): Date in YYYY-MM-DD format

**Example Request:**
```
GET /api/admin/reports/route-seat-report-download?routeId=507f1f77bcf86cd799439011&date=2025-10-28
```

**Response:**
- Content-Type: `application/pdf`
- Downloads a PDF file named: `RouteSeatReport-{busCode}-{date}.pdf`

## PDF Layout

The generated PDF includes:

1. **Header Section:**
   - Company logo (if available)
   - Bus code/number
   - Route information (origin - destination)
   - Date and time
   - MX Driver name
   - US Driver name

2. **Seating Chart:**
   - Two-column layout
   - Each seat entry shows:
     - **Empty seats:** Just the seat number
     - **Occupied seats:** Seat number | Passenger name (From, To) - displayed in blue and bold

3. **Footer:**
   - Page numbers

## Example PDF Output

```
┌─────────────────────────────────────────────────┐
│ [LOGO]      BUS: 66504 Dallas - Ocampo          │
│              DATE: 10/28/2025 16:00             │
│                                                  │
│ MX DRIVER: Sabas Franco    US DRIVER: Daniel G. │
│─────────────────────────────────────────────────│
│                                                  │
│ LEFT COLUMN          │  RIGHT COLUMN            │
│ 3                    │  1                       │
│ 4                    │  2                       │
│ 7                    │  5 | ISIDRO VELAZQUEZ... │
│ 8                    │  6 | JOSE RODRIGUEZ...   │
│ 11 | MARIA PEREZ...  │  9 | ROCIO PADILLA...   │
│ ...                  │  ...                     │
└─────────────────────────────────────────────────┘
```

## Implementation Details

### Files Modified:
1. `src/controllers/admin/report.controller.ts`
   - Added `getRouteSeatReportDownload()` function
   - Added `generateRouteSeatReportPDF()` helper function

2. `src/routes/admin/report.routes.ts`
   - Added route handler for PDF download

### Key Features:
- **Two-column layout:** Seats are divided into left and right columns
- **Dynamic pagination:** Automatically adds new pages if content exceeds one page
- **Driver information:** Shows both MX and US drivers
- **Passenger details:** Displays passenger name and route (from/to locations)
- **Visual distinction:** Empty seats in black, occupied seats in blue and bold
- **Professional formatting:** Clean, readable layout suitable for printing

## Data Flow

1. Client requests PDF with `routeId` and `date`
2. Server fetches route information including:
   - Bus details
   - Seat layout
   - Passenger bookings
   - Driver information
3. Generates seat report by:
   - Matching passengers to seats
   - Sorting seats numerically
   - Organizing data into two columns
4. Creates PDF using PDFKit library
5. Streams PDF directly to response

## Notes

- Empty seats are shown with just their seat number
- Occupied seats show: `{seatNumber} | {PASSENGER NAME} ({From}, {To})`
- The PDF is streamed directly to the client (not saved to disk)
- Supports buses with any number of seats
- Automatically handles multi-page PDFs for buses with many seats

## Error Handling

The endpoint will return appropriate error responses for:
- Missing or invalid `routeId`
- Missing or invalid `date` format
- Route not found
- Bus not found for the route

## Dependencies

- `pdfkit`: For PDF generation
- Existing models: RouteModel, PassengerModel, BookingModel

