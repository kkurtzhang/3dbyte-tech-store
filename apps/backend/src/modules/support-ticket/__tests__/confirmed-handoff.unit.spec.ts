import SupportTicketModuleService from "../service";
import type { CreateSupportTicketInput } from "../../../lib/support-tickets/validation";

const input: CreateSupportTicketInput & { consent_proposal_id: string } = {
  consent_proposal_id: "a".repeat(64),
  name: "Synthetic",
  email: "synthetic@example.invalid",
  subject: "Synthetic",
  message: "Synthetic message",
  category: "general",
  priority: "normal",
  source: "ai_chat",
  customer_id: null,
  order_id: null,
  order_reference: null,
  product_id: null,
  product_handle: null,
  ai_summary: null,
  metadata: { consent_proposal_id: "synthetic" },
};
function fixture() {
  const manager = { synthetic: true };
  const repository = {
    getFreshManager: jest.fn(() => manager),
    transaction: jest.fn(async (job: (manager: unknown) => Promise<unknown>) =>
      job(manager),
    ),
  };
  const service = new SupportTicketModuleService({
    baseRepository: repository,
  } as never);
  const ticket = jest
    .spyOn(service, "createSupportTickets")
    .mockResolvedValue({ id: "synthetic-ticket" } as never);
  const message = jest
    .spyOn(service, "createSupportTicketMessages")
    .mockResolvedValue({ id: "synthetic-message" } as never);
  const event = jest
    .spyOn(service, "createSupportTicketEvents")
    .mockResolvedValue({ id: "synthetic-event" } as never);
  return { service, repository, manager, ticket, message, event };
}
it("uses the native transaction for the ticket, message, consent event and both notification intents", async () => {
  const f = fixture();
  await f.service.createConfirmedAiHandoff(input);
  expect(f.ticket).toHaveBeenCalledWith(
    expect.objectContaining({
      ai_consent_proposal_id: input.consent_proposal_id,
    }),
    expect.anything(),
  );
  expect(f.repository.transaction).toHaveBeenCalledTimes(1);
  expect(f.event).toHaveBeenCalledTimes(3);
  for (const [, context] of f.event.mock.calls)
    expect(context).toEqual(
      expect.objectContaining({ transactionManager: f.manager }),
    );
  for (const call of [2, 3])
    expect(f.event).toHaveBeenNthCalledWith(
      call,
      expect.objectContaining({ type: "ai_notification_delivery_state" }),
      expect.anything(),
    );
  for (const operation of [f.ticket, f.message, f.event])
    expect(operation.mock.calls[0][1]).toEqual(
      expect.objectContaining({ transactionManager: f.manager }),
    );
  expect(f.message).toHaveBeenCalledWith(
    expect.objectContaining({
      ticket_id: "synthetic-ticket",
      body: input.message,
      author_type: "customer",
    }),
    expect.anything(),
  );
  expect(f.event).toHaveBeenCalledWith(
    expect.objectContaining({ type: "ai_handoff_confirmed" }),
    expect.anything(),
  );
});
it("propagates a message write failure through the transaction and does not write an event", async () => {
  const f = fixture();
  f.message.mockRejectedValueOnce(new Error("synthetic persistence failure"));
  await expect(f.service.createConfirmedAiHandoff(input)).rejects.toThrow(
    "synthetic persistence failure",
  );
  expect(f.event).not.toHaveBeenCalled();
});
