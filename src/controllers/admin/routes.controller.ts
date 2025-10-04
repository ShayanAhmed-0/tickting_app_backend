import { Request, Response } from "express";
import { STATUS_CODES } from "../../constants/statusCodes";
import ResponseUtil from "../../utils/Response/responseUtils";
import { ADMIN_CONSTANTS } from "../../constants/messages";
import { CustomError } from "../../classes/CustomError";
import Route from "../../models/route.model";
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
    const existingRoute = await Route.findOne({
      name: name,
    });

    if (existingRoute) {
      throw new CustomError(STATUS_CODES.CONFLICT, "Route with this name already exists");
    }

    // Create new route
    const newRoute = new Route({
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
    const { page, limit } = req.query;
    const query = { isActive: true };
    const options = {
      page: Number(page),
      limit: Number(limit),
      sort: { createdAt: -1 } as Record<string, 1 | -1>,
      populate: [
        { path: "origin", select: "name description" },
        { path: "destination", select: "name description" },
        { path: "bus", select: "code serialNumber capacity" },
        { path: "intermediateStops", select: "name description" }
      ],
    };
    const routes = await helper.PaginateHelper.customPaginate("routes", Route as any, query, options);
    return ResponseUtil.successResponse(res, STATUS_CODES.SUCCESS, { routes }, ADMIN_CONSTANTS.ROUTES_FETCHED);
  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
};
