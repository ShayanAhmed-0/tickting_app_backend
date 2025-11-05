# Notification System Documentation

## Overview

This comprehensive notification system delivers both push notifications (via Firebase Cloud Messaging) and database notifications for the Los Mismos ticketing application. The system handles booking confirmations, trip reminders, schedule changes, emergency alerts, and admin notifications.

## Features

### ✅ Implemented Features

1. **Dual Notification System**
   - Push notifications via Firebase Cloud Messaging (FCM)
   - Database notifications for in-app display
   - Automatic fallback and retry mechanisms

2. **Notification Categories**
   - Booking confirmations with payment receipts
   - Trip reminders (24 hours, 2 hours, 30 minutes before departure)
   - Schedule changes and delays
   - Emergency notifications (weather, cancellations, safety)
   - Admin alerts (bus capacity ≥90%)
   - Refund processed notifications

3. **User Preferences**
   - Granular notification preferences per user
   - Control over push, email, and SMS channels
   - Category-specific preferences
   - Reminder timing preferences

4. **Smart Routing**
   - Frontend routing metadata included in all notifications
   - Deep linking support for mobile apps
   - Context-aware navigation parameters

5. **Automated Reminders**
   - Scheduled cron jobs for trip reminders
   - Automatic bus capacity monitoring
   - Duplicate prevention mechanisms

## Architecture

### Database Schema

#### Notification Model
```typescript
{
  user: ObjectId,              // Recipient (auth id)
  targetRole: UserRole,        // For role-based broadcasts
  type: NotificationType,      // push, email, sms, inapp
  category: NotificationCategory,
  title: string,
  body: string,
  imageUrl: string,
  metadata: {
    screen: string,            // Frontend route
    params: object,            // Route parameters
    bookingId: string,
    tripId: string,
    // ... other context data
  },
  sentAt: Date,
  deliveredAt: Date,
  readAt: Date,
  deliveryStatus: DeliveryStatus,
  priority: 'high' | 'normal' | 'low',
  scheduledFor: Date,
  isSent: boolean
}
```

#### Profile Model Extensions
```typescript
notificationPreferences: {
  pushEnabled: boolean,
  emailEnabled: boolean,
  smsEnabled: boolean,
  bookingConfirmations: boolean,
  tripReminders: boolean,
  scheduleChanges: boolean,
  emergencyAlerts: boolean,
  promotions: boolean,
  reminder24h: boolean,
  reminder2h: boolean,
  reminder30m: boolean
}
```

## API Endpoints

### User Endpoints

#### 1. Get User Notifications
```http
GET /api/notifications?page=1&limit=20&unreadOnly=true&category=booking_confirmation
Authorization: Bearer <user_token>

Response:
{
  "status": "success",
  "data": {
    "notifications": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

#### 2. Get Unread Count
```http
GET /api/notifications/unread-count
Authorization: Bearer <user_token>

Response:
{
  "status": "success",
  "data": {
    "count": 5
  }
}
```

#### 3. Mark as Read
```http
PUT /api/notifications/:id/read
Authorization: Bearer <user_token>

Response:
{
  "status": "success",
  "message": "Notification marked as read"
}
```

#### 4. Mark All as Read
```http
PUT /api/notifications/read-all
Authorization: Bearer <user_token>

Response:
{
  "status": "success",
  "message": "All notifications marked as read"
}
```

#### 5. Delete Notification
```http
DELETE /api/notifications/:id
Authorization: Bearer <user_token>

Response:
{
  "status": "success",
  "message": "Notification deleted successfully"
}
```

#### 6. Get Notification Preferences
```http
GET /api/notifications/preferences
Authorization: Bearer <user_token>

Response:
{
  "status": "success",
  "data": {
    "preferences": {
      "pushEnabled": true,
      "emailEnabled": true,
      "bookingConfirmations": true,
      "tripReminders": true,
      "reminder24h": true,
      "reminder2h": true,
      "reminder30m": true
    }
  }
}
```

#### 7. Update Notification Preferences
```http
PUT /api/notifications/preferences
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "pushEnabled": true,
  "tripReminders": true,
  "reminder24h": true,
  "reminder2h": false,
  "reminder30m": true
}

Response:
{
  "status": "success",
  "data": {
    "preferences": { ... }
  }
}
```

#### 8. Register Device for Push Notifications
```http
POST /api/notifications/device/register
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "deviceToken": "fcm-device-token-here",
  "deviceType": "ios",
  "deviceName": "iPhone 13 Pro"
}

Response:
{
  "status": "success",
  "data": {
    "deviceId": "device_id_here"
  }
}
```

#### 9. Unregister Device
```http
POST /api/notifications/device/unregister
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "deviceToken": "fcm-device-token-here"
}

