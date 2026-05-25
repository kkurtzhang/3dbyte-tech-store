import MaildevNotificationProviderModule from "../index";

describe("MaildevNotificationProviderModule", () => {
  it("exports a Medusa notification module provider definition", () => {
    expect(MaildevNotificationProviderModule).toMatchObject({
      module: "notification",
      services: [expect.objectContaining({ identifier: "maildev" })],
    });
  });
});
