import { z } from "zod";

export const staffLoginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type StaffLoginInput = z.infer<typeof staffLoginSchema>;
