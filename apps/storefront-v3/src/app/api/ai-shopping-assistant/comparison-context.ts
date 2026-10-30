import { AsyncLocalStorage } from "node:async_hooks";
import {
  ComparisonBudget,
  COMPARISON_BUDGET_VERSION,
  type ComparisonArm,
  type ComparisonStage,
} from "./comparison-budget";
type Context = {
  budget: ComparisonBudget;
  arm: ComparisonArm;
  turn: number;
  stage: ComparisonStage;
};
const context = new AsyncLocalStorage<Context>();
/** Trusted in-process operator API only: no HTTP/header/query/body control is exposed.
 * Consume the entire response stream inside fn before returning. A process restart
 * does not authorize a new batch or reconstruct an account-wide billing ledger.
 */
export async function runComparisonTurn<T>(
  budget: ComparisonBudget,
  arm: ComparisonArm,
  turn: number,
  fn: () => Promise<T>,
): Promise<T> {
  budget.openTurn(arm, turn);
  try {
    return await context.run({ budget, arm, turn, stage: "route" }, fn);
  } finally {
    budget.closeTurn(arm, turn);
  }
}
export function comparisonArm() {
  return context.getStore()?.arm;
}
export function comparisonRouteSettings() {
  return context.getStore() ? { maxRetries: 0, maxOutputTokens: 1800 } : {};
}
export function comparisonMetadata(): Record<string, string | number> {
  const c = context.getStore();
  return c
    ? {
        comparison_run_id: c.budget.runId,
        comparison_arm: c.arm,
        comparison_turn: c.turn,
        comparison_expected_release_sha: c.budget.releaseSha,
        comparison_budget_version: COMPARISON_BUDGET_VERSION,
        comparison_reserved_usd: c.budget.quote.reservedUsd,
        comparison_budget_basis: c.budget.quote.basis,
      }
    : {};
}
export async function withComparisonStage<T>(
  stage: Exclude<ComparisonStage, "route">,
  fn: () => Promise<T>,
): Promise<T> {
  const c = context.getStore();
  return c ? context.run({ ...c, stage }, fn) : fn();
}
/** Every physical provider attempt is checked, including any unexpected SDK retry. */
export function comparisonFetch(fetchImpl: typeof fetch): typeof fetch {
  return async (input, init) => {
    const c = context.getStore();
    if (!c) return fetchImpl(input, init);
    if (input instanceof Request)
      throw Error("Comparison requires an explicit provider request body");
    const id = c.budget.reserve(c.arm, c.turn, c.stage, String(input), init);
    try {
      const response = await fetchImpl(input, { ...init, redirect: "error" });
      c.budget.complete(id, "received_response");
      return response;
    } catch {
      c.budget.complete(id, "transport_error");
      throw Error("Comparison provider transport failed; reservation retained");
    }
  };
}

export function assertComparisonReleaseSha(actual: string) {
  const c = context.getStore();
  if (c && c.budget.releaseSha !== actual)
    throw Error("Comparison release SHA mismatch");
}
