import type { ProductFileDownload } from "../types";

/** Read SigV4 timing from the trusted file provider's URL; never invent a TTL. */
export function parseSignedDownload(
  raw: unknown,
  now = Date.now(),
): ProductFileDownload | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const durations = url.searchParams.getAll("X-Amz-Expires");
  const dates = url.searchParams.getAll("X-Amz-Date");
  if (durations.length !== 1 || dates.length !== 1) return null;
  if (!/^[1-9]\d{0,5}$/.test(durations[0])) return null;
  const duration = Number(durations[0]);
  // SigV4's maximum signing window is seven days.
  if (duration > 7 * 24 * 60 * 60) return null;

  const date = dates[0].match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!date) return null;
  const iso = `${date[1]}-${date[2]}-${date[3]}T${date[4]}:${date[5]}:${date[6]}.000Z`;
  const signedAt = Date.parse(iso);
  if (
    !Number.isFinite(signedAt) ||
    new Date(signedAt).toISOString() !== iso ||
    signedAt > now
  )
    return null;

  const remaining = Math.floor((signedAt + duration * 1000 - now) / 1000);
  if (remaining <= 0) return null;
  return { url: raw, expires_in: remaining };
}
