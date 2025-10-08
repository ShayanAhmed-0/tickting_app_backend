# Seat Clearing on Disconnect/Leave Route - Test Documentation

## Overview
This document outlines the testing approach for the newly implemented seat clearing functionality when users disconnect or leave routes.

## Implementation Summary

### New Methods Added to SeatBookingService:

1. **`clearAllUserSeats(userId: string)`**
   - Clears all seats held by a specific user across all routes
   - Used when user disconnects completely
   - Returns success status, cleared seats list, and any errors

2. **`clearUserSeatsForRoute(userId: string, routeId: string)`**
   - Clears all seats held by a user for a specific route
   - Used when user leaves a route
   - Returns success status, cleared seats list, and any errors

### Updated Socket Handlers:

1. **`handleDisconnect()`**
   - Now calls `clearAllUserSeats()` to release all user's held seats
   - Broadcasts seat status changes to affected route rooms
   - Logs clearing results and any errors

2. **`handleLeaveRoute()`**
   - Now calls `clearUserSeatsForRoute()` to release user's seats for the specific route
   - Broadcasts seat status changes to the route room
   - Logs clearing results and any errors

## Testing Scenarios

### Test 1: User Disconnect
1. User connects and joins a route
2. User holds one or more seats
3. User disconnects (close browser, network loss, etc.)
4. **Expected Result**: All held seats should be released and marked as available
5. **Verification**: Other users should see seat status change events

### Test 2: User Leaves Route
1. User connects and joins a route
2. User holds one or more seats in that route
3. User calls `leave:route` event
4. **Expected Result**: Only seats for that specific route should be released
5. **Verification**: Other users in the route should see seat status change events

### Test 3: Multiple Routes
1. User connects and joins multiple routes (if supported)
2. User holds seats in different routes
3. User leaves one route
4. **Expected Result**: Only seats for the left route should be released
5. **Verification**: Seats in other routes should remain held

### Test 4: Error Handling
1. Test with invalid user IDs
2. Test with invalid route IDs
3. Test with network issues during clearing
4. **Expected Result**: Errors should be logged but not crash the system

## Socket Events to Monitor

### Client-Side Events to Listen For:
```javascript
// Seat status changes when user disconnects/leaves
socket.on('seat:status:changed', (data) => {
  console.log('Seat status changed:', data);
  // data should contain: routeId, seatLabel, status: 'available', userId
});

// User left events
socket.on('user:left', (data) => {
  console.log('User left:', data);
  // data should contain: routeId, userCount, userId
});
```

### Server-Side Logs to Monitor:
```
✅ Cleared seat {seatLabel} for user {userId} in route {routeId}
🧹 Cleared {count} seats for disconnected user {userId}
🧹 Cleared {count} seats for user {userId} in route {routeId}
❌ Errors clearing seats for user {userId}: [error list]
```

## Manual Testing Steps

### Step 1: Basic Disconnect Test
1. Start the server
2. Connect a client and join a route
3. Hold a seat
4. Disconnect the client (close browser tab)
5. Check server logs for clearing messages
6. Connect another client to verify seat is available

### Step 2: Leave Route Test
1. Start the server
2. Connect a client and join a route
3. Hold a seat
4. Send `leave:route` event with acknowledgment
5. Check server logs for clearing messages
6. Verify seat is available for other users

### Step 3: Multiple Seats Test
1. Start the server
2. Connect a client and join a route
3. Hold multiple seats
4. Disconnect the client
5. Check that all seats are cleared
6. Verify all seats show as available

## Performance Considerations

- The clearing operations are asynchronous and won't block other socket operations
- Redis operations are batched where possible for efficiency
- Error handling ensures partial failures don't crash the system
- Logging provides visibility into clearing operations

## Future Enhancements

- Add metrics for tracking seat clearing frequency
- Implement seat clearing timeouts for better UX
- Add admin endpoints to manually clear user seats
- Consider implementing seat clearing notifications to affected users
