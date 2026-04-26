import type { ExecArgs } from "@medusajs/framework/types";

import syncAddressesJob from "../jobs/sync-addresses";

export default async function runAddressSync({ container }: ExecArgs) {
  await syncAddressesJob(container);
}
