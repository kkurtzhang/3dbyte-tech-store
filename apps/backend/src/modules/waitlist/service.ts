import { MedusaService } from "@medusajs/framework/utils";
import { WaitlistEntry } from "./models/waitlist-entry";

class WaitlistModuleService extends MedusaService({
  WaitlistEntry,
}) {}

export default WaitlistModuleService;
