# Correct Socket.io Usage Examples

## 🐛 **The Problem:**
You were getting `holds:get event called without acknowledgment function` because your client was sending data as the first parameter instead of the acknowledgment function.

## ✅ **The Solution:**
The server now handles both cases, but here's the **correct way** to call socket events:

## 📡 **Correct Client Usage:**

### **1. Events that DON'T need data (only acknowledgment):**

```typescript
// ✅ CORRECT - Only acknowledgment function
socket.emit('holds:get', (response) => {
  if (response.success) {
    console.log('Holds:', response.data.holds);
  } else {
    console.error('Error:', response.error);
  }
});

// ✅ CORRECT - Ping
socket.emit('ping', (response) => {
  console.log('Pong:', response.message);
});

// ✅ CORRECT - Get info
socket.emit('info:get', (response) => {
  console.log('Info:', response.data);
});
```

### **2. Events that NEED data (data + acknowledgment):**

```typescript
// ✅ CORRECT - Join route
socket.emit('join:route', { routeId: 'route-123' }, (response) => {
  if (response.success) {
    console.log('Joined route:', response.data.routeId);
  }
});

// ✅ CORRECT - Get seats
socket.emit('seats:get', { routeId: 'route-123' }, (response) => {
  if (response.success) {
    console.log('Seats:', response.data.seats);
  }
});

// ✅ CORRECT - Hold seat
socket.emit('seat:hold', { routeId: 'route-123', seatLabel: '1A' }, (response) => {
  if (response.success) {
    console.log('Seat held:', response.data.seatLabel);
  }
});

// ✅ CORRECT - Release seat
socket.emit('seat:release', { routeId: 'route-123', seatLabel: '1A' }, (response) => {
  if (response.success) {
    console.log('Seat released:', response.data.seatLabel);
  }
});

// ✅ CORRECT - Confirm booking
socket.emit('booking:confirm', {
  routeId: 'route-123',
  seatLabels: ['1A', '1B'],
  passengers: [
    { name: 'John Doe', seatLabel: '1A' },
    { name: 'Jane Doe', seatLabel: '1B' }
  ],
  paymentInfo: { method: 'card' }
}, (response) => {
  if (response.success) {
    console.log('Booking confirmed:', response.data.bookingId);
  }
});
```

## ❌ **What Was Causing the Error:**

```typescript
// ❌ WRONG - This sends {routeId: ''} as the first parameter
socket.emit('holds:get', { routeId: '' }, (response) => {
  // This was being interpreted as:
  // data = { routeId: '' }
  // ack = (response) => { ... }
  // But holds:get doesn't expect data!
});

// ❌ WRONG - This sends data where only ack is expected
socket.emit('holds:get', { someData: 'value' });
```

## 🔧 **Server-Side Fix Applied:**

The server now handles both cases gracefully:

```typescript
// Server now accepts both patterns:
socket.on('holds:get', (data: any, ack?: Function) => {
  if (typeof data === 'function' && !ack) {
    // Client sent only acknowledgment function
    this.handleGetHolds(socket, data);
  } else if (typeof ack === 'function') {
    // Client sent data and acknowledgment function
    this.handleGetHolds(socket, ack);
  } else {
    console.error('holds:get event called without acknowledgment function');
    return;
  }
});
```

## 🎯 **Key Points:**

1. **Events without data**: Only send the acknowledgment function
2. **Events with data**: Send data first, then acknowledgment function
3. **Always provide acknowledgment**: All events expect a callback function
4. **Check response.success**: Always check if the operation was successful

## 🧪 **Test Your Client:**

```typescript
// Test holds:get (no data needed)
socket.emit('holds:get', (response) => {
  console.log('Response:', response);
});

// Test ping (no data needed)
socket.emit('ping', (response) => {
  console.log('Pong:', response);
});

// Test join:route (data needed)
socket.emit('join:route', { routeId: 'test-route' }, (response) => {
  console.log('Joined:', response);
});
```

The server should now handle your client calls correctly! 🎉

