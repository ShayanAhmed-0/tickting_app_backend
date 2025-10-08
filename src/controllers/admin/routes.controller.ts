import { Request, Response } from "express";
import { STATUS_CODES } from "../../constants/statusCodes";
import ResponseUtil from "../../utils/Response/responseUtils";
import { ADMIN_CONSTANTS } from "../../constants/messages";
import { CustomError } from "../../classes/CustomError";
import RouteModel from "../../models/route.model";
import Destination from "../../models/destinations.model";
import Bus from "../../models/bus.model";
import helper from "../../helper";

export const createRoute = async (req: Request, res: Response) => {
  try {
    const {
      name,
      origin,
      destination,
      bus,
      dayTime,
      intermediateStops,
      isActive
    } = req.body;

    // Check if route with same name already exists
    const existingRoute = await RouteModel.findOne({
      name: name,
    });

    if (existingRoute) {
      throw new CustomError(STATUS_CODES.CONFLICT, "Route with this name already exists");
    }

    // Create new route
    const newRoute = new RouteModel({
      name,
      origin,
      destination,
      bus,
      dayTime,
      intermediateStops: intermediateStops || [],
      isActive: isActive !== undefined ? isActive : true,
    });

    const savedRoute = await newRoute.save();

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.CREATED,
      {
        route: {
          id: savedRoute._id,
          name: savedRoute.name,
          origin: savedRoute.origin,
          destination: savedRoute.destination,
          bus: savedRoute.bus,
          dayTime: savedRoute.dayTime,
          intermediateStops: savedRoute.intermediateStops,
          isActive: savedRoute.isActive,
        }
      },
      ADMIN_CONSTANTS.ROUTE_CREATED
    );
  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
};

export const getRoutes = async (req: Request, res: Response) => {
  try {
    const { 
      page, 
      limit, 
      origin, 
      destination, 
      departureDate, 
      returnDate, 
      tripType, 
      day, 
      time, 
      bus, 
      isActive,
      search,
      sortBy,
      sortOrder
    } = req.query;

    // Build query object
    const query: any = {};

    // Active status filter
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    } else {
      query.isActive = true; // Default to active routes
    }

    // Origin filter
    if (origin) {
      query.origin = origin;
    }

    // Destination filter
    if (destination) {
      query.destination = destination;
    }

    // Day filter (for specific day of week)
    if (day) {
      query['dayTime.day'] = day;
    }

    // // Time filter (for specific time range)
    // if (time) {
    //   const timeParts = time.toString().split('-');
    //   if (timeParts.length === 2) {
    //     const startTime = timeParts[0];
    //     const endTime = timeParts[1];
    //     query['dayTime.time'] = {
    //       $gte: new Date(`1970-01-01T${startTime}:00.000Z`),
    //       $lte: new Date(`1970-01-01T${endTime}:00.000Z`)
    //     };
    //   }
    // }

    // Bus filter
    // if (bus) {
    //   query.bus = bus;
    // }

    // Search filter (searches in route name, origin, destination names)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'origin.name': { $regex: search, $options: 'i' } },
        { 'destination.name': { $regex: search, $options: 'i' } }
      ];
    }

  // // Date filtering for departure and return dates
  //   if (departureDate) {
  //     const depDate = new Date(departureDate.toString());
  //     const nextDay = new Date(depDate);
  //     nextDay.setDate(nextDay.getDate() + 1);
      
  //     // Filter routes that have schedules on the departure date
  //     query['dayTime.time'] = {
  //       $gte: depDate,
  //       $lt: nextDay
  //     };
  //   }  

    // Build sort options
    let sortOptions: Record<string, 1 | -1> = { createdAt: -1 };
    
    if (sortBy) {
      const order = sortOrder === 'asc' ? 1 : -1;
      sortOptions = { [sortBy.toString()]: order };
    }

    // Build populate options
    const populateOptions = [
      { path: "origin", select: "name description priceToDFW priceFromDFW priceRoundTrip" },
      { path: "destination", select: "name description priceToDFW priceFromDFW priceRoundTrip" },
      { path: "bus", select: "code serialNumber capacity seatLayout amenities" },
      { path: "intermediateStops", select: "name description" }
    ];

    // Pagination options
    const options = {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      sort: sortOptions,
      populate: populateOptions,
    };


    // Try pagination helper first
    const routes = await helper.PaginateHelper.customPaginate("routes", RouteModel as any, query, options);
    
    // Calculate available seats for each route
    const routesWithSeatInfo = Array.isArray(routes.routes) ? routes.routes.map((route: any) => {
      const routeObj = route.toObject ? route.toObject() : route;
      
      if (routeObj.bus && routeObj.bus.seatLayout && routeObj.bus.seatLayout.seats) {
        const seats = routeObj.bus.seatLayout.seats;
        const totalSeats = seats.length;
        const availableSeats = seats.filter((seat: any) => 
          seat.status === 'available' && seat.isAvailable === true
        ).length;
        const bookedSeats = seats.filter((seat: any) => 
          seat.status === 'booked'
        ).length;
        const heldSeats = seats.filter((seat: any) => 
          seat.status === 'held' || seat.status === 'selected'
        ).length;

        delete routeObj.bus.seatLayout;

        return {
          ...routeObj,
          seatAvailability: {
            total: totalSeats,
            available: availableSeats,
            booked: bookedSeats,
            held: heldSeats,
          }
        };
      }
      
      return routeObj;
    }) : [];
    
    console.log('📋 Routes Result:', JSON.stringify({
      totalDocs: routes.totalDocs,
      page: routes.page,
      limit: routes.limit,
      totalPages: routes.totalPages,
      hasNextPage: routes.hasNextPage,
      hasPrevPage: routes.hasPrevPage,
      docsCount: Array.isArray(routes.docs) ? routes.docs.length : 0,
      docs: Array.isArray(routes.docs) ? routes.docs.map((r: any) => ({ id: r._id, name: r.name })) : []
    }, null, 2));


    // Add filtering metadata
    const filterMetadata = {
      appliedFilters: {
        origin: origin || null,
        destination: destination || null,
        departureDate: departureDate || null,
        returnDate: returnDate || null,
        tripType: tripType || null,
        day: day || null,
        time: time || null,
        bus: bus || null,
        isActive: query.isActive,
        search: search || null
      },
      totalResults: routes.totalDocs,
      currentPage: routes.page,
      totalPages: routes.totalPages,
      hasNextPage: routes.hasNextPage,
      hasPrevPage: routes.hasPrevPage
    };

    return ResponseUtil.successResponse(
      res, 
      STATUS_CODES.SUCCESS, 
      { 
        routes: routesWithSeatInfo || [],
        pagination: {
          page: routes.page || 1,
          limit: routes.limit || 10,
          totalDocs: routes.totalDocs || 0,
          totalPages: routes.totalPages || 1,
          hasNextPage: routes.hasNextPage || false,
          hasPrevPage: routes.hasPrevPage || false
        },
        filters: filterMetadata
      }, 
      ADMIN_CONSTANTS.ROUTES_FETCHED
    );
  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
};

