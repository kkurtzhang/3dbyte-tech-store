import {
  consentStore,
  consentToken,
  ConsentConflict,
  type ConsentRecord,
} from "../consent-store";

const run = process.env.CONSENT_TEST_REDIS_URL ? describe : describe.skip;
run("isolated Redis consent atomicity", () => {
  beforeAll(() => {
    process.env.REDIS_URL = process.env.CONSENT_TEST_REDIS_URL;
  });
  it("allows exactly one atomic claim across concurrent callers and never recreates expired records", async () => {
    const id = consentToken();
    const context = consentToken();
    const record: ConsentRecord = {
      context,
      status: "preview",
      expiresAt: Date.now() + 600000,
      receiptExpiresAt: Date.now() + 120000,
    };
    await consentStore.create(id, record);
    const { raw } = await consentStore.read(id, context);
    const claimed = { ...record, status: "processing" as const };
    await expect(
      consentStore.replace(id, raw, {
        ...claimed,
        receiptExpiresAt: Date.now() - 1,
      }),
    ).rejects.toBeInstanceOf(ConsentConflict);
    const outcomes = await Promise.allSettled(
      Array.from({ length: 20 }, () => consentStore.replace(id, raw, claimed)),
    );
    expect(
      outcomes.filter((outcome) => outcome.status === "fulfilled"),
    ).toHaveLength(1);
    expect((await consentStore.read(id, context)).record.status).toBe(
      "processing",
    );
    await expect(consentStore.replace(id, raw, record)).rejects.toBeInstanceOf(
      ConsentConflict,
    );
    await expect(consentStore.read(id, consentToken())).rejects.toBeInstanceOf(
      ConsentConflict,
    );
    await expect(
      consentStore.replace(consentToken(), raw, claimed),
    ).rejects.toBeInstanceOf(ConsentConflict);
    await expect(consentStore.create(id, record)).rejects.toBeInstanceOf(
      ConsentConflict,
    );
  });
});
