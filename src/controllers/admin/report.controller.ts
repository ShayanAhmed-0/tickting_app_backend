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
import BookingModel from "../../models/booking.model";
import DriverReport from "../../models/driver-report.model";
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

    // Get seat layout
    const seatLayout = busDetails.seatLayout;
    const seats = seatLayout.seats || [];

    // Collect all booking IDs and seat labels from departureDateBookings for the queried date
    const bookingIds: any[] = [];
    const bookedSeatLabels: string[] = [];
    
    seats.forEach((seat: any) => {
      (seat.departureDateBookings || []).forEach((booking: any) => {
        const bookingDate = new Date(booking.departureDate);
        if (bookingDate >= startOfDay && bookingDate < endOfDay) {
          if (booking.bookingId) {
            bookingIds.push(booking.bookingId);
          }
          if (booking.status === 'booked') {
            bookedSeatLabels.push(seat.seatLabel);
          }
        }
      });
    });

    // Get passengers for this bus and specific seat labels that are booked
    const passengers = await PassengerModel.find({
      busId: busDetails._id,
      seatLabel: { $in: bookedSeatLabels },
      isCancelled: false
    }).sort({ seatLabel: 1 });

    // Create a passenger map for quick lookup by seat label
    const passengerMap = new Map(passengers.map(p => [p.seatLabel, p]));

    // Fetch all bookings with passenger details
    const bookings = await BookingModel.find({
      _id: { $in: bookingIds }
    });

    // Create a map: bookingId + seatLabel -> passenger from booking
    const bookingPassengerMap = new Map();
    bookings.forEach((booking: any) => {
      (booking.passengers || []).forEach((passenger: any) => {
        if (passenger.seatLabel) {
          bookingPassengerMap.set(`${booking._id}_${passenger.seatLabel}`, passenger);
        }
      });
    });
    
    // Sort seats by seat label for proper ordering
    seats.sort((a: any, b: any) => {
      const aNum = parseInt(a.seatLabel.replace(/\D/g, ''));
      const bNum = parseInt(b.seatLabel.replace(/\D/g, ''));
      return aNum - bNum;
    });

    // Create seat report by checking both PassengerModel and departureDateBookings
    const seatReport = seats.map((seat: any) => {
      // Check departureDateBookings for this specific date
      const dateBooking = (seat.departureDateBookings || []).find((booking: any) => {
        const bookingDate = new Date(booking.departureDate);
        return bookingDate >= startOfDay && bookingDate < endOfDay;
      });

      // Get passenger from PassengerModel (source of truth if exists)
      const passenger = passengerMap.get(seat.seatLabel);
      
      // Get passenger from Booking model if no PassengerModel record
      let bookingPassenger = null;
      if (!passenger && dateBooking?.bookingId) {
        bookingPassenger = bookingPassengerMap.get(`${dateBooking.bookingId}_${seat.seatLabel}`);
      }

      // Determine if seat is booked
      const isBooked = dateBooking?.status === 'booked' || !!passenger;
      const isSeatFree = !isBooked;
      
      // Get passenger info
      let passengerInfo = null;
      if (passenger) {
        // From PassengerModel (confirmed with ticket)
        passengerInfo = {
          fullName: passenger.fullName,
          ticketNumber: passenger.ticketNumber,
          contactNumber: passenger.contactNumber,
          isReturnTrip: passenger.ticketNumber?.includes('-RT') || false,
          alreadyScanned: passenger.alreadyScanned
        };
      } else if (bookingPassenger) {
        // From Booking model (booked but no ticket yet)
        passengerInfo = {
          fullName: `${bookingPassenger.firstName || ''} ${bookingPassenger.lastName || ''}`.trim(),
          ticketNumber: bookingPassenger.passengerRef || `Ref: ${dateBooking.bookingId}`,
          contactNumber: 'N/A',
          isReturnTrip: false,
          alreadyScanned: false
        };
      }
      
      return {
        seatNumber: seat.seatLabel,
        seatIndex: seat.seatIndex,
        status: isSeatFree ? SeatStatus.AVAILABLE : SeatStatus.BOOKED,
        isAvailable: isSeatFree,
        passengerInfo,
        isFree: isSeatFree
      };
    });

    // Calculate statistics based on seat report
    const totalSeats = seats.length;
    const bookedSeats = seatReport.filter((seat: any) => !seat.isFree).length;
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
      seatReport: seatReport.map((seat: any) => {
        const passengerName = seat.passengerInfo?.fullName || (seat.isFree ? 'Free' : 'Unknown');
        return {
          seatNumber: seat.seatNumber,
          status: seat.isFree ? 'Free' : 'Occupied',
          passengerName,
          ticketNumber: seat.passengerInfo?.ticketNumber || null,
          contactNumber: seat.passengerInfo?.contactNumber || null,
          isReturnTrip: seat.passengerInfo?.isReturnTrip || false,
          alreadyScanned: seat.passengerInfo?.alreadyScanned || false,
          // Additional fields for frontend display
          displayText: seat.isFree ? 'Free' : `${seat.seatNumber}: ${passengerName?.toUpperCase() || 'UNKNOWN'}`,
          isAvailable: seat.isFree
        };
      }),
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

