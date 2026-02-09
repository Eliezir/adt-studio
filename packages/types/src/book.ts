import { z } from "zod"

export const BookLabel = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/, "Label must be filesystem-safe")
export type BookLabel = z.infer<typeof BookLabel>
