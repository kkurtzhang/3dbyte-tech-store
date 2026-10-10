import NotificationProviderService from "../service";
import MaildevNotificationProviderModule from "../index";

describe("MaildevNotificationProviderModule", () => {
  it("exports a Medusa notification module provider definition", () => {
    expect(MaildevNotificationProviderModule).toMatchObject({
      module: "notification",
    });
    expect(MaildevNotificationProviderModule.services[0]).toBe(NotificationProviderService);
    expect(NotificationProviderService.identifier).toBe(
      "maildev",
    );
  });
});
