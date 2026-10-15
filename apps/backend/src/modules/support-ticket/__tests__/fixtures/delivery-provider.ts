import {
  AbstractNotificationProviderService,
  ModuleProvider,
  Modules,
} from "@medusajs/framework/utils";
import type { ProviderSendNotificationDTO } from "@medusajs/framework/types";
export const state = {
  calls: [] as Array<{ key: string; to: string; accepted: boolean }>,
  failInternal: false,
  acceptThenThrow: false,
};
class SyntheticProvider extends AbstractNotificationProviderService {
  static identifier = "synthetic-reconciliation";
  async send(notification: ProviderSendNotificationDTO) {
    const key = (
      notification as ProviderSendNotificationDTO & { idempotency_key?: string }
    ).idempotency_key;
    if (!key) throw new Error("Synthetic idempotency key required");
    if (!notification.to.endsWith("@example.invalid"))
      throw new Error("Synthetic recipient required");
    const internal =
      key.includes("/internal-created/") || key.includes("/internal/");
    state.calls.push({
      key,
      to: notification.to,
      accepted: !(internal && state.failInternal),
    });
    if (internal && state.failInternal)
      throw new Error("Synthetic internal provider interruption");
    if (state.acceptThenThrow)
      throw new Error("Synthetic response lost after provider acceptance");
    return { id: "synthetic-provider-" + state.calls.length };
  }
}
export default ModuleProvider(Modules.NOTIFICATION, {
  services: [SyntheticProvider],
});
