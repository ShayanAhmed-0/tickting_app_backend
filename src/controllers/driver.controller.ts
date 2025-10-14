import { Request, Response } from "express";
import ResponseUtil from "../utils/Response/responseUtils";
import { STATUS_CODES } from "../constants/statusCodes";
import { ADMIN_CONSTANTS, AUTH_CONSTANTS, DRIVER_CONSTANTS } from "../constants/messages";
import { CustomError } from "../classes/CustomError";
import PassengerModel from "../models/passenger.models";
import { TicketStatus, TripType } from "../models";
import { CustomRequest } from "../interfaces/auth";
import BusModel from "../models/bus.model";
import { createPaymentIntent } from "../utils/Stripe/stripe";

export const verifyTicket = async (req: CustomRequest, res: Response) => {
    try {
        const { ticketNumber } = req.body;
        if(!ticketNumber){
            throw new CustomError(STATUS_CODES.BAD_REQUEST, DRIVER_CONSTANTS.TICKET_NUMBER_REQUIRED);
        }
        const getPassenger = await PassengerModel.findOne({ ticketNumber }).select("-qrCode");
        const getBus = await BusModel.findById(getPassenger?.busId);
        if(!getBus){
            throw new CustomError(STATUS_CODES.NOT_FOUND, ADMIN_CONSTANTS.BUS_NOT_FOUND);
        }
        if(getBus.driver?.toString() !== req.authId){
            throw new CustomError(STATUS_CODES.BAD_REQUEST, DRIVER_CONSTANTS.BUS_NOT_ASSIGNED_TO_DRIVER);
        }
        if (!getPassenger) {
            throw new CustomError(STATUS_CODES.NOT_FOUND, DRIVER_CONSTANTS.TICKET_NOT_FOUND);
        }

        if (getPassenger.scannedForTicketCount > 2 && getPassenger.type === TripType.ROUND_TRIP) {
            throw new CustomError(STATUS_CODES.BAD_REQUEST, DRIVER_CONSTANTS.TICKET_ALREADY_USED);
        }
        if (getPassenger.status === TicketStatus.USED) {
            throw new CustomError(STATUS_CODES.BAD_REQUEST, DRIVER_CONSTANTS.TICKET_ALREADY_USED);
        }
        if (getPassenger.scannedForTicketCount === 1 && getPassenger.type === TripType.ROUND_TRIP) {
            const updatedPassenger = await PassengerModel.findByIdAndUpdate(getPassenger._id, { $inc: { scannedForTicketCount: 1 } });
            return ResponseUtil.successResponse(res, STATUS_CODES.SUCCESS, { updatedPassenger }, DRIVER_CONSTANTS.TICKET_CONFIRMATION);
        }
        if (!getPassenger.isValid) {
            throw new CustomError(STATUS_CODES.BAD_REQUEST, DRIVER_CONSTANTS.TICKET_NOT_VALID);
        }
        let validity = true;
        if (getPassenger.type === TripType.ROUND_TRIP && getPassenger.scannedForTicketCount < 2) {
            validity = false;
        }
        if (getPassenger.type === TripType.ONE_WAY && getPassenger.scannedForTicketCount < 1) {
            validity = false;
        }

        if(getPassenger.scannedForTicketCount === 0){
            await BusModel.findByIdAndUpdate(getBus._id, { $inc: { passengerOnBoarded: 1 } });
        }
        const updatedPassenger = await PassengerModel.findByIdAndUpdate(getPassenger._id, { status: TicketStatus.USED, alreadyScanned: true, scannedForTicketCount: getPassenger.scannedForTicketCount + 1, scannedForBaggageCount: getPassenger.scannedForBaggageCount + 1, checkedInBy: req.authId, isValid: validity });

      
        return ResponseUtil.successResponse(res, STATUS_CODES.SUCCESS, { updatedPassenger }, DRIVER_CONSTANTS.TICKET_VERIFIED);
    } catch (err) {
        if (err instanceof CustomError)
            return ResponseUtil.errorResponse(res, err.statusCode, err.message);
        ResponseUtil.handleError(res, err);
    }
}

