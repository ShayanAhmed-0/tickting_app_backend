import { z, ZodSchema } from "zod";
import { DeviceType, Gender, UserRole } from "../../models";

export const signupSchema: ZodSchema<{
  email: string;
  password: string;
  role?: UserRole;
  deviceType: DeviceType;
  deviceToken: string;
}> = z.object({
  email: z.string().email("Invalid email format").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(100),
  role: z
    .nativeEnum(UserRole, {
      errorMap: () => ({ message: `Invalid role` }),
    })
    .optional(),
  deviceType: z.nativeEnum(DeviceType, {
    errorMap: () => ({ message: `Invalid Device Type` }),
  }),
  deviceToken: z.string(),
});

export const loginSchema: ZodSchema<{
  email: string;
  password: string;
  deviceToken: string;
  deviceType: DeviceType;
}> = z.object({
  email: z.string().email("Invalid email format").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(100),
  deviceType: z.nativeEnum(DeviceType, {
    errorMap: () => ({ message: `Invalid Device Type` }),
  }),
  deviceToken: z.string(),
});

export const otpVerifySchema: ZodSchema<{
  userId: string;
  otp: string;
}> = z.object({
  userId: z.string().min(1, "userId is required"),
  otp: z.string(),
});
export const emailSchema: ZodSchema<{
  email: string;
}> = z.object({
  email: z.string().email("Invalid email format").max(255),
});
export const passowrdSchema: ZodSchema<{
  password: string;
}> = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(100),
});
export const changePassowrdSchema: ZodSchema<{
  oldPassword: string;
  newPassword: string;
}> = z.object({
  oldPassword: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(100),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(100),
});

export const createProfileSchema: ZodSchema<{
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: Gender;
  emergencyContact: string;
  documentCode: string;
  documentNumber: string;
  documentIssuingCountry: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
}> = z.object({
  firstName: z.string().max(255),
  lastName: z.string().max(255),
  dateOfBirth: z.coerce.date({
    errorMap: () => ({ message: "Invalid date format" }),
  }),
  gender: z.nativeEnum(Gender, {
    errorMap: () => ({
      message: "Invalid gender. Must be male, female, other, or prefer_not_say",
    }),
  }),
  emergencyContact: z.string(),
  documentCode: z.string(),
  documentNumber: z.string(),
  documentIssuingCountry: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
});
