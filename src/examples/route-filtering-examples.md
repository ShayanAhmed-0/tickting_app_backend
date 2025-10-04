# Route Filtering API - Query Examples

## 🎯 **Complete Query Parameter Examples**

### **1. Basic Route Listing**
```bash
# Get all active routes (default)
GET /api/admin/routes

# With pagination
GET /api/admin/routes?page=1&limit=10

# With sorting
GET /api/admin/routes?sortBy=name&sortOrder=asc
```

### **2. Origin & Destination Filtering**
```bash
# Filter by specific origin and destination
GET /api/admin/routes?origin=68e07ca39b1b15d265780592&destination=68e07ca39b1b15d265780593

# Filter by origin only
GET /api/admin/routes?origin=68e07ca39b1b15d265780592

# Filter by destination only
GET /api/admin/routes?destination=68e07ca39b1b15d265780593
```

### **3. Date Filtering**
```bash
# Filter by departure date
GET /api/admin/routes?departureDate=2024-01-15

# Filter by departure date with trip type
GET /api/admin/routes?departureDate=2024-01-15&tripType=one-way

# Filter by departure and return dates (round trip)
GET /api/admin/routes?departureDate=2024-01-15&returnDate=2024-01-20&tripType=round-trip
```

### **4. Day & Time Filtering**
```bash
# Filter by specific day
GET /api/admin/routes?day=monday

# Filter by time range
GET /api/admin/routes?time=08:00-18:00

# Filter by day and time
GET /api/admin/routes?day=monday&time=08:00-18:00

# Filter by multiple days (separate requests)
GET /api/admin/routes?day=monday
GET /api/admin/routes?day=tuesday
GET /api/admin/routes?day=wednesday
```

### **5. Search Functionality**
```bash
# Search by route name
GET /api/admin/routes?search=Mexico

# Search by city name
GET /api/admin/routes?search=Guadalajara

# Search with other filters
GET /api/admin/routes?search=Mexico&origin=68e07ca39b1b15d265780592
```

### **6. Bus Filtering**
```bash
# Filter by specific bus
GET /api/admin/routes?bus=68e07ca39b1b15d265780594

# Filter by bus with other criteria
GET /api/admin/routes?bus=68e07ca39b1b15d265780594&day=monday
```

### **7. Status Filtering**
```bash
# Get only active routes (default)
GET /api/admin/routes?isActive=true

# Get inactive routes
GET /api/admin/routes?isActive=false

# Get all routes (active and inactive)
GET /api/admin/routes?isActive=
```

### **8. Sorting Options**
```bash
# Sort by creation date (newest first)
GET /api/admin/routes?sortBy=createdAt&sortOrder=desc

# Sort by route name (A-Z)
GET /api/admin/routes?sortBy=name&sortOrder=asc

# Sort by departure time (earliest first)
GET /api/admin/routes?sortBy=dayTime.time&sortOrder=asc

# Sort by departure time (latest first)
GET /api/admin/routes?sortBy=dayTime.time&sortOrder=desc
```

### **9. Complex Filtering Combinations**
```bash
# Find routes from Mexico City to Guadalajara on Monday morning
GET /api/admin/routes?origin=68e07ca39b1b15d265780592&destination=68e07ca39b1b15d265780593&day=monday&time=06:00-12:00

# Find one-way routes departing on specific date
GET /api/admin/routes?departureDate=2024-01-15&tripType=one-way&sortBy=dayTime.time&sortOrder=asc

# Search for routes containing "Mexico" departing in the afternoon
GET /api/admin/routes?search=Mexico&time=12:00-18:00&sortBy=name&sortOrder=asc

# Find routes using specific bus on weekends
GET /api/admin/routes?bus=68e07ca39b1b15d265780594&day=saturday
GET /api/admin/routes?bus=68e07ca39b1b15d265780594&day=sunday
```

### **10. Pagination Examples**
```bash
# First page with 10 results
GET /api/admin/routes?page=1&limit=10

# Second page with 20 results
GET /api/admin/routes?page=2&limit=20

# Last page (if you know total pages)
GET /api/admin/routes?page=5&limit=10

# Large page size for admin dashboard
GET /api/admin/routes?page=1&limit=50
```

### **11. Real-World Use Cases**

#### **Find Ticket Form - One Way Trip**
```bash
# User searches: Mexico City → Guadalajara, Jan 15, 2024, One Way
GET /api/admin/routes?origin=68e07ca39b1b15d265780592&destination=68e07ca39b1b15d265780593&departureDate=2024-01-15&tripType=one-way&sortBy=dayTime.time&sortOrder=asc
```

