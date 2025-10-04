// ============================================
// Complete Socket.io Implementation for Bus Booking System
// ============================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Redis clients
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

const pubClient = new Redis();
const subClient = new Redis();

// Redis Adapter for multi-server support (optional but recommended)
const { createAdapter } = require('@socket.io/redis-adapter');
io.adapter(createAdapter(pubClient, subClient));

// ============================================
// Configuration
// ============================================
const SEAT_HOLD_DURATION = 10 * 60 * 1000; // 10 minutes
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ============================================
// Helper Functions
// ============================================

// Generate Redis keys
const keys = {
  seatHold: (scheduleId, seatId) => `hold:${scheduleId}:${seatId}`,
  scheduleSeats: (scheduleId) => `seats:${scheduleId}`,
  userHolds: (userId) => `user:holds:${userId}`,
  scheduleLock: (scheduleId, seatId) => `lock:${scheduleId}:${seatId}`
};

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Get seat availability from Redis/Database
async function getSeatAvailability(scheduleId) {
  // Check Redis cache first
  const cached = await redis.hgetall(keys.scheduleSeats(scheduleId));
  
  if (Object.keys(cached).length > 0) {
    return cached;
  }

  // If not in cache, fetch from database
  // This is a placeholder - replace with actual DB query
  const seats = await fetchSeatsFromDatabase(scheduleId);
  
  // Cache for 5 minutes
  const pipeline = redis.pipeline();
  for (const [seatId, status] of Object.entries(seats)) {
    pipeline.hset(keys.scheduleSeats(scheduleId), seatId, status);
  }
  pipeline.expire(keys.scheduleSeats(scheduleId), 300);
  await pipeline.exec();
  
  return seats;
}

// Hold a seat (with distributed lock)
async function holdSeat(scheduleId, seatId, userId) {
  const lockKey = keys.scheduleLock(scheduleId, seatId);
  const holdKey = keys.seatHold(scheduleId, seatId);
  
  // Try to acquire lock using SET NX (atomic operation)
  const locked = await redis.set(lockKey, '1', 'NX', 'EX', 2);
  
  if (!locked) {
    return { success: false, reason: 'seat_locked' };
  }
  
  try {
    // Check if seat is already held or booked
    const existingHold = await redis.get(holdKey);
    
    if (existingHold) {
      const holdData = JSON.parse(existingHold);
      
      // Check if hold is expired
      if (Date.now() < holdData.expiresAt) {
        // Seat is still held by someone
        if (holdData.userId !== userId) {
          return { success: false, reason: 'seat_held' };
        }
        // Same user, extend the hold
        return { success: true, extended: true };
      }
    }
    
    // Check if seat is permanently booked (check database)
    const isBooked = await isSeatBooked(scheduleId, seatId);
    if (isBooked) {
      return { success: false, reason: 'seat_booked' };
    }
    
    // Create hold
    const holdData = {
      userId,
      seatId,
      scheduleId,
      heldAt: Date.now(),
      expiresAt: Date.now() + SEAT_HOLD_DURATION
    };
    
    await redis.setex(
      holdKey,
      Math.floor(SEAT_HOLD_DURATION / 1000),
      JSON.stringify(holdData)
    );
    
    // Track user's holds
    await redis.sadd(keys.userHolds(userId), `${scheduleId}:${seatId}`);
    await redis.expire(keys.userHolds(userId), Math.floor(SEAT_HOLD_DURATION / 1000));
    
    // Update seat status in cache
    await redis.hset(keys.scheduleSeats(scheduleId), seatId, 'held');
    
    return { success: true, expiresAt: holdData.expiresAt };
    
  } finally {
    // Release lock
    await redis.del(lockKey);
  }
}

// Release a seat hold
async function releaseSeat(scheduleId, seatId, userId) {
  const holdKey = keys.seatHold(scheduleId, seatId);
  const existingHold = await redis.get(holdKey);
  
  if (!existingHold) {
    return { success: false, reason: 'no_hold' };
  }
  
  const holdData = JSON.parse(existingHold);
  
  // Verify the user owns this hold
  if (holdData.userId !== userId) {
    return { success: false, reason: 'not_owner' };
  }
  
  // Delete hold
  await redis.del(holdKey);
  await redis.srem(keys.userHolds(userId), `${scheduleId}:${seatId}`);
  
  // Update seat status
  await redis.hset(keys.scheduleSeats(scheduleId), seatId, 'available');
  
  return { success: true };
}

// Placeholder functions - implement with your database
async function fetchSeatsFromDatabase(scheduleId) {
  // Query your database here
  // Return format: { 'seat_1': 'available', 'seat_2': 'booked', ... }
  return {};
}

async function isSeatBooked(scheduleId, seatId) {
  // Check database if seat is permanently booked
  return false;
}

