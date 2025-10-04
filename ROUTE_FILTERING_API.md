# Route Filtering API Documentation

## 🎯 **Overview**
Comprehensive filtering system for routes that supports the "Find Ticket" interface with advanced search, filtering, and sorting capabilities.

## 📡 **API Endpoints**

### **1. Get Routes with Filtering**
```http
GET /api/admin/routes
```

#### **Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | number | Page number for pagination | `1` |
| `limit` | number | Number of results per page | `10` |
| `origin` | string | Origin destination ID | `68e07ca39b1b15d265780592` |
| `destination` | string | Destination ID | `68e07ca39b1b15d265780593` |
| `departureDate` | string | Departure date (ISO format) | `2024-01-15` |
| `returnDate` | string | Return date (ISO format) | `2024-01-20` |
| `tripType` | string | One-way or round-trip | `one-way` or `round-trip` |
| `day` | string | Day of the week | `monday`, `tuesday`, etc. |
| `time` | string | Time range (HH:MM-HH:MM) | `08:00-18:00` |
| `bus` | string | Bus ID | `68e07ca39b1b15d265780594` |
| `isActive` | boolean | Active status filter | `true` or `false` |
| `search` | string | Search in route name, origin, destination | `Mexico City` |
| `sortBy` | string | Sort field | `createdAt`, `name`, `dayTime.time` |
| `sortOrder` | string | Sort direction | `asc` or `desc` |

#### **Example Requests:**

```bash
# Basic filtering
GET /api/admin/routes?origin=68e07ca39b1b15d265780592&destination=68e07ca39b1b15d265780593

# Date filtering
GET /api/admin/routes?departureDate=2024-01-15&tripType=one-way

# Day and time filtering
GET /api/admin/routes?day=monday&time=08:00-18:00

# Search and sort
GET /api/admin/routes?search=Mexico&sortBy=name&sortOrder=asc

# Pagination
GET /api/admin/routes?page=2&limit=20
```

#### **Response Format:**
```json
{
  "success": true,
  "message": "Routes fetched successfully",
  "data": {
    "routes": [
      {
        "_id": "68e07ca39b1b15d265780592",
        "name": "Mexico City - Guadalajara",
        "origin": {
          "_id": "68e07ca39b1b15d265780592",
          "name": "Mexico City",
          "description": "Mexico City Terminal",
          "priceToDFW": 150,
          "priceFromDFW": 150,
          "priceRoundTrip": 280
        },
        "destination": {
          "_id": "68e07ca39b1b15d265780593",
          "name": "Guadalajara",
          "description": "Guadalajara Terminal",
          "priceToDFW": 200,
          "priceFromDFW": 200,
          "priceRoundTrip": 380
        },
        "bus": {
          "_id": "68e07ca39b1b15d265780594",
          "code": "BUS001",
          "serialNumber": "SN123456",
          "capacity": 48,
          "seatLayout": { /* seat layout data */ }
        },
        "dayTime": [
          {
            "day": "monday",
            "time": "2024-01-15T08:00:00.000Z"
          },
          {
            "day": "monday",
            "time": "2024-01-15T14:00:00.000Z"
          }
        ],
        "intermediateStops": [
          {
            "_id": "68e07ca39b1b15d265780595",
            "name": "Queretaro",
            "description": "Queretaro Stop"
          }
        ],
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalDocs": 25,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "filters": {
      "appliedFilters": {
        "origin": "68e07ca39b1b15d265780592",
        "destination": "68e07ca39b1b15d265780593",
        "departureDate": "2024-01-15",
        "returnDate": null,
        "tripType": "one-way",
        "day": "monday",
        "time": "08:00-18:00",
        "bus": null,
        "isActive": true,
        "search": null
      },
      "totalResults": 25,
      "currentPage": 1,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### **2. Get Filter Options**
```http
GET /api/admin/routes/filter-options
```

#### **Response Format:**
```json
{
  "success": true,
  "message": "Filter options fetched successfully",
  "data": {
    "destinations": [
      {
        "_id": "68e07ca39b1b15d265780592",
        "name": "Mexico City",
        "description": "Mexico City Terminal",
        "priceToDFW": 150,
        "priceFromDFW": 150,
        "priceRoundTrip": 280
      }
    ],
    "buses": [
      {
        "_id": "68e07ca39b1b15d265780594",
        "code": "BUS001",
        "serialNumber": "SN123456",
        "capacity": 48
      }
    ],
    "availableDays": [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday"
    ],
    "timeRange": {
      "min": "2024-01-01T06:00:00.000Z",
      "max": "2024-01-01T22:00:00.000Z"
    },
    "popularRoutes": [
      {
        "_id": "68e07ca39b1b15d265780592",
        "name": "Mexico City - Guadalajara",
        "origin": "Mexico City",
        "destination": "Guadalajara",
        "dayTimeCount": 14
      }
    ],
    "tripTypes": [
      { "value": "one-way", "label": "One Way" },
      { "value": "round-trip", "label": "Round Trip" }
    ],
    "sortOptions": [
      { "value": "createdAt", "label": "Date Created" },
      { "value": "name", "label": "Route Name" },
      { "value": "dayTime.time", "label": "Departure Time" }
    ]
  }
}
```

### **3. Search Routes**
```http
GET /api/admin/routes/search?q=search_term&limit=10
```

#### **Query Parameters:**
- `q` (required): Search query (minimum 2 characters)
- `limit` (optional): Maximum number of results (default: 10)

#### **Example:**
```bash
GET /api/admin/routes/search?q=Mexico&limit=5
```

#### **Response Format:**
```json
{
  "success": true,
  "message": "Search results fetched successfully",
  "data": {
    "routes": [
      {
        "_id": "68e07ca39b1b15d265780592",
        "name": "Mexico City - Guadalajara",
        "origin": {
          "name": "Mexico City",
          "description": "Mexico City Terminal"
        },
        "destination": {
          "name": "Guadalajara",
          "description": "Guadalajara Terminal"
        },
        "bus": {
          "code": "BUS001",
          "serialNumber": "SN123456",
          "capacity": 48
        }
      }
    ]
  }
}
```

## 🔍 **Filtering Features**

### **1. Origin & Destination Filtering**
- Filter by specific origin and destination IDs
- Supports exact matches
- Can be combined for route-specific searches

### **2. Date Filtering**
- **Departure Date**: Filter routes that have schedules on specific dates
- **Return Date**: For round-trip filtering (future enhancement)
- **Trip Type**: One-way or round-trip filtering

### **3. Day & Time Filtering**
- **Day**: Filter by specific days of the week
- **Time Range**: Filter by time ranges (e.g., 08:00-18:00)
- Supports multiple time slots per route

### **4. Search Functionality**
- **Text Search**: Search in route names, origin names, destination names
- **Case Insensitive**: Searches are case-insensitive
- **Partial Matches**: Supports partial string matching

### **5. Advanced Filtering**
- **Bus Filter**: Filter by specific bus
- **Active Status**: Filter by active/inactive routes
- **Sorting**: Multiple sort options with ascending/descending order

## 🎨 **Frontend Integration Examples**

### **Find Ticket Form Integration:**

```typescript
// Get filter options on component mount
const loadFilterOptions = async () => {
  const response = await fetch('/api/admin/routes/filter-options');
  const data = await response.json();
  setDestinations(data.data.destinations);
  setAvailableDays(data.data.availableDays);
  setTripTypes(data.data.tripTypes);
};

