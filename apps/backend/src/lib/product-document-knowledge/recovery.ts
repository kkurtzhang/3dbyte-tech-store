import type { Logger } from "@medusajs/framework/types";

// Process-local diagnostic state only; restart means no recorded success yet.
const lastSuccess = new Map<string, string>();
export async function trackReconciliation<
  T extends { indexed: number; deleted: number },
>(
  job: string,
  logger: Pick<Logger, "info" | "error">,
  execute: () => Promise<T>,
): Promise<T> {
  try {
    const result = await execute();
    const completedAt = new Date(Date.now()).toISOString();
    lastSuccess.set(job, completedAt);
    logger.info(
      JSON.stringify({
        job,
        status: "completed",
        ...result,
        last_success_at: completedAt,
      }),
    );
    return result;
  } catch (error) {
    logger.error(
      JSON.stringify({
        job,
        status: "failed",
        last_success_at: lastSuccess.get(job) ?? null,
        retry: "next_scheduled_run",
        reason: "reconciliation_failed",
      }),
    );
    throw error;
  }
}
