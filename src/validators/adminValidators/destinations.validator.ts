import { z, ZodSchema } from "zod";

export const createDestinationSchema: ZodSchema<{
  name: string;
  description?: string;
  priceToDFW: number;
  priceFromDFW: number;
  priceRoundTrip: number;
  salesOffice: string;
  MinutesOfDifference: number;
  TerminalOfReference?: string;
  isTerminal?: boolean;
  isActive?: boolean;
}> = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(255, "Name must be less than 255 characters"),
  
  description: z.string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  
  priceToDFW: z.number()
    .positive("Price to DFW must be a positive number")
    .finite("Price to DFW must be a valid number"),
  
  priceFromDFW: z.number()
    .positive("Price from DFW must be a positive number")
    .finite("Price from DFW must be a valid number"),
  
  priceRoundTrip: z.number()
    .positive("Round trip price must be a positive number")
    .finite("Round trip price must be a valid number"),
  
  salesOffice: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, "Sales office must be a valid MongoDB ObjectId"),
  
  MinutesOfDifference: z.number()
    .int("Minutes difference must be an integer")
    .positive("Minutes difference must be positive"),
  
  TerminalOfReference: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, "Terminal reference must be a valid MongoDB ObjectId")
    .optional(),
  
  isTerminal: z.boolean().optional(),
  
  isActive: z.boolean().optional()
});
