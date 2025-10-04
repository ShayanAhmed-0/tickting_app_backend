import { Request, Response } from "express";
import { STATUS_CODES } from "../../constants/statusCodes";
import ResponseUtil from "../../utils/Response/responseUtils";
import { ADMIN_CONSTANTS } from "../../constants/messages";
import { CustomError } from "../../classes/CustomError";
import Destination from "../../models/destinations.model";
import helper from "../../helper";


export const createDestinations = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      priceToDFW,
      priceFromDFW,
      priceRoundTrip,
      salesOffice,
      MinutesOfDifference,
      TerminalOfReference,
      isTerminal,
      isActive
    } = req.body;

    // Check if destination with same name already exists
    const existingDestination = await Destination.findOne({
      name: name,
    });

    if (existingDestination) {
      throw new CustomError(STATUS_CODES.CONFLICT, "Destination with this name already exists");
    }

    // Create new destination
    const newDestination = new Destination({
      name,
      description: description || null,
      priceToDFW,
      priceFromDFW,
      priceRoundTrip,
      salesOffice,
      MinutesOfDifference,
      TerminalOfReference: TerminalOfReference || null,
      isTerminal: isTerminal !== undefined ? isTerminal : false,
      isActive: isActive !== undefined ? isActive : true,
    });

    const savedDestination = await newDestination.save();

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.CREATED,
      {
        destination: {
          id: savedDestination._id,
          name: savedDestination.name,
          description: savedDestination.description,
          priceToDFW: savedDestination.priceToDFW,
          priceFromDFW: savedDestination.priceFromDFW,
          priceRoundTrip: savedDestination.priceRoundTrip,
          salesOffice: savedDestination.salesOffice,
          MinutesOfDifference: savedDestination.MinutesOfDifference,
          TerminalOfReference: savedDestination.TerminalOfReference,
          isTerminal: savedDestination.isTerminal,
          isActive: savedDestination.isActive,
        }
      },
      ADMIN_CONSTANTS.DESTINATION_CREATED
    );
  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
};

export const getDestinations = async (req: Request, res: Response) => {
  try {
    const { page, limit, name } = req.query;
    const query: any = { isActive: true, isDeleted: false };
    if (name && typeof name === "string" && name.trim() !== "") {
      query.name = { $regex: name.trim(), $options: "i" };
    }
    const options = {
      page: Number(page),
      limit: Number(limit),
      sort: { createdAt: -1 } as Record<string, 1 | -1>,
      populate: [
        { path: "salesOffice", select: "name description" },
        { path: "TerminalOfReference", select: "name description" }
      ],
    };
    const destinations = await helper.PaginateHelper.customPaginate("destinations", Destination as any, query, options);
    return ResponseUtil.successResponse(res, STATUS_CODES.SUCCESS, { destinations }, ADMIN_CONSTANTS.DESTINATIONS_FETCHED);
  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
};