export const addBaggage = async (req: CustomRequest, res: Response) => {
    try {
        const { ticketNumber, baggageAmount } = req.body;
        const baggageWeight = baggageAmount
        // Validate required fields
        if (!ticketNumber) {
            throw new CustomError(STATUS_CODES.BAD_REQUEST, DRIVER_CONSTANTS.TICKET_NUMBER_REQUIRED);
        }
        
        if (!baggageAmount || baggageAmount <= 0) {
            throw new CustomError(STATUS_CODES.BAD_REQUEST, DRIVER_CONSTANTS.BAGGAGE_AMOUNT_REQUIRED);
        }

        // Find the passenger by ticket number
        const getPassenger = await PassengerModel.findOne({ ticketNumber });
        if (!getPassenger) {
            throw new CustomError(STATUS_CODES.NOT_FOUND, DRIVER_CONSTANTS.TICKET_NOT_FOUND);
        }

        // Verify the bus belongs to this driver
        const getBus = await BusModel.findById(getPassenger.busId);
        if (!getBus) {
            throw new CustomError(STATUS_CODES.NOT_FOUND, ADMIN_CONSTANTS.BUS_NOT_FOUND);
        }
        
        if (getBus.driver?.toString() !== req.authId) {
            throw new CustomError(STATUS_CODES.BAD_REQUEST, DRIVER_CONSTANTS.BUS_NOT_ASSIGNED_TO_DRIVER);
        }

        // Check if passenger has already purchased extra baggage
        if (getPassenger.extraBaggageIntentId) {
            throw new CustomError(STATUS_CODES.BAD_REQUEST, DRIVER_CONSTANTS.BAGGAGE_ALREADY_PURCHASED);
        }

        // Check if ticket is valid
        // if (!getPassenger.isValid) {
        //     throw new CustomError(STATUS_CODES.BAD_REQUEST, DRIVER_CONSTANTS.TICKET_NOT_VALID);
        // }

        // Check if ticket is cancelled
        if (getPassenger.isCancelled) {
            throw new CustomError(STATUS_CODES.BAD_REQUEST, DRIVER_CONSTANTS.BAGGAGE_CANNOT_ADD_CANCELLED);
        }

        const paymentIntent = await createPaymentIntent(baggageAmount,{
            type: 'extra_baggage',
            passengerId: (getPassenger._id as any).toString(),
            ticketNumber: ticketNumber,
            baggageWeight: baggageWeight.toString(),
            baggageAmount: baggageAmount.toString(),
            driverId: req.authId,
            busId: (getBus._id as any).toString(),
        })

        // Update passenger record with payment intent ID (temporary)
        await PassengerModel.findByIdAndUpdate(getPassenger._id, {
            extraBaggageIntentId: paymentIntent.id
        });

        return ResponseUtil.successResponse(
            res,
            STATUS_CODES.SUCCESS,
            {
                paymentIntent: {
                    id: paymentIntent.id,
                    clientSecret: paymentIntent.client_secret,
                    totalAmount: paymentIntent.amount / 100, 
                },
                passenger: {
                    ticketNumber: getPassenger.ticketNumber,
                    fullName: getPassenger.fullName,
                    seatLabel: getPassenger.seatLabel
                },
                baggage: {
                    weight: baggageWeight,
                    amount: baggageAmount
                }
            },
            DRIVER_CONSTANTS.BAGGAGE_PAYMENT_INTENT_CREATED
        );
    } catch (err) {
        if (err instanceof CustomError)
            return ResponseUtil.errorResponse(res, err.statusCode, err.message);
        ResponseUtil.handleError(res, err);
    }
}

export const getPassengersCount = async (req: CustomRequest, res: Response) => {
    try {
        const authId = req.authId;
        const getBus = await BusModel.findOne({ driver: authId });
        if(!getBus){
            throw new CustomError(STATUS_CODES.NOT_FOUND, ADMIN_CONSTANTS.BUS_NOT_FOUND);
        }

        return ResponseUtil.successResponse(res, STATUS_CODES.SUCCESS, { 
            totalBookedSeats: getBus.totalBookedSeats,
            passengerOnBoarded: getBus.passengerOnBoarded
         }, DRIVER_CONSTANTS.PASSENGERS_COUNT_FETCHED);
    } catch (err) {
        if (err instanceof CustomError)
            return ResponseUtil.errorResponse(res, err.statusCode, err.message);
        ResponseUtil.handleError(res, err);
    }
}