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
      // Check if this is extra baggage payment or regular booking
      if (paymentIntent.metadata.type === 'extra_baggage') {
        await handleExtraBaggagePaymentSuccess(paymentIntent);
      } else {
        await handlePaymentSuccess(paymentIntent);
      }
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object as Stripe.PaymentIntent;
      // Check if this is extra baggage payment or regular booking
      if (failedPayment.metadata.type === 'extra_baggage') {
        await handleExtraBaggagePaymentFailure(failedPayment);
      } else {
        await handlePaymentFailure(failedPayment);
      }
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
        paymentIntentId: paymentIntent.id,
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
          },
          $inc: { totalBookedSeats: 1 }
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

/**
 * Handle successful extra baggage payment
 * Updates passenger record with extra baggage information
 */
async function handleExtraBaggagePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log('Extra baggage payment succeeded:', paymentIntent.id);
    
    const metadata = paymentIntent.metadata;
    const passengerId = metadata.passengerId;
    const ticketNumber = metadata.ticketNumber;
    const baggageWeight = metadata.baggageWeight;
    const baggageAmount = metadata.baggageAmount;
    const driverId = metadata.driverId;

    if (!passengerId || !ticketNumber) {
      console.error('Missing required metadata for extra baggage payment');
      return;
    }

    // Update passenger record with extra baggage details
    const updatedPassenger = await PassengerModel.findByIdAndUpdate(
      passengerId,
      {
        additionalBaggage: `${baggageWeight}kg - $${baggageAmount}`,
        extraBaggageIntentId: paymentIntent.id, 
      },
      { new: true }
    );

    if (!updatedPassenger) {
      console.error('Passenger not found for extra baggage payment:', passengerId);
      return;
    }

    // Create payment transaction record
    await PaymentTransaction.create({
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      gateway: PaymentGateway.STRIPE,
      gatewayResponse: paymentIntent,
      transactionId: paymentIntent.id,
      status: TransactionStatus.SUCCEEDED,
      createdBy: driverId
    });

    console.log('Extra baggage added successfully for ticket:', ticketNumber);
    console.log('Passenger updated:', updatedPassenger._id);

    // TODO: Send confirmation notification to passenger
    // TODO: Notify driver that payment is completed

  } catch (error) {
    console.error('Error handling extra baggage payment success:', error);
  }
}

/**
 * Handle failed extra baggage payment
 * Removes the payment intent ID from passenger record
 */
async function handleExtraBaggagePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log('Extra baggage payment failed:', paymentIntent.id);
    
    const metadata = paymentIntent.metadata;
    const passengerId = metadata.passengerId;
    const ticketNumber = metadata.ticketNumber;
    const driverId = metadata.driverId;

    if (!passengerId) {
      console.error('Missing passenger ID for extra baggage payment failure');
      return;
    }

    // Remove the payment intent ID from passenger record so they can try again
    await PassengerModel.findByIdAndUpdate(
      passengerId,
      {
        extraBaggageIntentId: null
      }
    );

    // Create payment transaction record for failed payment
    await PaymentTransaction.create({
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      gateway: PaymentGateway.STRIPE,
      gatewayResponse: paymentIntent,
      transactionId: paymentIntent.id,
      status: TransactionStatus.FAILED,
      createdBy: driverId
    });

    console.log('Extra baggage payment failed for ticket:', ticketNumber);

    // TODO: Send notification about payment failure

  } catch (error) {
    console.error('Error handling extra baggage payment failure:', error);
  }
}
