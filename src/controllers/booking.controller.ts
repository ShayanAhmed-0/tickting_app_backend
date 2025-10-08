import { Response } from "express";
import { CustomError } from "../classes/CustomError";
import { CustomRequest } from "../interfaces/auth";
import ResponseUtil from "../utils/Response/responseUtils";
import seatBookingService from "../services/seatBooking.service";
import { STATUS_CODES } from "../constants/statusCodes";
import { AUTH_CONSTANTS } from "../constants/messages";

export const bookSeats = async (req: CustomRequest, res: Response) => {
  try {
    const { userId, routeId, seatIds, passengers, paymentInfo } = req.body;
    const booking = await seatBookingService.confirmBooking(userId, routeId, seatIds, passengers, paymentInfo);
    // return ResponseUtil.successResponse(res, booking??{});
    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { booking },
      AUTH_CONSTANTS.OTP_SENT
    );
  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
};