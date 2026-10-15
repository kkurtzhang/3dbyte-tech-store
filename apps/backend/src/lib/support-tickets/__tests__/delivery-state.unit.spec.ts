import {
  initialDelivery,
  transitionDelivery,
  publicDelivery,
  DeliveryConflict,
} from "../delivery-state";
const ticket = {
  id: "spt_fixture",
  ticket_number: "TEST",
  status: "new",
  priority: "normal",
  category: "general",
  source: "ai_chat",
  subject: "Synthetic",
  customer_name: "Fixture",
  customer_email: "customer@example.invalid",
  metadata: { consent_support_inbox: "inbox@example.invalid" },
};
const payload = {
  to: "customer@example.invalid",
  channel: "email",
  template: "synthetic",
};
const claim = (state = initialDelivery(ticket, "customer", true)) =>
  transitionDelivery(
    state,
    { action: "claim", expectedVersion: state.version, payload, actorId: null },
    1000,
  );
const begin = () => {
  const s = claim();
  return transitionDelivery(
    s,
    { action: "begin", expectedVersion: s.version },
    1001,
  );
};
it("records intent before dispatch and never permits a second initial claim", () => {
  const s = claim();
  expect(s.status).toBe("queued");
  expect(s.attempt).toBe(1);
  expect(s.payload?.to).toBe(ticket.customer_email);
  expect(() =>
    transitionDelivery(
      s,
      { action: "claim", expectedVersion: s.version, payload, actorId: null },
      1002,
    ),
  ).toThrow(DeliveryConflict);
  expect(begin().status).toBe("unknown");
});
it("prevents replay, stale completions and mutation of the confirmed recipient", () => {
  expect(() =>
    transitionDelivery(
      initialDelivery(ticket, "customer", true),
      { action: "claim", expectedVersion: 3, payload, actorId: null },
      1,
    ),
  ).toThrow();
  expect(() =>
    claim({
      ...initialDelivery(ticket, "customer", true),
      recipient: "other@example.invalid",
    }),
  ).toThrow();
  const s = begin();
  expect(() =>
    transitionDelivery(
      s,
      {
        action: "sent",
        expectedVersion: s.version - 1,
        notificationId: "n",
        providerId: "p",
      },
      2000,
    ),
  ).toThrow();
});
it("does not turn interrupted sends into retryable failures automatically", () => {
  const s = begin();
  expect(publicDelivery(s, 999999).status).toBe("unknown");
  expect(publicDelivery(s, 999999).canSend).toBe(false);
  expect(() =>
    transitionDelivery(
      s,
      {
        action: "claim",
        expectedVersion: s.version,
        payload,
        actorId: "admin",
      },
      999999,
    ),
  ).toThrow();
});
it("requires reconciliation evidence and a stopped sender before retrying uncertainty", () => {
  const s = begin();
  const command = {
    action: "reconcile" as const,
    expectedVersion: s.version,
    actorId: "admin",
    outcome: "not_accepted" as const,
    evidence: "Provider case confirms no acceptance",
    providerReference: "case-123",
    senderStopped: true,
  };
  expect(() => transitionDelivery(s, command, 1002)).toThrow();
  expect(() =>
    transitionDelivery(s, { ...command, senderStopped: false }, 999999),
  ).toThrow();
  expect(() =>
    transitionDelivery(s, { ...command, evidence: "" }, 999999),
  ).toThrow();
  const failed = transitionDelivery(s, command, 999999);
  expect(failed.status).toBe("failed");
  const retry = transitionDelivery(
    failed,
    {
      action: "claim",
      expectedVersion: failed.version,
      payload: { ...payload, to: "wrong@example.invalid" },
      actorId: "admin",
    },
    1000000,
  );
  expect(retry.payload?.to).toBe(ticket.customer_email);
  expect(retry.key).not.toBe(s.key);
  expect(retry.attempt).toBe(2);
  expect(() =>
    transitionDelivery(
      failed,
      {
        action: "claim",
        expectedVersion: failed.version,
        payload,
        actorId: null,
      },
      1000000,
    ),
  ).toThrow();
});
it("retains uncertain legacy outcomes and limits retries", () => {
  const legacy = initialDelivery(ticket, "internal", false);
  expect(legacy.status).toBe("unknown");
  expect(legacy.key).toBe("support-ticket/internal-created/spt_fixture");
  expect(() =>
    transitionDelivery(
      legacy,
      { action: "claim", expectedVersion: 0, payload, actorId: "admin" },
      1,
    ),
  ).toThrow();
  const exhausted = {
    ...initialDelivery(ticket, "customer", true),
    status: "failed" as const,
    attempt: 5,
  };
  expect(publicDelivery(exhausted).canSend).toBe(false);
  expect(() => claim(exhausted)).toThrow();
});
it("uses sent only after a recorded provider acceptance and never implies delivery", () => {
  const s = begin();
  const sent = transitionDelivery(
    s,
    {
      action: "sent",
      expectedVersion: s.version,
      notificationId: "noti",
      providerId: "provider-accepted",
    },
    2000,
  );
  expect(publicDelivery(sent)).toMatchObject({
    status: "sent",
    canSend: false,
    canReconcile: false,
    providerId: "provider-accepted",
  });
  expect(() =>
    transitionDelivery(
      s,
      {
        action: "sent",
        expectedVersion: s.version,
        notificationId: "",
        providerId: "",
      },
      2000,
    ),
  ).toThrow();
});
