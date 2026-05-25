import ResendNotificationProviderModule from "../index";

describe("ResendNotificationProviderModule", () => {
  it("exports a Medusa notification module provider definition", () => {
    expect(ResendNotificationProviderModule).toMatchObject({
      module: "notification",
      services: [expect.objectContaining({ identifier: "resend" })],
    });
  });
});
