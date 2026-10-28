// Contract for offline reproductions; implementation follows the RED checkpoint.
export const LIMITS = { confirmMs: 60_000, pendingMs: 120_000, maxAgeMs: 21_600_000, maxAttempts: 3, backoffMs: 60_000 };
export async function recover() { throw new Error('Webhook recovery is not implemented'); }
