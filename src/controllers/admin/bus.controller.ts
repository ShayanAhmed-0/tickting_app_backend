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
  
  // Standard bus layout: 4 seats per row (2 right + 2 left)
  // Pattern per row: [2,1] (right), [4,3] (left) for row 1
  //                  [6,5] (right), [8,7] (left) for row 2, etc.
  const seatsPerRow = 4;
  const totalRows = Math.ceil(capacity / seatsPerRow);
  
  let seatIndex = 1;
  
  for (let row = 1; row <= totalRows; row++) {
    // Calculate base seat number for this row
    const baseNum = (row - 1) * 4 + 1;
    
    // Row pattern: [baseNum+1, baseNum, baseNum+3, baseNum+2]
    // Which is: [2, 1, 4, 3] for row 1, [6, 5, 8, 7] for row 2, etc.
    const rowSeats = [
      { num: baseNum + 1, position: 'right', column: 1 },  // Right column 1 (even: 2, 6, 10...)
      { num: baseNum,     position: 'right', column: 2 },  // Right column 2 (odd: 1, 5, 9...)
      { num: baseNum + 3, position: 'left',  column: 1 },  // Left column 1 (even: 4, 8, 12...)
      { num: baseNum + 2, position: 'left',  column: 2 }   // Left column 2 (odd: 3, 7, 11...)
    ];
    
    for (const seat of rowSeats) {
      if (seat.num <= capacity) {
        seats.push({
          seatLabel: seat.num.toString(),
          seatIndex: seatIndex,
          type: SeatType.REGULAR,
          isAvailable: true,
          status: SeatStatus.AVAILABLE,
          meta: {
            seatNumber: seat.num,
            row: row,
            position: seat.position,
            section: seat.position,
            column: seat.column
          }
        });
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
        mxdriverId, 
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
        mxdriverId: mxdriverId || null,
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
      populate: [{ path: "driver", select: "profile", populate: { path: "profile", select: "firstName secondName lastName" } }, { path: "mxdriverId", select: "profile", populate: { path: "profile", select: "firstName secondName lastName" } }],
    };
    const buses = await helper.PaginateHelper.customPaginate("buses", Bus, query, options);
    return ResponseUtil.successResponse(res, STATUS_CODES.SUCCESS, { buses }, ADMIN_CONSTANTS.BUS_FETCHED);
  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
}

export const updateBus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, description, serialNumber, isActive, driverId, mxdriverId, departureTime, departureDays, capacity } = req.body;
    
    // Build update object with only provided fields
    const updateData: any = {};
    if (code !== undefined) updateData.code = code;
    if (description !== undefined) updateData.description = description;
    if (serialNumber !== undefined) updateData.serialNumber = serialNumber;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (driverId !== undefined) updateData.driver = driverId; // Fix: use 'driver' field name
    if (mxdriverId !== undefined) updateData.mxdriverId = mxdriverId; // Fix: use 'mxdriverId' field name
    if (departureTime !== undefined) updateData.departureTime = departureTime;
    if (departureDays !== undefined) updateData.departureDay = departureDays; // Fix: use 'departureDay' field name
    if (capacity !== undefined) updateData.capacity = capacity;
    
    const bus = await Bus.findByIdAndUpdate(id, updateData, { 
      new: true,
      populate: [{ path: "driver", select: "firstName lastName" }, { path: "mxdriverId", select: "firstName lastName" }]
    });
    
    if (!bus) {
      throw new CustomError(STATUS_CODES.NOT_FOUND, ADMIN_CONSTANTS.BUS_NOT_FOUND);
    }
    
    return ResponseUtil.successResponse(res, STATUS_CODES.SUCCESS, { bus }, ADMIN_CONSTANTS.BUS_UPDATED);
  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
}

export const deleteBus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bus = await Bus.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    return ResponseUtil.successResponse(res, STATUS_CODES.SUCCESS, { bus }, ADMIN_CONSTANTS.BUS_DELETED);
  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
}