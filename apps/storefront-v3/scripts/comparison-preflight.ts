/// <reference types="node" />
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import {
  ComparisonBudget,
  quoteComparison,
} from "../src/app/api/ai-shopping-assistant/comparison-budget.js";
async function main() {
  const [file, releaseSha, runId] = process.argv.slice(2);
  if (!file || extname(file) !== ".json" || !releaseSha || !runId)
    throw Error(
      "Usage: comparison-preflight <public-pricing.json> <exact-release-sha> <run-id>",
    );
  const raw = await readFile(file, "utf8");
  if (Buffer.byteLength(raw, "utf8") > 4096)
    throw Error("Pricing record exceeds limit");
  const pricing: unknown = JSON.parse(raw);
  const quote = quoteComparison(pricing);
  console.log(
    JSON.stringify(
      { quote, maximumUsd: "2.00", mode: "offline_preflight_only" },
      null,
      2,
    ),
  );
  new ComparisonBudget({ runId, releaseSha, pricing });
  console.log(
    "Preflight passed. No provider request or trace was sent; execution remains separately authorized.",
  );
}
main().catch(() => {
  console.error(
    "Comparison preflight refused: missing/stale/invalid pricing, identity or reservation above USD 2. No provider request was sent.",
  );
  process.exitCode = 1;
});
