import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { recover, LIMITS } from '../coolify-recovery/recover.mjs';
import { FileState, initializeState } from '../coolify-recovery/state.mjs';

const SHA = 'a'.repeat(40);
const OLD = 'b'.repeat(40);
const config = { enabled: true, repository: 'kkurtzhang/3dbyte-tech-store', application: 'stage123', receiverReviewed: true };
function fixture() {
  let clock = 1_800_000_000_000;
  const original = { id: 1, guid: 'delivery-1', event: 'push', status_code: 520, redelivery: false, delivered_at: new Date(clock - 600_000).toISOString() };
  const payload = { ref: 'refs/heads/staging', after: SHA, deleted: false, forced: false, repository: { full_name: config.repository } };
  const deliveries = [original];
  const snapshot = { branchSha: SHA, ciPassed: true, releaseSha: OLD, history: [], queue: [], scopeSafe: true };
  const ledger = { version: 1, entries: {} };
  const saves = [];
  const calls = [];
  const store = {
    withLock: async (run) => run(),
    read: async () => structuredClone(ledger),
    save: async (value) => { saves.push(structuredClone(value)); Object.assign(ledger, structuredClone(value)); },
  };
  const api = {
    listDeliveries: async () => structuredClone(deliveries),
    getDelivery: async () => ({ ...original, payload: structuredClone(payload), endpointMatches: true }),
    snapshot: async () => structuredClone(snapshot),
    redeliver: async (id) => { assert.ok(saves.at(-1)); calls.push(id); return 202; },
  };
  const run = () => recover({ api, store, config, now: () => clock, random: () => 0.5 });
  return { api, store, calls, deliveries, original, payload, snapshot, ledger, run, advance: (ms) => { clock += ms; } };
}
async function ready(f) { assert.equal((await f.run()).status, 'observing'); f.advance(LIMITS.confirmMs); }
function redelivery(f, status, id = 2) {
  f.deliveries.unshift({ ...f.original, id, redelivery: true, status_code: status, delivered_at: new Date(1_800_000_000_000 + LIMITS.confirmMs).toISOString() });
}

