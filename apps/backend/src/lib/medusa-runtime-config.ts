type RuntimeEnv = Record<string, string | undefined>;

const developmentCorsDefaults = {
  storeCors: [
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:8000",
  ],
  adminCors: ["http://localhost:9000", "http://127.0.0.1:9000"],
  authCors: [
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:9000",
    "http://127.0.0.1:9000",
    "http://localhost:8000",
  ],
} as const;

const weakSecretValues = new Set([
  "changeme",
  "change-me",
  "password",
  "replace-with-random-64-char-secret",
  "secret",
  "supersecret",
]);

function isWeakSecret(value: string) {
  const normalized = value.toLowerCase();

  return (
    normalized.length < 32 ||
    weakSecretValues.has(normalized) ||
    normalized.includes("replace") ||
    normalized.includes("example")
  );
}

function getSecretValues(
  env: RuntimeEnv,
  name: "JWT_SECRET" | "COOKIE_SECRET",
) {
  const aliasName = `MEDUSA_${name}`;

  return [env[name], env[aliasName]]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

function getRuntimeName(env: RuntimeEnv) {
  return (env.APP_ENV || env.NODE_ENV || "development").toLowerCase();
}

function isProductionLike(env: RuntimeEnv) {
  const appEnv = env.APP_ENV?.toLowerCase();

  if (appEnv) {
    return appEnv === "staging" || appEnv === "production";
  }

  return env.NODE_ENV === "production";
}

function parseCorsOrigins(value: string | undefined) {
  return Array.from(
    new Set(
      (value || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  );
}

function readCorsValue(
  env: RuntimeEnv,
  name: "STORE_CORS" | "ADMIN_CORS" | "AUTH_CORS",
  developmentDefaults: readonly string[],
) {
  const configuredOrigins = parseCorsOrigins(env[name]);

  if (isProductionLike(env)) {
    if (configuredOrigins.length === 0) {
      throw new Error(`${name} is required in ${getRuntimeName(env)}`);
    }

    return configuredOrigins.join(",");
  }

  return Array.from(
    new Set([...configuredOrigins, ...developmentDefaults]),
  ).join(",");
}

export function resolveRuntimeSecret(
  name: "JWT_SECRET" | "COOKIE_SECRET",
  env: RuntimeEnv = process.env,
) {
  const values = getSecretValues(env, name);
  const value = values.find((candidate) => !isWeakSecret(candidate));

  if (!isProductionLike(env)) {
    return values[0] || "supersecret";
  }

  if (!value) {
    throw new Error(
      values.length === 0
        ? `${name} is required in ${getRuntimeName(env)}`
        : `${name} must not use a development placeholder in ${getRuntimeName(env)}`,
    );
  }

  return value;
}

export function buildMedusaHttpConfig(env: RuntimeEnv = process.env) {
  return {
    storeCors: readCorsValue(
      env,
      "STORE_CORS",
      developmentCorsDefaults.storeCors,
    ),
    adminCors: readCorsValue(
      env,
      "ADMIN_CORS",
      developmentCorsDefaults.adminCors,
    ),
    authCors: readCorsValue(
      env,
      "AUTH_CORS",
      developmentCorsDefaults.authCors,
    ),
    jwtSecret: resolveRuntimeSecret("JWT_SECRET", env),
    cookieSecret: resolveRuntimeSecret("COOKIE_SECRET", env),
  };
}
