import { Response } from "express";
import { CustomRequest } from "../../interfaces/auth";
import ResponseUtil from "../../utils/Response/responseUtils";
// import ServicesModel from "../../models/services.model";
import { STATUS_CODES } from "../../constants/statusCodes";
import { MISC_CONSTANTS } from "../../constants/messages";
import MediaModel from "../../models/media.model";
import { CustomError } from "../../classes/CustomError";

// export const createServices = async (req: CustomRequest, res: Response) => {
//     try {
//         const files = req.files as { [fieldname: string]: Express.Multer.File[] };
//         const icon = files?.icon?.[0];
//         const name = req.body.name
//         // console.log(req)
//         let iconId: string | undefined = undefined;
//         console.log(icon);
//         if (icon) {
//             const createIcon = await MediaModel.create({
//                 type: "icon",
//                 mimeType: icon.mimetype,
//                 fieldname: icon.fieldname,
//                 fileName: icon.filename,
//                 originalName: icon.originalname,
//                 url: icon.path,
//                 size: icon.size,
//             });
//             iconId = createIcon.id;
//         }
//         if (!name) {
//             throw new CustomError(STATUS_CODES.BAD_REQUEST, MISC_CONSTANTS.NAME_REQUIRED);
//         }
//         const NewSrevice = await
//             ServicesModel.create({
//                 name,
//                 icon: iconId
//             })
//         return ResponseUtil.successResponse(
//             res,
//             STATUS_CODES.SUCCESS,
//             { NewSrevice },
//             MISC_CONSTANTS.ALL_LOCS_FETCHED
//         );
//     }
//     catch (err) {
//         if (err instanceof CustomError)
//             return ResponseUtil.errorResponse(res, err.statusCode, err.message);
//         ResponseUtil.handleError(res, err);
//     }
// }