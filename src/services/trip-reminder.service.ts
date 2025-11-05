import Booking from '../models/booking.model';
import notificationService from './notification.service';
import { PaymentStatus, BookingStatus } from '../models/common/types';

interface TripReminderJob {
  checkAndSendReminders(): Promise<void>;
  checkBusCapacity(): Promise<void>;
}

class TripReminderService implements TripReminderJob {
  /**
   * Check for trips and send reminders based on departure time
   * This should be run every 5-10 minutes via a cron job
   */
  async checkAndSendReminders(): Promise<void> {
    try {
      console.log('🔔 Checking for trip reminders...');
      
      const now = new Date();
      
      // Calculate time windows for reminders
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const in30Minutes = new Date(now.getTime() + 30 * 60 * 1000);
      
      // Time windows with a small buffer (5 minutes)
      const buffer = 5 * 60 * 1000;
      
      // Find confirmed bookings with paid status
      const bookings = await Booking.find({
        bookingStatus: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID
      })
        .populate({
          path: 'trip',
          select: 'departureTime route bus',
          populate: {
            path: 'route',
            select: 'origin destination'
          }
        })
        .populate('user', '_id')
        .lean();

      for (const booking of bookings) {
        if (!booking.trip || !booking.user) continue;

        const trip = booking.trip as any;
        const departureTime = new Date(trip.departureTime);
        
        // Skip if trip has already departed
        if (departureTime < now) continue;

        const timeToDeparture = departureTime.getTime() - now.getTime();

        // Get user profile for notification preferences
        const Profile = (await import('../models/profile.model')).default;
        const profile = await Profile.findOne({ auth: booking.user });
        const prefs = profile?.notificationPreferences;

        // Check if reminders are enabled
        if (prefs?.tripReminders === false) continue;

        const userId = (booking.user as any)._id?.toString() || booking.user.toString();
        const route = trip.route as any;

        const tripData = {
          bookingRef: booking.bookingRef,
          origin: route?.origin?.name || 'Origin',
          destination: route?.destination?.name || 'Destination',
          departureTime: departureTime,
          seatNumbers: booking.passengers.map((p: any) => p.seatLabel).filter(Boolean),
          bookingId: booking._id.toString(),
          tripId: trip._id.toString()
        };

        // 24-hour reminder
        if (
          prefs?.reminder24h !== false &&
          timeToDeparture <= 24 * 60 * 60 * 1000 + buffer &&
          timeToDeparture > 24 * 60 * 60 * 1000 - buffer
        ) {
          // Check if we haven't already sent this reminder
          const Notification = (await import('../models/notification.model')).default;
          const existingReminder = await Notification.findOne({
            user: userId,
            category: 'trip_reminder_24h',
            'metadata.bookingId': booking._id.toString()
          });

          if (!existingReminder) {
            console.log(`Sending 24h reminder for booking ${booking.bookingRef}`);
            await notificationService.sendTripReminder(
              userId,
              'trip_reminder_24h',
              tripData
            ).catch(err => console.error('Error sending 24h reminder:', err));
          }
        }

        // 2-hour reminder
        if (
          prefs?.reminder2h !== false &&
          timeToDeparture <= 2 * 60 * 60 * 1000 + buffer &&
          timeToDeparture > 2 * 60 * 60 * 1000 - buffer
        ) {
          const Notification = (await import('../models/notification.model')).default;
          const existingReminder = await Notification.findOne({
            user: userId,
            category: 'trip_reminder_2h',
            'metadata.bookingId': booking._id.toString()
          });

          if (!existingReminder) {
            console.log(`Sending 2h reminder for booking ${booking.bookingRef}`);
            await notificationService.sendTripReminder(
              userId,
              'trip_reminder_2h',
              tripData
            ).catch(err => console.error('Error sending 2h reminder:', err));
          }
        }

        // 30-minute reminder
        if (
          prefs?.reminder30m !== false &&
          timeToDeparture <= 30 * 60 * 1000 + buffer &&
          timeToDeparture > 30 * 60 * 1000 - buffer
        ) {
          const Notification = (await import('../models/notification.model')).default;
          const existingReminder = await Notification.findOne({
            user: userId,
            category: 'trip_reminder_30m',
            'metadata.bookingId': booking._id.toString()
          });

          if (!existingReminder) {
            console.log(`Sending 30m reminder for booking ${booking.bookingRef}`);
            await notificationService.sendTripReminder(
              userId,
              'trip_reminder_30m',
              tripData
            ).catch(err => console.error('Error sending 30m reminder:', err));
          }
        }
      }

      console.log('✅ Trip reminder check completed');
    } catch (error) {
      console.error('❌ Error checking trip reminders:', error);
      throw error;
    }
  }

