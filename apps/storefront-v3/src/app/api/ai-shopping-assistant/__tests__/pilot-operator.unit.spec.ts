/** @jest-environment node */
import { mkdtemp, writeFile, readFile, rm, chmod } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { registerCompositionPilotOperator } from "../pilot-operator";
const env = {
  NODE_ENV: "production" as const,
  APP_ENV: "staging",
  STOREFRONT_RELEASE_SHA: "a".repeat(40),
  AI_ASSISTANT_GROUNDED_SYNTHESIS_ENABLED: "false",
};
const request = {
  scope: "composition-only-three-cases-six-calls",
  runId: "synthetic-operator",
  releaseSha: "a".repeat(40),
  pricing: {},
};
it("registers no hook in production environment or test/development runtimes", async () => {
  const on = jest.fn();
  const run = jest.fn();
  expect(
    await registerCompositionPilotOperator({
      env: { ...env, APP_ENV: "production" },
      tracingReady: true,
      signalTarget: { on },
      run,
    }),
  ).toBeUndefined();
  expect(on).not.toHaveBeenCalled();
});
it("claims once before execution, keeps credentials out of files and ignores concurrent signals", async () => {
  const directory = await mkdtemp(join(tmpdir(), "composition-op-"));
  await chmod(directory, 0o700);
  try {
    const run = jest.fn(async (_r, io) => {
      await io.persist({ status: "fixture" });
      io.reserve({ calls: [] });
    });
    const op = await registerCompositionPilotOperator({
      directory,
      env,
      tracingReady: true,
      signalTarget: { on: jest.fn() },
      run,
    });
    await writeFile(join(directory, "request.json"), JSON.stringify(request), {
      mode: 0o600,
    });
    await Promise.all([op!.handle(), op!.handle()]);
    await op!.handle();
    expect(run).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(await readFile(join(directory, "claimed.json"), "utf8")).runId,
    ).toBe(request.runId);
    const second = await registerCompositionPilotOperator({
      directory,
      env,
      tracingReady: true,
      signalTarget: { on: jest.fn() },
      run,
    });
    await second!.handle();
    expect(run).toHaveBeenCalledTimes(1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
it("refuses world-readable requests, mismatched releases and missing tracing before any provider-capable callback", async () => {
  for (const option of ["permissions", "sha", "tracing"]) {
    const directory = await mkdtemp(join(tmpdir(), "composition-op-"));
    await chmod(directory, 0o700);
    try {
      const run = jest.fn();
      const op = await registerCompositionPilotOperator({
        directory,
        env,
        tracingReady: option !== "tracing",
        signalTarget: { on: jest.fn() },
        run,
      });
      await writeFile(
        join(directory, "request.json"),
        JSON.stringify({
          ...request,
          ...(option === "sha" ? { releaseSha: "b".repeat(40) } : {}),
        }),
        { mode: option === "permissions" ? 0o644 : 0o600 },
      );
      await op!.handle();
      expect(run).not.toHaveBeenCalled();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
});
it.each([
  true,
  "customer",
  { captureRejectedDrafts: true },
  { captureRejectedDrafts: "synthetic-pilot-only", extra: "not allowed" },
])(
  "refuses unsupported capture controls %p before invoking the runner",
  async (diagnostics) => {
    const directory = await mkdtemp(join(tmpdir(), "composition-op-"));
    await chmod(directory, 0o700);
    try {
      const run = jest.fn();
      const op = await registerCompositionPilotOperator({
        directory,
        env,
        tracingReady: true,
        signalTarget: { on: jest.fn() },
        run,
      });
      await writeFile(
        join(directory, "request.json"),
        JSON.stringify({ ...request, diagnostics }),
        { mode: 0o600 },
      );
      await op!.handle();
      expect(run).not.toHaveBeenCalled();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);
it("passes the explicit synthetic opt-in only from the owner-only request and retains private receipt permissions", async () => {
  const directory = await mkdtemp(join(tmpdir(), "composition-op-"));
  await chmod(directory, 0o700);
  try {
    const run = jest.fn(async (_r, io) => {
      await io.persist({ rejectedDraft: { text: "SYNTHETIC_PRIVATE_DRAFT" } });
    });
    const op = await registerCompositionPilotOperator({
      directory,
      env,
      tracingReady: true,
      signalTarget: { on: jest.fn() },
      run,
    });
    await writeFile(
      join(directory, "request.json"),
      JSON.stringify({
        ...request,
        diagnostics: { captureRejectedDrafts: "synthetic-pilot-only" },
      }),
      { mode: 0o600 },
    );
    await op!.handle();
    expect(run.mock.calls[0][0].diagnostics).toEqual({
      captureRejectedDrafts: "synthetic-pilot-only",
    });
    const { stat } = await import("node:fs/promises");
    expect((await stat(join(directory, "report.json"))).mode & 0o077).toBe(0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