Response:
{
  "status": "success",
  "message": "Device unregistered successfully"
}
```

#### 10. Send Test Notification
```http
POST /api/notifications/test
Authorization: Bearer <user_token>

Response:
{
  "status": "success",
  "message": "Test notification sent successfully"
}
```

### Admin Endpoints

#### 1. Get All Notifications
```http
GET /api/admin/notifications?page=1&limit=50&category=booking_confirmation&userId=user_id
Authorization: Bearer <admin_token>

Response:
{
  "status": "success",
  "data": {
    "notifications": [...],
    "pagination": { ... }
  }
}
```

#### 2. Send Custom Notification
```http
POST /api/admin/notifications/send
Authorization: Bearer <admin_token>
Content-Type: application/json

// To specific users
{
  "userIds": ["user_id_1", "user_id_2"],
  "category": "booking_confirmation",
  "title": "Custom Notification",
  "body": "This is a custom message",
  "metadata": {
    "screen": "CustomScreen",
    "params": { "id": "123" }
  },
  "priority": "high"
}

// Or to a role
{
  "targetRole": "super_admin",
  "category": "admin_bus_capacity",
  "title": "System Alert",
  "body": "Important system message",
  "priority": "high"
}

Response:
{
  "status": "success",
  "message": "Notification(s) sent successfully"
}
```

#### 3. Send Emergency Notification
```http
POST /api/admin/notifications/emergency
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userIds": ["user_id_1", "user_id_2"],
  "type": "weather",
  "title": "Severe Weather Alert",
  "message": "Heavy rain expected. Some routes may be delayed.",
  "affectedRoutes": ["route_id_1", "route_id_2"],
  "alternativeOptions": [
    {
      "routeId": "route_id_3",
      "departureTime": "2025-11-06T10:00:00Z"
    }
  ]
}

Response:
{
  "status": "success",
  "message": "Emergency notification sent successfully"
}
```

## Notification Triggers

### Automatic Triggers

#### 1. Booking Confirmation
**When:** Payment successful
**Recipients:** Customer who made the booking
**Metadata:**
```json
{
  "screen": "BookingDetails",
  "params": { "bookingId": "booking_id" },
  "bookingRef": "LM-20251105-ABC123",
  "origin": "Mexico City",
  "destination": "Guadalajara",
  "departureTime": "2025-11-10T08:00:00Z",
  "seatNumbers": ["A1", "A2"],
  "amount": 500,
  "currency": "MXN"
}
```

#### 2. Payment Receipt
**When:** Payment successful
**Recipients:** Customer who made the payment
**Metadata:**
```json
{
  "screen": "PaymentReceipt",
  "params": { "paymentId": "payment_id" },
  "bookingRef": "LM-20251105-ABC123",
  "amount": 500,
  "currency": "MXN"
}
```

#### 3. Trip Reminders
**When:** 24h, 2h, or 30min before departure (configurable per user)
**Recipients:** All customers with confirmed bookings
**Metadata:**
```json
{
  "screen": "BookingDetails",
  "params": { "bookingId": "booking_id" },
  "bookingRef": "LM-20251105-ABC123",
  "departureTime": "2025-11-10T08:00:00Z",
  "origin": "Mexico City",
  "destination": "Guadalajara"
}
```

#### 4. Bus Capacity Alert
**When:** Bus reaches 90% capacity
**Recipients:** Super admins and managers
**Metadata:**
```json
{
  "screen": "TripManagement",
  "params": { "tripId": "trip_id" },
  "origin": "Mexico City",
  "destination": "Guadalajara",
  "departureTime": "2025-11-10T08:00:00Z",
  "busCapacity": 40,
  "currentBookings": 36
}
```

### Manual Triggers

#### Schedule Changes
```typescript
await notificationService.sendScheduleChange(
  userId,
  {
    bookingRef: "LM-20251105-ABC123",
    origin: "Mexico City",
    destination: "Guadalajara",
    oldDepartureTime: new Date("2025-11-10T08:00:00Z"),
    newDepartureTime: new Date("2025-11-10T09:00:00Z"),
    reason: "Traffic conditions",
    bookingId: "booking_id",
    tripId: "trip_id"
  }
);
```

#### Emergency Notifications
```typescript
await notificationService.sendEmergencyNotification(
  ["user_id_1", "user_id_2"],
  {
    type: "weather",
    title: "Severe Weather Alert",
    message: "Heavy rain expected. Route may be delayed.",
    affectedRoutes: ["route_id_1"],
    alternativeOptions: [...]
  }
);
```

## Scheduled Jobs

### Trip Reminder Cron Job
- **Frequency:** Every 5 minutes
- **Function:** Checks upcoming trips and sends reminders
- **Logic:**
  1. Query confirmed bookings with departure time within reminder windows
  2. Check user's notification preferences
  3. Verify reminder hasn't been sent already
  4. Send push and DB notification
  5. Log successful delivery

### Bus Capacity Monitor
- **Frequency:** Every hour
- **Function:** Monitors bus capacity and alerts admins
- **Logic:**
  1. Aggregate bookings by trip for next 7 days
  2. Calculate capacity percentage
  3. Find trips ≥90% capacity
  4. Send alert to admins and managers
  5. Prevent duplicate alerts

## Frontend Integration

### Metadata for Routing

All notifications include routing metadata for seamless frontend navigation:

```typescript
// Example notification metadata
{
  screen: "BookingDetails",        // Screen/route to navigate to
  params: {                         // Route parameters
    bookingId: "booking_id_here"
  },
  bookingRef: "LM-20251105-ABC123", // Additional context data
  departureTime: "2025-11-10T08:00:00Z"
}
```

### Implementing Navigation

#### React Native Example
```typescript
import { useNavigation } from '@react-navigation/native';

