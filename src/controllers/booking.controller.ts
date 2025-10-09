import { Response } from "express";
import { CustomError } from "../classes/CustomError";
import { CustomRequest } from "../interfaces/auth";
import ResponseUtil from "../utils/Response/responseUtils";
import seatBookingService from "../services/seatBooking.service";
import { STATUS_CODES } from "../constants/statusCodes";
import { AUTH_CONSTANTS } from "../constants/messages";
import RouteModel from "../models/route.model";
import { createPaymentIntent } from "../utils/Stripe/stripe";
import BusModel from "../models/bus.model";
import PassengerModel from "../models/passenger.models";
import { QRCodeUtils } from "../utils/QRCode";
import { ForWho, SeatStatus, TripType, UserRole } from "../models/common/types";
import { io } from "../server";
import AuthModel from "../models/auth.model";
import { redis, RedisKeys } from "../config/redis";

export const bookSeats = async (req: CustomRequest, res: Response) => {
  try {
    const { routeId,busId, paymentType,passengers, tripType,bookedBy=UserRole.CUSTOMER } = req.body;

    const userId = req.authId;
    if(!userId) {
      return ResponseUtil.errorResponse(res, STATUS_CODES.BAD_REQUEST, "User not found");
    }
    // const user = await AuthModel.findById(authId);
    // const userId = user?.profile?.toString() || "";
    const getRoutPrice = await RouteModel.findById(routeId).populate('destination');
    const getBus = await BusModel.findById(busId);
    if(!getBus) {
      return ResponseUtil.errorResponse(res, STATUS_CODES.BAD_REQUEST, "Bus not found");
    }
    // Get seat labels from passengers data
    const seatLabels = passengers.map((p: any) => p.seatLabel);
    
    // Get the actual seat objects from bus
    const getSeats = getBus.seatLayout.seats;
    const getUserSeats = getSeats.filter((seat) => seatLabels.includes(seat.seatLabel));
    
    // Validate that all requested seats exist
    if (getUserSeats.length !== passengers.length) {
      return ResponseUtil.errorResponse(
        res, 
        STATUS_CODES.BAD_REQUEST, 
        "One or more seats not found"
      );
    }

    // Check if seats are held/selected by this user or available
    const invalidSeats = getUserSeats.filter((seat) => {
      // Seat must be either:
      // 1. Available (no userId)
      // 2. Held/Selected by the current user
      const isAvailableOrOwnedByUser = 
        !seat.userId || 
        seat.userId.toString() === userId;
      
      return !isAvailableOrOwnedByUser;
    });

    if (invalidSeats.length > 0) {
      const seatLabelsInvalid = invalidSeats.map(s => s.seatLabel).join(', ');
      return ResponseUtil.errorResponse(
        res, 
        STATUS_CODES.BAD_REQUEST, 
        `Seats ${seatLabelsInvalid} are already held or booked by another user`
      );
    }

    // Check if any seats are already booked
    const alreadyBookedSeats = getUserSeats.filter((seat) => 
      seat.status === SeatStatus.BOOKED
    );

    if (alreadyBookedSeats.length > 0) {
      const bookedSeatLabels = alreadyBookedSeats.map(s => s.seatLabel).join(', ');
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

    if (notHeldSeats.length > 0) {
      const notHeldLabels = notHeldSeats.join(', ');
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        `You must hold seats ${notHeldLabels} before booking. Please select and hold the seats first.`
      );
    }
    
    let getTotalPrice = (getRoutPrice?.destination as any)?.priceFromDFW * passengers.length;
    if(tripType === TripType.ROUND_TRIP) {
      getTotalPrice = getTotalPrice * 2;
    }
    if(paymentType === "stripe") {
    // Add passengers data in redis with unique key and send that key in payment intent
    const { v4: uuidv4 } = require('uuid');
    const passengersRedisKey = `booking:passengers:${uuidv4()}`;
    await redis.set(passengersRedisKey, JSON.stringify(passengers), 'EX', 15 * 60); // expires in 15 min
    
    // Extend seat hold timer to give user enough time to complete payment (20 minutes)
    const extendedHoldDuration = 20 * 60; // 20 minutes in seconds
    for (const seatLabel of seatLabels) {
      const holdKey = RedisKeys.seatHold(routeId, seatLabel);
      const holdData = await redis.get(holdKey);
      
      if (holdData) {
        const hold = JSON.parse(holdData);
        // Update the expiration time
        hold.expiresAt = Date.now() + (extendedHoldDuration * 1000);
        await redis.setex(holdKey, extendedHoldDuration, JSON.stringify(hold));
      }
    }

    const paymentIntent = await createPaymentIntent(getTotalPrice, {
      routeId: routeId,
      userId: userId,
      bookedBy: bookedBy,
      totalPrice: getTotalPrice,
      seats: getUserSeats.length,
      busId: getBus._id?.toString() || busId,
      // passengers: JSON.stringify(passengers),
      passengersRedisKey: passengersRedisKey
    });

    // Return payment intent client secret to frontend
    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: getTotalPrice,
        bookingsCount: getUserSeats.length,
        data: req.body
      },
      "Payment intent created successfully"
    );
  }
  else{
    let forType = ForWho.SELF;
    let groupTicketSerial = null
    const passengersDB = []
    if(passengers.length > 1){
      forType = ForWho.FAMILY;
      groupTicketSerial = `TKT-${Date.now()}-${passengers.length}`;
    }
    for (let i = 0; i < passengers.length; i++) {
      const passenger = passengers[i];
      
      const create=await PassengerModel.create({
        user: userId,
        bookedBy: bookedBy, // Assuming user role
        seatLabel: passenger.seatLabel,
        busId: getBus._id?.toString() || busId,
        for: forType, // Assuming self booking
        ticketNumber: `TKT-${Date.now()}-${i}`,
        groupTicketSerial: groupTicketSerial,
        fullName: passenger.fullName,
        gender: passenger.gender,
        dob: passenger.dob,
        contactNumber: passenger.contactNumber,
        DocumentId: passenger.DocumentId,
        type: tripType, // Assuming one way trip
        From: (getRoutPrice as any)?.origin?.name || "Origin",
        To: (getRoutPrice as any)?.destination?.name || "Destination",
        DepartureDate: (getRoutPrice as any)?.departureTime || new Date(),
        ReturnDate: tripType === "round_trip" ? new Date() : null, // Set appropriate return date
      });
      passengersDB.push(create)
    }

    // Update bus seat status to BOOKED
    for (const seat of getUserSeats) {
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

    // Generate individual QR codes for each passenger/seat
    const passengersWithQR = [];
    for (const passenger of passengersDB) {
      // Create QR code data for individual passenger
      const qrCodeData = QRCodeUtils.createBookingQRData({
        userId: userId,
        routeId: routeId,
        busId: getBus._id?.toString() || busId,
        passengers: [passenger], // Single passenger
        routeInfo: {
          from: (getRoutPrice as any)?.origin?.name || "Origin",
          to: (getRoutPrice as any)?.destination?.name || "Destination",
          departureDate: (getRoutPrice as any)?.departureTime || new Date(),
          returnDate: tripType === "round_trip" ? new Date() : null
        },
        paymentType: paymentType,
        totalPrice: (getRoutPrice?.destination as any)?.priceFromDFW * (tripType === TripType.ROUND_TRIP ? 2 : 1),
        groupTicketSerial: groupTicketSerial || undefined
      });

      // Generate QR code as base64 string for this passenger
      const qrCodeBase64 = await QRCodeUtils.generateQRCodeAsBase64(qrCodeData);

      // Add QR code to passenger data
      passengersWithQR.push({
        ...passenger.toObject(),
        qrCode: {
          data: qrCodeBase64,
          bookingId: qrCodeData.bookingId,
          format: "base64"
        }
      });
    }

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { 
        passengers: passengersWithQR,
        type: paymentType, 
        bookingsCount: getUserSeats.length,
        groupTicketSerial: groupTicketSerial,
        message: `Generated ${passengersWithQR.length} individual QR code(s)`
      },
      AUTH_CONSTANTS.BOOKING_SUCCESS
    );
  }
    
    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      {},
      AUTH_CONSTANTS.BOOKING_SUCCESS
    );
  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
};