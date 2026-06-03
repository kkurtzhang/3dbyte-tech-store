import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_LOCAL_EMAIL_ASSET_BASE_URL = "http://127.0.0.1:3001";
const DEFAULT_PRODUCTION_EMAIL_ASSET_BASE_URL =
  "https://store.3dbytetech.com.au";
const DEFAULT_STAGING_EMAIL_ASSET_BASE_URL =
  "https://store.staging.3dbytetech.com.au";
const EMAIL_BRAND_LOGO_PATH = "/brand/logos/logo-primary-horizontal-640w.png";
const EMAIL_BRAND_LOGO_PUBLIC_PATH =
  "apps/storefront-v3/public/brand/logos/logo-primary-horizontal-640w.png";
const EMAIL_BRAND_LOGO_BACKEND_RELATIVE_PATH =
  "../storefront-v3/public/brand/logos/logo-primary-horizontal-640w.png";

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const normalizeBaseUrl = (value?: string | null): string | null => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    const pathname =
      url.pathname === "/" ? "" : trimTrailingSlash(url.pathname);

    return trimTrailingSlash(`${url.origin}${pathname}`);
  } catch {
    return null;
  }
};

export const EMAIL_BRAND_LOGO_ALT = "3D Byte Tech";

const isLocalRuntime = (
  env: Partial<Record<string, string | undefined>>,
): boolean => {
  const runtime = (env.APP_ENV || env.NODE_ENV || "development").toLowerCase();

  return runtime !== "production" && runtime !== "staging";
};

const shouldEmbedLocalLogo = (
  env: Partial<Record<string, string | undefined>>,
): boolean => {
  if (env.EMAIL_BRAND_LOGO_EMBED === "true") {
    return true;
  }

  if (env.EMAIL_BRAND_LOGO_EMBED === "false") {
    return false;
  }

  return isLocalRuntime(env);
};

const getLocalLogoFileCandidates = (
  env: Partial<Record<string, string | undefined>>,
): string[] => [
  ...(env.EMAIL_BRAND_LOGO_FILE ? [env.EMAIL_BRAND_LOGO_FILE] : []),
  resolve(process.cwd(), EMAIL_BRAND_LOGO_PUBLIC_PATH),
  resolve(process.cwd(), EMAIL_BRAND_LOGO_BACKEND_RELATIVE_PATH),
];

const getEmbeddedBrandLogoSrc = (
  env: Partial<Record<string, string | undefined>>,
): string | null => {
  for (const candidate of getLocalLogoFileCandidates(env)) {
    if (!existsSync(candidate)) {
      continue;
    }

    const encoded = readFileSync(candidate).toString("base64");

    return `data:image/png;base64,${encoded}`;
  }

  return null;
};

const getDefaultEmailAssetBaseUrl = (
  env: Partial<Record<string, string | undefined>>,
): string => {
  const runtime = (env.APP_ENV || env.NODE_ENV || "development").toLowerCase();

  if (runtime === "production") {
    return DEFAULT_PRODUCTION_EMAIL_ASSET_BASE_URL;
  }

  if (runtime === "staging") {
    return DEFAULT_STAGING_EMAIL_ASSET_BASE_URL;
  }

  return DEFAULT_LOCAL_EMAIL_ASSET_BASE_URL;
};

export const getEmailAssetBaseUrl = (
  env: Partial<Record<string, string | undefined>> = process.env,
): string => {
  const candidates = [
    env.EMAIL_ASSET_BASE_URL,
    env.STOREFRONT_URL,
    env.NEXT_PUBLIC_SITE_URL,
    env.SERVICE_URL_STOREFRONT,
    env.SERVICE_FQDN_STOREFRONT,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeBaseUrl(candidate);

    if (normalized) {
      return normalized;
    }
  }

  return getDefaultEmailAssetBaseUrl(env);
};

export const getEmailBrandLogoUrl = (
  env: Partial<Record<string, string | undefined>> = process.env,
): string => {
  const explicitAssetBaseUrl = Boolean(env.EMAIL_ASSET_BASE_URL?.trim());

  if (!explicitAssetBaseUrl && shouldEmbedLocalLogo(env)) {
    const embeddedLogoSrc = getEmbeddedBrandLogoSrc(env);

    if (embeddedLogoSrc) {
      return embeddedLogoSrc;
    }
  }

  return `${getEmailAssetBaseUrl(env)}${EMAIL_BRAND_LOGO_PATH}`;
};