function NotificationItem({ notification }) {
  const navigation = useNavigation();
  
  const handleNotificationPress = () => {
    const { screen, params } = notification.metadata;
    if (screen && params) {
      navigation.navigate(screen, params);
    }
  };
  
  return (
    <TouchableOpacity onPress={handleNotificationPress}>
      <Text>{notification.title}</Text>
      <Text>{notification.body}</Text>
    </TouchableOpacity>
  );
}
```

#### React Web Example
```typescript
import { useHistory } from 'react-router-dom';

function NotificationItem({ notification }) {
  const history = useHistory();
  
  const handleNotificationPress = () => {
    const { screen, params } = notification.metadata;
    if (screen && params) {
      const queryString = new URLSearchParams(params).toString();
      history.push(`/${screen.toLowerCase()}?${queryString}`);
    }
  };
  
  return (
    <div onClick={handleNotificationPress}>
      <h3>{notification.title}</h3>
      <p>{notification.body}</p>
    </div>
  );
}
```

### Firebase Cloud Messaging Setup

#### iOS (Swift)
```swift
import FirebaseMessaging

// Register for push notifications
Messaging.messaging().token { token, error in
  if let error = error {
    print("Error fetching FCM token: \(error)")
  } else if let token = token {
    print("FCM token: \(token)")
    // Send token to backend
    registerDevice(token: token, type: "ios", name: UIDevice.current.name)
  }
}

// Handle notification tap
func userNotificationCenter(_ center: UNUserNotificationCenter,
                           didReceive response: UNNotificationResponse,
                           withCompletionHandler completionHandler: @escaping () -> Void) {
  let userInfo = response.notification.request.content.userInfo
  if let screen = userInfo["screen"] as? String,
     let paramsJson = userInfo["params"] as? String,
     let paramsData = paramsJson.data(using: .utf8),
     let params = try? JSONDecoder().decode([String: String].self, from: paramsData) {
    // Navigate to screen with params
    navigateToScreen(screen, params: params)
  }
  completionHandler()
}
```

#### Android (Kotlin)
```kotlin
import com.google.firebase.messaging.FirebaseMessaging

// Get FCM token
FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
    if (task.isSuccessful) {
        val token = task.result
        // Send token to backend
        registerDevice(token, "android", Build.MODEL)
    }
}

// Handle notification tap
class NotificationClickReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val screen = intent.getStringExtra("screen")
        val paramsJson = intent.getStringExtra("params")
        val params = Gson().fromJson(paramsJson, Map::class.java)
        
        // Navigate to screen
        navigateToScreen(screen, params)
    }
}
```

#### React Native (JavaScript)
```javascript
import messaging from '@react-native-firebase/messaging';

// Request permission and get token
async function requestUserPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    const token = await messaging().getToken();
    // Send token to backend
    await registerDevice(token, Platform.OS, DeviceInfo.getModel());
  }
}

// Handle background messages
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
});

// Handle foreground messages
messaging().onMessage(async remoteMessage => {
  console.log('Foreground message:', remoteMessage);
  // Display in-app notification
});

// Handle notification open
messaging().onNotificationOpenedApp(remoteMessage => {
  const { screen, params } = remoteMessage.data;
  navigation.navigate(screen, JSON.parse(params));
});

// Check if app was opened from notification (killed state)
messaging()
  .getInitialNotification()
  .then(remoteMessage => {
    if (remoteMessage) {
      const { screen, params } = remoteMessage.data;
      navigation.navigate(screen, JSON.parse(params));
    }
  });
```

## Testing

### Test Push Notification
```bash
curl -X POST http://localhost:5000/api/notifications/test \
  -H "Authorization: Bearer <user_token>"
```

### Test Custom Notification (Admin)
```bash
curl -X POST http://localhost:5000/api/admin/notifications/send \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user_id_here"],
    "category": "booking_confirmation",
    "title": "Test Notification",
    "body": "This is a test",
    "priority": "high"
  }'
