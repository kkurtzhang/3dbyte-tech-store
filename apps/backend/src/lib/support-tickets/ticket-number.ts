import { randomInt } from "node:crypto"

const SUPPORT_TICKET_PREFIX = "3DBS"
const SUPPORT_TICKET_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

const generateSecureString = (length: number): string =>
  Array.from({ length }, () =>
    SUPPORT_TICKET_ALPHABET.charAt(
      randomInt(SUPPORT_TICKET_ALPHABET.length)
    )
  ).join("")

export const generateSupportTicketNumber = (): string =>
  `${SUPPORT_TICKET_PREFIX}-${generateSecureString(4)}-${generateSecureString(6)}`