async function confirmBookingInDatabase(bookingData) {
  // Save booking to database
  // Return booking ID
  return 'booking_' + Date.now();
}

// ============================================
// Socket.io Middleware
// ============================================

// Authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  const user = verifyToken(token);
  
  if (!user) {
    return next(new Error('Invalid token'));
  }
  
  socket.data.userId = user.id;
  socket.data.userEmail = user.email;
  socket.data.heldSeats = new Set();
  
  next();
});

// ============================================
// Socket.io Connection Handler
// ============================================

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  console.log(`User connected: ${userId} (Socket: ${socket.id})`);
  
  // ----------------------------------------
  // Join Schedule Room
  // ----------------------------------------
  socket.on('join:schedule', async (data) => {
    try {
      const { scheduleId } = data;
      
      if (!scheduleId) {
        socket.emit('error', { message: 'Schedule ID required' });
        return;
      }
      
      // Leave any previous schedule rooms
      const rooms = Array.from(socket.rooms);
      rooms.forEach(room => {
        if (room.startsWith('schedule:')) {
          socket.leave(room);
        }
      });
      
      // Join new schedule room
      socket.join(`schedule:${scheduleId}`);
      socket.data.currentSchedule = scheduleId;
      
      console.log(`User ${userId} joined schedule ${scheduleId}`);
      
      // Send current seat availability
      const seats = await getSeatAvailability(scheduleId);
      socket.emit('seats:availability', { scheduleId, seats });
      
      // Notify others that a user joined (optional)
      socket.to(`schedule:${scheduleId}`).emit('user:joined', {
        scheduleId,
        userCount: io.sockets.adapter.rooms.get(`schedule:${scheduleId}`)?.size || 0
      });
      
    } catch (error) {
      console.error('Error joining schedule:', error);
      socket.emit('error', { message: 'Failed to join schedule' });
    }
  });
  
  // ----------------------------------------
  // Leave Schedule Room
  // ----------------------------------------
  socket.on('leave:schedule', async (data) => {
    try {
      const { scheduleId } = data;
      
      if (!scheduleId) return;
      
      socket.leave(`schedule:${scheduleId}`);
      socket.data.currentSchedule = null;
      
      console.log(`User ${userId} left schedule ${scheduleId}`);
      
      // Notify others
      socket.to(`schedule:${scheduleId}`).emit('user:left', {
        scheduleId,
        userCount: io.sockets.adapter.rooms.get(`schedule:${scheduleId}`)?.size || 0
      });
      
    } catch (error) {
      console.error('Error leaving schedule:', error);
    }
  });
  
  // ----------------------------------------
  // Hold Seat
  // ----------------------------------------
  socket.on('seat:hold', async (data) => {
    try {
      const { scheduleId, seatId } = data;
      
      if (!scheduleId || !seatId) {
        socket.emit('seat:hold:failed', { 
          seatId, 
          reason: 'invalid_data' 
        });
        return;
      }
      
      // Attempt to hold the seat
      const result = await holdSeat(scheduleId, seatId, userId);
      
      if (result.success) {
        // Track held seat
        socket.data.heldSeats.add(`${scheduleId}:${seatId}`);
        
        // Notify user
        socket.emit('seat:hold:success', {
          seatId,
          scheduleId,
          expiresAt: result.expiresAt,
          extended: result.extended || false
        });
        
        // Broadcast to all users in the schedule room
        io.to(`schedule:${scheduleId}`).emit('seat:status:changed', {
          seatId,
          status: 'held',
          expiresAt: result.expiresAt
        });
        
        // Set up auto-release timer
        const timeUntilExpiry = result.expiresAt - Date.now();
        setTimeout(async () => {
          const released = await releaseSeat(scheduleId, seatId, userId);
          if (released.success) {
            socket.data.heldSeats.delete(`${scheduleId}:${seatId}`);
            io.to(`schedule:${scheduleId}`).emit('seat:status:changed', {
              seatId,
              status: 'available'
            });
            socket.emit('seat:expired', { seatId, scheduleId });
          }
        }, timeUntilExpiry);
        
      } else {
        socket.emit('seat:hold:failed', {
          seatId,
          scheduleId,
          reason: result.reason
        });
      }
      
    } catch (error) {
      console.error('Error holding seat:', error);
      socket.emit('seat:hold:failed', { 
        seatId: data.seatId,
        reason: 'server_error' 
      });
    }
  });
  
  // ----------------------------------------
  // Release Seat
  // ----------------------------------------
  socket.on('seat:release', async (data) => {
    try {
      const { scheduleId, seatId } = data;
      
      if (!scheduleId || !seatId) return;
      
      const result = await releaseSeat(scheduleId, seatId, userId);
      
      if (result.success) {
        socket.data.heldSeats.delete(`${scheduleId}:${seatId}`);
        
        socket.emit('seat:release:success', { seatId, scheduleId });
        
        // Broadcast to all users
        io.to(`schedule:${scheduleId}`).emit('seat:status:changed', {
          seatId,
          status: 'available'
        });
      } else {
        socket.emit('seat:release:failed', {
          seatId,
          scheduleId,
          reason: result.reason
        });
      }
      
    } catch (error) {
      console.error('Error releasing seat:', error);
    }
  });
  
  // ----------------------------------------
  // Confirm Booking
  // ----------------------------------------
  socket.on('booking:confirm', async (data) => {
    try {
      const { scheduleId, seatIds, paymentInfo } = data;
      
      if (!scheduleId || !seatIds || !Array.isArray(seatIds)) {
        socket.emit('booking:failed', { reason: 'invalid_data' });
        return;
      }
      
      // Verify all seats are held by this user
      const verifications = await Promise.all(
        seatIds.map(async (seatId) => {
          const holdKey = keys.seatHold(scheduleId, seatId);
          const holdData = await redis.get(holdKey);
          
          if (!holdData) return false;
          
          const hold = JSON.parse(holdData);
          return hold.userId === userId && Date.now() < hold.expiresAt;
        })
      );
      
      if (verifications.includes(false)) {
        socket.emit('booking:failed', { reason: 'invalid_holds' });
        return;
      }
      
      // Process payment (integrate with payment gateway)
      // const paymentResult = await processPayment(paymentInfo);
      
      // Save booking to database
      const bookingId = await confirmBookingInDatabase({
        userId,
        scheduleId,
        seatIds,
        // paymentId: paymentResult.id
      });
      
      // Delete holds and update seats as booked
      const pipeline = redis.pipeline();
      for (const seatId of seatIds) {
        pipeline.del(keys.seatHold(scheduleId, seatId));
        pipeline.hset(keys.scheduleSeats(scheduleId), seatId, 'booked');
        socket.data.heldSeats.delete(`${scheduleId}:${seatId}`);
      }
      await pipeline.exec();
      
      // Notify user
      socket.emit('booking:success', {
        bookingId,
        scheduleId,
        seatIds
      });
      
      // Broadcast to all users in the room
      io.to(`schedule:${scheduleId}`).emit('seats:booked', {
        seatIds,
        scheduleId
      });
      
      console.log(`Booking confirmed: ${bookingId} for user ${userId}`);
      
    } catch (error) {
      console.error('Error confirming booking:', error);
      socket.emit('booking:failed', { reason: 'server_error' });
    }
  });
  
  // ----------------------------------------
  // Get Current Holds
  // ----------------------------------------
  socket.on('holds:get', async () => {
    try {
      const holds = await redis.smembers(keys.userHolds(userId));
      const holdDetails = [];
      
      for (const hold of holds) {
        const [scheduleId, seatId] = hold.split(':');
        const holdKey = keys.seatHold(scheduleId, seatId);
        const holdData = await redis.get(holdKey);
        
        if (holdData) {
          holdDetails.push(JSON.parse(holdData));
        }
      }
      
      socket.emit('holds:list', holdDetails);
      
    } catch (error) {
      console.error('Error getting holds:', error);
    }
  });
  
  // ----------------------------------------
  // Disconnect Handler
  // ----------------------------------------
  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${userId} (Socket: ${socket.id})`);
    
    // Release all held seats
    const heldSeats = Array.from(socket.data.heldSeats);
    
    for (const seat of heldSeats) {
      const [scheduleId, seatId] = seat.split(':');
      
      const result = await releaseSeat(scheduleId, seatId, userId);
      
      if (result.success) {
        io.to(`schedule:${scheduleId}`).emit('seat:status:changed', {
          seatId,
          status: 'available'
        });
      }
    }
    
    // Notify schedule rooms
    if (socket.data.currentSchedule) {
      socket.to(`schedule:${socket.data.currentSchedule}`).emit('user:left', {
        scheduleId: socket.data.currentSchedule,
        userCount: io.sockets.adapter.rooms.get(`schedule:${socket.data.currentSchedule}`)?.size || 0
      });
    }
  });
  
  // ----------------------------------------
  // Error Handler
  // ----------------------------------------
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// ============================================
// REST API Endpoints (for initial data)
// ============================================

app.use(express.json());

// Get seat availability (REST endpoint)
app.get('/api/schedules/:scheduleId/seats', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const seats = await getSeatAvailability(scheduleId);
    res.json({ scheduleId, seats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch seats' });
  }
});

// ============================================
// Server Start
// ============================================

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
});

// ============================================
// Graceful Shutdown
// ============================================

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    redis.disconnect();
    pubClient.disconnect();
    subClient.disconnect();
    process.exit(0);
  });
});

// ============================================
// Export for testing
// ============================================

module.exports = { app, io, server };