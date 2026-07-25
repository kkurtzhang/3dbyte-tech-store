import ResendNotificationProviderModule from "../index";

describe("ResendNotificationProviderModule", () => {
  it("exports a Medusa notification module provider definition", () => {
    expect(ResendNotificationProviderModule).toMatchObject({
      module: "notification",
    });
    expect(ResendNotificationProviderModule.services[0].identifier).toBe(
      "resend",
    );
  });
});
