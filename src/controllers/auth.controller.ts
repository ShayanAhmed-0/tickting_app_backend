import AuthConfig from "../config/authConfig";
import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { CustomRequest } from "../interfaces/auth";
import { CustomError } from "../classes/CustomError";
import ResponseUtil from "../utils/Response/responseUtils";
import { hash } from "bcrypt";
import { compareSync } from "bcrypt";
import { generateToken } from "../utils/Token";
import { OtpModel } from "../models/otp.model";
import { AUTH_CONSTANTS } from "../constants/messages";
import { STATUS_CODES } from "../constants/statusCodes";
import AuthModel from "../models/auth.model";
import helper from "../helper";
import MediaModel from "../models/media.model";
import ProfileModel from "../models/profile.model";
import mongoose from "mongoose";
import { get_full_user_profile_population_from_auth_query } from "../queries/user.queries";
import { rpID, rpName, SALT_ROUNDS, UPLOADS_URL } from "../config/environment";
import { OtpTypes, UserRole } from "../models";
import DeviceModel from "../models/device.model";
import { generateRegistrationOptions } from "@simplewebauthn/server";

export const signup = async (req: Request, res: Response) => {
  try {
    let {
      email,
      password,
      role = UserRole.CUSTOMER,
      deviceToken,
      deviceType,
    } = req.body;
    email = email.toLowerCase().trim();
    const userExist = await AuthModel.findOne({
      email: email,
    });
    if (userExist) {
      throw new CustomError(
        STATUS_CODES.BAD_REQUEST,
        AUTH_CONSTANTS.USER_ALREADY_EXISTS
      );
    }

    const salt = await bcrypt.genSalt(Number(SALT_ROUNDS));
    const hashPassword = await bcrypt.hash(password, salt);
    let user = await AuthModel.create({
      email: email,
      password: hashPassword,
      role,
      salt,
    });

    helper.AuthenticationHelper.sendOTP(
      email,
      user._id,
      OtpTypes.registaration
    );

    const checkDevice = await DeviceModel.findOne({ deviceToken });
    if (checkDevice) {
      await DeviceModel.findByIdAndUpdate(checkDevice._id, {
        auth: user._id,
        isActive: true,
      });
    } else {
      await DeviceModel.create({
        auth: user._id,
        deviceToken,
        deviceName: req.headers["user-agent"] || "unknown",
        deviceType,
      });
    }
    // await DeviceModel.create({
    //   auth: user._id,
    //   deviceToken,
    //   deviceName: req.headers["user-agent"] || "unknown",
    //   deviceType,
    // });

    // Convert to plain object and remove sensitive fields
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.salt;

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { user: userObj },
      AUTH_CONSTANTS.OTP_SENT
    );
  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    let { email, password, deviceToken, deviceType } = req.body;
    email = email.toLowerCase().trim();
    const user = await AuthModel.findOne({ email }).populate("profile");

    if (!user) {
      throw new CustomError(
        STATUS_CODES.NOT_FOUND,
        AUTH_CONSTANTS.USER_NOT_FOUND
      );
    }

    const hashPassword = await bcrypt.hash(password, user.salt!);
    const hashpass = compareSync(password, hashPassword);

    if (!hashpass) {
      throw new CustomError(
        STATUS_CODES.BAD_REQUEST,
        AUTH_CONSTANTS.PASSWORD_MISMATCH
      );
    }
    const token = generateToken({
      email: email,
      authId: String(user._id),
      role: user.role as UserRole,
    });

    // Convert to plain object and remove sensitive fields
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.salt;
    console.log(userObj);

    const checkDevice = await DeviceModel.findOne({ deviceToken });
    if (checkDevice) {
      await DeviceModel.findByIdAndUpdate(checkDevice._id, {
        auth: user._id,
        isActive: true,
      });
    } else {
      await DeviceModel.create({
        auth: user._id,
        deviceToken,
        deviceName: req.headers["user-agent"] || "unknown",
        deviceType,
      });
    }
    if (!user.isVerified) {
      helper.AuthenticationHelper.sendOTP(
        email,
        user._id,
        OtpTypes.registaration
      );
      return ResponseUtil.successResponse(
        res,
        STATUS_CODES.SUCCESS,
        {
          isVerified: user.isVerified,
          isProfileCompleted: user.isProfileCompleted,
          user: { _id: user._id, role: user.role },
        },
        AUTH_CONSTANTS.VERIFY_ACCOUNT
      );
    }

    if (!user.isProfileCompleted) {
      return ResponseUtil.successResponse(
        res,
        STATUS_CODES.SUCCESS,
        {
          isProfileCompleted: user.isProfileCompleted,
          isVerified: user.isVerified,
          user: { _id: user._id, role: user.role },
          token,
        },
        AUTH_CONSTANTS.INCOMPLETE_PROFILE
      );
    }

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { user:userObj, token },
      AUTH_CONSTANTS.LOGGED_IN
    );
  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { otp, userId } = req.body;
    const otpRes = await OtpModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (otpRes && otpRes.otp != otp) {
      throw new CustomError(
        STATUS_CODES.BAD_REQUEST,
        AUTH_CONSTANTS.OTP_MISMATCH
      );
    }
    if (otpRes && new Date() > otpRes.expiry) {
      throw new CustomError(
        STATUS_CODES.BAD_REQUEST,
        AUTH_CONSTANTS.OTP_EXPIRED
      );
    }

    const user = await AuthModel.findByIdAndUpdate(userId, {
      isVerified: true,
    });
    if (user && user.email) {
      const token = generateToken({
        email: user.email,
        authId: userId,
        role: user.role as UserRole,
      });
      return ResponseUtil.successResponse(
        res,
        STATUS_CODES.SUCCESS,
        { token },
        AUTH_CONSTANTS.OTP_VERIFIED
      );
    }
    throw new CustomError(
      STATUS_CODES.BAD_REQUEST,
      AUTH_CONSTANTS.USER_NOT_FOUND
    );
  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
};

