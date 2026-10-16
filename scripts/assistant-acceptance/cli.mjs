import { parseOptions } from "./config.mjs";
import { runHarness } from "./runner.mjs";
const controller = new AbortController();
process.once("SIGINT", () => controller.abort());
process.once("SIGTERM", () => controller.abort());
try {
  const options = parseOptions(process.argv.slice(2));
  const result = await runHarness(options, {
    signal: controller.signal,
    onReady: ({ url, runDir }) =>
      console.log(
        JSON.stringify({ status: "READY", url, runDir, mode: options.mode }),
      ),
  });
  console.log(
    JSON.stringify({
      result: result.result,
      runDir: result.runDir,
      passed: result.cases?.filter((c) => c.passed).length,
      total: result.cases?.length,
      cleanup: result.cleanup,
    }),
  );
  if (!["PASS", "PREFLIGHT_PASS"].includes(result.result)) process.exitCode = 1;
} catch (error) {
  // Only this allowlist of static configuration errors is safe to display.
  const safe = [
    "Live mode needs --key-file",
    "Private config must contain",
    "Private config must be owner-only",
    "Provider configuration",
    "Use run, serve",
    "Unknown or incomplete",
    "Mode must",
    "Key files are",
    "Use an isolated checkout",
    "Unknown acceptance case",
  ];
  console.error(
    safe.some((prefix) => error.message?.startsWith(prefix))
      ? error.message
      : "Harness preflight failed. Check the documented SSD paths, clean reviewed source, installed dependencies, and pinned Redis setup. No credentials were logged.",
  );
  process.exitCode = 1;
}
