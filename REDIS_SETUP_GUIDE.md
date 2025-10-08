# Redis Setup Guide

## ⚠️ Current Issue

You're seeing Redis connection timeout errors:
```
❌ Redis sub client error: Error: connect ETIMEDOUT
❌ Redis pub client error: Error: connect ETIMEDOUT
```

This happens when Redis isn't running or can't be reached at the configured address.

## 🔍 Why Redis is Used

Redis is used for:
1. **Socket.IO Adapter** - Enables multi-server Socket.IO support (pub/sub)
2. **Seat Hold Caching** - Fast temporary seat reservations
3. **Session Management** - Distributed session storage

## 🚀 Solutions

### Option 1: Install and Run Redis Locally (Development)

#### Windows

**Using WSL2 (Recommended):**
```bash
# Install WSL2 if not already installed
wsl --install

# In WSL terminal
sudo apt update
sudo apt install redis-server

# Start Redis
sudo service redis-server start

# Verify it's running
redis-cli ping
# Should return: PONG
```

**Using Docker:**
```bash
# Pull and run Redis
docker run -d --name redis -p 6379:6379 redis:latest

# Verify it's running
docker exec -it redis redis-cli ping
# Should return: PONG
```

**Using Chocolatey:**
```bash
# Install Chocolatey first: https://chocolatey.org/install
choco install redis-64

# Start Redis
redis-server
```

#### macOS

```bash
# Using Homebrew
brew install redis

# Start Redis
brew services start redis

# Or run in foreground
redis-server
```

#### Linux

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify
redis-cli ping
```

### Option 2: Use Cloud Redis (Production)

#### Redis Cloud (Free Tier Available)

1. Sign up at https://redis.com/try-free/
2. Create a free database
3. Get your connection URL
4. Update `.env`:

```env
REDIS_URL=redis://default:password@your-host:port
```

#### Upstash (Serverless Redis)

1. Sign up at https://upstash.com/
2. Create a Redis database
3. Copy connection URL
4. Update `.env`:

```env
REDIS_URL=rediss://default:password@your-host:port
```

#### AWS ElastiCache

1. Create ElastiCache Redis cluster
2. Get endpoint URL
3. Update `.env`:

```env
REDIS_URL=redis://your-elasticache-endpoint:6379
```

### Option 3: Disable Redis Adapter (Development Only)

If you don't need multi-server support during development:

**Modify `src/config/socket.ts`:**

```typescript
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
// import { createAdapter } from '@socket.io/redis-adapter';
// import { pubClient, subClient } from './redis';

export const createSocketServer = (httpServer: HttpServer): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Redis adapter for multi-server support (DISABLED FOR DEVELOPMENT)
  // io.adapter(createAdapter(pubClient, subClient));

  return io;
};
```

**⚠️ Note:** This disables multi-server support. Socket.IO will only work on a single server instance.

### Option 4: Conditional Redis Adapter

Use Redis adapter only in production:

**Modify `src/config/socket.ts`:**

```typescript
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { pubClient, subClient } from './redis';
import { ENVIRONMENT } from './environment';

export const createSocketServer = (httpServer: HttpServer): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Only use Redis adapter in production
  if (ENVIRONMENT === 'production') {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Redis adapter enabled for Socket.IO');
  } else {
    console.log('ℹ️  Redis adapter disabled (development mode)');
  }

  return io;
};
```

## 🔧 Environment Variables

Make sure your `.env` file has:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379

# Or for cloud Redis
# REDIS_URL=redis://default:password@your-host:port

# Environment
ENVIRONMENT=development
```

## ✅ Verify Redis Connection

### Test with Redis CLI

```bash
# Connect to Redis
redis-cli

# Test commands
> ping
PONG

> set test "Hello Redis"
OK

> get test
"Hello Redis"

> exit
```

### Test from Node.js

Create a test file:

```javascript
// test-redis.js
const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379
});

redis.on('connect', () => {
  console.log('✅ Redis connected!');
  process.exit(0);
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
  process.exit(1);
});
```

Run it:
```bash
node test-redis.js
```

## 🐛 Troubleshooting

### Error: ETIMEDOUT

**Cause:** Can't reach Redis server

**Solutions:**
- Check if Redis is running: `redis-cli ping`
- Verify port 6379 is not blocked by firewall
- Check REDIS_HOST and REDIS_PORT in `.env`

### Error: ECONNREFUSED

**Cause:** Redis server not running

**Solutions:**
- Start Redis: `redis-server` or `sudo service redis-server start`
- Check if another process is using port 6379

### Error: NOAUTH Authentication required

**Cause:** Redis requires password but none provided

**Solutions:**
- Add password to connection URL:
  ```env
  REDIS_URL=redis://default:your-password@localhost:6379
  ```

### Error: ERR unknown command

**Cause:** Redis version too old

**Solutions:**
- Update Redis to latest version
- Check minimum version requirements

## 📊 Current Status

Based on your logs:
- ✅ Main Redis client: **Connected**
- ❌ Pub client: **Timeout**
- ❌ Sub client: **Timeout**
- ✅ Sub client (retry): **Connected**

**Recommendation:** The pub/sub clients are having intermittent connection issues. This suggests:
1. Redis might be running but slow to respond
2. Network latency issues
3. Redis might be overloaded

## 🎯 Recommended Solution

For **development**, use **Option 4** (conditional Redis adapter):
- Fast development without Redis setup
- Easy to enable for production

For **production**, use **Option 2** (cloud Redis):
- Reliable and managed
- No infrastructure maintenance
- Built-in redundancy

## 📝 Quick Fix (Right Now)

1. **Stop your server** (Ctrl+C)

2. **Comment out Redis adapter:**
   ```typescript
   // src/config/socket.ts
   // io.adapter(createAdapter(pubClient, subClient));
   ```

3. **Restart server:**
   ```bash
   npm run dev
   ```

4. **Verify no errors** - Server should start without Redis timeout errors

5. **Later:** Set up proper Redis using one of the options above

## 🎉 Summary

- Redis timeout errors won't break your app (it still works!)
- For development: Disable Redis adapter or use Docker
- For production: Use cloud Redis (Redis Cloud, Upstash, etc.)
- Socket.IO events will still work without Redis (single server only)

Your booking system is fully functional even with these Redis warnings! 🚀
