# 🗺️ Routes API with Seat Availability

## Overview

All route endpoints now include detailed seat availability information for each bus, making it easy to display real-time seat status to users.

---

## 📡 Endpoints

### 1. Get All Routes

**Endpoint:** `GET /api/routes`

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 10) |
| `origin` | string | No | Origin destination ID |
| `destination` | string | No | Destination ID |
| `day` | string | No | Day of week (monday, tuesday, etc.) |
| `isActive` | boolean | No | Filter by active status (default: true) |
| `search` | string | No | Search in route/destination names |
| `sortBy` | string | No | Field to sort by |
| `sortOrder` | string | No | asc or desc |

**Success Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "routes": [
      {
        "_id": "route_id_1",
        "name": "Dallas to Houston Express",
        "origin": {
          "_id": "dest_id_1",
          "name": "Dallas, TX",
          "priceFromDFW": 0,
          "priceToDFW": 60.00,
          "priceRoundTrip": 0
        },
        "destination": {
          "_id": "dest_id_2",
          "name": "Houston, TX",
          "priceFromDFW": 60.00,
          "priceToDFW": 60.00,
          "priceRoundTrip": 110.00
        },
        "bus": {
          "_id": "bus_id_1",
          "code": "BUS-001",
          "serialNumber": "SN-12345",
          "capacity": 45,
          "amenities": ["wifi", "restroom", "usb"],
          "seatLayout": {
            "type": "standard",
            "seats": [
              {
                "seatLabel": "A1",
                "seatIndex": 0,
                "type": "regular",
                "status": "available",
                "isAvailable": true,
                "userId": null
              },
              {
                "seatLabel": "A2",
                "seatIndex": 1,
                "type": "regular",
                "status": "held",
                "isAvailable": false,
                "userId": "user_id_123"
              },
              {
                "seatLabel": "A3",
                "seatIndex": 2,
                "type": "regular",
                "status": "booked",
                "isAvailable": false,
                "userId": "user_id_456"
              }
              // ... more seats
            ]
          }
        },
        "seatAvailability": {
          "total": 45,
          "available": 38,
          "booked": 5,
          "held": 2,
          "availableSeats": [
            {
              "seatLabel": "A1",
              "seatIndex": 0,
              "type": "regular",
              "status": "available",
              "isAvailable": true,
              "userId": null
            }
            // ... all available seats
          ]
        },
        "dayTime": [
          {
            "day": "monday",
            "time": "08:00"
          },
          {
            "day": "wednesday",
            "time": "08:00"
          }
        ],
        "isActive": true
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
        "origin": null,
        "destination": null,
        "day": null,
        "isActive": true,
        "search": null
      },
      "totalResults": 25,
      "currentPage": 1,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "message": "Routes fetched successfully"
}
```

---

### 2. Get Route by ID

**Endpoint:** `GET /api/routes/id/:id`

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Route MongoDB ObjectId |

**Success Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "route": {
      "_id": "route_id",
      "name": "Dallas to Houston Express",
      "origin": {
        "_id": "dest_id_1",
        "name": "Dallas, TX",
        "description": "Dallas Fort Worth Area",
        "priceFromDFW": 0,
        "priceToDFW": 60.00,
        "priceRoundTrip": 0
      },
      "destination": {
        "_id": "dest_id_2",
        "name": "Houston, TX",
        "description": "Houston Metropolitan Area",
        "priceFromDFW": 60.00,
        "priceToDFW": 60.00,
        "priceRoundTrip": 110.00
      },
      "bus": {
        "_id": "bus_id",
        "code": "BUS-001",
        "serialNumber": "SN-12345",
        "capacity": 45,
        "amenities": ["wifi", "restroom", "usb", "ac"],
        "seatLayout": {
          "type": "standard",
          "seats": [
            /* All 45 seats with their current status */
          ]
        }
      },
      "seatAvailability": {
        "total": 45,
        "available": 38,
        "booked": 5,
        "held": 2,
        "availableSeats": [
          /* Array of only available seats */
        ]
      },
      "dayTime": [
        {
          "day": "monday",
          "time": "08:00"
        }
      ],
      "intermediateStops": [],
      "isActive": true
    }
  },
  "message": "Route fetched successfully"
}
```

---

### 3. Search Routes

**Endpoint:** `GET /api/routes/search`

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query (min 2 chars) |
| `limit` | number | No | Max results (default: 10) |

