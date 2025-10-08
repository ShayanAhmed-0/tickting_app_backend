# Socket.IO Seat Booking Events

## 📡 Real-Time Seat Status Updates

When seats are booked (either via cash or Stripe payment), all users who have joined the route room will receive real-time updates about seat status changes.

## 🔄 Event Flow

```
User Books Seat (Cash or Stripe)
         ↓
Backend Updates Seat Status to BOOKED
         ↓
Backend Emits 'seat:status:changed' Event
         ↓
Socket.IO broadcasts to route room: `route:${routeId}`
         ↓
All connected users in that route receive update
         ↓
Frontend updates seat map UI automatically
```

## 📤 Emitted Event

### Event Name: `seat:status:changed`

**Emitted When:**
- Seat is booked with cash payment
- Seat is booked with Stripe payment
- Seat status changes to `BOOKED`

**Emitted To:**
- All users in the route room: `route:${routeId}`

**Event Data Structure:**
```typescript
{
  routeId: string;      // The route ID
  seatLabel: string;    // Seat identifier (e.g., "A1", "B2")
  status: string;       // New status: "BOOKED"
  userId: string;       // User who booked the seat
  busId: string;        // Bus ID
}
```

**Example:**
```json
{
  "routeId": "route_123abc",
  "seatLabel": "A1",
  "status": "booked",
  "userId": "user_456def",
  "busId": "bus_789ghi"
}
```

## 💻 Frontend Implementation

### 1. Join Route Room

Before receiving seat updates, users must join the route room:

```javascript
import io from 'socket.io-client';

// Connect to server
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Join route room
socket.emit('join:route', { routeId: 'route_123abc' }, (response) => {
  if (response.success) {
    console.log('✅ Joined route room');
  }
});
```

### 2. Listen for Seat Status Changes

```javascript
// Listen for real-time seat status updates
socket.on('seat:status:changed', (data) => {
  console.log('Seat status changed:', data);
  
  const { routeId, seatLabel, status, userId, busId } = data;
  
  // Update your UI
  updateSeatInUI(seatLabel, status);
  
  // Show notification
  if (status === 'booked') {
    showNotification(`Seat ${seatLabel} has been booked`);
  }
});
```

### 3. Complete React Example

```typescript
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

interface SeatStatus {
  seatLabel: string;
  status: 'available' | 'held' | 'selected' | 'booked';
  userId?: string;
}

function SeatMap({ routeId }: { routeId: string }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [seats, setSeats] = useState<SeatStatus[]>([]);

  useEffect(() => {
    // Connect to socket
    const newSocket = io('http://localhost:3000', {
      auth: { token: localStorage.getItem('token') }
    });

    // Join route room
    newSocket.emit('join:route', { routeId }, (response: any) => {
      if (response.success) {
        console.log('Joined route room');
      }
    });

    // Listen for seat status changes
    newSocket.on('seat:status:changed', (data: {
      routeId: string;
      seatLabel: string;
      status: string;
      userId: string;
      busId: string;
    }) => {
      console.log('Seat status changed:', data);
      
      // Update seat in state
      setSeats(prevSeats => 
        prevSeats.map(seat => 
          seat.seatLabel === data.seatLabel
            ? { ...seat, status: data.status as any, userId: data.userId }
            : seat
        )
      );

      // Show toast notification
      if (data.status === 'booked') {
        toast.info(`Seat ${data.seatLabel} has been booked`);
      }
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      newSocket.emit('leave:route', { routeId });
      newSocket.close();
    };
  }, [routeId]);

  return (
    <div className="seat-map">
      {seats.map(seat => (
        <div
          key={seat.seatLabel}
          className={`seat seat-${seat.status}`}
        >
          {seat.seatLabel}
        </div>
      ))}
    </div>
  );
}
```

### 4. Vue.js Example

```vue
<template>
  <div class="seat-map">
    <div
      v-for="seat in seats"
      :key="seat.seatLabel"
      :class="['seat', `seat-${seat.status}`]"
    >
      {{ seat.seatLabel }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import io from 'socket.io-client';

const props = defineProps(['routeId']);
const seats = ref([]);
let socket = null;

onMounted(() => {
  // Connect to socket
  socket = io('http://localhost:3000', {
    auth: { token: localStorage.getItem('token') }
  });

  // Join route room
  socket.emit('join:route', { routeId: props.routeId }, (response) => {
    if (response.success) {
      console.log('Joined route room');
    }
  });

  // Listen for seat status changes
  socket.on('seat:status:changed', (data) => {
    console.log('Seat status changed:', data);
    
    // Update seat in array
    const seatIndex = seats.value.findIndex(
      s => s.seatLabel === data.seatLabel
    );
    
    if (seatIndex !== -1) {
      seats.value[seatIndex] = {
        ...seats.value[seatIndex],
        status: data.status,
        userId: data.userId
      };
    }
  });
});

onUnmounted(() => {
  if (socket) {
    socket.emit('leave:route', { routeId: props.routeId });
    socket.close();
  }
});
</script>
```

