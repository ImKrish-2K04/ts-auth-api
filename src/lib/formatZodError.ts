import { z } from "zod";

export const formatZodError = (error: z.ZodError): string => {
  const fieldErrors = z.flattenError(error).fieldErrors;
  const entries = Object.entries(fieldErrors) as [
    string,
    string[] | undefined,
  ][];
  if (!entries.length) return "Invalid data";
  return entries
    .map(([field, errors]) => `${field}: ${errors?.join(", ")}`)
    .join(" | ");
};