export const sendOtp = async (req: Request, res: Response) => {
  try {
    let { email } = req.body;
    email = email.toLowerCase().trim();
    const user = await AuthModel.findOne({ email });
    if (!user) {
      throw new CustomError(
        STATUS_CODES.NOT_FOUND,
        AUTH_CONSTANTS.USER_NOT_FOUND
      );
    }
    helper.AuthenticationHelper.sendOTP(email, user._id, OtpTypes.resend);
    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { email, userId: user._id },
      AUTH_CONSTANTS.OTP_SENT
    );
  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
};

export const createProfile = async (req: CustomRequest, res: Response) => {
  try {
    let {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      emergencyContact,
      documentCode,
      documentNumber,
      documentIssuingCountry,
      address,
      city,
      state,
      postalCode,
    } = req.body;
    const authId = req.authId;
    const user = await AuthModel.findById(authId);
    if (!user) {
      throw new CustomError(
        STATUS_CODES.NOT_FOUND,
        AUTH_CONSTANTS.USER_NOT_FOUND
      );
    }
    const profiledoc = {
      auth: authId,
      firstName,
      lastName,
      dob: dateOfBirth,
      gender,
      address: {
        streetAddress: address,
        city,
        state,
        postalCode,
      },
      emergencyContact,
      documents: {
        documentCode,
        documentNumber,
        documentIssuingCountry,
      },
    };

    const profile = await ProfileModel.create(profiledoc);
    const updateUser = await AuthModel.findByIdAndUpdate(
      authId,
      {
        profile: profile._id,
        isProfileCompleted: true,
      },
      { new: true }
    );

    if (!updateUser) {
      throw new CustomError(
        STATUS_CODES.NOT_FOUND,
        AUTH_CONSTANTS.USER_NOT_FOUND
      );
    }

    // Populate the user with the profile data for the response
    const userWithProfile = await AuthModel.findById(authId)
      .populate("profile")
      .select("-password -salt");

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { user: userWithProfile },
      AUTH_CONSTANTS.PROFILE_CREATED
    );
  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
};

export const getProfile = async (req: CustomRequest, res: Response) => {
  try {
    const authId = req.authId;
    const user = await AuthModel.findById(authId)
      .populate("profile")
      .select("-password -salt");

    if (!user) {
      throw new CustomError(
        STATUS_CODES.NOT_FOUND,
        AUTH_CONSTANTS.USER_NOT_FOUND
      );
    }

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { user },
      AUTH_CONSTANTS.PROFILE_CREATED
    );
  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
};

