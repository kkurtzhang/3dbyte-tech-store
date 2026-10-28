// One reconciliation tick. The scheduler, credentials and receiver safety review
// are intentionally separate from this inactive-by-default implementation.
export const LIMITS = Object.freeze({
  confirmMs: 60_000, pendingMs: 120_000, maxAgeMs: 21_600_000,
  maxAttempts: 3, backoffMs: 60_000, maxBackoffMs: 900_000,
});
const REPOSITORY = 'kkurtzhang/3dbyte-tech-store';
const SHA = /^[a-f0-9]{40}$/;
const transient = (code) => code === null || code === 0 || code === 408 || code === 429 || (code >= 500 && code <= 599);
const success = (code) => code >= 200 && code < 400;
const time = (delivery) => Date.parse(delivery.delivered_at);

function gate(snapshot, sha) {
  if (snapshot.scopeSafe !== true) return 'unsafe-scope';
  if (snapshot.branchSha !== sha) return 'superseded';
  if (snapshot.releaseSha === sha) return 'already-deployed';
  // Any target record, including finished/failed/cancelled, proves acceptance.
  // Never use webhook retries to retry a build, cancellation or unhealthy app.
  if (snapshot.history.some((d) => d.commit === sha)) return 'deployment-observed';
  if (snapshot.queue.length || snapshot.history.some((d) => !['finished', 'failed', 'cancelled-by-user'].includes(d.status))) return 'queue-busy';
  if (snapshot.ciPassed !== true) return 'ci-not-green';
  return null;
}

export async function recover({ api, store, config, now = Date.now, random = Math.random }) {
  if (config.enabled !== true) return { status: 'disabled', terminal: false };
  if (config.receiverReviewed !== true) return { status: 'receiver-review-required', terminal: true };
  if (config.repository !== REPOSITORY || !/^[a-zA-Z0-9_-]{1,100}$/.test(config.application)) throw new Error('Invalid staging recovery scope');
  return store.withLock(async () => {
    const snapshot = await api.snapshot();
    const deliveries = await api.listDeliveries();
    const originals = deliveries.filter((d) => d.event === 'push' && d.redelivery === false).sort((a, b) => time(b) - time(a));
    if (originals.length > 20) throw new Error('Too many candidate deliveries; inspect scope/history manually');
    let original;
    for (const item of originals) {
      const detail = await api.getDelivery(item.id);
      const p = detail.payload;
      if (detail.endpointMatches && p?.repository?.full_name === REPOSITORY && p.ref === 'refs/heads/staging' && p.deleted === false && p.forced === false && SHA.test(p.after)) {
        original ??= detail;
        if (p.after === snapshot.branchSha) { original = detail; break; }
      }
    }
    if (!original) return { status: 'out-of-scope', terminal: false };
    const sha = original.payload.after;
    const result = (status, extra = {}) => ({ status, sha, deliveryId: original.id, guid: original.guid, terminal: false, ...extra });
    const blocked = gate(snapshot, sha);
    if (blocked) return result(blocked, { terminal: ['unsafe-scope', 'deployment-observed'].includes(blocked) });
    const age = now() - time(original);
    if (!Number.isFinite(age) || age < 0 || age > LIMITS.maxAgeMs) return result('expired', { terminal: true });
    const related = deliveries.filter((d) => d.guid === original.guid).sort((a, b) => time(b) - time(a) || b.id - a.id);
    const latest = related[0];
    if (!latest || !Number.isFinite(time(latest))) throw new Error('Invalid delivery history');
    const ledger = await store.read();
    const key = `${REPOSITORY}:${config.application}:${sha}`;
    const entry = ledger.entries[key] ?? { attempts: [], absentSince: now() };
    ledger.entries[key] = entry;
    const save = () => store.save(ledger);
    if (entry.terminal) return result(entry.terminal, { terminal: true });
    const pending = entry.attempts.at(-1);
    if (pending && !pending.observedId) {
      const observed = related.find((d) => !pending.beforeIds.includes(d.id) && d.redelivery === true);
      if (observed) { pending.observedId = observed.id; await save(); }
      else if (now() - pending.requestedAt < LIMITS.pendingMs && pending.result === 'accepted') return result('awaiting-delivery');
      else { entry.terminal = 'uncertain-redelivery'; await save(); return result(entry.terminal, { terminal: true }); }
    }
    if (success(latest.status_code)) return result('delivered-without-deployment', { terminal: true });
    if (!transient(latest.status_code)) return result('permanent-delivery-failure', { terminal: true });
    const attempts = Math.max(entry.attempts.length, related.filter((d) => d.redelivery).length);
    // Give every observed failure a jittered exponential delay; persist the
    // random deadline so repeated invocations cannot redraw shorter delays.
    if (entry.latestId !== latest.id) {
      entry.latestId = latest.id;
      const delay = Math.min(LIMITS.maxBackoffMs, LIMITS.backoffMs * 2 ** attempts) * (0.75 + random() * 0.5);
      entry.nextAt = Math.max(time(latest), pending?.requestedAt ?? 0) + Math.ceil(delay);
      await save();
      if (pending) return result('backoff', { nextAt: entry.nextAt });
    }
    if (attempts >= LIMITS.maxAttempts) { entry.terminal = 'attempt-limit'; await save(); return result(entry.terminal, { terminal: true }); }
    if (now() < entry.nextAt) return result('backoff', { nextAt: entry.nextAt });
    if (now() - entry.absentSince < LIMITS.confirmMs) { await save(); return result('observing', { nextAt: entry.absentSince + LIMITS.confirmMs }); }
    // A new webhook or human action may have queued a deployment since the
    // first snapshot. Refresh all guards immediately before committing intent.
    const finalGate = gate(await api.snapshot(), sha);
    if (finalGate) return result(finalGate);
    entry.attempts.push({ requestedAt: now(), beforeIds: related.map((d) => d.id), result: 'intent' });
    await save(); // durable, fsynced intent BEFORE the non-idempotent POST
    try {
      const status = await api.redeliver(original.id);
      entry.attempts.at(-1).result = status === 202 ? 'accepted' : 'uncertain';
      if (status !== 202) entry.terminal = status >= 400 && status < 500 && status !== 408 && status !== 429 ? 'redelivery-rejected' : 'uncertain-redelivery';
    } catch {
      // No raw response/error text: it could contain credentials or payloads.
      entry.terminal = 'uncertain-redelivery';
    }
    await save();
    return result(entry.terminal ?? 'redelivery-requested', { attempts: entry.attempts.length, terminal: Boolean(entry.terminal) });
  });
}
