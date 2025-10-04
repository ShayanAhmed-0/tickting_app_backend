import { Request, Response } from "express";
import { STATUS_CODES } from "../../constants/statusCodes";
import ResponseUtil from "../../utils/Response/responseUtils";
import { ADMIN_CONSTANTS } from "../../constants/messages";
import { CustomError } from "../../classes/CustomError";
import Bus from "../../models/bus.model";
import { SeatLayoutType, SeatType, Seat, SeatStatus } from "../../models/common/types";
import helper from "../../helper";

// Function to generate the 54-seat layout based on the provided image
const generateSeatLayout = () => {
  const seats: Seat[] = [];
  
  // Left section seats (28 seats)
  const leftSectionSeats = [
    { seatNumber: 3, row: 1, position: 'left' },
    { seatNumber: 4, row: 1, position: 'left' },
    { seatNumber: 7, row: 2, position: 'left' },
    { seatNumber: 8, row: 2, position: 'left' },
    { seatNumber: 11, row: 3, position: 'left' },
    { seatNumber: 12, row: 3, position: 'left' },
    { seatNumber: 15, row: 4, position: 'left' },
    { seatNumber: 16, row: 4, position: 'left' },
    { seatNumber: 19, row: 5, position: 'left' },
    { seatNumber: 20, row: 5, position: 'left' },
    { seatNumber: 23, row: 6, position: 'left' },
    { seatNumber: 24, row: 6, position: 'left' },
    { seatNumber: 27, row: 7, position: 'left' },
    { seatNumber: 28, row: 7, position: 'left' },
    { seatNumber: 31, row: 8, position: 'left' },
    { seatNumber: 32, row: 8, position: 'left' },
    { seatNumber: 35, row: 9, position: 'left' },
    { seatNumber: 36, row: 9, position: 'left' },
    { seatNumber: 39, row: 10, position: 'left' },
    { seatNumber: 40, row: 10, position: 'left' },
    { seatNumber: 43, row: 11, position: 'left' },
    { seatNumber: 44, row: 11, position: 'left' },
    { seatNumber: 47, row: 12, position: 'left' },
    { seatNumber: 48, row: 12, position: 'left' },
    { seatNumber: 53, row: 13, position: 'left' },
    { seatNumber: 54, row: 13, position: 'left' },
    { seatNumber: 55, row: 14, position: 'left' },
    { seatNumber: 56, row: 14, position: 'left' }
  ];

  // Right section seats (26 seats)
  const rightSectionSeats = [
    { seatNumber: 1, row: 1, position: 'right' },
    { seatNumber: 2, row: 1, position: 'right' },
    { seatNumber: 5, row: 2, position: 'right' },
    { seatNumber: 6, row: 2, position: 'right' },
    { seatNumber: 9, row: 3, position: 'right' },
    { seatNumber: 10, row: 3, position: 'right' },
    { seatNumber: 13, row: 4, position: 'right' },
    { seatNumber: 14, row: 4, position: 'right' },
    { seatNumber: 17, row: 5, position: 'right' },
    { seatNumber: 18, row: 5, position: 'right' },
    { seatNumber: 21, row: 6, position: 'right' },
    { seatNumber: 22, row: 6, position: 'right' },
    { seatNumber: 25, row: 7, position: 'right' },
    { seatNumber: 26, row: 7, position: 'right' },
    { seatNumber: 29, row: 8, position: 'right' },
    { seatNumber: 30, row: 8, position: 'right' },
    { seatNumber: 33, row: 9, position: 'right' },
    { seatNumber: 34, row: 9, position: 'right' },
    { seatNumber: 37, row: 10, position: 'right' },
    { seatNumber: 38, row: 10, position: 'right' },
    { seatNumber: 41, row: 11, position: 'right' },
    { seatNumber: 42, row: 11, position: 'right' },
    { seatNumber: 45, row: 12, position: 'right' },
    { seatNumber: 46, row: 12, position: 'right' },
    { seatNumber: 49, row: 13, position: 'right' },
    { seatNumber: 50, row: 13, position: 'right' }
  ];

  // Combine all seats
  const allSeats = [...leftSectionSeats, ...rightSectionSeats];

  // Generate seat objects
  allSeats.forEach((seat, index) => {
    seats.push({
      seatLabel: seat.seatNumber.toString(),
      seatIndex: index + 1,
      type: SeatType.REGULAR,
      isAvailable: true,
      status: SeatStatus.AVAILABLE,
      meta: {
        seatNumber: seat.seatNumber,
        row: seat.row,
        position: seat.position,
        section: seat.position === 'left' ? 'left' : 'right'
      }
    });
  });

  return {
    type: SeatLayoutType.STANDARD,
    seats: seats
  };
};

export const createBus = async (req: Request, res: Response) => {
    try {
      const { 
        code, 
        description, 
        serialNumber,  
        isActive, 
        driverId, 
        departureTime, 
        departureDays 
      } = req.body;

      // Check if bus with same code or serial number already exists
      const existingBus = await Bus.findOne({
        $or: [
          { code: code },
          { serialNumber: serialNumber }
        ]
      });

      if (existingBus) {
        throw new CustomError(STATUS_CODES.CONFLICT, ADMIN_CONSTANTS.BUS_ALREADY_EXISTS);
      }

      // Generate seat layout
      const seatLayout = generateSeatLayout();

      // Create new bus
      const newBus = new Bus({
        code,
        description: description || null,
        serialNumber,
        capacity: seatLayout.seats.length,
        seatLayout,
        isActive: isActive !== undefined ? isActive : true,
        driver: driverId || null,
        departureTime: departureTime ? new Date(departureTime) : null,
        departureDay: departureDays || []
      });

      const savedBus = await newBus.save();

      return ResponseUtil.successResponse(
        res,
        STATUS_CODES.CREATED,
        {
          bus: {
            id: savedBus._id,
            code: savedBus.code,
            description: savedBus.description,
            serialNumber: savedBus.serialNumber,
            capacity: savedBus.capacity,
            seatLayout: savedBus.seatLayout,
            isActive: savedBus.isActive,
            driver: savedBus.driver,
            departureTime: savedBus.departureTime,
            departureDay: savedBus.departureDay
          }
        },
        ADMIN_CONSTANTS.BUS_CREATED
      );
    } catch (err) {
      if (err instanceof CustomError)
        return ResponseUtil.errorResponse(res, err.statusCode, err.message);
      ResponseUtil.handleError(res, err);
    }
  };

export const getBuses = async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query;
    const query = { isActive: true, isDeleted: false };
    const options = {
      page: Number(page),
      limit: Number(limit),
      sort: { createdAt: -1 } as Record<string, 1 | -1>,
      populate: [{ path: "driver", select: "firstName lastName" }],
    };
    const buses = await helper.PaginateHelper.customPaginate("buses", Bus, query, options);
    return ResponseUtil.successResponse(res, STATUS_CODES.SUCCESS, { buses }, ADMIN_CONSTANTS.BUS_FETCHED);
  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
}