**Example Request:**
```
GET /api/routes/search?q=houston&limit=5
```

**Success Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "routes": [
      {
        "_id": "route_id",
        "name": "Dallas to Houston Express",
        "origin": {
          "_id": "dest_id_1",
          "name": "Dallas, TX"
        },
        "destination": {
          "_id": "dest_id_2",
          "name": "Houston, TX"
        },
        "bus": {
          "_id": "bus_id",
          "code": "BUS-001",
          "capacity": 45,
          "seatLayout": {
            "seats": [/* all seats */]
          }
        },
        "seatAvailability": {
          "total": 45,
          "available": 38,
          "booked": 5,
          "held": 2,
          "availableSeats": [/* available seats only */]
        }
      }
    ]
  },
  "message": "Search results fetched successfully"
}
```

---

## 📊 Seat Availability Object

### Structure

```typescript
interface SeatAvailability {
  total: number;           // Total number of seats in bus
  available: number;       // Count of available seats
  booked: number;         // Count of booked seats
  held: number;           // Count of held/selected seats
  availableSeats: Seat[]; // Array of available seat objects
}
```

### Example

```json
{
  "total": 45,
  "available": 38,
  "booked": 5,
  "held": 2,
  "availableSeats": [
    {
      "seatLabel": "A1",
      "seatIndex": 0,
      "type": "regular",
      "status": "available",
      "isAvailable": true,
      "userId": null
    },
    {
      "seatLabel": "A4",
      "seatIndex": 3,
      "type": "regular",
      "status": "available",
      "isAvailable": true,
      "userId": null
    }
    // ... 36 more available seats
  ]
}
```

---

## 💻 Frontend Integration

### Display Available Seats Count

```typescript
// src/components/RouteCard.tsx
interface RouteCardProps {
  route: Route;
}

export function RouteCard({ route }: RouteCardProps) {
  const { seatAvailability } = route;

  return (
    <div className="route-card">
      <h3>{route.name}</h3>
      
      <div className="route-info">
        <p>{route.origin.name} → {route.destination.name}</p>
        <p>Price: ${route.destination.priceFromDFW}</p>
      </div>

      {/* Seat Availability Display */}
      <div className="seat-info">
        <div className="seat-count">
          <span className="available">
            {seatAvailability.available} Available
          </span>
          <span className="total">
            / {seatAvailability.total} Total
          </span>
        </div>

        {seatAvailability.available === 0 && (
          <div className="fully-booked">
            ⚠️ Fully Booked
          </div>
        )}

        {seatAvailability.available <= 5 && seatAvailability.available > 0 && (
          <div className="few-seats">
            🔥 Only {seatAvailability.available} seats left!
          </div>
        )}
      </div>

      <button 
        disabled={seatAvailability.available === 0}
        onClick={() => navigateToBooking(route)}
      >
        {seatAvailability.available === 0 ? 'Sold Out' : 'Book Now'}
      </button>
    </div>
  );
}
```

### Filter Routes by Availability

```typescript
// src/pages/RoutesPage.tsx
import { useState, useEffect } from 'react';
import { routeService } from '../services/routeService';

export function RoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);

  const loadRoutes = async () => {
    const response = await routeService.getRoutes();
    if (response.success) {
      setRoutes(response.data.routes);
    }
  };

  const filteredRoutes = showOnlyAvailable
    ? routes.filter(route => route.seatAvailability?.available > 0)
    : routes;

  return (
    <div>
      <h1>Available Routes</h1>

      <label>
        <input
          type="checkbox"
          checked={showOnlyAvailable}
          onChange={(e) => setShowOnlyAvailable(e.target.checked)}
        />
        Show only routes with available seats
      </label>

      <div className="routes-list">
        {filteredRoutes.map(route => (
          <RouteCard key={route._id} route={route} />
        ))}
      </div>
    </div>
  );
}
```

### Display Seat Map

```typescript
// src/components/DetailedSeatMap.tsx
interface DetailedSeatMapProps {
  route: Route;
}

