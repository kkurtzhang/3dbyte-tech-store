type EnvRecord = Partial<Record<string, string | undefined>>;

type ImageRemotePattern = {
  protocol: "http" | "https";
  hostname: string;
  port?: string;
  pathname?: string;
};

const assetImageHostnameEnvKeys = [
  "NEXT_PUBLIC_SPACE_DOMAIN",
  "NEXT_PUBLIC_CDN_SPACE_DOMAIN",
  "NEXT_PUBLIC_SPACE_ENDPOINT",
] as const;

const aiCatalogueMediaHostnameEnvKeys = [
  "AI_CATALOGUE_MEDIA_BASE_URL",
  "NEXT_PUBLIC_SITE_URL",
  "SERVICE_FQDN_STOREFRONT",
  "SERVICE_URL_STOREFRONT",
] as const;

const sourceBackedProductImageHostnameEnvKeys = [
  "NEXT_PUBLIC_PRODUCT_IMAGE_HOSTS",
] as const;

const strapiMediaRemotePatternEnvKeys = ["NEXT_PUBLIC_STRAPI_URL"] as const;

const defaultSourceBackedProductImageHostnames = [
  "shop.polymaker.com",
  "ueeshop.ly200-cdn.com",
  "cdnus.globalso.com",
  "store.bblcdn.com",
  "store.sunlu.com",
  "www.printdry.com",
  "magigoo.com",
  "biqu.equipment",
  "www.phaetus.com",
  "cdn.shopify.com",
  "www.hobbywing.com",
  "www.flyskytech.com",
  "static1.squarespace.com",
  "radiomasterrc.com",
  "rcprinter.com",
  "www.agfrc.com",
  "www.avidrc.com",
  "www.injora.com",
  "www.amassconnectors.com",
] as const;

function toHostname(value: string | undefined): string | null {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    const url = new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(trimmedValue)
        ? trimmedValue
        : `https://${trimmedValue}`,
    );

    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function toImageRemotePattern(
  value: string | undefined,
): ImageRemotePattern | null {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    const url = new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(trimmedValue)
        ? trimmedValue
        : `https://${trimmedValue}`,
    );
    let protocol: ImageRemotePattern["protocol"] | null = null;

    if (url.protocol === "http:") {
      protocol = "http";
    } else if (url.protocol === "https:") {
      protocol = "https";
    }

    if (!protocol) {
      return null;
    }

    return {
      protocol,
      hostname: url.hostname.toLowerCase(),
      ...(url.port ? { port: url.port } : {}),
    };
  } catch {
    return null;
  }
}

function getUniqueHostnames(env: EnvRecord, keys: readonly string[]): string[] {
  return Array.from(
    new Set(
      keys
        .map((key) => toHostname(env[key]))
        .filter((hostname): hostname is string => Boolean(hostname)),
    ),
  );
}

function getUniqueRemotePatterns(
  env: EnvRecord,
  keys: readonly string[],
): ImageRemotePattern[] {
  const seen = new Set<string>();

  return keys
    .map((key) => toImageRemotePattern(env[key]))
    .filter((pattern): pattern is ImageRemotePattern => Boolean(pattern))
    .filter((pattern) => {
      const patternKey = `${pattern.protocol}://${pattern.hostname}:${pattern.port ?? ""}`;

      if (seen.has(patternKey)) {
        return false;
      }

      seen.add(patternKey);
      return true;
    });
}

export function getAssetImageHostnames(env: EnvRecord = process.env): string[] {
  return getUniqueHostnames(env, assetImageHostnameEnvKeys);
}

export function getSourceBackedProductImageHostnames(
  env: EnvRecord = process.env,
): string[] {
  const envHostnames = sourceBackedProductImageHostnameEnvKeys.flatMap((key) =>
    (env[key] ?? "")
      .split(",")
      .map((value) => toHostname(value))
      .filter((hostname): hostname is string => Boolean(hostname)),
  );

  return Array.from(
    new Set([...defaultSourceBackedProductImageHostnames, ...envHostnames]),
  );
}

export function getAiCatalogueRemotePatterns(
  env: EnvRecord = process.env,
): ImageRemotePattern[] {
  return getUniqueHostnames(env, aiCatalogueMediaHostnameEnvKeys).map(
    (hostname) => ({
      protocol: "https",
      hostname,
      pathname: "/ai-catalogue/products/**",
    }),
  );
}

export function getStrapiMediaRemotePatterns(
  env: EnvRecord = process.env,
): ImageRemotePattern[] {
  return getUniqueRemotePatterns(env, strapiMediaRemotePatternEnvKeys);
}
