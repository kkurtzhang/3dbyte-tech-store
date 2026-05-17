import { z } from "@medusajs/framework/zod";

export const PutAdminEmailSenderProfile = z.object({
  from: z.string().min(1),
  reply_to: z.string().min(1),
});

export const PostAdminEmailSenderProfileTest = z.object({
  to: z.string().email(),
});
