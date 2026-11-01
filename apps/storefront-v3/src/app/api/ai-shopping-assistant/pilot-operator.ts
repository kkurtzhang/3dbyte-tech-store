import { constants } from "node:fs";
import { mkdir, lstat, open, rename, writeFile } from "node:fs/promises";
import { writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { getReleaseSha } from "@/lib/release-identity";
import type { PilotRequest, RuntimePilotReport } from "./pilot-runtime";
export const PILOT_DIRECTORY = "/tmp/3dbyte-composition-pilot";
const requestSchema = z
  .object({
    scope: z.literal("composition-only-three-cases-six-calls"),
    runId: z.string().regex(/^[a-zA-Z0-9._:-]{1,100}$/),
    releaseSha: z.string().regex(/^[a-f0-9]{40}$/),
    pricing: z.record(z.string(), z.unknown()),
  })
  .strict();
/** Local container-owner operation only. No network endpoint or credential grants. */
export async function registerCompositionPilotOperator(options: {
  tracingReady: boolean;
  run: (
    request: PilotRequest,
    io: {
      persist: (r: RuntimePilotReport) => Promise<void>;
      reserve: (r: unknown) => void;
    },
  ) => Promise<unknown>;
  directory?: string;
  signalTarget?: Pick<NodeJS.Process, "on">;
  env?: NodeJS.ProcessEnv;
}) {
  const env = options.env ?? process.env;
  if (env.APP_ENV !== "staging" || env.NODE_ENV !== "production")
    return undefined;
  if (!options.signalTarget && process.listenerCount("SIGUSR2") > 0)
    throw Error("pilot_signal_already_in_use");
  const directory = options.directory ?? PILOT_DIRECTORY;
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const info = await lstat(directory);
  if (
    !info.isDirectory() ||
    info.isSymbolicLink() ||
    (info.mode & 0o077) !== 0 ||
    info.uid !== process.getuid?.()
  )
    throw Error("pilot_directory_not_private");
  const atomic = async (name: string, value: unknown) => {
    const tmp = join(directory, `${name}.tmp`);
    await writeFile(tmp, JSON.stringify(value, null, 2) + "\n", {
      mode: 0o600,
    });
    await rename(tmp, join(directory, name));
  };
  const readiness = {
    pid: process.pid,
    releaseSha: getReleaseSha(env),
    tracingReady: options.tracingReady,
    generalSynthesisEnabled:
      env.AI_ASSISTANT_GROUNDED_SYNTHESIS_ENABLED === "true",
    scope: "composition-only-three-cases-six-calls",
    signal: "SIGUSR2",
  };
  await atomic("readiness.json", readiness);
  let handled = false;
  let handling = false;
  const handle = async () => {
    if (handled || handling) return;
    handling = true;
    let file;
    try {
      file = await open(
        join(directory, "request.json"),
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );
    } catch {
      handling = false;
      return;
    }
    try {
      const stat = await file.stat();
      if (
        !stat.isFile() ||
        stat.uid !== process.getuid?.() ||
        (stat.mode & 0o077) !== 0 ||
        stat.size > 4096
      )
        throw Error("pilot_request_not_private");
      const request = requestSchema.parse(
        JSON.parse(await file.readFile("utf8")),
      ) as PilotRequest;
      if (
        !options.tracingReady ||
        readiness.generalSynthesisEnabled ||
        readiness.releaseSha !== request.releaseSha
      )
        throw Error("pilot_readiness_mismatch");
      // Exclusive claim survives process restart inside this container. An uncertain
      // outcome never becomes a new allowance merely by sending the signal again.
      const claim = await open(join(directory, "claimed.json"), "wx", 0o600);
      handled = true;
      await claim.writeFile(
        JSON.stringify({
          runId: request.runId,
          releaseSha: request.releaseSha,
          state: "claimed",
          at: new Date().toISOString(),
        }),
      );
      await claim.close();
      await atomic("status.json", { state: "running", runId: request.runId });
      await options.run(request, {
        persist: (r) => atomic("report.json", r),
        reserve: (r) => {
          writeFileSync(
            join(directory, "reservation.json.tmp"),
            JSON.stringify(r, null, 2) + "\n",
            { mode: 0o600 },
          );
          renameSync(
            join(directory, "reservation.json.tmp"),
            join(directory, "reservation.json"),
          );
        },
      });
      await atomic("status.json", {
        state: "finished",
        runId: request.runId,
        at: new Date().toISOString(),
      });
    } catch (error) {
      await atomic("status.json", {
        state: handled ? "stopped_after_claim" : "refused",
        reason:
          error instanceof Error && /^pilot_[a-z_]+$/.test(error.message)
            ? error.message
            : "pilot_preflight_or_execution_failed",
        at: new Date().toISOString(),
      });
    } finally {
      await file.close();
      handling = false;
    }
  };
  (options.signalTarget ?? process).on("SIGUSR2", () => {
    void handle().catch(() =>
      console.warn(
        "[composition-pilot] Local operation stopped; inspect private receipts.",
      ),
    );
  });
  return { handle, readiness };
}