// Search routes based on form data
const searchRoutes = async (formData) => {
  const params = new URLSearchParams({
    origin: formData.origin,
    destination: formData.destination,
    departureDate: formData.departureDate,
    tripType: formData.tripType,
    day: formData.day,
    time: formData.time,
    page: '1',
    limit: '10'
  });
  
  const response = await fetch(`/api/admin/routes?${params}`);
  const data = await response.json();
  setRoutes(data.data.routes);
  setPagination(data.data.pagination);
};

// Autocomplete search
const searchAutocomplete = async (query) => {
  if (query.length < 2) return;
  
  const response = await fetch(`/api/admin/routes/search?q=${query}&limit=5`);
  const data = await response.json();
  setSearchResults(data.data.routes);
};
```

### **Filter State Management:**

```typescript
interface FilterState {
  origin: string | null;
  destination: string | null;
  departureDate: string | null;
  returnDate: string | null;
  tripType: 'one-way' | 'round-trip';
  day: string | null;
  time: string | null;
  bus: string | null;
  search: string | null;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}
```

## 🚀 **Performance Features**

### **1. Pagination**
- Efficient pagination with configurable page sizes
- Total count and page information included
- Navigation helpers (hasNextPage, hasPrevPage)

### **2. Caching**
- Filter options can be cached on frontend
- Search results can be cached for repeated queries
- Popular routes are pre-computed

### **3. Database Optimization**
- Proper indexing on frequently queried fields
- Aggregation pipelines for complex queries
- Efficient population of related data

## 📊 **Analytics & Insights**

### **1. Popular Routes**
- Routes sorted by frequency of use
- Helps identify most popular destinations
- Useful for recommendations

### **2. Time Range Analysis**
- Min/max time ranges across all routes
- Helps with time picker UI components
- Identifies operational hours

### **3. Filter Usage Tracking**
- Applied filters are returned in response
- Helps understand user search patterns
- Useful for analytics and optimization

## 🔧 **Error Handling**

### **Common Error Responses:**

```json
{
  "success": false,
  "message": "Invalid date format",
  "error": "DEPARTURE_DATE_INVALID"
}
```

### **Validation Errors:**
- Invalid date formats
- Invalid ObjectId formats
- Missing required parameters
- Search query too short

## 🎯 **Use Cases**

### **1. Find Ticket Interface**
- Origin/destination selection
- Date picker integration
- Trip type selection
- Real-time search

### **2. Admin Dashboard**
- Route management
- Filtering and sorting
- Bulk operations
- Analytics views

### **3. Mobile App**
- Quick search
- Filter persistence
- Offline capabilities
- Push notifications

The filtering system provides a comprehensive solution for route discovery and management, supporting both simple searches and complex multi-criteria filtering! 🎉

