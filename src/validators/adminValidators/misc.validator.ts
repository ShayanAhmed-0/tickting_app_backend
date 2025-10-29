import { z, ZodSchema } from "zod";

export const updateCurrencySchema: ZodSchema<{
  usd: number;
  mxn: number;
}> = z.object({
  usd: z.number(),
  mxn: z.number(),
});