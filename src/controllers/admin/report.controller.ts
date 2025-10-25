import { Request, Response } from "express";
import { STATUS_CODES } from "../../constants/statusCodes";
import ResponseUtil from "../../utils/Response/responseUtils";
import { ADMIN_CONSTANTS } from "../../constants/messages";
import { CustomError } from "../../classes/CustomError";
import RouteModel from "../../models/route.model";
import BusModel from "../../models/bus.model";
import PassengerModel from "../../models/passenger.models";
import AuthModel from "../../models/auth.model";
import OfficeModel from "../../models/office.model";
import DestinationModel from "../../models/destinations.model";
import { SeatStatus, UserRole } from "../../models/common/types";
import helper from "../../helper";
import mongoose from "mongoose";

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
      .populate({
        path: 'bus',
        select: 'serialNumber code driver seatLayout capacity totalBookedSeats',
        populate: {
          path: 'driver',
          select: 'profile',
          populate: {
            path: 'profile',
            select: 'firstName secondName lastName contactNumber'
          }
        }
      });

    if (!route) {
      return ResponseUtil.errorResponse(res, STATUS_CODES.NOT_FOUND, "Route not found");
    }

    const busDetails = route.bus as any;
    if (!busDetails) {
      return ResponseUtil.errorResponse(res, STATUS_CODES.NOT_FOUND, "Bus not found for this route");
    }

    // Create a new date object to avoid modifying the original
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all passengers for this route and date
    const passengers = await PassengerModel.find({
      busId: busDetails._id,
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
    const availableSeats = seatReport.filter((seat: any) => seat.isFree).length;
    const occupiedSeats = passengers.filter(p => p.alreadyScanned).length;

    // Get driver information
    const driver = busDetails.driver as any;
    const driverInfo = driver ? {
      id: driver._id,
      name: driver.profile ? `${driver.profile.firstName || ''} ${driver.profile.secondName || ''} ${driver.profile.lastName || ''}`.trim() || 'Unknown Driver' : 'Unknown Driver',
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
      seatReport: seatReport.map((seat: any) => ({
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

export const getSalesReport = async (req: Request, res: Response) => {
  try {
    const { fromDate, toDate, salesDateType, salesAgent, salesOffice, page, limit } = req.query;

    // Build query for customPaginate
    const query: any = { isCancelled: false , bookedBy: { $nin: [UserRole.CUSTOMER, UserRole.DRIVER] }};

    // Date filtering
    if (fromDate || toDate) {
      // 'sale' = By Sale Date (createdAt), 'departure' = By Departure Date (DepartureDate)
      const dateField = salesDateType === 'departure' ? 'DepartureDate' : 'createdAt';
      query[dateField] = {};

      if (fromDate) {
        const startDate = new Date(fromDate as string);
        startDate.setHours(0, 0, 0, 0);
        query[dateField].$gte = startDate;
      }

      if (toDate) {
        const endDate = new Date(toDate as string);
        endDate.setHours(23, 59, 59, 999);
        query[dateField].$lte = endDate;
      }
    }

    // Sales agent filter
    if (salesAgent) {
      query.user = salesAgent;
    }

    // Sales office filter
    if (salesOffice) { 
      query.salesOffice = salesOffice;
    }

    // Pagination options with populate
    const options = {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      sort: { createdAt: -1 } as Record<string, 1 | -1>,
      populate: [
        {
          path: 'user',
          select: 'profile',
          populate: {
            path: 'profile',
            select: 'firstName secondName lastName contactNumber'
          }
        },
        {
          path: 'busId',
          select: 'serialNumber code'
        }
      ]
    };

    // Fetch paginated data
    const salesData = await helper.PaginateHelper.customPaginate(
      "sales",
      PassengerModel,
      query,
      options
    );

    // Get unique destination names for sales office lookup
    // const destinationNames = [...new Set(
    //   (salesData as any).sales.flatMap((p: any) => [p.From, p.To])
    // )];

    // const destinations = await DestinationModel.find({ 
    //   name: { $in: destinationNames },
    //   isActive: true 
    // }).populate('salesOffice', 'name');
    
    // // Create a map for quick destination lookup by name
    // const destinationMap = new Map(
    //   destinations.map((dest: any) => [dest.name, dest])
    // );

    // Transform the data to match the report format
    const formattedSales = (salesData as any).sales.map((passenger: any) => {
      const user = passenger.user as any;
      const bus = passenger.busId as any;
      
      // Get agent name
      const soldBy = user?.profile 
        ? `${user.profile.firstName || ''} ${user.profile.secondName || ''} ${user.profile.lastName || ''}`.trim()
        : 'Unknown';

      // Use stored price and currency from passenger record
      const price = passenger.price || 0;
      const currency = passenger.currency || 'MXN';

      // Get sales office from destination
      // let salesOfficeName = 'Main Office Dallas'; // Default
      // const destination = destinationMap.get(passenger.To);
      // if (destination && destination.salesOffice) {
      //   salesOfficeName = (destination.salesOffice as any).name || salesOfficeName;
      // }

      return {
        salesOffice: passenger.office,
        soldBy,
        from: passenger.From,
        to: passenger.To,
        departureDate: new Date(passenger.DepartureDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }),
        passenger: passenger.fullName,
        price: `$${price.toFixed(2)}`,
        qty: 1,
        ticketNumber: passenger.ticketNumber,
        seatLabel: passenger.seatLabel,
        contactNumber: passenger.contactNumber,
        busCode: bus?.code || 'N/A',
        bookedAt: passenger.createdAt,
        type: passenger.type
      };
    });

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      {
        sales: formattedSales,
        totalDocs: (salesData as any).totalDocs,
        currentPage: (salesData as any).currentPage,
        totalPages: (salesData as any).totalPages,
        hasNextPage: (salesData as any).hasNextPage,
        hasPrevPage: (salesData as any).hasPrevPage
      },
      "Sales report generated successfully"
    );

  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
};
