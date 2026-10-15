import { z } from "zod";
import { readAssistantJson } from "../read-request";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import {
  callSupportBackend,
  getSupportSession,
  isSupportSameOrigin,
} from "../support-session";

const id = z.string().regex(/^[a-f0-9]{64}$/);
const inputSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("preview"),
      proposalId: id,
      includeTranscript: z.boolean().default(false),
    })
    .strict(),
  z
    .object({
      action: z.literal("confirm"),
      proposalId: id,
      receipt: id,
      digest: id,
      confirmed: z.literal(true),
    })
    .strict(),
]);
const json = (body: unknown, status: number) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", Vary: "Cookie, Origin" },
  });
export async function POST(req: Request) {
  if (!isSupportSameOrigin(req))
    return json({ error: "Same-origin confirmation required" }, 403);
  const session = getSupportSession(req);
  if (!session)
    return json(
      { error: "The support session expired. Ask for a new preview." },
      409,
    );
  const rate = await checkRateLimit(
    `assistant-support:${getClientIp(req.headers)}`,
    12,
    60_000,
  );
  if (!rate.allowed)
    return json({ error: "Too many confirmation requests. Please wait." }, 429);
  try {
    const parsed = inputSchema.safeParse(await readAssistantJson(req, 2048));
    if (!parsed.success) return json({ error: "Invalid confirmation" }, 400);
    const { action, ...body } = parsed.data;
    const response = await callSupportBackend(req, session, action, body);
    if (!response.ok)
      return json(
        {
          error:
            response.status === 409
              ? "This preview expired, changed or was submitted. Review its status before trying again."
              : "Support confirmation is unavailable. Check the request status before starting another request.",
        },
        [400, 401, 409, 429].includes(response.status) ? response.status : 503,
      );
    return json(await response.json(), response.status);
  } catch {
    return json(
      {
        error:
          "Support confirmation is unavailable. Check its status before starting another request.",
      },
      503,
    );
  }
}
