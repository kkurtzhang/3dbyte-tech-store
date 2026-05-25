import { randomInt } from "node:crypto";

const ORDER_DISPLAY_ID_PREFIX = "3DBO";
const ORDER_DISPLAY_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const generateSecureString = (length: number): string =>
  Array.from({ length }, () =>
    ORDER_DISPLAY_ID_ALPHABET.charAt(
      randomInt(ORDER_DISPLAY_ID_ALPHABET.length),
    ),
  ).join("");

export const generateOrderCustomDisplayId = (): string =>
  `${ORDER_DISPLAY_ID_PREFIX}-${generateSecureString(4)}-${generateSecureString(6)}`;
