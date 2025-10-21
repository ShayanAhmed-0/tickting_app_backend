import { z, ZodSchema } from "zod";

// Route seat report schema
export const routeSeatReportSchema: ZodSchema<{
  routeId: string;
  date: string;
}> = z.object({
  routeId: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, "Route ID must be a valid MongoDB ObjectId")
    .min(1, "Route ID is required"),
  
  date: z.string()
    .min(1, "Date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
});

// Export the schema for use in routes
export default routeSeatReportSchema;
