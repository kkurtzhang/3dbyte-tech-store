import { createHash, randomBytes } from "node:crypto";
import { CUSTOMER_TOKEN_COOKIE } from "@/lib/auth/session-cookies";
import { resolveMedusaBaseUrl } from "@/lib/medusa/base-url";

function cookieName(req: Request) {
  return process.env.NODE_ENV === "production" ||
    new URL(req.url).protocol === "https:"
    ? "__Host-assistant_support_session"
    : "assistant_support_session";
}
const TOKEN = /^[a-f0-9]{64}$/;
function readCookie(req: Request, name: string) {
  const entries = (req.headers.get("cookie") || "")
    .split(";")
    .map((entry) => entry.trim());
  const values = entries.filter((entry) => entry.startsWith(`${name}=`));
  if (values.length !== 1) return undefined;
  try {
    return decodeURIComponent(values[0].slice(name.length + 1));
  } catch {
    return undefined;
  }
}
export function getSupportSession(req: Request, create = false) {
  const existing = readCookie(req, cookieName(req));
  const session =
    existing && TOKEN.test(existing)
      ? existing
      : create
        ? randomBytes(32).toString("hex")
        : undefined;
  if (!session) return null;
  const customerToken = readCookie(req, CUSTOMER_TOKEN_COOKIE);
  const context = createHash("sha256")
    .update(JSON.stringify([session, customerToken || null]))
    .digest("hex");
  return { session, context, customerToken, isNew: session !== existing };
}
export function withSupportSession(
  response: Response,
  req: Request,
  session: NonNullable<ReturnType<typeof getSupportSession>>,
) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  if (session.isNew) {
    const secure =
      process.env.NODE_ENV === "production" ||
      (req.url && new URL(req.url).protocol === "https:");
    headers.append(
      "Set-Cookie",
      `${cookieName(req)}=${session.session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800${secure ? "; Secure" : ""}`,
    );
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
export function isSupportSameOrigin(req: Request) {
  try {
    const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (!configured && process.env.NODE_ENV === "production") return false;
    const expected = new URL(configured || req.url).origin;
    const fetchSite = req.headers.get("sec-fetch-site");
    return (
      req.headers.get("origin") === expected &&
      (!fetchSite || fetchSite === "same-origin") &&
      req.headers.get("content-type")?.split(";")[0].trim() ===
        "application/json"
    );
  } catch {
    return false;
  }
}
export async function callSupportBackend(
  req: Request,
  session: NonNullable<ReturnType<typeof getSupportSession>>,
  action: "prepare" | "preview" | "confirm",
  body: unknown,
) {
  const internalToken = process.env.INTERNAL_API_TOKEN?.trim();
  if (!internalToken) throw new Error("Support unavailable");
  return fetch(
    `${resolveMedusaBaseUrl()}/ai/support-ticket${action === "confirm" ? "" : `/${action}`}`,
    {
      method: "POST",
      cache: "no-store",
      redirect: "error",
      signal: req.signal
        ? AbortSignal.any([req.signal, AbortSignal.timeout(8000)])
        : AbortSignal.timeout(8000),
      headers: {
        "content-type": "application/json",
        "x-3db-internal-token": internalToken,
        "x-3db-assistant-session": session.context,
        ...(session.customerToken
          ? { authorization: `Bearer ${session.customerToken}` }
          : {}),
      },
      body: JSON.stringify(body),
    },
  );
}
