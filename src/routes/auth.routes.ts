import { Router } from "express";
import { createChallange, createProfile, getProfile, login, sendOtp, signup, verifyOtp } from "../controllers/auth.controller";
import { handleMediaFilesLocal } from "../utils/Mutlipart";
import { checkDefaultToken } from "../middleware/check-default-token.middleware";
import { checkUserAuth } from "../middleware/check-user-auth.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { 
  signupSchema, 
  loginSchema, 
  otpVerifySchema, 
  emailSchema, 
  passowrdSchema, 
  changePassowrdSchema, 
  createProfileSchema
} from "../validators/authValidators";

const router = Router();

router.post("/signup", checkDefaultToken, validateBody(signupSchema), signup);
router.post(
  "/create-profile",
  checkUserAuth,
  validateBody(createProfileSchema),
  // handleMediaFilesLocal.fields([ 
  //   { name: "avatar", maxCount: 1 }, 
  //   { name: "certificates", maxCount: 1 },
  //   { name: "businessLicense", maxCount: 1 },
  //   { name: "insuranceCertificate", maxCount: 1 },
  //   { name: "compensationInsurance", maxCount: 1 },
  //   { name: "TradeLicenses", maxCount: 10 } // Allow multiple trade licenses
  // ]),
  createProfile
);
// router.post(
//   "/create-profile",
//   handleMediaFilesLocal.single("avatar"),
//   createProfile
// ); 
router.post("/login", checkDefaultToken, validateBody(loginSchema), login);
router.get("/profile", checkUserAuth, getProfile);
router.post("/send-otp", checkDefaultToken, validateBody(emailSchema), sendOtp);
router.post("/verify-otp", checkDefaultToken, validateBody(otpVerifySchema), verifyOtp);
router.post("/create-challange", checkUserAuth, createChallange);
// router.post("/forget", checkDefaultToken, validateBody(emailSchema), forgetAccount);
// router.post("/forget-password", checkUserAuth, validateBody(passowrdSchema), forgetPassword);
// router.post("/change-password", checkUserAuth, validateBody(changePassowrdSchema), changePassword);
// router.get("/profile", checkUserAuth, getUserProfile);
// router.post("/update-profile", checkUserAuth, getUserProfile);

export default router;

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login to the application
 *     tags: [Authentication Flow]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal Server Error
 */
