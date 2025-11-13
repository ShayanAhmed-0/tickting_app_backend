# Notification System - Quick Reference

## 🚀 Quick Start

### 1. Register Device (First Time)
```javascript
POST /api/notifications/device/register
{
  "deviceToken": "fcm_token_from_firebase",
  "deviceType": "ios", // or "android", "web"
  "deviceName": "iPhone 13"
}
```

### 2. Get Notifications
```javascript
GET /api/notifications?page=1&limit=20
```

### 3. Mark as Read
```javascript
PUT /api/notifications/:id/read
```

## 📋 Common Use Cases

### Get Unread Count (For Badge)
```bash
curl -X GET http://localhost:5000/api/notifications/unread-count \
  -H "Authorization: Bearer <token>"
```

### Update Preferences
```bash
curl -X PUT http://localhost:5000/api/notifications/preferences \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tripReminders": true,
    "reminder24h": true,
    "reminder2h": false
  }'
```

### Send Test Notification
```bash
curl -X POST http://localhost:5000/api/notifications/test \
  -H "Authorization: Bearer <token>"
```

## 🎯 Notification Categories

| Category | Trigger | Recipients | Auto/Manual |
|----------|---------|------------|-------------|
| `booking_confirmation` | Payment success | Customer | Auto |
| `payment_receipt` | Payment success | Customer | Auto |
| `trip_reminder_24h` | 24h before departure | Customer | Auto |
| `trip_reminder_2h` | 2h before departure | Customer | Auto |
| `trip_reminder_30m` | 30min before departure | Customer | Auto |
| `schedule_change` | Admin action | Affected customers | Manual |
| `schedule_delay` | Admin action | Affected customers | Manual |
| `emergency_weather` | Admin action | Affected customers | Manual |
| `emergency_cancellation` | Admin action | Affected customers | Manual |
| `emergency_safety` | Admin action | Affected customers | Manual |
| `admin_bus_capacity` | Bus ≥90% full | Admins | Auto |

## 🔔 Frontend Navigation Metadata

All notifications include routing data:

```typescript
{
  metadata: {
    screen: "BookingDetails",    // Route name
    params: {                     // Route params
      bookingId: "booking_id"
    },
    // Additional context data
    bookingRef: "LM-20251105-ABC",
    departureTime: "2025-11-10T08:00:00Z"
  }
}
```

### React Native Navigation
```typescript
const handleNotificationPress = (notification) => {
  const { screen, params } = notification.metadata;
  navigation.navigate(screen, params);
};
```

### React Web Navigation
```typescript
const handleNotificationPress = (notification) => {
  const { screen, params } = notification.metadata;
  const query = new URLSearchParams(params).toString();
  history.push(`/${screen.toLowerCase()}?${query}`);
};
```

## 🛠️ Admin Tools

### Send Custom Notification
```bash
curl -X POST http://localhost:5000/api/admin/notifications/send \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user1", "user2"],
    "category": "schedule_change",
    "title": "Schedule Update",
    "body": "Your trip time has changed",
    "priority": "high"
  }'
```

### Send Emergency Alert
```bash
curl -X POST http://localhost:5000/api/admin/notifications/emergency \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user1", "user2"],
    "type": "weather",
    "title": "Weather Alert",
    "message": "Heavy rain expected",
    "affectedRoutes": ["route1"]
  }'
```

### View All Notifications
```bash
curl -X GET "http://localhost:5000/api/admin/notifications?page=1&limit=50" \
  -H "Authorization: Bearer <admin_token>"
```

## 📊 Scheduled Jobs

### Trip Reminders
- **Frequency:** Every 5 minutes
- **Function:** Sends reminders for upcoming trips
- **Config:** `src/services/trip-reminder.service.ts`

### Bus Capacity Monitor
- **Frequency:** Every 1 hour
- **Function:** Alerts admins when bus ≥90% full
- **Config:** `src/services/trip-reminder.service.ts`

## 🔧 User Preferences

Default settings:
```json
{
  "pushEnabled": true,
  "emailEnabled": true,
  "smsEnabled": false,
  "bookingConfirmations": true,
  "tripReminders": true,
  "scheduleChanges": true,
  "emergencyAlerts": true,
  "promotions": false,
  "reminder24h": true,
  "reminder2h": true,
  "reminder30m": true
}
```

