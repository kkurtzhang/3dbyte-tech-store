export function getPublicDocumentDownloadUrl(pathOrUrl: string): string {
  const decodeDocumentId = (documentId: string) => {
    try {
      return decodeURIComponent(documentId);
    } catch {
      return documentId;
    }
  };

  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  const absoluteUrl = /^https?:\/\//i.test(pathOrUrl);
  const pathname = (() => {
    if (!absoluteUrl) {
      return path;
    }

    try {
      return new URL(pathOrUrl).pathname;
    } catch {
      return "";
    }
  })();
  const match = path.match(/^\/store\/product-documents\/([^/]+)\/download\/?$/);
  const absoluteMatch = pathname.match(
    /^\/store\/product-documents\/([^/]+)\/download\/?$/,
  );
  const documentId = match?.[1] || absoluteMatch?.[1];

  if (documentId) {
    return `/api/product-documents/${encodeURIComponent(
      decodeDocumentId(documentId),
    )}/download`;
  }

  return absoluteUrl ? "#" : path;
}
