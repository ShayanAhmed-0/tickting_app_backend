import { Request, Response } from "express";
import ResponseUtil from "../../utils/Response/responseUtils";
import { STATUS_CODES } from "../../constants/statusCodes";
import { ADMIN_CONSTANTS, AUTH_CONSTANTS } from "../../constants/messages";
import { CustomError } from "../../classes/CustomError";
import AuthModel from "../../models/auth.model";
import { SALT_ROUNDS } from "../../config/environment";
import bcrypt from "bcrypt";
import ProfileModel from "../../models/profile.model";
import { UserRole } from "../../models";
import helper from "../../helper";
export const createDriver = async (req: Request, res: Response) => {
    try {
    let { firstName, secondName, lastName, email, password, driverLicenseId } = req.body;
    const userExist = await AuthModel.findOne({ email });
    if (userExist) {
      throw new CustomError(STATUS_CODES.BAD_REQUEST, AUTH_CONSTANTS.USER_ALREADY_EXISTS);
    }
    const salt = await bcrypt.genSalt(Number(SALT_ROUNDS));
    const hashPassword = await bcrypt.hash(password, salt);
    const checkDriverLicenseId = await ProfileModel.findOne({ documents: { driverLicenseId } });
    if (checkDriverLicenseId) {
      throw new CustomError(STATUS_CODES.BAD_REQUEST, AUTH_CONSTANTS.DRIVER_LICENSE_ID_ALREADY_EXISTS);
    }
    const auth = await AuthModel.create({ email, password: hashPassword, role: UserRole.DRIVER,isProfileCompleted: true });
    const driver = await ProfileModel.create({ auth: auth._id, firstName, secondName, lastName, documents: { driverLicenseId } });
    await AuthModel.findByIdAndUpdate(auth._id, { profile: driver._id });
      return ResponseUtil.successResponse(
        res,
        STATUS_CODES.SUCCESS,
        {driver},
        ADMIN_CONSTANTS.DRIVER_CREATED
      );
    } catch (err) {
      if (err instanceof CustomError)
        return ResponseUtil.errorResponse(res, err.statusCode, err.message);
      ResponseUtil.handleError(res, err);
    }
  };

export const getDrivers = async (req: Request, res: Response) => {
    try {
      const { page, limit } = req.query;
      const skip = (Number(page) - 1) * Number(limit);
      const query = { role: UserRole.DRIVER, isActive: true , isDeleted: false, isProfileCompleted: true};
      const options = {
        page: Number(page),
        limit: Number(limit),
        sort: { createdAt: -1 } as Record<string, 1 | -1>,
        select: "-password",
        populate: [{ path: "profile", select: "firstName secondName lastName" }]
      };
      const drivers = await helper.PaginateHelper.customPaginate("drivers", AuthModel as any, query, options);
        return ResponseUtil.successResponse(res, STATUS_CODES.SUCCESS, { drivers }, ADMIN_CONSTANTS.DRIVERS_FETCHED);
    } catch (err) {
        if (err instanceof CustomError)
            return ResponseUtil.errorResponse(res, err.statusCode, err.message);
        ResponseUtil.handleError(res, err);
    }
}