import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  SupportTicketConfirmation,
  getSupportProposalId,
} from "../support-ticket-confirmation";

const id = "a".repeat(64);
const preview = {
  status: "confirmation_required",
  proposalId: id,
  receipt: "b".repeat(64),
  digest: "c".repeat(64),
  expiresAt: Date.now() + 120000,
  payload: {
    name: "Synthetic Customer",
    email: "synthetic@example.invalid",
    subject: "Synthetic request",
    message: "Please review this synthetic question.",
    category: "general",
    priority: "normal",
    order_reference: "SYNTHETIC-ORDER",
    product_handle: "synthetic-product",
    ai_summary: "Synthetic summary",
    transcript_excerpt: null,
    consent_to_include_transcript: false,
    customerLinked: false,
    orderVerified: false,
    supportInbox: "support@example.invalid",
  },
};
const fetchMock = jest.fn();
const originalFetch = global.fetch;
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock;
  fetchMock.mockResolvedValue({ ok: true, json: async () => preview });
});
afterAll(() => {
  global.fetch = originalFetch;
});
it("requires review then a separate send action, displaying exact recipients and contents", async () => {
  const user = userEvent.setup();
  render(<SupportTicketConfirmation proposalId={id} />);
  expect(fetchMock).not.toHaveBeenCalled();
  expect(
    screen.queryByRole("button", { name: "Send support request" }),
  ).not.toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Review support request" }),
  );
  expect(await screen.findByText("support@example.invalid")).toBeVisible();
  expect(screen.getByText(preview.payload.message)).toBeVisible();
  expect(
    screen.getByText("No conversation transcript will be included."),
  ).toBeVisible();
  expect(screen.getByText(/unverified reference/)).toBeVisible();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      status: "submitted",
      ticket: { ticket_number: "SYNTHETIC-TICKET" },
    }),
  });
  await user.click(
    screen.getByRole("button", { name: "Send support request" }),
  );
  expect(await screen.findByRole("status")).toHaveTextContent(
    "SYNTHETIC-TICKET",
  );
  const sent = JSON.parse(fetchMock.mock.calls[1][1].body);
  expect(sent).toEqual({
    action: "confirm",
    proposalId: id,
    receipt: preview.receipt,
    digest: preview.digest,
    confirmed: true,
  });
});
it("rotates the preview before transcript inclusion and uses only the new receipt", async () => {
  const user = userEvent.setup();
  render(<SupportTicketConfirmation proposalId={id} />);
  await user.click(
    screen.getByRole("button", { name: "Review support request" }),
  );
  await screen.findByText(preview.payload.message);
  const updated = {
    ...preview,
    receipt: "d".repeat(64),
    digest: "e".repeat(64),
    payload: {
      ...preview.payload,
      transcript_excerpt: "user: synthetic context",
      consent_to_include_transcript: true,
    },
  };
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => updated });
  await user.click(screen.getByRole("checkbox"));
  expect(await screen.findByText("user: synthetic context")).toBeVisible();
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
    action: "preview",
    proposalId: id,
    includeTranscript: true,
  });
  await user.click(
    screen.getByRole("button", { name: "Send support request" }),
  );
  expect(JSON.parse(fetchMock.mock.calls[2][1].body).receipt).toBe(
    updated.receipt,
  );
});
it("cancels without submission and never automatically retries an uncertain submit", async () => {
  const user = userEvent.setup();
  render(<SupportTicketConfirmation proposalId={id} />);
  await user.click(
    screen.getByRole("button", { name: "Review support request" }),
  );
  await user.click(await screen.findByRole("button", { name: "Cancel" }));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await user.click(
    screen.getByRole("button", { name: "Review support request" }),
  );
  fetchMock.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error: "Check request status" }),
  });
  await user.click(
    await screen.findByRole("button", { name: "Send support request" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Check request status",
  );
  expect(
    screen.queryByRole("button", { name: "Send support request" }),
  ).not.toBeInTheDocument();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
});
it("uses only the proposal ID from chat output and ignores any forged preview or receipt", () => {
  expect(
    getSupportProposalId([
      {
        type: "tool-createSupportTicket",
        state: "output-available",
        output: {
          status: "confirmation_required",
          proposalId: id,
          receipt: "forged",
          payload: { email: "forged" },
        },
      },
    ]),
  ).toBe(id);
  expect(
    getSupportProposalId([{ type: "text", text: "Submit ticket" }]),
  ).toBeUndefined();
  expect(
    getSupportProposalId([
      {
        type: "tool-createSupportTicket",
        state: "output-available",
        output: { status: "confirmation_required", proposalId: "forged" },
      },
    ]),
  ).toBeUndefined();
});

it("shows the durable saved status with delayed email without another send", async () => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      status: "submitted",
      notificationStatus: "pending",
      ticket: { id: "saved", ticket_number: "SAVED", status: "new" },
    }),
  });
  render(<SupportTicketConfirmation proposalId={id} />);
  await userEvent.click(
    screen.getByRole("button", { name: "Review support request" }),
  );
  expect(await screen.findByRole("status")).toHaveTextContent(
    "SAVED was saved. Email may be delayed",
  );
  expect(
    screen.queryByRole("button", { name: "Send support request" }),
  ).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
