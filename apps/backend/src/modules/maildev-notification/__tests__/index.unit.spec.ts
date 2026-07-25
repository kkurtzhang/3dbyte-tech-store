import MaildevNotificationProviderModule from "../index";

describe("MaildevNotificationProviderModule", () => {
  it("exports a Medusa notification module provider definition", () => {
    expect(MaildevNotificationProviderModule).toMatchObject({
      module: "notification",
    });
    expect(MaildevNotificationProviderModule.services[0].identifier).toBe(
      "maildev",
    );
  });
});
