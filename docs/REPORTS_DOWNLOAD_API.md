# Reports Download API Documentation

This document provides detailed information about the three report download APIs available in the system.

---

## Table of Contents
1. [Authentication](#authentication)
2. [Route Seat Report Download](#1-route-seat-report-download)
3. [Sales Report Download](#2-sales-report-download)
4. [Drivers Report Download](#3-drivers-report-download)
5. [Error Responses](#error-responses)

---

## Authentication

All endpoints require admin authentication. Include the admin JWT token in the Authorization header:

```
Authorization: Bearer <your-admin-jwt-token>
```

---

## 1. Route Seat Report Download

Generate and download a PDF report showing the bus seating chart with passenger information for a specific route and date.

### Endpoint

```
GET /api/admin/reports/route-seat-report-download
```

### Query Parameters

| Parameter | Type   | Required | Description                              | Format/Example        |
|-----------|--------|----------|------------------------------------------|-----------------------|
| `routeId` | string | Yes      | MongoDB ObjectId of the route           | `507f1f77bcf86cd799439011` |
| `date`    | string | Yes      | Date for the report                      | `YYYY-MM-DD` (e.g., `2025-10-28`) |

### Request Example

```bash
curl -X GET "https://api.example.com/api/admin/reports/route-seat-report-download?routeId=507f1f77bcf86cd799439011&date=2025-10-28" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Response

**Success (200 OK)**

- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename=RouteSeatReport-{busCode}-{date}.pdf`
- Body: Binary PDF file

The PDF contains:
- Company logo
- Bus code/number
- Route information (origin - destination)
- Date and time
- MX Driver name
- US Driver name
- Two-column seating chart showing:
  - Empty seats: Just the seat number
  - Occupied seats: `SeatNumber | PASSENGER NAME (From, To)` in blue bold

**PDF Layout Example:**
```
┌────────────────────────────────────────────────────────┐
│ [LOGO]      BUS: 66504 Dallas - Ocampo                 │
│              DATE: 10/28/2025 16:00                    │
│                                                         │
│ MX DRIVER: Sabas Franco    US DRIVER: Daniel Guerrero │
│─────────────────────────────────────────────────────────│
│                                                         │
│ LEFT COLUMN              │  RIGHT COLUMN               │
│ 3                        │  1                          │
│ 4                        │  2                          │
│ 7                        │  5 | ISIDRO VELAZQUEZ...   │
│ 8                        │  6 | JOSE RODRIGUEZ...     │
│ 11 | MARIA PEREZ...      │  9 | ROCIO PADILLA...     │
└────────────────────────────────────────────────────────┘
```

### JavaScript/TypeScript Integration Example

```typescript
async function downloadRouteSeatReport(routeId: string, date: string, token: string) {
  const url = `https://api.example.com/api/admin/reports/route-seat-report-download?routeId=${routeId}&date=${date}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  // Get the blob
  const blob = await response.blob();
  
  // Create download link
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `RouteSeatReport-${routeId}-${date}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

// Usage
downloadRouteSeatReport('507f1f77bcf86cd799439011', '2025-10-28', 'your-jwt-token');
```

### Validation Rules

- `routeId` must be a valid 24-character MongoDB ObjectId
- `date` must be in `YYYY-MM-DD` format
- Both parameters are required

---

## 2. Sales Report Download

Generate and download sales report in Excel or PDF format showing all ticket sales within a date range.

### Endpoint

```
GET /api/admin/reports/sales-report-download
```

### Query Parameters

| Parameter      | Type   | Required | Description                                    | Format/Example               |
|----------------|--------|----------|------------------------------------------------|------------------------------|
| `fromDate`     | string | No       | Start date for the report                      | `YYYY-MM-DD` (e.g., `2025-10-20`) |
| `toDate`       | string | No       | End date for the report                        | `YYYY-MM-DD` (e.g., `2025-10-28`) |
| `salesDateType`| string | No       | Filter by sale date or departure date          | `sale` or `departure` (default: `sale`) |
| `salesAgent`   | string | No       | Filter by specific sales agent (user ID)       | MongoDB ObjectId              |
| `salesOffice`  | string | No       | Filter by specific sales office (office ID)    | MongoDB ObjectId              |
| `format`       | string | No       | Output format                                  | `excel` or `pdf` (default: `excel`) |

### Default Behavior

- If `fromDate` is not provided: defaults to 7 days before current date
- If `toDate` is not provided: defaults to current date
- If `salesDateType` is not provided: defaults to `sale`
- If `format` is not provided: defaults to `excel`

### Request Examples

**Basic Request (Excel format):**
```bash
curl -X GET "https://api.example.com/api/admin/reports/sales-report-download?fromDate=2025-10-20&toDate=2025-10-28" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**With Filters (PDF format):**
```bash
curl -X GET "https://api.example.com/api/admin/reports/sales-report-download?fromDate=2025-10-20&toDate=2025-10-28&salesDateType=departure&salesAgent=507f1f77bcf86cd799439011&format=pdf" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Response

**Success (200 OK) - Excel Format**

- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename=PrintSalesReport-{fromDate}-{toDate}.xlsx`
- Body: Binary Excel file

**Success (200 OK) - PDF Format**

- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename=PrintSalesReport-{fromDate}-{toDate}.pdf`
- Body: Binary PDF file

### Report Contents

The report includes the following columns:
- **Vendido en** (Sold at): Sales office name
- **Forma de Pago** (Payment method): Cash, CreditCard, or Free
- **Agente** (Agent): Sales agent name
- **De** (From): Origin location
- **Hacia** (To): Destination location
- **Fecha Salida** (Departure date): Date and time of departure
- **# Autobus** (Bus number): Bus serial number/code
- **Nombre Pasajero** (Passenger name): Ticket number and passenger full name
- **Fecha Venta** (Sale date): Date and time of sale
- **Precio US** (Price USD): Ticket price in USD
- **Precio MX** (Price MXN): Ticket price in MXN
- **Cantidad** (Quantity): Always 1

The report groups data by:
1. Sales office
2. Payment type (Cash, CreditCard, Free)
3. Sales agent

Each group includes subtotals.

### JavaScript/TypeScript Integration Example

```typescript
interface SalesReportOptions {
  fromDate?: string;
  toDate?: string;
  salesDateType?: 'sale' | 'departure';
  salesAgent?: string;
  salesOffice?: string;
  format?: 'excel' | 'pdf';
}

async function downloadSalesReport(options: SalesReportOptions, token: string) {
  const params = new URLSearchParams();
  
  if (options.fromDate) params.append('fromDate', options.fromDate);
  if (options.toDate) params.append('toDate', options.toDate);
  if (options.salesDateType) params.append('salesDateType', options.salesDateType);
  if (options.salesAgent) params.append('salesAgent', options.salesAgent);
  if (options.salesOffice) params.append('salesOffice', options.salesOffice);
  if (options.format) params.append('format', options.format);
  
  const url = `https://api.example.com/api/admin/reports/sales-report-download?${params.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const blob = await response.blob();
  const extension = options.format === 'pdf' ? 'pdf' : 'xlsx';
  
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `SalesReport-${options.fromDate}-${options.toDate}.${extension}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

// Usage
downloadSalesReport({
  fromDate: '2025-10-20',
  toDate: '2025-10-28',
  salesDateType: 'sale',
  format: 'excel'
}, 'your-jwt-token');
```

### Validation Rules

- `fromDate` and `toDate` must be in `YYYY-MM-DD` format
- `salesDateType` must be either `sale` or `departure`
- `salesAgent` must be a valid 24-character MongoDB ObjectId
- `salesOffice` must be a valid 24-character MongoDB ObjectId
- `format` must be either `excel` or `pdf`

---

## 3. Drivers Report Download

Generate and download drivers report in Excel or PDF format showing trip information and driver assignments.

### Endpoint

```
GET /api/admin/reports/drivers-report-download
```

### Query Parameters

| Parameter  | Type   | Required | Description                                | Format/Example               |
|------------|--------|----------|--------------------------------------------|------------------------------|
| `fromDate` | string | No       | Start date for the report                  | `YYYY-MM-DD` (e.g., `2025-10-20`) |
| `toDate`   | string | No       | End date for the report                    | `YYYY-MM-DD` (e.g., `2025-10-28`) |
| `driverId` | string | No       | Filter by specific driver (MX or US driver)| MongoDB ObjectId              |
| `format`   | string | No       | Output format                              | `excel` or `pdf` (default: `excel`) |

### Default Behavior

- If `fromDate` is not provided: defaults to 7 days before current date
- If `toDate` is not provided: defaults to current date
- If `format` is not provided: defaults to `excel`

### Request Examples

**Basic Request (Excel format):**
```bash
curl -X GET "https://api.example.com/api/admin/reports/drivers-report-download?fromDate=2025-10-20&toDate=2025-10-28" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**With Driver Filter (PDF format):**
```bash
curl -X GET "https://api.example.com/api/admin/reports/drivers-report-download?fromDate=2025-10-20&toDate=2025-10-28&driverId=507f1f77bcf86cd799439011&format=pdf" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Response

**Success (200 OK) - Excel Format**

- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename=DriversReport-{fromDate}-{toDate}.xlsx`
- Body: Binary Excel file

**Success (200 OK) - PDF Format**

- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename=DriversReport-{fromDate}-{toDate}.pdf`
- Body: Binary PDF file

### Report Contents

The report includes the following columns:
- **Bus Number**: Bus serial number or code
- **Route Name**: Name of the route
- **Trip Date**: Date of the trip (MM/DD/YYYY format)
- **Trip Time**: Time of the trip
- **MX Driver**: Mexican driver's full name
- **US Driver**: US driver's full name
- **Passengers**: Number of passengers on the trip

### JavaScript/TypeScript Integration Example

```typescript
interface DriversReportOptions {
  fromDate?: string;
  toDate?: string;
  driverId?: string;
  format?: 'excel' | 'pdf';
}

async function downloadDriversReport(options: DriversReportOptions, token: string) {
  const params = new URLSearchParams();
  
  if (options.fromDate) params.append('fromDate', options.fromDate);
  if (options.toDate) params.append('toDate', options.toDate);
  if (options.driverId) params.append('driverId', options.driverId);
  if (options.format) params.append('format', options.format);
  
  const url = `https://api.example.com/api/admin/reports/drivers-report-download?${params.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const blob = await response.blob();
  const extension = options.format === 'pdf' ? 'pdf' : 'xlsx';
  
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `DriversReport-${options.fromDate}-${options.toDate}.${extension}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

// Usage
downloadDriversReport({
  fromDate: '2025-10-20',
  toDate: '2025-10-28',
  format: 'pdf'
}, 'your-jwt-token');
```

### Validation Rules

- `fromDate` and `toDate` must be in `YYYY-MM-DD` format
- `driverId` must be a valid 24-character MongoDB ObjectId
- `format` must be either `excel` or `pdf`

---

## Error Responses

All endpoints return standardized error responses:

### 400 Bad Request

Invalid parameters or validation errors.

```json
{
  "statusCode": 400,
  "success": false,
  "message": "Route ID must be a valid MongoDB ObjectId"
}
```

**Common causes:**
- Invalid date format
- Invalid ObjectId format
- Missing required parameters

### 401 Unauthorized

Missing or invalid authentication token.

```json
{
  "statusCode": 401,
  "success": false,
  "message": "Unauthorized access"
}
```

### 404 Not Found

Resource not found (route, driver, etc.).

```json
{
  "statusCode": 404,
  "success": false,
  "message": "Route not found"
}
```

### 500 Internal Server Error

Server-side error.

```json
{
  "statusCode": 500,
  "success": false,
  "message": "Internal server error"
}
```

---

## Rate Limiting

These endpoints may be rate-limited to prevent abuse. The default limits are:
- 100 requests per minute per IP address
- 1000 requests per hour per authenticated user

---

## Best Practices

1. **Always handle errors gracefully** in your client application
2. **Cache authentication tokens** to avoid unnecessary login requests
3. **Use appropriate date ranges** to avoid generating extremely large reports
4. **Implement retry logic** for transient network errors
5. **Show loading indicators** while reports are being generated
6. **Validate user input** on the client side before making API requests

---

## Support

For questions or issues with these APIs, please contact:
- **Email**: support@example.com
- **Documentation**: https://docs.example.com
- **Developer Portal**: https://developers.example.com

---

## Changelog

### Version 1.0.0 (2025-10-28)
- Initial release of report download APIs
- Support for route seat reports (PDF)
- Support for sales reports (Excel/PDF)
- Support for drivers reports (Excel/PDF)

