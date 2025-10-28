# Dashboard API Documentation

## Endpoint
```
GET /admin/misc/dashboard
```

## Authentication
Requires admin authentication token in headers:
```
Authorization: Bearer <admin_token>
```

## Query Parameters

| Parameter      | Type   | Required | Description                           |
|----------------|--------|----------|---------------------------------------|
| date           | string | No       | Date to fetch dashboard data (YYYY-MM-DD). If not provided, shows last 30 days. |
| departureDate  | string | No       | Filter trips by departure date (YYYY-MM-DD) |
| bookingType    | string | No       | Filter by booking type: `customer`, `cashier`, `driver`, etc. |
| dateRangeStart | string | No       | Start date for date range filter (YYYY-MM-DD) |
| dateRangeEnd   | string | No       | End date for date range filter (YYYY-MM-DD) |
| filter         | string | No       | General filter parameter |

**Note:** If no date parameters are provided (`date`, `departureDate`, `dateRangeStart`, `dateRangeEnd`), the API will return **overall data for the last 30 days** and compare with the previous 30 days.

## Response Structure

### Success Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Dashboard data fetched successfully (Last 30 days)",
  "data": {
    "period": {
      "isOverallData": true,
      "label": "Last 30 Days",
      "startDate": "2025-08-29",
      "endDate": "2025-09-28",
      "durationDays": 30
    },
    "nowBoarding": {
      "id": "68e07c26030e49473a427011",
      "routeName": "Dallas to Ocampo Route",
      "origin": {
        "name": "Dallas, TX USA",
        "time": "06:00"
      },
      "destination": {
        "name": "Ocampo, Guanajuato",
        "time": "06:00"
      },
      "date": "2025-09-28T00:00:00.000Z",
      "passengerAvatars": [
        {
          "pictureUrl": "https://example.com/profile1.jpg",
          "name": "John Doe"
        },
        {
          "pictureUrl": null,
          "name": "Jane Smith"
        }
      ],
      "totalPassengers": 32,
      "remainingCount": 28,
      "bus": {
        "serialNumber": "739-283",
        "code": "BUS-739",
        "capacity": 40
      },
      "capacityPercentage": 60,
      "status": "boarding"
    },
    "nowBoardingTrips": [...],
    "activeTrips": [
      {
        "id": "68e07c26030e49473a427012",
        "origin": {
          "name": "Dallas, TX USA",
          "time": "06:00"
        },
        "destination": {
          "name": "Ocampo, Guanajuato",
          "time": "06:00"
        },
        "date": "2025-09-28T00:00:00.000Z",
        "passengerAvatars": [
          {
            "pictureUrl": "https://example.com/profile1.jpg",
            "name": "John Doe"
          },
          {
            "pictureUrl": "https://example.com/profile2.jpg",
            "name": "Jane Smith"
          },
          {
            "pictureUrl": null,
            "name": "Bob Johnson"
          }
        ],
        "totalPassengers": 22,
        "remainingCount": 18,
        "bus": {
          "serialNumber": "739-283",
          "code": "BUS-739",
          "capacity": 40
        },
        "capacityPercentage": 60,
        "status": "started",
        "tripInformation": {
          "salida": "2025-09-28T14:30:00.000Z",
          "destination": "Downtown Terminal",
          "estimatedDuration": 45,
          "timeRemaining": 28
        }
      }
    ],
    "salesAndPerformance": {
      "passengers": {
        "count": 2520,
        "change": 16.9,
        "period": "Last 30 days"
      },
      "trips": {
        "count": 4,
        "change": -16.9,
        "period": "Last 30 days"
      },
      "occupancyRate": {
        "rate": 85,
        "change": 1.1,
        "period": "Last 30 days"
      },
      "revenue": {
        "amount": 129.21,
        "change": 4.1,
        "period": "Last 30 days"
      }
    },
    "filters": {
      "applied": {
        "date": "2025-09-28",
        "departureDate": null,
        "bookingType": "customer",
        "dateRangeStart": null,
        "dateRangeEnd": null,
        "filter": null
      }
    }
  }
}
```

## Data Explanation

### Period Information
Shows the time period for the displayed data.

**Fields:**
- `isOverallData`: Boolean indicating if showing overall data (true) or filtered data (false)
- `label`: Human-readable label (e.g., "Last 30 Days" or "Filtered Period")
- `startDate`: Start date of the period (YYYY-MM-DD)
- `endDate`: End date of the period (YYYY-MM-DD)
- `durationDays`: Number of days in the period

### Now Boarding
Shows the trip that is currently in "boarding" status (passengers are actively boarding).

**Fields:**
- `id`: Route ID
- `routeName`: Name of the route
- `origin`: Origin location and departure time
- `destination`: Destination location and arrival time
- `date`: Current date
- `passengerAvatars`: Array of up to 4 passenger objects with:
  - `pictureUrl`: Profile picture URL (null if customer has no profile picture)
  - `name`: Passenger's full name
- `totalPassengers`: Total number of passengers for this trip
- `remainingCount`: Number of passengers beyond the first 4 (+N indicator)
- `bus`: Bus information including serial number, code, and capacity
- `capacityPercentage`: Percentage of seats filled
- `status`: Always "boarding" for this section

### Active Trips
Shows all trips that are currently in "started" status (actively in transit).

**Fields:**
- `id`: Trip/report ID
- `origin`: Origin location and departure time
- `destination`: Destination location and arrival time
- `date`: Trip date
- `passengerAvatars`: Array of up to 4 passenger objects with:
  - `pictureUrl`: Profile picture URL from customer profile (null if not set)
  - `name`: Passenger's full name
- `totalPassengers`: Total number of confirmed passengers (filtered by bookingType if specified)
- `remainingCount`: Number of passengers beyond the first 4 shown in avatars
- `bus`: Bus information including serial number, code, and capacity
- `capacityPercentage`: Percentage of seats filled (passengers / capacity * 100)
- `status`: Current trip status (`started`)
- `tripInformation`:
  - `salida`: Actual departure/start time
  - `destination`: Destination name
  - `estimatedDuration`: Estimated trip duration in minutes
  - `timeRemaining`: Minutes remaining until estimated arrival

### Sales & Performance

All metrics include comparison with the previous period:
- **Overall data (no filters)**: Last 30 days vs. previous 30 days
- **Filtered data**: Selected period vs. same duration before

**Passengers:**
- `count`: Total number of passengers booked for the period
- `change`: Percentage change compared to the previous period
- `period`: Description of the period (e.g., "Last 30 days" or specific date)

**Trips:**
- `count`: Total number of trips for the period
- `change`: Percentage change compared to the previous period
- `period`: Description of the period

**Occupancy Rate:**
- `rate`: Average occupancy percentage across all trips (0-100)
- `change`: Percentage point change compared to the previous period
- `period`: Description of the period

**Revenue:**
- `amount`: Total revenue from successful payments for the period
- `change`: Percentage change compared to the previous period
- `period`: Description of the period

## Examples

### Get overall dashboard (last 30 days - no filters)
```bash
GET /admin/misc/dashboard
```
**Response will include:**
- `period.isOverallData: true`
- `period.label: "Last 30 Days"`
- Data for the last 30 days compared to previous 30 days

### Get dashboard for specific date
```bash
GET /admin/misc/dashboard?date=2025-09-28
```

### Filter by departure date
```bash
GET /admin/misc/dashboard?departureDate=2025-10-15
```

### Filter by booking type (show only customer bookings)
```bash
GET /admin/misc/dashboard?bookingType=customer
```

### Filter by date range
```bash
GET /admin/misc/dashboard?dateRangeStart=2025-09-01&dateRangeEnd=2025-09-30
```

### Combined filters
```bash
GET /admin/misc/dashboard?departureDate=2025-09-28&bookingType=cashier
```

### Complex filter example (multiple filters together)
```bash
GET /admin/misc/dashboard?departureDate=2025-10-30&bookingType=customer&dateRangeStart=2025-11-27&dateRangeEnd=2025-12-30
```
**Note:** When both `departureDate` and `dateRangeStart/End` are provided, the date range takes precedence.

### Show all bookings
```bash
GET /admin/misc/dashboard?bookingType=all
# or
GET /admin/misc/dashboard?bookingType=All%20Bookings
```

## Filter Options

### Booking Types
You can filter trips and passengers by who made the booking:

- `all` or `All Bookings` - Show all bookings regardless of who booked them (default)
- `customer` - Bookings made by customers through the web/mobile app
- `cashier` - Bookings made by cashiers at ticket offices
- `driver` - Bookings made by drivers
- `manager` - Bookings made by managers
- `super_admin` or `Super Admin` - Bookings made by super admins

**Note:** If `bookingType` is not provided or set to `all` or `All Bookings`, all bookings will be shown.

## Notes

### Overall Data (No Filters)
- **Default Behavior**: When no date filters are provided, the API returns data for the **last 30 days**
- **Comparison**: Compares with the previous 30 days (days 31-60 before current date)
- **Indicator**: Response includes `period.isOverallData: true`
- **Use Case**: Perfect for getting a quick overview of business performance

### Filtered Data
- **Smart Comparison**: When filters are applied, comparison period matches the filtered period duration
  - Example: 7-day range is compared with the 7 days before that
  - Example: Single day is compared with the day before
- **Indicator**: Response includes `period.isOverallData: false`

### Other Notes
- **Profile Pictures**: Passenger avatars will show profile pictures only for customers who have set their profile picture. Cashier-booked tickets won't have profile pictures.
- **Now Boarding**: Only shows routes with status "boarding". To set a route to boarding status, update the route's status field.
- Positive `change` values indicate growth/improvement
- Negative `change` values indicate decline
- Occupancy rate is calculated as: (Total Booked Passengers / Total Capacity) × 100
- Revenue is calculated from all successful payment transactions
- `passengerAvatars` array shows up to 4 passengers, use `remainingCount` for the "+N" indicator
- Filters can be combined for more specific results

