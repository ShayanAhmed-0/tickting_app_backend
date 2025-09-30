import { z, ZodSchema } from "zod";
import { DeviceType, UserRole } from "../../models";

export const createDriverSchema: ZodSchema<{
    firstName: string;
    secondName: string;
    lastName: string;
    driverLicenseId: string;
    email: string;
    password: string;
  }> = z.object({
    firstName: z.string().max(255),
    secondName: z.string().max(255),
    lastName: z.string().max(255),
    driverLicenseId: z.string().max(255),
    email: z.string(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(100)
  });