export const getDriversReport = async (req: Request, res: Response) => {
  try {
    const { fromDate, toDate, driverId, page, limit } = req.query;

    // Build query for driver reports
    const query: any = {};

    // Date filtering
    if (fromDate || toDate) {
      query.tripDate = {};
      if (fromDate) {
        const startDate = new Date(fromDate as string);
        startDate.setHours(0, 0, 0, 0);
        query.tripDate.$gte = startDate;
      }
      if (toDate) {
        const endDate = new Date(toDate as string);
        endDate.setHours(23, 59, 59, 999);
        query.tripDate.$lte = endDate;
      }
    }

    // Driver filter - check both mxDriver and usDriver
    if (driverId) {
      query.$or = [
        { mxDriver: driverId },
        { usDriver: driverId }
      ];
    }

    // Pagination options with populate
    const options = {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      sort: { tripDate: -1, tripTime: -1 } as Record<string, 1 | -1>,
      populate: [
        {
          path: 'mxDriver',
          select: 'profile',
          populate: {
            path: 'profile',
            select: 'firstName secondName lastName'
          }
        },
        {
          path: 'usDriver',
          select: 'profile',
          populate: {
            path: 'profile',
            select: 'firstName secondName lastName'
          }
        },
        {
          path: 'bus',
          select: 'serialNumber code'
        },
        {
          path: 'origin',
          select: 'name'
        },
        {
          path: 'destination',
          select: 'name'
        }
      ]
    };

    // Fetch paginated driver reports
    const reportsData = await helper.PaginateHelper.customPaginate(
      "reports",
      DriverReport,
      query,
      options
    );

    // Transform the data to match the report format
    const formattedReports = (reportsData as any).reports.map((report: any) => {
      // Get driver names
      const mxDriver = report.mxDriver?.profile
        ? `${report.mxDriver.profile.firstName || ''} ${report.mxDriver.profile.secondName || ''} ${report.mxDriver.profile.lastName || ''}`.trim()
        : 'N/A';

      const usDriver = report.usDriver?.profile
        ? `${report.usDriver.profile.firstName || ''} ${report.usDriver.profile.secondName || ''} ${report.usDriver.profile.lastName || ''}`.trim()
        : 'N/A';

      return {
        busRouteName: report.busRouteName,
        routeName: report.routeName,
        tripDate: new Date(report.tripDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }),
        tripTime: report.tripTime,
        mxDriver,
        usDriver,
        passengers: report.passengers,
        origin: report.origin?.name || 'N/A',
        destination: report.destination?.name || 'N/A',
        busCode: report.bus?.code || 'N/A',
        status: report.status,
        startedAt: report.startedAt,
        completedAt: report.completedAt
      };
    });

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      {
        reports: formattedReports,
        totalDocs: (reportsData as any).totalDocs,
        currentPage: (reportsData as any).currentPage,
        totalPages: (reportsData as any).totalPages,
        hasNextPage: (reportsData as any).hasNextPage,
        hasPrevPage: (reportsData as any).hasPrevPage
      },
      "Drivers report generated successfully"
    );

  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
};
