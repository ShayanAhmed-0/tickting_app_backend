# Reports API Integration Documentation

This document provides comprehensive integration details for the Admin Reports APIs.

---

## Table of Contents
1. [Sales Report API](#1-sales-report-api)
2. [Drivers Report API](#2-drivers-report-api)
3. [Common Response Structure](#common-response-structure)
4. [Error Handling](#error-handling)

---

## 1. Sales Report API

### Endpoint
```
GET /api/admin/reports/sales-report
```

### Authentication
Requires admin authentication token in the request header.

### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `fromDate` | String | No | Start date in YYYY-MM-DD format | `2025-01-01` |
| `toDate` | String | No | End date in YYYY-MM-DD format | `2025-01-31` |
| `salesDateType` | String | No | Date type: `sale` (booking date) or `departure` (trip date) | `sale` |
| `salesAgent` | String | No | Filter by sales agent (MongoDB ObjectId) | `68e6b64b60d314cc6424029f` |
| `salesOffice` | String | No | Filter by sales office (MongoDB ObjectId) | `68f8264598f351a2d0a87fe9` |
| `page` | Number | No | Page number (default: 1) | `1` |
| `limit` | Number | No | Items per page (default: 10) | `10` |

### Request Examples

#### Get All Sales (Paginated)
```bash
GET /api/admin/reports/sales-report?page=1&limit=10
```

#### Filter by Date Range (Sale Date)
```bash
GET /api/admin/reports/sales-report?fromDate=2025-01-01&toDate=2025-01-31&salesDateType=sale&page=1&limit=20
```

#### Filter by Departure Date
```bash
GET /api/admin/reports/sales-report?fromDate=2025-09-01&toDate=2025-09-30&salesDateType=departure&page=1&limit=10
```

#### Filter by Sales Agent
```bash
GET /api/admin/reports/sales-report?salesAgent=68e6b64b60d314cc6424029f&page=1&limit=10
```

#### Combined Filters
```bash
GET /api/admin/reports/sales-report?fromDate=2025-01-01&toDate=2025-01-31&salesDateType=sale&salesAgent=68e6b64b60d314cc6424029f&page=1&limit=10
```

### Response Structure

```json
{
  "status": 200,
  "data": {
    "sales": [
      {
        "salesOffice": "Main Office Dallas",
        "soldBy": "John Doe Smith",
        "from": "Dallas, TX USA",
        "to": "San Felipe, Guanajuato",
        "departureDate": "09/23/2025",
        "passenger": "Daisy Monreal",
        "price": "$140.00",
        "qty": 1,
        "ticketNumber": "TKT-1730056704188-0",
        "seatLabel": "1",
        "contactNumber": "+1234567890",
        "busCode": "BUS001",
        "bookedAt": "2025-09-20T10:30:00.000Z",
        "type": "one_way"
      }
    ],
    "totalDocs": 46,
    "currentPage": 1,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "success": true,
  "message": "Sales report generated successfully"
}
```

### Response Fields Description

| Field | Type | Description |
|-------|------|-------------|
| `salesOffice` | String | Name of the sales office |
| `soldBy` | String | Full name of the sales agent |
| `from` | String | Origin destination name |
| `to` | String | Destination name |
| `departureDate` | String | Trip departure date (MM/DD/YYYY) |
| `passenger` | String | Passenger full name |
| `price` | String | Ticket price with currency symbol |
| `qty` | Number | Quantity (always 1 per passenger) |
| `ticketNumber` | String | Unique ticket number |
| `seatLabel` | String | Seat number |
| `contactNumber` | String | Passenger contact number |
| `busCode` | String | Bus identification code |
| `bookedAt` | String | Timestamp when booking was created |
| `type` | String | Trip type: `one_way` or `round_trip` |

### Pagination Fields

| Field | Type | Description |
|-------|------|-------------|
| `totalDocs` | Number | Total number of sales records |
| `currentPage` | Number | Current page number |
| `totalPages` | Number | Total number of pages |
| `hasNextPage` | Boolean | Whether next page exists |
| `hasPrevPage` | Boolean | Whether previous page exists |

### Use Cases

#### 1. Daily Sales Report
```bash
# Get all sales for today by sale date
GET /api/admin/reports/sales-report?fromDate=2025-10-26&toDate=2025-10-26&salesDateType=sale
```

#### 2. Monthly Sales Summary
```bash
# Get all sales for October 2025
GET /api/admin/reports/sales-report?fromDate=2025-10-01&toDate=2025-10-31&salesDateType=sale&limit=100
```

#### 3. Agent Performance Report
```bash
# Get sales by specific agent for current month
GET /api/admin/reports/sales-report?salesAgent=68e6b64b60d314cc6424029f&fromDate=2025-10-01&toDate=2025-10-31
```

#### 4. Upcoming Trips Revenue
```bash
# Get revenue for trips departing next month
GET /api/admin/reports/sales-report?fromDate=2025-11-01&toDate=2025-11-30&salesDateType=departure
```

### Important Notes

- **Date Filtering**: 
  - `salesDateType=sale` filters by `createdAt` (when ticket was sold)
  - `salesDateType=departure` filters by `DepartureDate` (when trip departs)
  - If no `salesDateType` is provided, defaults to `sale`

- **Price Data**: Prices are stored in the `Passenger` model at booking time and displayed with currency symbol

- **Excluded Records**: Only shows non-cancelled tickets (`isCancelled: false`)

- **Booking Types**: Excludes bookings made by `CUSTOMER` and `DRIVER` roles (shows only cashier/agent bookings)

---

## 2. Drivers Report API

### Endpoint
```
GET /api/admin/reports/drivers-report
```

### Authentication
Requires admin authentication token in the request header.

### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `fromDate` | String | No | Start date in YYYY-MM-DD format | `2025-09-01` |
| `toDate` | String | No | End date in YYYY-MM-DD format | `2025-09-30` |
| `driverId` | String | No | Filter by driver ID (checks both MX and US drivers) | `68f8136dd20ac3995d11e76d` |
| `page` | Number | No | Page number (default: 1) | `1` |
| `limit` | Number | No | Items per page (default: 10) | `10` |

### Request Examples

#### Get All Driver Reports (Paginated)
```bash
GET /api/admin/reports/drivers-report?page=1&limit=10
```

#### Filter by Date Range
```bash
GET /api/admin/reports/drivers-report?fromDate=2025-09-01&toDate=2025-09-30&page=1&limit=20
```

#### Filter by Specific Driver
```bash
GET /api/admin/reports/drivers-report?driverId=68f8136dd20ac3995d11e76d&page=1&limit=10
```

#### Combined Filters
```bash
GET /api/admin/reports/drivers-report?fromDate=2025-09-01&toDate=2025-09-30&driverId=68f8136dd20ac3995d11e76d&page=1&limit=10
```

### Response Structure

```json
{
  "status": 200,
  "data": {
    "reports": [
      {
        "busRouteName": "0730067387 Ocampo",
        "routeName": "Dallas to Ocampo",
        "tripDate": "09/10/2025",
        "tripTime": "11:00",
        "mxDriver": "David Moya",
        "usDriver": "Jose Muñiz",
        "passengers": 22,
        "origin": "Dallas, TX USA",
        "destination": "Ocampo",
        "busCode": "BUS001",
        "status": "completed",
        "startedAt": "2025-09-10T11:00:00.000Z",
        "completedAt": "2025-09-10T16:30:00.000Z"
      }
    ],
    "totalDocs": 46,
    "currentPage": 1,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "success": true,
  "message": "Drivers report generated successfully"
}
```

### Response Fields Description

| Field | Type | Description |
|-------|------|-------------|
| `busRouteName` | String | Bus serial number + destination |
| `routeName` | String | Route name |
| `tripDate` | String | Trip date (MM/DD/YYYY) |
| `tripTime` | String | Trip departure time (HH:MM) |
| `mxDriver` | String | MX driver full name or "N/A" |
| `usDriver` | String | US driver full name or "N/A" |
| `passengers` | Number | Total passenger count for this trip |
| `origin` | String | Origin destination name |
| `destination` | String | Destination name |
| `busCode` | String | Bus identification code |
| `status` | String | Trip status: `started`, `completed`, or `cancelled` |
| `startedAt` | String | Timestamp when trip started |
| `completedAt` | String | Timestamp when trip completed (null if not completed) |

### Trip Status Values

| Status | Description |
|--------|-------------|
| `started` | Driver has started the trip but not ended it |
| `completed` | Driver has completed the trip |
| `cancelled` | Trip was cancelled |

### Use Cases

#### 1. Daily Driver Activity Report
```bash
# Get all trips for today
GET /api/admin/reports/drivers-report?fromDate=2025-10-26&toDate=2025-10-26
```

#### 2. Monthly Driver Performance
```bash
# Get all trips for October 2025
GET /api/admin/reports/drivers-report?fromDate=2025-10-01&toDate=2025-10-31&limit=100
```

#### 3. Specific Driver Report
```bash
# Get trips for a specific driver
GET /api/admin/reports/drivers-report?driverId=68f8136dd20ac3995d11e76d&fromDate=2025-10-01&toDate=2025-10-31
```

#### 4. Active Trips Monitoring
```bash
# Get recent trips sorted by date
GET /api/admin/reports/drivers-report?page=1&limit=20
```

### Important Notes

- **Data Source**: Reports are generated from the `DriverReport` collection which is populated when drivers start/end trips

- **Driver Filtering**: The `driverId` parameter searches both `mxDriver` and `usDriver` fields

- **Automatic Population**: Trip records are automatically created when:
  - Driver starts trip → Creates record with `status: 'started'`
  - Driver ends trip → Updates record with `status: 'completed'` and final passenger count

- **Passenger Count**: Shows the actual number of passengers for each trip (updated when trip ends)

- **Date Filtering**: Filters by `tripDate` field in the DriverReport collection

---

## Common Response Structure

### Success Response
```json
{
  "status": 200,
  "data": {
    // Report-specific data
    "totalDocs": 46,
    "currentPage": 1,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "success": true,
  "message": "Report generated successfully"
}
```

### Pagination Metadata

All report APIs include standard pagination metadata:

```typescript
{
  totalDocs: number;      // Total number of records
  currentPage: number;    // Current page number
  totalPages: number;     // Total number of pages
  hasNextPage: boolean;   // True if more pages exist
  hasPrevPage: boolean;   // True if previous pages exist
}
```

---

## Error Handling

### Validation Errors

#### Invalid Date Format
```json
{
  "status": 400,
  "success": false,
  "message": "From date must be in YYYY-MM-DD format"
}
```

#### Invalid ObjectId
```json
{
  "status": 400,
  "success": false,
  "message": "Sales agent ID must be a valid MongoDB ObjectId"
}
```

#### Invalid Page Number
```json
{
  "status": 400,
  "success": false,
  "message": "Page must be a positive number"
}
```

### Authorization Errors

#### Unauthorized Access
```json
{
  "status": 401,
  "success": false,
  "message": "Unauthorized access"
}
```

#### Forbidden (Not Admin)
```json
{
  "status": 403,
  "success": false,
  "message": "Admin access required"
}
```

### Server Errors

#### Internal Server Error
```json
{
  "status": 500,
  "success": false,
  "message": "Internal server error"
}
```

---

## Code Examples

### JavaScript/TypeScript (Fetch API)

#### Sales Report
```typescript
const fetchSalesReport = async (filters: {
  fromDate?: string;
  toDate?: string;
  salesDateType?: 'sale' | 'departure';
  salesAgent?: string;
  salesOffice?: string;
  page?: number;
  limit?: number;
}) => {
  const queryParams = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });

  const response = await fetch(
    `/api/admin/reports/sales-report?${queryParams}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  return data;
};

// Usage
const report = await fetchSalesReport({
  fromDate: '2025-10-01',
  toDate: '2025-10-31',
  salesDateType: 'sale',
  page: 1,
  limit: 20
});

console.log('Total Sales:', report.data.totalDocs);
console.log('Sales Data:', report.data.sales);
```

#### Drivers Report
```typescript
const fetchDriversReport = async (filters: {
  fromDate?: string;
  toDate?: string;
  driverId?: string;
  page?: number;
  limit?: number;
}) => {
  const queryParams = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });

  const response = await fetch(
    `/api/admin/reports/drivers-report?${queryParams}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  return data;
};

// Usage
const report = await fetchDriversReport({
  fromDate: '2025-09-01',
  toDate: '2025-09-30',
  page: 1,
  limit: 10
});

console.log('Total Trips:', report.data.totalDocs);
console.log('Trip Reports:', report.data.reports);
```

### cURL Examples

#### Sales Report
```bash
curl -X GET "http://localhost:3000/api/admin/reports/sales-report?fromDate=2025-10-01&toDate=2025-10-31&salesDateType=sale&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

#### Drivers Report
```bash
curl -X GET "http://localhost:3000/api/admin/reports/drivers-report?fromDate=2025-09-01&toDate=2025-09-30&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### Axios Examples

#### Sales Report
```typescript
import axios from 'axios';

const getSalesReport = async () => {
  try {
    const response = await axios.get('/api/admin/reports/sales-report', {
      params: {
        fromDate: '2025-10-01',
        toDate: '2025-10-31',
        salesDateType: 'sale',
        page: 1,
        limit: 10
      },
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching sales report:', error);
    throw error;
  }
};
```

#### Drivers Report
```typescript
import axios from 'axios';

const getDriversReport = async () => {
  try {
    const response = await axios.get('/api/admin/reports/drivers-report', {
      params: {
        fromDate: '2025-09-01',
        toDate: '2025-09-30',
        driverId: '68f8136dd20ac3995d11e76d',
        page: 1,
        limit: 10
      },
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching drivers report:', error);
    throw error;
  }
};
```

---

## Data Flow

### Sales Report Data Flow

```
1. User books ticket
   ↓
2. Passenger record created with price and currency
   ↓
3. Sales report queries Passenger collection
   ↓
4. Populates user/agent and destination data
   ↓
5. Returns paginated sales data
```

### Drivers Report Data Flow

```
1. Driver starts trip
   ↓
2. DriverReport record created with status='started'
   ↓
3. Trip is in progress
   ↓
4. Driver ends trip
   ↓
5. DriverReport updated with status='completed' and final passenger count
   ↓
6. Report API queries DriverReport collection
   ↓
7. Returns paginated trip data
```

---

## Best Practices

### 1. Pagination
- Always use pagination for large datasets
- Recommended limit: 10-50 items per page
- For exports, use higher limits (100-500)

### 2. Date Ranges
- Use specific date ranges to improve query performance
- Avoid querying very large date ranges without pagination
- Use `salesDateType` appropriately based on your reporting needs

### 3. Filtering
- Combine filters to get specific reports
- Use `salesAgent` for agent performance tracking
- Use `driverId` for driver performance monitoring

### 4. Error Handling
- Always check `success` field in response
- Handle pagination edge cases (no next/prev page)
- Implement retry logic for server errors

### 5. Caching
- Consider caching report data for frequently accessed date ranges
- Invalidate cache when new bookings are made

---

## Performance Considerations

### Sales Report
- **Indexes**: Queries use indexes on `createdAt`, `DepartureDate`, `user`, and `isCancelled`
- **Population**: Uses efficient population with select to minimize data transfer
- **Pagination**: Limits database load by using pagination helper

### Drivers Report
- **Collection**: Uses dedicated `DriverReport` collection (no complex aggregations)
- **Indexes**: Optimized indexes on `tripDate`, `mxDriver`, `usDriver`, `bus`, and `status`
- **Pre-computed**: Data is pre-computed when drivers start/end trips
- **Fast Lookups**: Direct queries without joins

---

## Data Models

### Sales Report Data Source
- **Primary**: `Passenger` collection
- **Relations**: 
  - `user` → `Auth` → `Profile` (sales agent info)
  - `busId` → `Bus` (bus details)
  - Destinations (pricing and office info)

### Drivers Report Data Source
- **Primary**: `DriverReport` collection
- **Relations**:
  - `mxDriver` → `Auth` → `Profile` (MX driver info)
  - `usDriver` → `Auth` → `Profile` (US driver info)
  - `bus` → `Bus` (bus details)
  - `origin` → `Destination` (origin info)
  - `destination` → `Destination` (destination info)

---

## Troubleshooting

### Issue: No data returned
**Possible Causes:**
- Date range doesn't match any records
- Wrong `salesDateType` parameter
- Filters are too restrictive

**Solution:**
- Verify date ranges
- Remove filters one by one
- Check if data exists in database

### Issue: Slow response times
**Possible Causes:**
- Large date range without pagination
- Missing indexes
- Too much data being populated

**Solution:**
- Use pagination with reasonable limits
- Narrow date ranges
- Ensure database indexes are created

### Issue: Missing passenger names in Sales Report
**Possible Causes:**
- Passenger model not updated with price/currency
- Booking controllers not saving price field

**Solution:**
- Update booking controllers to save `price` and `currency` fields
- Run migration to add price to existing passenger records

---

## Migration Notes

### Adding Price to Existing Passengers

If you have existing passenger records without price/currency fields, run this migration:

```javascript
// Migration script to add price to existing passengers
const updateExistingPassengers = async () => {
  const passengers = await PassengerModel.find({ price: { $exists: false } });
  
  for (const passenger of passengers) {
    // Calculate price based on From/To destinations
    const origin = await DestinationModel.findOne({ name: passenger.From });
    const destination = await DestinationModel.findOne({ name: passenger.To });
    
    let price = 140; // Default
    
    if (origin && destination) {
      const isDallasOrigin = origin.name?.toLowerCase().includes('dallas');
      const isDallasDestination = destination.name?.toLowerCase().includes('dallas');
      
      if (passenger.type === 'round_trip') {
        if (isDallasOrigin || isDallasDestination) {
          price = isDallasOrigin 
            ? (destination.priceFromDFW + destination.priceToDFW)
            : (origin.priceToDFW + origin.priceFromDFW);
        } else {
          price = ((origin.priceToDFW) + (destination.priceFromDFW)) * 2;
        }
      } else {
        if (isDallasOrigin) {
          price = destination.priceFromDFW;
        } else if (isDallasDestination) {
          price = origin.priceToDFW;
        } else {
          price = (origin.priceToDFW) + (destination.priceFromDFW);
        }
      }
    }
    
    await PassengerModel.findByIdAndUpdate(passenger._id, {
      price: price,
      currency: 'MXN'
    });
  }
};
```

---

## Rate Limiting

Consider implementing rate limiting for report APIs:
- Recommended: 100 requests per minute per admin user
- Implement caching for frequently requested reports

---

## Export Features

### CSV Export Example
```typescript
const exportSalesReportToCSV = async (filters: any) => {
  const allSales = [];
  let currentPage = 1;
  let hasMore = true;
  
  // Fetch all pages
  while (hasMore) {
    const response = await fetchSalesReport({
      ...filters,
      page: currentPage,
      limit: 100
    });
    
    allSales.push(...response.data.sales);
    hasMore = response.data.hasNextPage;
    currentPage++;
  }
  
  // Convert to CSV
  const csv = convertToCSV(allSales);
  return csv;
};
```

---

## Support

For issues or questions regarding these APIs:
1. Check this documentation first
2. Verify authentication tokens
3. Validate query parameters
4. Check server logs for errors
5. Contact backend development team

---

**Last Updated:** October 26, 2025
**API Version:** 1.0.0