export const getRouteById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const populateOptions = [
      { path: "origin", select: "name description priceToDFW priceFromDFW priceRoundTrip" },
      { path: "destination", select: "name description priceToDFW priceFromDFW priceRoundTrip" },
      { path: "bus", select: "code serialNumber capacity seatLayout amenities" },
      { path: "intermediateStops", select: "name description" }
    ];
    const route = await RouteModel.findById(id).populate(populateOptions);
    
    if (!route) {
      return ResponseUtil.errorResponse(res, STATUS_CODES.NOT_FOUND, "Route not found");
    }

    const routeObj = route.toObject();

    // Calculate available seats
    const bus = routeObj.bus as any;
    if (bus && bus.seatLayout && bus.seatLayout.seats) {
      const seats = bus.seatLayout.seats;
      const totalSeats = seats.length;
      const availableSeats = seats.filter((seat: any) => 
        seat.status === 'available' && seat.isAvailable === true
      ).length;
      const bookedSeats = seats.filter((seat: any) => 
        seat.status === 'booked'
      ).length;
      const heldSeats = seats.filter((seat: any) => 
        seat.status === 'held' || seat.status === 'selected'
      ).length;

      const routeWithSeatInfo = {
        ...routeObj,
        seatAvailability: {
          total: totalSeats,
          available: availableSeats,
          booked: bookedSeats,
          held: heldSeats,
          availableSeats: seats.filter((seat: any) => 
            seat.status === 'available' && seat.isAvailable === true
          )
        }
      };

      return ResponseUtil.successResponse(
        res, 
        STATUS_CODES.SUCCESS, 
        { route: routeWithSeatInfo }, 
        ADMIN_CONSTANTS.ROUTE_FETCHED
      );
    }

    return ResponseUtil.successResponse(
      res, 
      STATUS_CODES.SUCCESS, 
      { route: routeObj }, 
      ADMIN_CONSTANTS.ROUTE_FETCHED
    );
  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
};

