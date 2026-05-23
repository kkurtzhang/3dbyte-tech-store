export function getPublicDocumentDownloadUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  const match = path.match(/^\/store\/product-documents\/([^/]+)\/download\/?$/);

  if (match?.[1]) {
    return `/api/product-documents/${encodeURIComponent(
      decodeURIComponent(match[1]),
    )}/download`;
  }

  return path;
}
