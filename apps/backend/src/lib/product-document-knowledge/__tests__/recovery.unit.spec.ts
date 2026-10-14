import { trackReconciliation } from "../recovery";
it("records completed counts and retains last success when a retryable reconciliation fails", async () => {
  const logger = { info: jest.fn(), error: jest.fn() };
  jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-14T10:00:00Z"));
  await trackReconciliation("fixture-job", logger, async () => ({
    indexed: 2,
    deleted: 1,
  }));
  expect(JSON.parse(logger.info.mock.calls[0][0])).toMatchObject({
    status: "completed",
    indexed: 2,
    deleted: 1,
    last_success_at: "2026-10-14T10:00:00.000Z",
  });
  await expect(
    trackReconciliation("fixture-job", logger, async () => {
      throw new Error("private source details");
    }),
  ).rejects.toThrow();
  expect(JSON.parse(logger.error.mock.calls[0][0])).toMatchObject({
    status: "failed",
    retry: "next_scheduled_run",
    last_success_at: "2026-10-14T10:00:00.000Z",
  });
  expect(logger.info).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(logger.error.mock.calls)).not.toContain(
    "private source details",
  );
  jest.restoreAllMocks();
});
