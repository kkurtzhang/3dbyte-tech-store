export type AdminSdkAuthConfig = {
  type: "jwt" | "session";
  jwtTokenStorageKey?: string;
};

const getBundledAuthType = (): AdminSdkAuthConfig["type"] | undefined => {
  if (typeof __AUTH_TYPE__ === "undefined") {
    return undefined;
  }

  return __AUTH_TYPE__;
};

const getBundledJwtTokenStorageKey = (): string | undefined => {
  if (typeof __JWT_TOKEN_STORAGE_KEY__ === "undefined") {
    return undefined;
  }

  return __JWT_TOKEN_STORAGE_KEY__ || undefined;
};

export const getAdminSdkAuthConfig = (): AdminSdkAuthConfig => {
  const jwtTokenStorageKey = getBundledJwtTokenStorageKey();

  return {
    type: getBundledAuthType() ?? "session",
    ...(jwtTokenStorageKey ? { jwtTokenStorageKey } : {}),
  };
};
