import type {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";
import {
  getRequestHeader,
  getSupportTicketModule,
} from "../../../../support-ticket-utils";
import {
  deliveryViews,
  dispatchTicketDelivery,
} from "../../../../../lib/support-tickets/delivery";
import { DeliveryConflict } from "../../../../../lib/support-tickets/delivery-state";

const common = {
  kind: z.enum(["customer", "internal"]),
  expectedVersion: z.number().int().min(0),
  confirmed: z.literal(true),
};
const schema = z.discriminatedUnion("action", [
  z.object({ ...common, action: z.literal("send") }).strict(),
  z
    .object({
      ...common,
      action: z.literal("reconcile"),
      outcome: z.enum(["accepted", "not_accepted", "unresolved"]),
      evidence: z.string().trim().min(20).max(2000),
      providerReference: z.string().trim().min(3).max(200),
      senderStopped: z.boolean(),
    })
    .strict(),
]);
async function adminActor(req: MedusaRequest) {
  const auth = (req as AuthenticatedMedusaRequest).auth_context;
  if (!auth?.actor_id || auth.actor_type !== "user") return null;
  try {
    const user = await req.scope
      .resolve<{
        retrieveUser: (
          id: string,
        ) => Promise<{ id: string; deleted_at?: unknown }>;
      }>("user")
      .retrieveUser(auth.actor_id);
    return user.id === auth.actor_id && !user.deleted_at ? user.id : null;
  } catch {
    return null;
  }
}
function validOrigin(req: MedusaRequest) {
  if (getRequestHeader(req, "sec-fetch-site") === "cross-site") return false;
  const origin = getRequestHeader(req, "origin");
  if (!origin)
    return /^Bearer [^\s]+$/i.test(getRequestHeader(req, "authorization"));
  return (process.env.ADMIN_CORS ?? "")
    .split(",")
    .map((value) => value.trim())
    .some((allowed) => {
      try {
        return allowed !== "*" && new URL(allowed).origin === origin;
      } catch {
        return false;
      }
    });
}
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const actorId = await adminActor(req);
  if (!actorId)
    return res
      .status(401)
      .json({ message: "An active Admin user session is required" });
  if (!validOrigin(req))
    return res.status(403).json({ message: "Admin request origin rejected" });
  if (
    getRequestHeader(req, "content-type").split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    return res.status(415).json({ message: "JSON is required" });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: "Invalid delivery action" });
  try {
    const service = getSupportTicketModule(req);
    const [ticket] = await service.listSupportTickets({ id: req.params.id });
    if (!ticket || ticket.source !== "ai_chat")
      return res.status(404).json({ message: "AI support ticket not found" });
    const input = parsed.data;
    if (input.action === "send")
      await dispatchTicketDelivery(
        req,
        ticket,
        input.kind,
        input.expectedVersion,
        actorId,
      );
    else
      await service.transitionDelivery(ticket.id, input.kind, {
        ...input,
        action: "reconcile",
        actorId,
      });
    res.setHeader?.("Cache-Control", "no-store");
    return res.json({ deliveries: await deliveryViews(req, ticket) });
  } catch (error) {
    return res
      .status(error instanceof DeliveryConflict ? 409 : 503)
      .json({
        message:
          error instanceof DeliveryConflict
            ? "Delivery changed or requires reconciliation. Refresh its status."
            : "Delivery status is uncertain. Refresh and reconcile before trying again.",
      });
  }
}
