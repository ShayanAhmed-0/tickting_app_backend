# Sales Report Download API Documentation

## Endpoint
```
GET /admin/reports/sales-report-download
```

## Authentication
Requires admin authentication token in headers:
```
Authorization: Bearer <admin_token>
```

## Query Parameters

| Parameter      | Type   | Required | Default   | Description                           |
|----------------|--------|----------|-----------|---------------------------------------|
| fromDate       | string | No       | 7 days ago| Start date for report (YYYY-MM-DD)   |
| toDate         | string | No       | Today     | End date for report (YYYY-MM-DD)      |
| salesDateType  | string | No       | sale      | Filter by date type: `sale` (booking date) or `departure` (departure date) |
| salesAgent     | string | No       | -         | Filter by sales agent (User ObjectId) |
| salesOffice    | string | No       | -         | Filter by sales office (Office ObjectId) |
| format         | string | No       | excel     | Output format: `excel` or `pdf`       |

## Response

The endpoint returns a file download (Excel or PDF) with the following structure:

### Report Structure

**Title:**
```
Reporte de Ventas Por Dia de [Venta/Salida] Entre [fromDate] y [toDate]
```

**Grouped by:**
1. Sales Office (Vendido en)
2. Payment Type (Forma de Pago)
3. Sales Agent (Agente)

**Columns:**
- **Vendido en**: Sales office name
- **Forma de Pago**: Payment method (Cash, CreditCard, Free)
- **Agente**: Sales agent name
- **De**: Origin/From location
- **Hacia**: Destination/To location
- **Fecha Salida**: Departure date and time
- **# Autobus**: Bus serial number/code
- **Nombre Pasajero**: Passenger name with ticket number, type (R=Round Trip, S=One-Way), and seat number
- **Fecha Venta**: Sale/booking date and time
- **Precio US**: Price in USD
- **Precio MX**: Price in MXN (USD * 20)
- **Cantidad**: Quantity (always 1 per passenger)

**Totals:**
- Subtotals for each office/payment type/agent group
- Grand total at the bottom

### Excel Format (.xlsx)

- Styled with headers, colored rows for totals
- Currency formatting for price columns
- Proper column widths for readability
- Merged cells for title

### PDF Format (.pdf)

- Landscape A4 layout
- Grouped sections with headers
- Table format with proper spacing
- Automatic page breaks when needed
- Grand total highlighted

## Examples

### Download Excel report for today
```bash
GET /admin/reports/sales-report-download
```

### Download PDF report for specific date range
```bash
GET /admin/reports/sales-report-download?fromDate=2025-10-26&toDate=2025-10-27&format=pdf
```

### Filter by departure date and specific sales office
```bash
GET /admin/reports/sales-report-download?fromDate=2025-10-01&toDate=2025-10-31&salesDateType=departure&salesOffice=68e123456789abc&format=excel
```

### Filter by sales agent
```bash
GET /admin/reports/sales-report-download?fromDate=2025-10-01&toDate=2025-10-31&salesAgent=68e987654321def
```

## Response Headers

### Excel Format
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename=PrintSalesReport-2025-10-26-2025-10-27.xlsx
```

### PDF Format
```
Content-Type: application/pdf
Content-Disposition: attachment; filename=PrintSalesReport-2025-10-26-2025-10-27.pdf
```

## Data Grouping Logic

The report automatically groups passengers by:

1. **Sales Office**: Based on `salesOffice` field or `office` field
2. **Payment Type**: 
   - `CreditCard` - if `paymentIntentId` exists
   - `Free` - if `extraBaggageIntentId` exists
   - `Cash` - default for all other cases
3. **Agent**: The user who created the booking (from user.profile)

## Price Calculation

- **Price US**: Taken from passenger.price field
- **Price MX**: Calculated as Price US × 20 (conversion rate)

## Passenger Name Format

Format: `{ticketNumber} - {fullName} ({R/S})  ({seatLabel})`

Example: `245644 - Carlos Díaz (S)  (11)`

Where:
- **R** = Round trip (type = 'round_trip')
- **S** = One-way (type = 'one_way')
- **(11)** = Seat number

## Filters Behavior

- If no dates provided: Last 7 days by default
- `salesDateType`:
  - `sale`: Filters by booking/creation date (createdAt)
  - `departure`: Filters by departure date (DepartureDate)
- Only valid, non-cancelled passengers are included
- Results are sorted by: salesOffice → paymentType → createdAt

## Notes

- The report excludes cancelled and invalid tickets
- Currency conversion is fixed at 1 USD = 20 MXN (can be configured)
- Excel format provides better data manipulation capabilities
- PDF format is ideal for printing and sharing
- Large reports will automatically paginate in PDF format
- All dates are displayed in MM/DD/YYYY HH:mm format

