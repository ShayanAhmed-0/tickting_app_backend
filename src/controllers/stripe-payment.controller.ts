import { Response } from "express";
import Stripe from "stripe";
import { STRIPE_SECRET_KEY } from "../config/environment";
import { CustomRequest } from "../interfaces/auth";
import ResponseUtil from "../utils/Response/responseUtils";
import { STATUS_CODES } from "../constants/statusCodes";
import BusModel from "../models/bus.model";
import PassengerModel from "../models/passenger.models";
import RouteModel from "../models/route.model";
import PaymentTransaction from "../models/payment-transaction.model";
import { QRCodeUtils } from "../utils/QRCode";
import { SeatStatus, PaymentGateway, TransactionStatus, ForWho, TripType, UserRole } from "../models/common/types";
import { AUTH_CONSTANTS } from "../constants/messages";
import { io } from "../server";
import { redis, RedisKeys } from "../config/redis";

const stripe = new Stripe(STRIPE_SECRET_KEY as string);

/**
 * Confirm Stripe payment and complete booking
 * This endpoint is called by the frontend after successful payment
 */
export const confirmStripePayment = async (req: CustomRequest, res: Response) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Payment Intent ID is required"
      );
    }

    // Retrieve payment intent from Stripe to verify it succeeded
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        `Payment has not succeeded. Status: ${paymentIntent.status}`
      );
    }

    // Extract metadata from payment intent
    const metadata = paymentIntent.metadata;
    const userId = metadata.userId;
    const routeId = metadata.routeId;
    const bookedBy = metadata.bookedBy;
    const busId = metadata.busId;
    // const passengersData = metadata.passengers ? JSON.parse(metadata.passengers) : [];
    const passengersData = metadata.passengersRedisKey ? JSON.parse(await redis.get(metadata.passengersRedisKey) as string) : [];
    const seatsData = metadata.seats ? parseInt(metadata.seats) : 0;

    if (!userId || !routeId || !busId) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Missing required payment metadata"
      );
    }

    // Check if booking already exists for this payment intent
    const existingTransaction = await PaymentTransaction.findOne({
      transactionId: paymentIntentId,
      status: TransactionStatus.SUCCEEDED
    });

    if (existingTransaction) {
      // Booking already processed, retrieve existing data with QR codes
      const existingPassengers = await PassengerModel.find({
        user: userId,
        busId: busId
      }).sort({ createdAt: -1 }).limit(seatsData);

      if (existingPassengers.length > 0) {
        const groupTicketSerial = existingPassengers[0].groupTicketSerial;
        
        // Format passengers with their stored QR codes
        const passengersWithQR = existingPassengers.map((passenger) => ({
          ...passenger.toObject(),
          qrCode: {
            data: passenger.qrCode, // QR code already stored in database
            bookingId: `${passenger._id}`,
            format: "base64"
          }
        }));

        return ResponseUtil.successResponse(
          res,
          STATUS_CODES.SUCCESS,
          {
            passengers: passengersWithQR,
            type: "stripe",
            bookingsCount: existingPassengers.length,
            groupTicketSerial: groupTicketSerial,
            paymentIntentId: paymentIntentId
          },
          "Booking already confirmed"
        );
      }
    }

    // Get route and bus information
    const getRoutePrice = await RouteModel.findById(routeId).populate('origin destination');
    const getBus = await BusModel.findById(busId);

    if (!getBus) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Bus not found"
      );
    }

    // Get seat labels from passengers data
    const seatLabels = passengersData.map((p: any) => p.seatLabel);
    
    // Get the actual seat objects from bus
    const getSeats = getBus.seatLayout.seats;
    const getUserSeats = getSeats.filter((seat: any) => seatLabels.includes(seat.seatLabel));
    
    // Validate that all requested seats exist
    if (getUserSeats.length !== passengersData.length) {
      return ResponseUtil.errorResponse(
        res, 
        STATUS_CODES.BAD_REQUEST, 
        "One or more seats not found"
      );
    }

    // Check if seats are held/selected by this user or available
    const invalidSeats = getUserSeats.filter((seat: any) => {
      // Seat must be either:
      // 1. Available (no userId)
      // 2. Held/Selected by the current user
      const isAvailableOrOwnedByUser = 
        !seat.userId || 
        seat.userId.toString() === userId;
      
      return !isAvailableOrOwnedByUser;
    });

    if (invalidSeats.length > 0) {
      const seatLabelsInvalid = invalidSeats.map((s: any) => s.seatLabel).join(', ');
      return ResponseUtil.errorResponse(
        res, 
        STATUS_CODES.BAD_REQUEST, 
        `Seats ${seatLabelsInvalid} are already held or booked by another user`
      );
    }

    // Check if any seats are already booked
    const alreadyBookedSeats = getUserSeats.filter((seat: any) => 
      seat.status === SeatStatus.BOOKED
    );

    if (alreadyBookedSeats.length > 0) {
      const bookedSeatLabels = alreadyBookedSeats.map((s: any) => s.seatLabel).join(', ');
      return ResponseUtil.errorResponse(
        res, 
        STATUS_CODES.BAD_REQUEST, 
        `Seats ${bookedSeatLabels} are already booked`
      );
    }

    // Verify that user actually held these seats in Redis
    const notHeldSeats: string[] = [];
    for (const seatLabel of seatLabels) {
      const holdKey = RedisKeys.seatHold(routeId, seatLabel);
      const holdData = await redis.get(holdKey);
      
      if (!holdData) {
        // No hold found in Redis
        notHeldSeats.push(seatLabel);
      } else {
        const hold = JSON.parse(holdData);
        // Check if hold belongs to this user and is not expired
        if (hold.userId !== userId) {
          notHeldSeats.push(seatLabel);
        } else if (Date.now() > hold.expiresAt) {
          notHeldSeats.push(seatLabel);
        }
      }
    }

    // if (notHeldSeats.length > 0) {
    //   const notHeldLabels = notHeldSeats.join(', ');
    //   return ResponseUtil.errorResponse(
    //     res,
    //     STATUS_CODES.BAD_REQUEST,
    //     `You must hold seats ${notHeldLabels} before booking. Please select and hold the seats first.`
    //   );
    // }

    // Determine booking type
    let forType = ForWho.SELF;
    let groupTicketSerial = null;
    const passengersDB = [];

    if (passengersData.length > 1) {
      forType = ForWho.FAMILY;
      groupTicketSerial = `TKT-${Date.now()}-${passengersData.length}`;
    }

    // Create passenger records
    for (let i = 0; i < passengersData.length; i++) {
      const passenger = passengersData[i];
      
      // Properly validate and format the date of birth
      // if (passenger.dob) {
      //   // If dob is a string, try to parse it
      //   if (typeof passenger.dob === 'string') {
      //     const dateObj = new Date(passenger.dob);
      //     // Check if the date is valid
      //     if (isNaN(dateObj.getTime())) {
      //       throw new Error(`Invalid date format for passenger ${i + 1}: ${passenger.dob}`);
      //     }
      //     passenger.dob = dateObj;
      //   }
      //   // If it's already a Date object, validate it
      //   else if (passenger.dob instanceof Date) {
      //     if (isNaN(passenger.dob.getTime())) {
      //       throw new Error(`Invalid date for passenger ${i + 1}`);
      //     }
      //   }
      // } else {
      //   throw new Error(`Date of birth is required for passenger ${i + 1}`);
      // }

      const create = await PassengerModel.create({
        user: userId,
        bookedBy: bookedBy? bookedBy : UserRole.CUSTOMER,
        seatLabel: passenger.seatLabel,
        busId: getBus._id,
        for: forType,
        ticketNumber: `TKT-${Date.now()}-${i}`,
        groupTicketSerial: groupTicketSerial,
        fullName: passenger.fullName,
        gender: passenger.gender,
        dob: passenger.dob,
        contactNumber: passenger.contactNumber,
        DocumentId: passenger.DocumentId,
        type: TripType.ONE_WAY,
        From: (getRoutePrice as any)?.origin?.name || "Origin",
        To: (getRoutePrice as any)?.destination?.name || "Destination",
        DepartureDate: (getRoutePrice as any)?.departureTime || new Date(),
        ReturnDate: new Date(),
      });
      passengersDB.push(create);
    }

    // Update bus seat status to BOOKED
    for (const passenger of passengersData) {
      if (!passenger.seatLabel) continue; // Skip if seatLabel is undefined
      
      await BusModel.updateOne(
        {
          _id: getBus._id,
          "seatLayout.seats.seatLabel": passenger.seatLabel
        },
        {
          $set: {
            "seatLayout.seats.$.status": SeatStatus.BOOKED,
            "seatLayout.seats.$.isAvailable": false
          }
        }
      );

      // Delete the Redis hold for this seat since it's now permanently booked
      const holdKey = RedisKeys.seatHold(routeId, passenger.seatLabel);
      await redis.del(holdKey);
      
      // Remove from user holds set
      await redis.srem(RedisKeys.userHolds(userId), `${routeId}:${passenger.seatLabel}`);

      // Emit seat status change to all users in the route room
      io.to(`route:${routeId}`).emit('seat:status:changed', {
        routeId: routeId,
        seatLabel: passenger.seatLabel,
        status: SeatStatus.BOOKED,
        userId: userId,
        busId: busId
      });
    }

    // Generate individual QR codes for each passenger/seat
    const passengersWithQR = [];
    const pricePerSeat = (paymentIntent.amount / 100) / passengersData.length;
    
    for (const passenger of passengersDB) {
      // Create QR code data for individual passenger
      const qrCodeData = QRCodeUtils.createBookingQRData({
        ticketNumber: passenger.ticketNumber,
        // userId: userId,
        // routeId: routeId,
        // busId: getBus._id?.toString() || busId,
        // passengers: [passenger], // Single passenger
        // routeInfo: {
        //   from: (getRoutePrice as any)?.origin?.name || "Origin",
        //   to: (getRoutePrice as any)?.destination?.name || "Destination",
        //   departureDate: (getRoutePrice as any)?.departureTime || new Date(),
        //   returnDate: new Date()
        // },
        // paymentType: "stripe",
        // totalPrice: pricePerSeat,
        // groupTicketSerial: groupTicketSerial || undefined
      });

      // Generate QR code as base64 string for this passenger
      const qrCodeBase64 = await QRCodeUtils.generateQRCodeAsBase64(qrCodeData);

      // Save QR code to passenger record in database
      passenger.qrCode = qrCodeBase64;
      await passenger.save();

      // Add QR code to passenger data
      passengersWithQR.push({
        ...passenger.toObject(),
        qrCode: {
          data: qrCodeBase64,
          bookingId: qrCodeData.ticketNumber,
          format: "base64"
        }
      });
    }

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

    // Clean up passengers data from Redis since booking is complete
    if (metadata.passengersRedisKey) {
      await redis.del(metadata.passengersRedisKey);
    }

    // Return the same response format as cash payment
    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      {
        passengers: passengersWithQR,
        type: "stripe",
        bookingsCount: passengersData.length,
        groupTicketSerial: groupTicketSerial,
        paymentIntentId: paymentIntentId,
        message: `Generated ${passengersWithQR.length} individual QR code(s)`
      },
      AUTH_CONSTANTS.BOOKING_SUCCESS
    );

  } catch (error: any) {
    console.error('Error confirming Stripe payment:', error);
    return ResponseUtil.errorResponse(
      res,
      500,
      error.message || "Failed to confirm payment"
    );
  }
};
