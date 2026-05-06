const ORDER_DISPLAY_ID_PREFIX = "3DB";

export const generateOrderCustomDisplayId = (
  timestampMs = Date.now(),
): string => `${ORDER_DISPLAY_ID_PREFIX}-${timestampMs}`;