export const createChallange = async (req: CustomRequest, res: Response) => {
  try {
    const { authId } = req;
    const user = await AuthModel.findById(authId);
    if (!user) {
      throw new CustomError(
        STATUS_CODES.NOT_FOUND,
        AUTH_CONSTANTS.USER_NOT_FOUND
      );
    }
    const challengePayload = await generateRegistrationOptions({
      rpID: rpID!,
      rpName: rpName!,
      userName: user?.email || "",
      // userDisplayName: user?.firstName || "",
      // userId: user?._id.toString() || "",
      // attestationType: "direct",
      // authenticatorSelection: {
      //   userVerification: "required",
      // },
      // pubKeyCredParams: [
      //   {
      //     type: "public-key",
      //     alg: -7,
      //   },
      // ],
    })
    
    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { challengePayload },
      AUTH_CONSTANTS.CHALLENGE_CREATED
    );
  } catch (err) {
    if (err instanceof CustomError)
      return ResponseUtil.errorResponse(res, err.statusCode, err.message);
    ResponseUtil.handleError(res, err);
  }
};
// export const forgetAccount = async (req: Request, res: Response) => {
//   try {
//     let { email } = req.body;
//     email = email.toLowerCase().trim();
//     const user = await AuthModel.findOne({ email });
//     if (!user) {
//       throw new CustomError(
//         STATUS_CODES.NOT_FOUND,
//         AUTH_CONSTANTS.USER_NOT_FOUND
//       );
//     }
//     helper.AuthenticationHelper.sendOTP(email, user._id, OtpTypeEnums.resend);
//     return ResponseUtil.successResponse(
//       res,
//       STATUS_CODES.SUCCESS,
//       {
//         user: {
//           _id: user._id,
//           email: user.email,
//           isVerified: user.isVerified,
//           role: user.role,
//           isProfileCompleted: user.isProfileCompleted,
//         },
//       },
//       AUTH_CONSTANTS.OTP_SENT
//     );
//   } catch (err) {
//     if (err instanceof CustomError)
//       return ResponseUtil.errorResponse(res, err.statusCode, err.message);
//     ResponseUtil.handleError(res, err);
//   }
// };
// export const forgetPassword = async (req: CustomRequest, res: Response) => {
//   try {
//     let { password } = req.body;
//     const { authId } = req;
//     const user = await AuthModel.findById(authId);
//     if (!user) {
//       return ResponseUtil.errorResponse(
//         res,
//         STATUS_CODES.NOT_FOUND,
//         AUTH_CONSTANTS.USER_NOT_FOUND
//       );
//     }
//     const hashPassword = await hash(password, String(AuthConfig.SALT));
//     await AuthModel.findByIdAndUpdate(authId, { password: hashPassword });
//     return ResponseUtil.successResponse(
//       res,
//       STATUS_CODES.SUCCESS,
//       { user },
//       AUTH_CONSTANTS.PASSWORD_CHANGED
//     );
//   } catch (err) {
//     if (err instanceof CustomError)
//       return ResponseUtil.errorResponse(res, err.statusCode, err.message);
//     ResponseUtil.handleError(res, err);
//   }
// };
// export const changePassword = async (req: CustomRequest, res: Response) => {
//   try {
//     let { oldPassword, newPassword } = req.body;
//     const { authId } = req;
//     const user = await AuthModel.findById(authId);
//     if (!user) {
//       throw new CustomError(
//         STATUS_CODES.NOT_FOUND,
//         AUTH_CONSTANTS.USER_NOT_FOUND
//       );
//     }
//     const hashPassword = await hash(oldPassword, String(AuthConfig.SALT));
//     if (!compareSync(oldPassword, String(user.password))) {
//       throw new CustomError(
//         STATUS_CODES.NOT_FOUND,
//         AUTH_CONSTANTS.INVALID_CURRENT_PASSWORD
//       );
//     }
//     const newHashPassword = await hash(newPassword, String(AuthConfig.SALT));
//     if (hashPassword === newHashPassword) {
//       throw new CustomError(
//         STATUS_CODES.NOT_FOUND,
//         AUTH_CONSTANTS.SAME_PASSWORD
//       );
//     }
//     await AuthModel.findByIdAndUpdate(authId, { password: newHashPassword });
//     return ResponseUtil.successResponse(
//       res,
//       STATUS_CODES.SUCCESS,
//       { user },
//       AUTH_CONSTANTS.PASSWORD_CHANGED
//     );
//   } catch (err) {
//     if (err instanceof CustomError)
//       return ResponseUtil.errorResponse(res, err.statusCode, err.message);
//     ResponseUtil.handleError(res, err);
//   }
// };
// export const getUserProfile = async (req: CustomRequest, res: Response) => {
//   try {
//     const { authId } = req;
//     const user = await AuthModel.findById(authId).populate(
//       get_full_user_profile_population_from_auth_query
//     );
//     if (!user) {
//       throw new CustomError(
//         STATUS_CODES.NOT_FOUND,
//         AUTH_CONSTANTS.USER_NOT_FOUND
//       );
//     }
//     return ResponseUtil.successResponse(
//       res,
//       STATUS_CODES.SUCCESS,
//       { user },
//       AUTH_CONSTANTS.PROFILE_FETCHED
//     );
//   } catch (err) {
//     if (err instanceof CustomError)
//       return ResponseUtil.errorResponse(res, err.statusCode, err.message);
//     ResponseUtil.handleError(res, err);
//   }
// };