#### **Find Ticket Form - Round Trip**
```bash
# User searches: Mexico City → Guadalajara, Jan 15-20, 2024, Round Trip
GET /api/admin/routes?origin=68e07ca39b1b15d265780592&destination=68e07ca39b1b15d265780593&departureDate=2024-01-15&returnDate=2024-01-20&tripType=round-trip&sortBy=dayTime.time&sortOrder=asc
```

#### **Admin Dashboard - Route Management**
```bash
# Show all routes with pagination
GET /api/admin/routes?page=1&limit=25&sortBy=createdAt&sortOrder=desc

# Filter inactive routes
GET /api/admin/routes?isActive=false&sortBy=name&sortOrder=asc

# Search for specific route
GET /api/admin/routes?search=Mexico&page=1&limit=10
```

#### **Mobile App - Quick Search**
```bash
# Quick search for routes
GET /api/admin/routes/search?q=Mexico&limit=5

# Search with autocomplete
GET /api/admin/routes/search?q=Guad&limit=3
```

### **12. Filter Options Endpoint**
```bash
# Get all available filter options
GET /api/admin/routes/filter-options
```

## 🔧 **JavaScript/TypeScript Examples**

### **Frontend Implementation Examples:**

```typescript
// Basic route fetching
const fetchRoutes = async (filters: RouteFilters) => {
  const params = new URLSearchParams();
  
  if (filters.origin) params.append('origin', filters.origin);
  if (filters.destination) params.append('destination', filters.destination);
  if (filters.departureDate) params.append('departureDate', filters.departureDate);
  if (filters.returnDate) params.append('returnDate', filters.returnDate);
  if (filters.tripType) params.append('tripType', filters.tripType);
  if (filters.day) params.append('day', filters.day);
  if (filters.time) params.append('time', filters.time);
  if (filters.bus) params.append('bus', filters.bus);
  if (filters.search) params.append('search', filters.search);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  
  const response = await fetch(`/api/admin/routes?${params}`);
  return response.json();
};

// Find Ticket form submission
const handleFindTicket = async (formData: FindTicketForm) => {
  const queryParams = {
    origin: formData.originId,
    destination: formData.destinationId,
    departureDate: formData.departureDate,
    tripType: formData.tripType,
    page: 1,
    limit: 10,
    sortBy: 'dayTime.time',
    sortOrder: 'asc'
  };
  
  const routes = await fetchRoutes(queryParams);
  return routes;
};

// Search with autocomplete
const searchRoutes = async (query: string) => {
  if (query.length < 2) return [];
  
  const response = await fetch(`/api/admin/routes/search?q=${query}&limit=5`);
  const data = await response.json();
  return data.data.routes;
};

// Get filter options
const getFilterOptions = async () => {
  const response = await fetch('/api/admin/routes/filter-options');
  const data = await response.json();
  return data.data;
};
```

### **cURL Examples:**

```bash
# Basic request
curl -X GET "http://localhost:9000/api/admin/routes?page=1&limit=10" \
  -H "Authorization: Bearer your-jwt-token"

# Complex filtering
curl -X GET "http://localhost:9000/api/admin/routes?origin=68e07ca39b1b15d265780592&destination=68e07ca39b1b15d265780593&departureDate=2024-01-15&tripType=one-way&day=monday&time=08:00-18:00&sortBy=dayTime.time&sortOrder=asc" \
  -H "Authorization: Bearer your-jwt-token"

# Search request
curl -X GET "http://localhost:9000/api/admin/routes/search?q=Mexico&limit=5" \
  -H "Authorization: Bearer your-jwt-token"

# Filter options
curl -X GET "http://localhost:9000/api/admin/routes/filter-options" \
  -H "Authorization: Bearer your-jwt-token"
```

## 📊 **Response Examples**

### **Successful Response:**
```json
{
  "success": true,
  "message": "Routes fetched successfully",
  "data": {
    "routes": [/* array of route objects */],
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

### **Error Response:**
```json
{
  "success": false,
  "message": "Invalid date format",
  "error": "DEPARTURE_DATE_INVALID"
}
```

## 🎯 **Best Practices**

1. **Always include pagination** for large datasets
2. **Use specific filters** to reduce response size
3. **Sort results** for better user experience
4. **Handle empty results** gracefully
5. **Cache filter options** on frontend
6. **Implement debouncing** for search inputs
7. **Validate dates** before sending requests
8. **Use appropriate limits** based on use case

These examples cover all possible query parameter combinations for the route filtering API! 🚀

