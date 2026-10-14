import { AsyncLocalStorage } from "node:async_hooks";

const authorizedCreation = new AsyncLocalStorage<Record<string, unknown>>();

/** Only the authenticated review action can enter this server-side capability. */
export function createReviewEvent<T>(
  data: Record<string, unknown>,
  create: () => Promise<T>,
): Promise<T> {
  return authorizedCreation.run(Object.freeze({ ...data }), create);
}
export function assertReviewCreate(event: {
  params: { data: Record<string, unknown> };
}) {
  const expected = authorizedCreation.getStore();
  if (
    !expected ||
    Object.keys(expected).some(
      (key) => event.params.data[key] !== expected[key],
    )
  )
    throw new Error(
      "Native review decisions require the authenticated review action.",
    );
}
export function immutableReviewMutation(): never {
  throw new Error(
    "Native review events are immutable. Withdraw publication or review a new content revision.",
  );
}