## 🐛 Debugging

### Check Device Registration
```bash
# MongoDB
db.devices.find({ auth: ObjectId("user_id"), isActive: true })
```

### Check Recent Notifications
```bash
# MongoDB
db.notifications.find({ 
  user: ObjectId("user_id") 
}).sort({ createdAt: -1 }).limit(10)
```

### Check Notification Preferences
```bash
# MongoDB
db.profiles.findOne({ 
  auth: ObjectId("user_id") 
}).notificationPreferences
```

### View Server Logs
```bash
# Look for these messages
✅ Firebase Admin SDK initialized successfully
✅ Trip reminder and capacity check cron jobs initialized
✅ Booking and payment notifications sent successfully
✅ Successfully sent push notification

# Errors
❌ Failed to send to device
❌ Error sending push notification
```

## 📱 FCM Token Management

### iOS Token Retrieval
```swift
import FirebaseMessaging

Messaging.messaging().token { token, error in
  if let token = token {
    registerDevice(token: token, type: "ios")
  }
}
```

### Android Token Retrieval
```kotlin
FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
  val token = task.result
  registerDevice(token, "android")
}
```

### React Native Token Retrieval
```javascript
import messaging from '@react-native-firebase/messaging';

const token = await messaging().getToken();
await registerDevice(token, Platform.OS);
```

## 🔐 Security Notes

1. **All endpoints require authentication**
2. **Admin endpoints require admin role**
3. **Firebase service account stored in:** `src/config/los-mismos-staging-8432b3d3637a.json`
4. **Device tokens are user-specific**
5. **Users can only access their own notifications**

## 📈 Performance Tips

1. **Use pagination** for notification lists (default: 20 per page)
2. **Mark notifications as read** to improve query performance
3. **Delete old notifications** periodically
4. **Monitor FCM token validity** and refresh as needed
5. **Use unread count endpoint** instead of loading all notifications

## 🎨 UI Best Practices

### Badge Display
```typescript
// Get unread count for badge
const { data } = await fetch('/api/notifications/unread-count');
setBadgeCount(data.count);
```

### Real-time Updates
```typescript
// Socket.io for real-time notifications
socket.on('notification:new', (notification) => {
  addNotification(notification);
  updateBadgeCount(count + 1);
  showToast(notification.title, notification.body);
});
```

### Notification List
```typescript
const NotificationList = () => {
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  
  useEffect(() => {
    fetchNotifications(page);
  }, [page]);
  
  const handleNotificationPress = async (notification) => {
    // Mark as read
    await markAsRead(notification.id);
    
    // Navigate
    const { screen, params } = notification.metadata;
    navigation.navigate(screen, params);
  };
};
```

## 🚨 Common Issues

### Issue: Notifications not received
**Solutions:**
1. Check device registration
2. Verify user preferences
3. Check FCM token validity
4. Review Firebase console logs

### Issue: Duplicate notifications
**Solutions:**
1. Cron jobs have duplicate prevention
2. Check for multiple device registrations
3. Review scheduled notification logic

### Issue: Wrong routing
**Solutions:**
1. Verify metadata structure
2. Check frontend route names
3. Test navigation handler

## 📞 Support Checklist

When reporting issues, provide:
- [ ] User ID
- [ ] Device type and token
- [ ] Notification category
- [ ] Expected vs actual behavior
- [ ] Server logs
- [ ] Firebase console logs
- [ ] Timestamp of issue

## 🎯 Testing Checklist

- [ ] Register device successfully
- [ ] Receive test notification
- [ ] View notification list
- [ ] Mark notification as read
- [ ] Delete notification
- [ ] Update preferences
- [ ] Verify trip reminder (24h)
- [ ] Verify trip reminder (2h)
- [ ] Verify trip reminder (30min)
- [ ] Test bus capacity alert (admin)
- [ ] Test emergency notification (admin)
- [ ] Verify navigation from notification
- [ ] Check unread count badge
- [ ] Test on iOS device
- [ ] Test on Android device

---

For detailed documentation, see [NOTIFICATION_SYSTEM.md](./NOTIFICATION_SYSTEM.md)

