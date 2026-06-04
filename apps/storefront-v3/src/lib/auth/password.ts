import { z } from "zod"

export const PASSWORD_REQUIREMENTS_MESSAGE =
  "Password must be at least 10 characters and include uppercase, lowercase, number, and symbol."

export const strongPasswordSchema = z
  .string()
  .min(10, PASSWORD_REQUIREMENTS_MESSAGE)
  .regex(/[a-z]/, PASSWORD_REQUIREMENTS_MESSAGE)
  .regex(/[A-Z]/, PASSWORD_REQUIREMENTS_MESSAGE)
  .regex(/\d/, PASSWORD_REQUIREMENTS_MESSAGE)
  .regex(/[^A-Za-z0-9]/, PASSWORD_REQUIREMENTS_MESSAGE)

export function validatePasswordStrength(password: string) {
  const parsed = strongPasswordSchema.safeParse(password)

  if (parsed.success) {
    return null
  }

  return parsed.error.issues[0]?.message || PASSWORD_REQUIREMENTS_MESSAGE
}