test('inactive by default: no credentialed reads or mutations', async () => {
  const result = await recover({ config: { enabled: false } });
  assert.equal(result.status, 'disabled');
});
test('520 with an accepted deployment on an older history page never redelivers', async () => {
  const f = fixture();
  f.snapshot.history = [{ commit: OLD, status: 'finished' }, { commit: SHA, status: 'queued', deployment_uuid: 'accepted-520' }];
  assert.equal((await f.run()).status, 'deployment-observed');
  assert.deepEqual(f.calls, []);
});
test('fresh absence confirmed twice permits one original delivery retry, with durable intent first', async () => {
  const f = fixture(); await ready(f);
  assert.equal((await f.run()).status, 'redelivery-requested');
  assert.deepEqual(f.calls, [1]);
  assert.equal(Object.values(f.ledger.entries)[0].attempts[0].result, 'accepted');
  assert.equal((await f.run()).status, 'awaiting-delivery');
  assert.equal(f.calls.length, 1);
});
test('in-flight or unrelated queue entries block a duplicate even with unresolved commit', async () => {
  for (const queue of [[{ commit: 'HEAD', status: 'queued' }], [{ commit: OLD, status: 'in_progress' }]]) {
    const f = fixture(); f.snapshot.queue = queue;
    assert.equal((await f.run()).status, 'queue-busy'); assert.deepEqual(f.calls, []);
  }
});
test('failed/cancelled builds are terminal and never treated as failed webhook delivery', async () => {
  for (const status of ['failed', 'cancelled-by-user', 'finished', 'unknown']) {
    const f = fixture(); f.snapshot.history = [{ commit: SHA, status }];
    assert.equal((await f.run()).status, 'deployment-observed'); assert.deepEqual(f.calls, []);
  }
});
test('current healthy release, superseded SHA, failed CI or ambiguous app scope suppress retry', async () => {
  for (const [field, value, expected] of [['releaseSha', SHA, 'already-deployed'], ['branchSha', OLD, 'superseded'], ['ciPassed', false, 'ci-not-green'], ['scopeSafe', false, 'unsafe-scope']]) {
    const f = fixture(); f.snapshot[field] = value;
    assert.equal((await f.run()).status, expected); assert.deepEqual(f.calls, []);
  }
});
test('rechecks current staging and queue immediately before writing retry intent', async () => {
  const f = fixture(); await ready(f);
  let n = 0;
  f.api.snapshot = async () => ({ ...f.snapshot, branchSha: ++n === 1 ? SHA : OLD });
  assert.equal((await f.run()).status, 'superseded'); assert.deepEqual(f.calls, []);
});
test('nonstaging, wrong repo, forced/deleted push and mismatched webhook URL never retry', async () => {
  for (const patch of [{ ref: 'refs/heads/main' }, { repository: { full_name: 'other/repo' } }, { forced: true }, { deleted: true }]) {
    const f = fixture(); Object.assign(f.payload, patch);
    assert.equal((await f.run()).status, 'out-of-scope'); assert.deepEqual(f.calls, []);
  }
  const f = fixture(); f.api.getDelivery = async () => ({ ...f.original, payload: f.payload, endpointMatches: false });
  assert.equal((await f.run()).status, 'out-of-scope');
});
test('permanent delivery errors and age limit produce actionable terminal results', async () => {
  for (const status of [400, 401, 403, 404, 422]) {
    const f = fixture(); f.original.status_code = status;
    assert.equal((await f.run()).status, 'permanent-delivery-failure'); assert.deepEqual(f.calls, []);
  }
  const f = fixture(); f.advance(LIMITS.maxAgeMs);
  assert.equal((await f.run()).status, 'expired');
});
test('bounded exponential jitter and max three redeliveries survive repeated process invocations', async () => {
  const f = fixture(); await ready(f);
  for (let i = 0; i < LIMITS.maxAttempts; i++) {
    assert.equal((await f.run()).status, 'redelivery-requested');
    redelivery(f, 520, i + 2);
    assert.equal((await f.run()).status, 'backoff');
    f.advance(LIMITS.backoffMs * 2 ** (i + 1));
  }
  assert.equal((await f.run()).status, 'attempt-limit');
  assert.equal(f.calls.length, 3);
});
test('successful delivery without a deployment is terminal rather than a deployment loop', async () => {
  const f = fixture(); await ready(f); await f.run(); redelivery(f, 200);
  assert.equal((await f.run()).status, 'delivered-without-deployment');
  assert.equal(f.calls.length, 1);
});
test('ambiguous POST 520/timeout is never blindly retried on restart', async () => {
  for (const mode of ['520', 'timeout']) {
    const f = fixture(); await ready(f);
    f.api.redeliver = async () => { f.calls.push(1); if (mode === 'timeout') throw new Error('private response must not leak'); return 520; };
    assert.equal((await f.run()).status, 'uncertain-redelivery');
    f.advance(LIMITS.confirmMs * 4);
    assert.equal((await f.run()).status, 'uncertain-redelivery'); assert.equal(f.calls.length, 1);
  }
});
test('202 that never appears in delivery history stops for manual reconciliation', async () => {
  const f = fixture(); await ready(f); await f.run(); f.advance(LIMITS.pendingMs + 1);
  assert.equal((await f.run()).status, 'uncertain-redelivery'); assert.equal(f.calls.length, 1);
});
test('existing redeliveries count toward limit, even with an empty local ledger', async () => {
  const f = fixture(); for (let i = 0; i < 3; i++) redelivery(f, 520, i + 2);
  assert.equal((await f.run()).status, 'attempt-limit'); assert.deepEqual(f.calls, []);
});
test('receiver safety review required and incomplete reads fail closed', async () => {
  const f = fixture();
  assert.equal((await recover({ api: f.api, store: f.store, config: { ...config, receiverReviewed: false } })).status, 'receiver-review-required');
  f.api.listDeliveries = async () => { throw new Error('incomplete-history'); };
  await assert.rejects(f.run, /incomplete-history/); assert.deepEqual(f.calls, []);
});
test('filesystem lock excludes concurrent workers and state is durable across instances', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'recovery-state-'));
  const dir = join(parent, 'private');
  try {
    await initializeState(dir);
    const a = new FileState(dir); const b = new FileState(dir);
    await a.withLock(async () => {
      assert.equal((await b.withLock(() => assert.fail('second worker ran'))).status, 'locked');
      await a.save({ version: 1, entries: { example: { attempts: [{ result: 'intent', requestedAt: 1, beforeIds: [] }] } } });
    });
    assert.equal((await b.read()).entries.example.attempts[0].result, 'intent');
    assert.ok((await readFile(join(dir, 'ledger.json'), 'utf8')).includes('intent'));
    await assert.rejects(initializeState(dir), /exist/i);
  } finally { await rm(parent, { recursive: true, force: true }); }
});

test('a busy queue invalidates the previous absence confirmation window', async () => {
  const f = fixture(); await ready(f);
  f.snapshot.queue = [{ status: 'queued', commit: 'HEAD' }];
  assert.equal((await f.run()).status, 'queue-busy');
  f.snapshot.queue = [];
  assert.equal((await f.run()).status, 'observing'); assert.deepEqual(f.calls, []);
});

test('corrupt or insecure ledger never resets the retry budget', async () => {
  const { writeFile, chmod } = await import('node:fs/promises');
  const parent = await mkdtemp(join(tmpdir(), 'recovery-corrupt-')); const dir = join(parent, 'private');
  try {
    await initializeState(dir); const store = new FileState(dir);
    for (const value of [{ version: 2, entries: {} }, { version: 1, entries: [] }, { version: 1, entries: { key: { attempts: [{ requestedAt: 'bad', beforeIds: [] }] } } }]) {
      await writeFile(join(dir, 'ledger.json'), JSON.stringify(value)); await assert.rejects(store.read());
    }
    await chmod(dir, 0o755); await assert.rejects(store.withLock(() => assert.fail('insecure state accepted')), /private persistent/);
  } finally { await rm(parent, { recursive: true, force: true }); }
});
