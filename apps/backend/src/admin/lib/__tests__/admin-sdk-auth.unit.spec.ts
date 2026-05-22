import { getAdminSdkAuthConfig } from "../admin-sdk-auth";

const setBundledAdminAuth = (
  authType?: "jwt" | "session",
  jwtTokenStorageKey?: string,
) => {
  if (authType) {
    Object.defineProperty(globalThis, "__AUTH_TYPE__", {
      configurable: true,
      value: authType,
    });
  } else {
    Reflect.deleteProperty(globalThis, "__AUTH_TYPE__");
  }

  if (jwtTokenStorageKey) {
    Object.defineProperty(globalThis, "__JWT_TOKEN_STORAGE_KEY__", {
      configurable: true,
      value: jwtTokenStorageKey,
    });
  } else {
    Reflect.deleteProperty(globalThis, "__JWT_TOKEN_STORAGE_KEY__");
  }
};

describe("admin SDK auth config", () => {
  afterEach(() => {
    setBundledAdminAuth();
  });

  it("uses the Medusa admin JWT auth config injected by the bundler", () => {
    setBundledAdminAuth("jwt", "medusa_auth_token");

    expect(getAdminSdkAuthConfig()).toEqual({
      type: "jwt",
      jwtTokenStorageKey: "medusa_auth_token",
    });
  });

  it("falls back to cookie sessions when the admin bundler does not inject auth config", () => {
    setBundledAdminAuth();

    expect(getAdminSdkAuthConfig()).toEqual({
      type: "session",
    });
  });
});