// export const updaeProfile = async (req: CustomRequest, res: Response) => {
//   try {
//     const { authId } = req;
//     const getUser = await AuthModel.findById(authId).populate("Profile");
//     if (!authId) {
//       throw new CustomError(
//         STATUS_CODES.NOT_FOUND,
//         AUTH_CONSTANTS.USER_NOT_FOUND
//       );
//     }
//     if (!getUser || !getUser.profile) {
//       throw new CustomError(
//         STATUS_CODES.NOT_FOUND,
//         AUTH_CONSTANTS.USER_NOT_FOUND
//       );
//     }
//     // const { fullName, age, gender, phoneNumber,long,lat } = createProfileSchema.parse(req.body);
//     const files = req.files as { [fieldname: string]: Express.Multer.File[] };
//     const avatar = files?.avatar?.[0];
//     let certificateMediaId: string | null = null;
//     let businessLicenseMediaId: string | null = null;
//     let insuranceCertificateMediaId: string | null = null;
//     let compensationInsuranceMediaId: string | null = null;
//     let tradeLicensesMediaIds: string[] | null = null;
//     if (typeof req.body.age === "string") {
//       req.body.age = parseInt(req.body.age);
//       req.body.long = parseFloat(req.body.long);
//       req.body.lat = parseFloat(req.body.lat);
//       if (req.body.TinNumber) {
//         req.body.TinNumber = parseInt(req.body.TinNumber);
//       }
//     }
//     // let { fullName, gender, age, long, lat, locationName, phoneNumber, experience, services, TinNumber }: {
//     //   fullName: string,
//     //   gender: string,
//     //   age: number,
//     //   phoneNumber: string,
//     //   locationName: string,
//     //   experience: string
//     //   long: number,
//     //   lat: number,
//     //   services: string[]
//     //   TinNumber: number,
//     // } = {
//     //   fullName: getUser.profile.fullName
//     //   gender: getUser
//     //   age: getUser
//     //   phoneNumber: getUser
//     //   experience: getUser
//     //   long: getUser
//     //   lat: getUser
//     //   locationName: getUser
//     //   services: getUser
//     //   TinNumber: getUser
//     // };
//     // if (req.role === "Customer") {
//     //   ({ fullName, gender, age, long, lat, locationName, phoneNumber } = updateCustomerProfileSchema.parse(req.body))
//     // }
//     else if (req.role === "Worker") {
//       const certificates = files?.certificates?.[0];
//       const businessLicense = files?.businessLicense?.[0];
//       const insuranceCertificate = files?.insuranceCertificate?.[0];
//       const compensationInsurance = files?.compensationInsurance?.[0];
//       const TradeLicenses = files?.TradeLicenses;
//       const mediaDocuments: any[] = [];
//       [
//         { file: certificates, fieldname: "certificates" },
//         { file: businessLicense, fieldname: "businessLicense" },
//         { file: insuranceCertificate, fieldname: "insuranceCertificate" },
//         { file: compensationInsurance, fieldname: "compensationInsurance" },
//       ].forEach(({ file, fieldname }) => {
//         if (file) {
//           mediaDocuments.push({
//             type: "Document",
//             mimeType: file.mimetype || "application/pdf",
//             fieldName: fieldname,
//             fileName: file.filename || "filename",
//             originalName: file.originalname || "originalname",
//             url: UPLOADS_URL + file.filename || "",
//             size: file.size || 0,
//           });
//         }
//       });

