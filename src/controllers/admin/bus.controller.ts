import { Request, Response } from "express";
import { STATUS_CODES } from "../../constants/statusCodes";
import ResponseUtil from "../../utils/Response/responseUtils";
import { ADMIN_CONSTANTS } from "../../constants/messages";
import { CustomError } from "../../classes/CustomError";
import Bus from "../../models/bus.model";
import { SeatLayoutType, SeatType, Seat, SeatStatus } from "../../models/common/types";
import helper from "../../helper";

// Function to dynamically generate seat layout based on bus capacity
// Standard layout: 4 seats per row (2 right + 2 left)
// Seat numbering: 1-2 (right), 3-4 (left), 5-6 (right), 7-8 (left), etc.
const generateSeatLayout = (capacity: number) => {
  const seats: Seat[] = [];
  
  // Standard bus layout: 4 seats per row (2 left + 2 right)
  // Pattern: seat 1-2 (right), seat 3-4 (left), seat 5-6 (right), seat 7-8 (left), etc.
  const seatsPerRow = 4;
  const totalRows = Math.ceil(capacity / seatsPerRow);
  
  let seatNumber = 1;
  let seatIndex = 1;
  
  for (let row = 1; row <= totalRows; row++) {
    // Generate 2 right seats for this row
    for (let i = 0; i < 2; i++) {
      if (seatNumber <= capacity) {
        seats.push({
          seatLabel: seatNumber.toString(),
          seatIndex: seatIndex,
          type: SeatType.REGULAR,
          isAvailable: true,
          status: SeatStatus.AVAILABLE,
          meta: {
            seatNumber: seatNumber,
            row: row,
            position: 'right',
            section: 'right',
            column: i + 1
          }
        });
        seatNumber++;
        seatIndex++;
      }
    }
    
    // Generate 2 left seats for this row
    for (let i = 0; i < 2; i++) {
      if (seatNumber <= capacity) {
        seats.push({
          seatLabel: seatNumber.toString(),
          seatIndex: seatIndex,
          type: SeatType.REGULAR,
          isAvailable: true,
          status: SeatStatus.AVAILABLE,
          meta: {
            seatNumber: seatNumber,
            row: row,
            position: 'left',
            section: 'left',
            column: i + 1
          }
        });
        seatNumber++;
        seatIndex++;
      }
    }
  }

  return {
    type: SeatLayoutType.STANDARD,
    seats: seats.slice(0, capacity) // Ensure we only return exactly 'capacity' seats
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
        departureDays,
        capacity
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
      const seatLayout = generateSeatLayout(capacity);

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