### 5. Vanilla JavaScript Example

```javascript
// Initialize socket connection
const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('token')
  }
});

// Join route room
socket.emit('join:route', { routeId: 'route_123abc' }, (response) => {
  if (response.success) {
    console.log('Joined route room');
  }
});

// Listen for seat status changes
socket.on('seat:status:changed', (data) => {
  const { seatLabel, status, userId } = data;
  
  // Find seat element
  const seatElement = document.querySelector(`[data-seat="${seatLabel}"]`);
  
  if (seatElement) {
    // Remove old status classes
    seatElement.classList.remove('available', 'held', 'selected', 'booked');
    
    // Add new status class
    seatElement.classList.add(status);
    
    // Update data attribute
    seatElement.setAttribute('data-status', status);
    seatElement.setAttribute('data-user-id', userId);
    
    // Disable if booked
    if (status === 'booked') {
      seatElement.setAttribute('disabled', 'true');
    }
  }
  
  // Show notification
  showNotification(`Seat ${seatLabel} is now ${status}`);
});

// Leave route room when navigating away
window.addEventListener('beforeunload', () => {
  socket.emit('leave:route', { routeId: 'route_123abc' });
});
```

## 🎨 CSS for Seat States

```css
.seat {
  width: 40px;
  height: 40px;
  margin: 5px;
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.seat-available {
  background-color: #4CAF50;
  color: white;
}

.seat-held {
  background-color: #FFC107;
  color: black;
}

.seat-selected {
  background-color: #2196F3;
  color: white;
}

.seat-booked {
  background-color: #9E9E9E;
  color: white;
  cursor: not-allowed;
  opacity: 0.6;
}

/* Animation for status change */
@keyframes statusChange {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.seat.status-changed {
  animation: statusChange 0.5s ease;
}
```

## 📊 Event Triggers

| Action | Controller | Event Emitted | Room |
|--------|-----------|---------------|------|
| Cash Payment | `booking.controller.ts` | `seat:status:changed` | `route:${routeId}` |
| Stripe Payment | `stripe-payment.controller.ts` | `seat:status:changed` | `route:${routeId}` |
| Stripe Webhook | `stripe-webhook.controller.ts` | `seat:status:changed` | `route:${routeId}` |

## 🔍 Debugging

### Check if user is in route room

```javascript
// Server-side (in socket handler)
const rooms = io.sockets.adapter.rooms;
const routeRoom = rooms.get(`route:${routeId}`);
console.log(`Users in route room:`, routeRoom?.size || 0);
```

### Check if event is being emitted

```javascript
// Server-side (in controller)
console.log(`Emitting seat:status:changed to route:${routeId}`, {
  seatLabel,
  status: 'booked'
});

io.to(`route:${routeId}`).emit('seat:status:changed', data);
```

### Check if client receives event

```javascript
// Client-side
socket.on('seat:status:changed', (data) => {
  console.log('✅ Received seat status change:', data);
});

// Check all events
socket.onAny((eventName, ...args) => {
  console.log(`Event received: ${eventName}`, args);
});
```

## 🚀 Testing

### Test with multiple browser tabs

1. Open multiple browser tabs
2. Join the same route in all tabs
3. Book a seat in one tab
4. Verify all other tabs receive the update

### Test with Socket.IO client

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:3000', {
  auth: { token: 'your-token' }
});

socket.emit('join:route', { routeId: 'route_123' }, (response) => {
  console.log('Join response:', response);
});

socket.on('seat:status:changed', (data) => {
  console.log('Seat changed:', data);
});
```

## 📝 Best Practices

1. **Always join route room before booking**
   ```javascript
   socket.emit('join:route', { routeId }, () => {
     // Now safe to book seats
   });
   ```

2. **Leave room when navigating away**
   ```javascript
   useEffect(() => {
     return () => {
       socket.emit('leave:route', { routeId });
     };
   }, []);
   ```

3. **Handle reconnection**
   ```javascript
   socket.on('connect', () => {
     socket.emit('join:route', { routeId });
   });
   ```

4. **Update UI optimistically**
   ```javascript
   // Update UI immediately
   updateSeatLocally(seatLabel, 'booked');
   
   // Then listen for confirmation
   socket.on('seat:status:changed', (data) => {
     confirmSeatUpdate(data);
   });
   ```

## 🎉 Summary

- ✅ Real-time seat updates for all users
- ✅ Works with both cash and Stripe payments
- ✅ Broadcasts to all users in route room
- ✅ Includes seat label, status, user ID, and bus ID
- ✅ Easy to integrate with any frontend framework
- ✅ Automatic UI updates across all connected clients

Now all users will see seat status changes in real-time! 🚀