/**
 * Get filter options for routes (destinations, buses, days, etc.)
 */
export const getRouteFilterOptions = async (req: Request, res: Response) => {
  try {
    // Get all active destinations
    const destinations = await Destination.find({ 
      isActive: true, 
      isDeleted: false 
    }).select('name description priceToDFW priceFromDFW priceRoundTrip').sort({ name: 1 });

    // Get all active buses
    const buses = await Bus.find({ 
      isActive: true 
    }).select('code serialNumber capacity').sort({ code: 1 });

    // Get unique days from routes
    const dayTimeData = await RouteModel.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$dayTime' },
      { $group: { _id: '$dayTime.day' } },
      { $sort: { _id: 1 } }
    ]);

    const availableDays = dayTimeData.map(item => item._id);

    // Get time ranges from routes
    const timeData = await RouteModel.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$dayTime' },
      { 
        $group: { 
          _id: null, 
          minTime: { $min: '$dayTime.time' },
          maxTime: { $max: '$dayTime.time' }
        } 
      }
    ]);

    const timeRange = timeData.length > 0 ? {
      min: timeData[0].minTime,
      max: timeData[0].maxTime
    } : null;

    // Get popular routes (most frequently used)
    const popularRoutes = await RouteModel.aggregate([
      { $match: { isActive: true } },
      { 
        $lookup: {
          from: 'destinations',
          localField: 'origin',
          foreignField: '_id',
          as: 'originData'
        }
      },
      { 
        $lookup: {
          from: 'destinations',
          localField: 'destination',
          foreignField: '_id',
          as: 'destinationData'
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          origin: { $arrayElemAt: ['$originData.name', 0] },
          destination: { $arrayElemAt: ['$destinationData.name', 0] },
          dayTimeCount: { $size: '$dayTime' }
        }
      },
      { $sort: { dayTimeCount: -1 } },
      { $limit: 10 }
    ]);

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      {
        destinations,
        buses,
        availableDays,
        timeRange,
        popularRoutes,
        tripTypes: [
          { value: 'one-way', label: 'One Way' },
          { value: 'round-trip', label: 'Round Trip' }
        ],
        sortOptions: [
          { value: 'createdAt', label: 'Date Created' },
          { value: 'name', label: 'Route Name' },
          { value: 'dayTime.time', label: 'Departure Time' }
        ]
      },
      'Filter options fetched successfully'
    );
  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
};

/**
 * Search routes by origin and destination names (for autocomplete)
 */
export const searchRoutes = async (req: Request, res: Response) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.toString().trim().length < 2) {
      return ResponseUtil.successResponse(
        res,
        STATUS_CODES.SUCCESS,
        { routes: [] },
        'Search query too short'
      );
    }

    const searchQuery = q.toString().trim();
    
    const routes = await RouteModel.find({
      isActive: true,
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { 'origin.name': { $regex: searchQuery, $options: 'i' } },
        { 'destination.name': { $regex: searchQuery, $options: 'i' } }
      ]
    })
    .populate('origin', 'name description priceToDFW priceFromDFW priceRoundTrip')
    .populate('destination', 'name description priceToDFW priceFromDFW priceRoundTrip')
    .populate('bus', 'code serialNumber capacity seatLayout amenities')
    .limit(Number(limit))
    .sort({ name: 1 });

    // Calculate available seats for each route
    const routesWithSeatInfo = routes.map((route: any) => {
      const routeObj = route.toObject();
      
      if (routeObj.bus && routeObj.bus.seatLayout && routeObj.bus.seatLayout.seats) {
        const seats = routeObj.bus.seatLayout.seats;
        const totalSeats = seats.length;
        const availableSeats = seats.filter((seat: any) => 
          seat.status === 'available' && seat.isAvailable === true
        ).length;
        const bookedSeats = seats.filter((seat: any) => 
          seat.status === 'booked'
        ).length;
        const heldSeats = seats.filter((seat: any) => 
          seat.status === 'held' || seat.status === 'selected'
        ).length;

        return {
          ...routeObj,
          seatAvailability: {
            total: totalSeats,
            available: availableSeats,
            booked: bookedSeats,
            held: heldSeats,
            availableSeats: seats.filter((seat: any) => 
              seat.status === 'available' && seat.isAvailable === true
            )
          }
        };
      }
      
      return routeObj;
    });

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { routes: routesWithSeatInfo },
      'Search results fetched successfully'
    );
  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
};
