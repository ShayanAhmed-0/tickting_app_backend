import { Request, Response } from "express";
import { STATUS_CODES } from "../../constants/statusCodes";
import ResponseUtil from "../../utils/Response/responseUtils";
import { ADMIN_CONSTANTS } from "../../constants/messages";
import { CustomError } from "../../classes/CustomError";
import RouteModel from "../../models/route.model";
import BusModel from "../../models/bus.model";
import PassengerModel from "../../models/passenger.models";
import AuthModel from "../../models/auth.model";
import { SeatStatus } from "../../models/common/types";

export const getRouteSeatReport = async (req: Request, res: Response) => {
  try {
    const { routeId, date } = req.query;

    if (!routeId) {
      return ResponseUtil.errorResponse(res, STATUS_CODES.BAD_REQUEST, "Route ID is required");
    }

    if (!date) {
      return ResponseUtil.errorResponse(res, STATUS_CODES.BAD_REQUEST, "Date is required");
    }

    // Parse the date
    const reportDate = new Date(date as string);
    if (isNaN(reportDate.getTime())) {
      return ResponseUtil.errorResponse(res, STATUS_CODES.BAD_REQUEST, "Invalid date format");
    }

    // Find the route with populated data
    const route = await RouteModel.findById(routeId)
      .populate('origin', 'name description')
      .populate('destination', 'name description')
      .populate('bus', 'serialNumber code driver')
      .populate('bus.driver', 'profile');

    if (!route) {
      return ResponseUtil.errorResponse(res, STATUS_CODES.NOT_FOUND, "Route not found");
    }

    const bus = route.bus as any;
    if (!bus) {
      return ResponseUtil.errorResponse(res, STATUS_CODES.NOT_FOUND, "Bus not found for this route");
    }

    // Get bus details with seat layout
    const busDetails = await BusModel.findById(bus._id).populate('driver', 'profile');
    if (!busDetails) {
      return ResponseUtil.errorResponse(res, STATUS_CODES.NOT_FOUND, "Bus details not found");
    }

    // Create a new date object to avoid modifying the original
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all passengers for this route and date
    const passengers = await PassengerModel.find({
      busId: bus._id,
      DepartureDate: {
        $gte: startOfDay,
        $lt: endOfDay
      },
      isCancelled: false
    }).sort({ seatLabel: 1 });


    // Create seat report data
    const seatLayout = busDetails.seatLayout;
    const seats = seatLayout.seats || [];
    
    // Sort seats by seat label for proper ordering
    seats.sort((a: any, b: any) => {
      const aNum = parseInt(a.seatLabel.replace(/\D/g, ''));
      const bNum = parseInt(b.seatLabel.replace(/\D/g, ''));
      return aNum - bNum;
    });

    const seatReport = seats.map((seat: any) => {
      const passenger = passengers.find(p => p.seatLabel === seat.seatLabel);
      
      // Priority logic: If there's a passenger record, seat is occupied
      // If no passenger record, check bus seat status
      const isSeatFree = !passenger;
      
      return {
        seatNumber: seat.seatLabel,
        seatIndex: seat.seatIndex,
        status: isSeatFree ? SeatStatus.AVAILABLE : SeatStatus.BOOKED,
        isAvailable: isSeatFree,
        passengerInfo: passenger ? {
          fullName: passenger.fullName,
          ticketNumber: passenger.ticketNumber,
          contactNumber: passenger.contactNumber,
          isReturnTrip: passenger.ticketNumber?.includes('-RT') || false
        } : null,
        isFree: isSeatFree
      };
    });

    // Calculate statistics based on actual passenger records
    const totalSeats = seats.length;
    const bookedSeats = passengers.length;
    const availableSeats = seatReport.filter(seat => seat.isFree).length;
    const occupiedSeats = passengers.filter(p => p.alreadyScanned).length;

    // Get driver information
    const driver = busDetails.driver as any;
    const driverInfo = driver ? {
      id: driver._id,
      name: driver.profile?.fullName || 'Unknown Driver',
      contact: driver.profile?.contactNumber || 'N/A'
    } : null;

    // Format the response data similar to the interface shown
    const reportData = {
      routeInfo: {
        id: route._id,
        name: route.name,
        from: (route.origin as any)?.name || 'Unknown',
        to: (route.destination as any)?.name || 'Unknown',
        date: reportDate.toISOString().split('T')[0],
        time: route.dayTime && route.dayTime.length > 0 ? route.dayTime[0].time : 'N/A'
      },
      busInfo: {
        id: busDetails._id,
        serialNumber: busDetails.serialNumber,
        code: busDetails.code,
        driver: driverInfo,
        capacity: busDetails.capacity,
        totalBookedSeats: busDetails.totalBookedSeats
      },
      statistics: {
        totalSeats,
        bookedSeats,
        availableSeats,
        occupiedSeats,
        occupancyRate: totalSeats > 0 ? ((bookedSeats / totalSeats) * 100).toFixed(1) : '0'
      },
      seatReport: seatReport.map(seat => ({
        seatNumber: seat.seatNumber,
        status: seat.isFree ? 'Free' : 'Occupied',
        passengerName: seat.passengerInfo?.fullName || (seat.isFree ? 'Free' : 'Unknown'),
        ticketNumber: seat.passengerInfo?.ticketNumber || null,
        isReturnTrip: seat.passengerInfo?.isReturnTrip || false,
        // Additional fields for frontend display
        displayText: seat.isFree ? 'Free' : `${seat.seatNumber}: ${seat.passengerInfo?.fullName?.toUpperCase() || 'UNKNOWN'}`,
        isAvailable: seat.isFree
      })),
      generatedAt: new Date().toISOString()
    };

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      reportData,
      "Route seat report generated successfully"
    );

  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
};
