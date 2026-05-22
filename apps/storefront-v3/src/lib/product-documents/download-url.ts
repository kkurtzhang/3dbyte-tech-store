import { resolveMedusaBaseUrl } from "@/lib/medusa/base-url";

export function getPublicDocumentDownloadUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${resolveMedusaBaseUrl({ isServer: false })}${path}`;
}