```

### Simulate Trip Reminder
```bash
# Manually trigger trip reminder check
curl -X POST http://localhost:5000/api/admin/trigger-reminder-check \
  -H "Authorization: Bearer <admin_token>"
```

## Configuration

### Environment Variables
```env
# Firebase Admin SDK is configured via the service account JSON file
# Located at: src/config/los-mismos-staging-8432b3d3637a.json
```

### Cron Job Intervals
Modify in `src/services/trip-reminder.service.ts`:

```typescript
// Trip reminders check interval (default: 5 minutes)
setInterval(() => {
  this.checkAndSendReminders();
}, 5 * 60 * 1000);

// Bus capacity check interval (default: 1 hour)
setInterval(() => {
  this.checkBusCapacity();
}, 60 * 60 * 1000);
```

### Reminder Time Windows
Modify in `src/services/trip-reminder.service.ts`:

```typescript
// Adjust these values to change reminder timing
const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
const in30Minutes = new Date(now.getTime() + 30 * 60 * 1000);
const buffer = 5 * 60 * 1000; // 5-minute buffer
```

## Error Handling

### Push Notification Failures
- Invalid/expired tokens automatically disable devices
- Errors are logged but don't fail the booking
- Database notification is always created as fallback

### Duplicate Prevention
- Checks for existing reminders before sending
- Uses booking ID and category as unique identifiers
- Prevents spam from scheduled jobs

## Performance Considerations

### Database Indexes
Optimized indexes for common queries:
```typescript
// Compound indexes
{ user: 1, createdAt: -1 }
{ user: 1, readAt: 1 }
{ user: 1, deliveryStatus: 1 }
{ scheduledFor: 1, isSent: 1 }
{ category: 1, createdAt: -1 }
{ targetRole: 1, createdAt: -1 }
```

### Batch Operations
- Multiple device tokens processed in parallel
- Uses `Promise.allSettled()` for resilience
- Failed sends don't affect successful ones

### Caching
- User preferences cached during processing
- Device tokens retrieved once per notification batch

## Monitoring

### Logs to Watch
```bash
# Successful notifications
✅ Firebase Admin SDK initialized successfully
✅ Booking and payment notifications sent successfully
✅ Successfully sent push notification

# Errors
❌ Failed to send to device
❌ Error sending push notification
❌ Error checking trip reminders
```

### Metrics to Track
- Notification delivery rate
- Push notification success rate
- Average time from trigger to delivery
- User engagement (click-through rate)
- Device token refresh rate

## Security

### Authentication
- All user endpoints require JWT authentication
- Admin endpoints require admin role verification
- Device registration tied to authenticated user

### Data Privacy
- Notification data includes only necessary information
- PII (Personally Identifiable Information) minimized in metadata
- Users can delete their notifications

### Firebase Security
- Service account key stored securely
- Limited to necessary Firebase services
- Project-level permissions configured

## Troubleshooting

### Notifications Not Received

1. **Check device registration:**
   ```bash
   # Verify device is registered
   db.devices.find({ auth: ObjectId("user_id"), isActive: true })
   ```

2. **Check user preferences:**
   ```bash
   # Verify notifications are enabled
   db.profiles.findOne({ auth: ObjectId("user_id") }).notificationPreferences
   ```

3. **Check Firebase logs:**
   - Look for invalid token errors
   - Verify FCM service is active

4. **Check notification creation:**
   ```bash
   # Verify notification was created
   db.notifications.find({ user: ObjectId("user_id") }).sort({ createdAt: -1 })
   ```

### Trip Reminders Not Sending

1. **Verify cron jobs are running:**
   - Check server startup logs for "Trip reminder and capacity check cron jobs initialized"

2. **Check booking status:**
   ```bash
   # Verify bookings are confirmed and paid
   db.passengers.find({
     user: ObjectId("user_id"),
     status: "CONFIRMED",
     DepartureDate: { $gt: new Date() }
   })
   ```

3. **Check for existing reminders:**
   ```bash
   # Verify reminder wasn't already sent
   db.notifications.find({
     user: ObjectId("user_id"),
     category: "trip_reminder_24h"
   })
   ```

## Future Enhancements

### Planned Features
- [ ] Email notifications via SendGrid/AWS SES
- [ ] SMS notifications via Twilio
- [ ] In-app notification badge count sync
- [ ] Notification templates for easier customization
- [ ] A/B testing for notification content
- [ ] Analytics dashboard for notification performance
- [ ] Webhook support for third-party integrations
- [ ] Rich media notifications (images, videos)
- [ ] Action buttons in notifications
- [ ] Notification scheduling UI for admins

## Support

For issues or questions:
1. Check the logs: `src/services/notification.service.ts`
2. Review Firebase console: https://console.firebase.google.com
3. Contact: [Support Email]

## License

Internal use only - Los Mismos Ticketing Application