  /**
   * Check bus capacity and send alerts to admins when 90% or more full
   * This should be run periodically (e.g., every hour)
   */
  async checkBusCapacity(): Promise<void> {
    try {
      console.log('🚌 Checking bus capacity...');

      const now = new Date();
      const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Next 7 days

      // Aggregate bookings by trip to calculate capacity
      const capacityData = await Booking.aggregate([
        {
          $match: {
            bookingStatus: BookingStatus.CONFIRMED,
            paymentStatus: { $in: [PaymentStatus.PAID, PaymentStatus.PENDING] }
          }
        },
        {
          $lookup: {
            from: 'trips',
            localField: 'trip',
            foreignField: '_id',
            as: 'tripData'
          }
        },
        {
          $unwind: '$tripData'
        },
        {
          $match: {
            'tripData.departureTime': { $gte: now, $lte: futureDate }
          }
        },
        {
          $lookup: {
            from: 'buses',
            localField: 'tripData.bus',
            foreignField: '_id',
            as: 'busData'
          }
        },
        {
          $unwind: '$busData'
        },
        {
          $lookup: {
            from: 'routes',
            localField: 'tripData.route',
            foreignField: '_id',
            as: 'routeData'
          }
        },
        {
          $unwind: '$routeData'
        },
        {
          $group: {
            _id: '$trip',
            tripId: { $first: '$tripData._id' },
            routeId: { $first: '$tripData.route' },
            departureTime: { $first: '$tripData.departureTime' },
            origin: { $first: '$routeData.origin' },
            destination: { $first: '$routeData.destination' },
            totalSeats: { $first: { $size: '$busData.seatLayout.seats' } },
            bookedSeats: { $sum: { $size: '$passengers' } }
          }
        },
        {
          $addFields: {
            capacityPercentage: {
              $multiply: [
                { $divide: ['$bookedSeats', '$totalSeats'] },
                100
              ]
            }
          }
        },
        {
          $match: {
            capacityPercentage: { $gte: 90 }
          }
        }
      ]);

      // Send notifications for high-capacity trips
      const Notification = (await import('../models/notification.model')).default;

      for (const trip of capacityData) {
        // Check if we've already sent an alert for this trip
        const existingAlert = await Notification.findOne({
          category: 'admin_bus_capacity',
          'metadata.tripId': trip.tripId.toString()
        });

        if (!existingAlert) {
          console.log(`Sending capacity alert for trip ${trip.tripId} - ${trip.capacityPercentage.toFixed(1)}% full`);
          
          await notificationService.sendBusCapacityAlert({
            tripId: trip.tripId.toString(),
            routeId: trip.routeId.toString(),
            origin: trip.origin?.name || 'Origin',
            destination: trip.destination?.name || 'Destination',
            departureTime: trip.departureTime,
            totalSeats: trip.totalSeats,
            bookedSeats: trip.bookedSeats,
            capacityPercentage: trip.capacityPercentage
          }).catch(err => console.error('Error sending capacity alert:', err));
        }
      }

      console.log(`✅ Bus capacity check completed. Found ${capacityData.length} high-capacity trips`);
    } catch (error) {
      console.error('❌ Error checking bus capacity:', error);
      throw error;
    }
  }

  /**
   * Initialize the cron jobs (deprecated - now using BullMQ)
   * @deprecated Use BullMQ workers instead
   */
  initializeCronJobs(): void {
    console.log('⚠️  Legacy cron jobs are deprecated. Using BullMQ workers instead.');
  }
}

export default new TripReminderService();

