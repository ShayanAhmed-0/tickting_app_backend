# Seat Clearing Fix - Leave Route Issue

## Problem
When users left a route, seats were not being cleared properly, especially for departure date-specific bookings. The issue occurred because:

1. **Format Mismatch**: Seat holds with departure dates were stored in Redis as `routeId:seatLabel:departureDate` (3 parts), but the clearing logic only expected `routeId:seatLabel` (2 parts).

2. **Missing Date Parameter**: The `leave:route` socket event didn't accept a departure date parameter, so date-specific rooms weren't being handled properly.

3. **Incomplete Room Management**: When leaving a route with a specific date, the socket wasn't leaving both the general route room and the date-specific room.

## Solution

### 1. Updated `clearUserSeatsForRoute()` in `seatBooking.service.ts`
- Now properly parses holds with 3 parts: `routeId:seatLabel:departureDate`
- Extracts the optional departure date from the hold key
- Passes the departure date to `releaseSeat()` when available
- Handles both legacy (2-part) and modern (3-part) hold formats
- Added fallback cleanup to remove Redis entries even if seat release fails

### 2. Updated `clearAllUserSeats()` in `seatBooking.service.ts`
- Same improvements as `clearUserSeatsForRoute()`
- Properly handles date-specific holds when clearing all seats on disconnect
- Added orphaned hold cleanup for routes that no longer exist

### 3. Updated `leave:route` Event Handler in `socket.handlers.ts`
- Now accepts optional `date` parameter: `{ routeId: string; date?: string }`
- Backwards compatible - still works without date parameter

### 4. Updated `handleLeaveRoute()` in `socket.handlers.ts`
- Leaves both general route room (`route:${routeId}`) and date-specific room (`route:${routeId}:${date}`)
- Broadcasts seat status changes to both general and date-specific rooms
- Properly extracts departure date from cleared seat holds
- Sends `user:left` events to both rooms

## Key Changes

### Before:
```typescript
// Only parsed 2 parts
const [holdRouteId, seatLabel] = hold.split(':');

// Didn't pass departure date
await this.releaseSeat(busId, routeId, seatLabel, userId);

// Only left general room
socket.leave(`route:${routeId}`);
```

### After:
```typescript
// Parses all parts including optional date
const holdParts = hold.split(':');
const holdRouteId = holdParts[0];
const seatLabel = holdParts[1];
const departureDate = holdParts[2]; // Optional

// Passes departure date if available
const departureDateObj = departureDate ? new Date(departureDate) : undefined;
await this.releaseSeat(busId, routeId, seatLabel, userId, departureDateObj);

// Leaves both rooms
socket.leave(`route:${routeId}`);
if (date) {
  socket.leave(`route:${routeId}:${date}`);
}
```

## Benefits

1. **Proper Cleanup**: Seats are now properly cleared when users leave a route, regardless of whether they're using date-specific or legacy bookings
2. **Backwards Compatible**: Still works with legacy holds that don't have departure dates
3. **Better Room Management**: Properly manages both general and date-specific socket rooms
4. **Robust Error Handling**: Falls back to cleaning up Redis even if database operations fail
5. **Accurate Real-time Updates**: All connected clients receive proper seat status updates in their respective rooms

## Testing Recommendations

1. Test leaving a route with date-specific seats held
2. Test leaving a route with legacy (no date) seats held
3. Test leaving a route with mixed hold types
4. Verify seat status broadcasts reach all connected clients
5. Check that seats become available immediately after leaving
6. Test disconnect scenario to ensure seats are cleared properly

## Client-Side Update (Optional)

To take full advantage of the fix, clients can optionally pass the date when leaving:

```javascript
// Without date (legacy, still works)
socket.emit('leave:route', { routeId: '...' }, (response) => {
  console.log(response);
});

// With date (recommended for date-specific bookings)
socket.emit('leave:route', { routeId: '...', date: '2025-10-27' }, (response) => {
  console.log(response);
});
```

Both formats are supported for backwards compatibility.