//       // Add multiple trade licenses
//       if (TradeLicenses && TradeLicenses.length > 0) {
//         TradeLicenses.forEach((license) => {
//           mediaDocuments.push({
//             type: "Document",
//             mimeType: license.mimetype || "application/pdf",
//             fieldName: "TradeLicenses",
//             fileName: license.filename || "filename",
//             originalName: license.originalname || "originalname",
//             url: UPLOADS_URL + license.filename || "",
//             size: license.size || 0,
//           });
//         });
//       }

//       // Create all media documents at once
//       const createdMedia = await MediaModel.create(mediaDocuments);

//       // Extract specific media IDs
//       certificateMediaId =
//         createdMedia.find((media) => media.fieldName === "certificates")?.id ||
//         null;
//       businessLicenseMediaId =
//         createdMedia.find((media) => media.fieldName === "businessLicense")
//           ?.id || null;
//       insuranceCertificateMediaId =
//         createdMedia.find((media) => media.fieldName === "insuranceCertificate")
//           ?.id || null;
//       compensationInsuranceMediaId =
//         createdMedia.find(
//           (media) => media.fieldName === "compensationInsurance"
//         )?.id || null;
//       tradeLicensesMediaIds = createdMedia
//         .filter((media) => media.fieldName === "TradeLicenses")
//         .map((media) => media.id);
//       // ({ fullName, gender, age, long, lat, locationName, phoneNumber, experience, services, TinNumber } = updateWorkerProfileSchema.parse(req.body))
//     } else {
//       throw new CustomError(
//         STATUS_CODES.BAD_REQUEST,
//         AUTH_CONSTANTS.INVALID_ROLE
//       );
//     }
//     if (!avatar) {
//       throw new CustomError(
//         STATUS_CODES.BAD_REQUEST,
//         AUTH_CONSTANTS.USER_AVATAR_REQUIRED
//       );
//     }

//     const avatarMedia = await MediaModel.create({
//       type: "Image",
//       mimeType: req.file?.mimetype || "jpeg",
//       fieldName: req.file?.fieldname || "fieldName",
//       fileName: req.file?.filename || "filename",
//       originalName: req.file?.originalname || "originalname",
//       url: UPLOADS_URL! + req.file?.filename || "",
//       size: req.file?.size || 0,
//     });

//     // const coordinates: number[]
//     // if (long && lat) {
//     //   coordinates = [long, lat]
//     // }

//     // const newProfile = new ProfileModel({
//     //   fullName,
//     //   gender,
//     //   age,
//     //   auth: req.authId,
//     //   phoneNumber,
//     //   location: {
//     //     type: "Point",
//     //     coordinates: coordinates, // [longitude, latitude]
//     //     locationName: locationName || "",
//     //   },
//     //   TinNumber: TinNumber || null,
//     //   services: services || null,
//     //   experience: experience || "",
//     //   profilePicture: avatarMedia._id,
//     //   certificate: certificateMediaId,
//     //   businessLicense: businessLicenseMediaId,
//     //   insuranceCertificate: insuranceCertificateMediaId,
//     //   compensationInsurance: compensationInsuranceMediaId,
//     //   TradeLicenses: tradeLicensesMediaIds
//     // });
//     const [
//       user,
//       // savedProfile
//     ] = await Promise.all([
//       AuthModel.findByIdAndUpdate(
//         req.authId,
//         {
//           isProfileCompleted: true,
//           // profile: newProfile._id,
//         },
//         { new: true }
//       ).populate(get_full_user_profile_population_from_auth_query),
//       // newProfile.save(),
//     ]);

//     return ResponseUtil.successResponse(
//       res,
//       STATUS_CODES.SUCCESS,
//       { user },
//       AUTH_CONSTANTS.PROFILE_FETCHED
//     );
//   } catch (err) {
//     if (err instanceof CustomError)
//       return ResponseUtil.errorResponse(res, err.statusCode, err.message);
//     ResponseUtil.handleError(res, err);
//   }
// };
