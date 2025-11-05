# BullMQ Quick Start Guide

## 🚀 Quick Setup

### 1. Install Redis

```bash
# Using Docker (Recommended)
docker run -d --name redis -p 6379:6379 redis:latest

# Verify Redis is running
docker ps | grep redis
```

### 2. Configure Environment

Add to `.env`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Start Server

```bash
npm run dev
```

Expected output:
```
✅ Firebase Admin SDK initialized successfully
🚀 Server running on port 5000
📡 Socket.io ready for connections
🔔 Notification system initialized
🚀 Initializing BullMQ workers...
✅ BullMQ workers initialized
✅ BullMQ repeatable jobs initialized successfully
✅ BullMQ system initialized successfully
```

## 📊 Monitor Queues

### Check Queue Statistics
```bash
curl http://localhost:5000/api/admin/queues/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### View Active Jobs
```bash
curl "http://localhost:5000/api/admin/queues/trip-reminders/jobs?status=active" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### View Failed Jobs
```bash
curl "http://localhost:5000/api/admin/queues/notifications/jobs?status=failed&limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 🔧 Common Operations

### Pause Queue
```bash
curl -X POST http://localhost:5000/api/admin/queues/trip-reminders/pause \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Resume Queue
```bash
curl -X POST http://localhost:5000/api/admin/queues/trip-reminders/resume \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Retry Failed Job
```bash
curl -X POST http://localhost:5000/api/admin/queues/notifications/jobs/123/retry \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Clean Old Jobs
```bash
curl -X DELETE http://localhost:5000/api/admin/queues/notifications/clean \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "grace": 3600000,
    "status": "completed",
    "limit": 1000
  }'
```

## 📋 Queue Overview

| Queue | Schedule | Purpose |
|-------|----------|---------|
| `trip-reminders` | Every 5 minutes | Send 24h, 2h, 30m trip reminders |
| `bus-capacity` | Every hour | Alert admins when bus ≥90% full |
| `notifications` | Every minute | Process scheduled notifications |

## 🐛 Troubleshooting

### Redis Not Connected

**Check Redis:**
```bash
redis-cli ping
# Should return: PONG
```

**Fix:**
```bash
# Restart Redis
docker restart redis

# Or start new Redis container
docker run -d --name redis -p 6379:6379 redis:latest
```

### Jobs Not Processing

**Check queue status:**
```bash
curl http://localhost:5000/api/admin/queues/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**If queue is paused, resume it:**
```bash
curl -X POST http://localhost:5000/api/admin/queues/trip-reminders/resume \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Too Many Failed Jobs

**View failures:**
```bash
curl "http://localhost:5000/api/admin/queues/notifications/jobs?status=failed&limit=50" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Clean failed jobs:**
```bash
curl -X DELETE http://localhost:5000/api/admin/queues/notifications/clean \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"grace": 0, "status": "failed", "limit": 1000}'
```

## 🎯 Key Features

- ✅ **Persistent Jobs**: Survive server restarts
- ✅ **Auto Retry**: 3 attempts with exponential backoff
- ✅ **Monitoring**: Real-time statistics
- ✅ **Scalable**: Run multiple workers
- ✅ **Rate Limiting**: Prevent overwhelming services
- ✅ **Graceful Shutdown**: Clean process termination

## 📈 Performance Tips

1. **Clean old jobs regularly** (completed jobs after 24h)
2. **Monitor failed job count** (should be <1%)
3. **Check queue depth** (shouldn't grow indefinitely)
4. **Scale workers** if processing is slow

## 🔒 Security

- All admin endpoints require admin authentication
- Redis should not be exposed to public internet
- Use Redis AUTH if deployed in production

## 📚 Next Steps

- Read [BULLMQ_IMPLEMENTATION.md](./BULLMQ_IMPLEMENTATION.md) for detailed docs
- Review [NOTIFICATION_SYSTEM.md](./NOTIFICATION_SYSTEM.md) for notification details
- Set up monitoring alerts for failed jobs

---

For detailed documentation, see [BULLMQ_IMPLEMENTATION.md](./BULLMQ_IMPLEMENTATION.md)

