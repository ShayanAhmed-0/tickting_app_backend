import { Request, Response } from "express";
import Stripe from "stripe";
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from "../config/environment";
import ResponseUtil from "../utils/Response/responseUtils";
import { STATUS_CODES } from "../constants/statusCodes";
import BusModel from "../models/bus.model";
import PassengerModel from "../models/passenger.models";
import RouteModel from "../models/route.model";
import PaymentTransaction from "../models/payment-transaction.model";
import { QRCodeUtils } from "../utils/QRCode";
import { SeatStatus, PaymentGateway, TransactionStatus } from "../models/common/types";
import { io } from "../server";

const stripe = new Stripe(STRIPE_SECRET_KEY as string);

/**
 * Handle Stripe webhook events
 * This controller processes payment events from Stripe and completes the booking
 */
export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentSuccess(paymentIntent);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object as Stripe.PaymentIntent;
      await handlePaymentFailure(failedPayment);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
};

/**
 * Handle successful payment
 * Creates passenger records, updates seat status, and generates QR code
 */
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log('Payment succeeded:', paymentIntent.id);
    
    // Extract metadata from payment intent
    const metadata = paymentIntent.metadata;
    const userId = metadata.userId;
    const routeId = metadata.routeId;
    const busId = metadata.busId;
    const passengersData = metadata.passengers ? JSON.parse(metadata.passengers) : [];
    const seatsData = metadata.seats ? JSON.parse(metadata.seats) : [];

    if (!userId || !routeId || !busId) {
      console.error('Missing required metadata in payment intent');
      return;
    }

    // Get route and bus information
    const getRoutePrice = await RouteModel.findById(routeId).populate('origin destination');
    const getBus = await BusModel.findById(busId);

    if (!getBus) {
      console.error('Bus not found:', busId);
      return;
    }

    // Determine booking type
    let forType = "SELF";
    let groupTicketSerial = null;
    const passengersDB = [];

    if (passengersData.length > 1) {
      forType = "FAMILY";
      groupTicketSerial = `TKT-${Date.now()}-${passengersData.length}`;
    }

    // Create passenger records
    for (let i = 0; i < seatsData.length; i++) {
      const seat = seatsData[i];
      const passenger = passengersData[i] || {
        fullName: "Passenger " + (i + 1),
        gender: "other",
        dob: new Date(),
        contactNumber: "",
        DocumentId: ""
      };

      const create = await PassengerModel.create({
        profile: userId,
        bookedBy: "USER",
        seatLabel: seat.seatLabel,
        busId: getBus._id,
        for: forType,
        ticketNumber: `TKT-${Date.now()}-${i}`,
        groupTicketSerial: groupTicketSerial,
        fullName: passenger.fullName,
        gender: passenger.gender,
        dob: passenger.dob,
        contactNumber: passenger.contactNumber,
        DocumentId: passenger.DocumentId,
        type: "ONE_WAY",
        From: (getRoutePrice as any)?.origin?.name || "Origin",
        To: (getRoutePrice as any)?.destination?.name || "Destination",
        DepartureDate: (getRoutePrice as any)?.departureTime || new Date(),
        ReturnDate: new Date(),
      });
      passengersDB.push(create);
    }

    // Update bus seat status to BOOKED
    for (const seat of seatsData) {
      await BusModel.updateOne(
        {
          _id: getBus._id,
          "seatLayout.seats.seatLabel": seat.seatLabel
        },
        {
          $set: {
            "seatLayout.seats.$.status": SeatStatus.BOOKED,
            "seatLayout.seats.$.isAvailable": false
          }
        }
      );

      // Emit seat status change to all users in the route room
      io.to(`route:${routeId}`).emit('seat:status:changed', {
        routeId: routeId,
        seatLabel: seat.seatLabel,
        status: SeatStatus.BOOKED,
        userId: userId,
        busId: busId
      });
    }

    // Create QR code data structure
    const qrCodeData = QRCodeUtils.createBookingQRData({
      userId: userId,
      routeId: routeId,
      busId: getBus._id?.toString() || busId,
      passengers: passengersDB,
      routeInfo: {
        from: (getRoutePrice as any)?.origin?.name || "Origin",
        to: (getRoutePrice as any)?.destination?.name || "Destination",
        departureDate: (getRoutePrice as any)?.departureTime || new Date(),
        returnDate: new Date()
      },
      paymentType: "stripe",
      totalPrice: paymentIntent.amount / 100, // Convert from cents
      groupTicketSerial: groupTicketSerial || undefined
    });

    // Generate QR code as base64 string
    const qrCodeBase64 = await QRCodeUtils.generateQRCodeAsBase64(qrCodeData);

    // Create payment transaction record
    await PaymentTransaction.create({
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      gateway: PaymentGateway.STRIPE,
      gatewayResponse: paymentIntent,
      transactionId: paymentIntent.id,
      status: TransactionStatus.SUCCEEDED,
      createdBy: userId
    });

    console.log('Booking completed successfully for payment:', paymentIntent.id);
    console.log('QR Code generated:', qrCodeData.bookingId);
    console.log('Passengers created:', passengersDB.length);

    // TODO: Send confirmation email/notification to user with QR code
    // You can implement email sending here with the qrCodeBase64

  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

/**
 * Handle failed payment
 * Releases held seats and logs the failure
 */
async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log('Payment failed:', paymentIntent.id);
    
    const metadata = paymentIntent.metadata;
    const userId = metadata.userId;
    const busId = metadata.busId;
    const seatsData = metadata.seats ? JSON.parse(metadata.seats) : [];

    if (!busId || !seatsData.length) {
      console.error('Missing required metadata for payment failure handling');
      return;
    }

    // Release seats back to available
    const getBus = await BusModel.findById(busId);
    if (getBus) {
      for (const seat of seatsData) {
        await BusModel.updateOne(
          {
            _id: getBus._id,
            "seatLayout.seats.seatLabel": seat.seatLabel,
            "seatLayout.seats.userId": userId
          },
          {
            $set: {
              "seatLayout.seats.$.status": SeatStatus.AVAILABLE,
              "seatLayout.seats.$.isAvailable": true,
              "seatLayout.seats.$.userId": null
            }
          }
        );
      }
    }

    // Create payment transaction record for failed payment
    await PaymentTransaction.create({
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      gateway: PaymentGateway.STRIPE,
      gatewayResponse: paymentIntent,
      transactionId: paymentIntent.id,
      status: TransactionStatus.FAILED,
      createdBy: userId
    });

    console.log('Seats released for failed payment:', paymentIntent.id);

    // TODO: Send notification to user about payment failure

  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}