export function DetailedSeatMap({ route }: DetailedSeatMapProps) {
  const { seatAvailability } = route;
  const allSeats = route.bus.seatLayout.seats;

  return (
    <div className="detailed-seat-map">
      <div className="seat-stats">
        <div className="stat">
          <span className="label">Total Seats:</span>
          <span className="value">{seatAvailability.total}</span>
        </div>
        <div className="stat available">
          <span className="label">Available:</span>
          <span className="value">{seatAvailability.available}</span>
        </div>
        <div className="stat held">
          <span className="label">Held:</span>
          <span className="value">{seatAvailability.held}</span>
        </div>
        <div className="stat booked">
          <span className="label">Booked:</span>
          <span className="value">{seatAvailability.booked}</span>
        </div>
      </div>

      <div className="seats-grid">
        {allSeats.map(seat => (
          <div
            key={seat.seatLabel}
            className={`seat seat-${seat.status}`}
            title={`${seat.seatLabel} - ${seat.status}`}
          >
            {seat.seatLabel}
          </div>
        ))}
      </div>

      {/* Quick Select Available Seats */}
      <div className="quick-select">
        <h4>Quick Select Available Seats:</h4>
        <div className="available-seats-list">
          {seatAvailability.availableSeats.map(seat => (
            <button
              key={seat.seatLabel}
              className="available-seat-btn"
              onClick={() => selectSeat(seat.seatLabel)}
            >
              {seat.seatLabel}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Progress Bar for Seat Availability

```typescript
// src/components/SeatAvailabilityBar.tsx
interface SeatAvailabilityBarProps {
  seatAvailability: {
    total: number;
    available: number;
    booked: number;
    held: number;
  };
}

export function SeatAvailabilityBar({ seatAvailability }: SeatAvailabilityBarProps) {
  const availablePercent = (seatAvailability.available / seatAvailability.total) * 100;
  const bookedPercent = (seatAvailability.booked / seatAvailability.total) * 100;
  const heldPercent = (seatAvailability.held / seatAvailability.total) * 100;

  return (
    <div className="seat-availability-bar">
      <div className="progress-bar">
        <div 
          className="segment available" 
          style={{ width: `${availablePercent}%` }}
          title={`${seatAvailability.available} available`}
        />
        <div 
          className="segment held" 
          style={{ width: `${heldPercent}%` }}
          title={`${seatAvailability.held} held`}
        />
        <div 
          className="segment booked" 
          style={{ width: `${bookedPercent}%` }}
          title={`${seatAvailability.booked} booked`}
        />
      </div>
      
      <div className="stats-text">
        <span>{seatAvailability.available} of {seatAvailability.total} seats available</span>
      </div>
    </div>
  );
}
```

### CSS for Availability Bar

```css
/* Seat Availability Bar */
.seat-availability-bar {
  margin: 15px 0;
}

.progress-bar {
  width: 100%;
  height: 24px;
  display: flex;
  border-radius: 12px;
  overflow: hidden;
  background-color: #f0f0f0;
}

.progress-bar .segment {
  height: 100%;
  transition: width 0.3s ease;
}

.segment.available {
  background-color: #4CAF50;
}

.segment.held {
  background-color: #FFC107;
}

.segment.booked {
  background-color: #9E9E9E;
}

.stats-text {
  margin-top: 8px;
  font-size: 14px;
  color: #666;
  text-align: center;
}

/* Seat Stats Grid */
.seat-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.stat {
  padding: 15px;
  border-radius: 8px;
  background-color: #f5f5f5;
  text-align: center;
}

.stat.available {
  background-color: #e8f5e9;
  border: 2px solid #4CAF50;
}

.stat.held {
  background-color: #fff8e1;
  border: 2px solid #FFC107;
}

.stat.booked {
  background-color: #f5f5f5;
  border: 2px solid #9E9E9E;
}

.stat .label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.stat .value {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #333;
}
```

---

## 🔍 Use Cases

### 1. Show Availability Badge

```typescript
function AvailabilityBadge({ route }: { route: Route }) {
  const { available, total } = route.seatAvailability;
  const percentage = (available / total) * 100;

  let badgeClass = 'high';
  let badgeText = 'Available';

  if (percentage === 0) {
    badgeClass = 'sold-out';
    badgeText = 'Sold Out';
  } else if (percentage <= 20) {
    badgeClass = 'low';
    badgeText = 'Few Seats Left';
  } else if (percentage <= 50) {
    badgeClass = 'medium';
    badgeText = 'Filling Up';
  }

  return (
    <div className={`availability-badge ${badgeClass}`}>
      {badgeText}
    </div>
  );
}
```

### 2. Filter by Minimum Available Seats

```typescript
function RouteList({ minSeats = 1 }: { minSeats?: number }) {
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    const response = await routeService.getRoutes();
    if (response.success) {
      // Filter routes with at least minSeats available
      const filtered = response.data.routes.filter(
        route => route.seatAvailability?.available >= minSeats
      );
      setRoutes(filtered);
    }
  };

  return (
    <div>
      {routes.map(route => (
        <RouteCard key={route._id} route={route} />
      ))}
    </div>
  );
}
```

### 3. Real-time Availability Updates

```typescript
// Combine API data with Socket.IO updates
import { useEffect, useState } from 'react';
import { socketService } from '../services/socketService';

export function RouteWithRealTimeSeats({ routeId }: { routeId: string }) {
  const [route, setRoute] = useState<Route | null>(null);

  useEffect(() => {
    loadRoute();
    
    // Connect socket and join route room
    const socket = socketService.getSocket();
    if (socket) {
      socketService.joinRoute(routeId);

      // Listen for seat status changes
      socket.on('seat:status:changed', (data) => {
        console.log('Seat status changed:', data);
        
        // Update seat availability counts
        setRoute(prevRoute => {
          if (!prevRoute) return null;

          const updatedSeats = prevRoute.bus.seatLayout.seats.map(seat =>
            seat.seatLabel === data.seatLabel
              ? { ...seat, status: data.status, userId: data.userId }
              : seat
          );

          // Recalculate availability
          const available = updatedSeats.filter(s => 
            s.status === 'available' && s.isAvailable
          ).length;
          const booked = updatedSeats.filter(s => 
            s.status === 'booked'
          ).length;
          const held = updatedSeats.filter(s => 
            s.status === 'held' || s.status === 'selected'
          ).length;

          return {
            ...prevRoute,
            bus: {
              ...prevRoute.bus,
              seatLayout: {
                ...prevRoute.bus.seatLayout,
                seats: updatedSeats
              }
            },
            seatAvailability: {
              ...prevRoute.seatAvailability,
              available,
              booked,
              held,
              availableSeats: updatedSeats.filter(s => 
                s.status === 'available' && s.isAvailable
              )
            }
          };
        });
      });
    }

    return () => {
      socketService.leaveRoute(routeId);
    };
  }, [routeId]);

  const loadRoute = async () => {
    const response = await routeService.getRouteById(routeId);
    if (response.success) {
      setRoute(response.data.route);
    }
  };

  if (!route) return <div>Loading...</div>;

  return (
    <div>
      <h2>{route.name}</h2>
      
      <SeatAvailabilityBar seatAvailability={route.seatAvailability} />
      
      <DetailedSeatMap route={route} />
    </div>
  );
}
```

---

## 🎯 Benefits

### 1. **Instant Availability Info**
No need for separate API call to check seat availability.

### 2. **Better UX**
Show users how many seats are left before they click.

### 3. **Smart Filtering**
Filter routes with available seats only.

### 4. **Availability Indicators**
Show "Selling Fast", "Few Seats Left", "Sold Out" badges.

### 5. **Detailed Seat Data**
Get full seat layout with status for advanced UI.

### 6. **Available Seats Array**
Quick access to only available seats for selection.

---

## 📊 Response Comparison

### Before (No Seat Info)
```json
{
  "routes": [
    {
      "name": "Dallas to Houston",
      "bus": {
        "code": "BUS-001",
        "capacity": 45
      }
    }
  ]
}
```

### After (With Seat Info) ✅
```json
{
  "routes": [
    {
      "name": "Dallas to Houston",
      "bus": {
        "code": "BUS-001",
        "capacity": 45,
        "seatLayout": {
          "seats": [/* all seats */]
        }
      },
      "seatAvailability": {
        "total": 45,
        "available": 38,
        "booked": 5,
        "held": 2,
        "availableSeats": [/* available seats */]
      }
    }
  ]
}
```

---

## 🎉 Summary

- ✅ **Seat availability** included in all route endpoints
- ✅ **Counts provided** - total, available, booked, held
- ✅ **Available seats array** - Only seats that can be selected
- ✅ **Full seat layout** - Complete seat map with statuses
- ✅ **Real-time ready** - Combine with Socket.IO for live updates
- ✅ **Better UX** - Show availability before user clicks

Now you can display seat availability directly from route data! 🎫✨
