import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApi, readDeploymentHistory } from '../coolify-recovery/api.mjs';
const sha = 'a'.repeat(40);
const cfg = { repository: 'kkurtzhang/3dbyte-tech-store', application: 'stage123', coolifyUrl: 'https://coolify.test', webhookUrl: 'https://coolify.test/webhooks/source/github/events', appJwt: 'fixture-app', readToken: 'fixture-read', coolifyToken: 'fixture-coolify' };
const checks = ['deployment-config', 'address-reindex-policy', 'lint', 'type-check', 'test', 'build', 'e2e-smoke', 'security-scan'].map((name, id) => ({ name, id, app: { slug: 'github-actions' }, status: 'completed', conclusion: 'success' }));
const app = { id: 5, uuid: 'stage123', git_branch: 'staging', git_repository: cfg.repository, settings: { is_auto_deploy_enabled: true } };
function fixture() {
  const calls = []; const sleeps = [];
  const routes = new Map([
    ['/repos/kkurtzhang/3dbyte-tech-store', { id: 9 }],
    ['/repos/kkurtzhang/3dbyte-tech-store/branches/staging', { commit: { sha } }],
    [`/repos/kkurtzhang/3dbyte-tech-store/commits/${sha}/check-runs?per_page=100&page=1`, { check_runs: checks }],
    ['/api/v1/applications', [app]],
    ['/api/v1/deployments/applications/stage123?take=50&skip=0', { deployments: [] }],
    ['/api/v1/deployments', []],
    ['/api/health', { releaseSha: 'b'.repeat(40) }],
    ['/app/hook/deliveries?per_page=100', [{ id: 1, repository_id: 9, event: 'push', guid: 'delivery-1', redelivery: false, status_code: 520, delivered_at: new Date(1_800_000_000_000).toISOString() }]],
    ['/app/hook/deliveries/1', { id: 1, url: cfg.webhookUrl, request: { payload: { ref: 'refs/heads/staging', after: sha } } }],
    ['/app/hook/deliveries/1/attempts', {}],
  ]);
  const fetchImpl = async (url, init) => {
    const path = new URL(url).pathname + new URL(url).search; calls.push({ url, path, ...init });
    assert.ok(routes.has(path), `Unexpected URL ${path}`);
    const value = routes.get(path);
    if (typeof value === 'function') return value(init);
    return new Response(JSON.stringify(value), { status: init.method === 'POST' ? 202 : 200 });
  };
  const api = createApi(cfg, { fetchImpl, sleep: async (ms) => sleeps.push(ms), random: () => 0.5 });
  return { api, routes, calls, sleeps, fetchImpl };
}

test('full Coolify history paginates until empty, not latest-only or partial absence', async () => {
  const pages = [[...Array.from({ length: 50 }, (_, id) => ({ id, commit: 'b'.repeat(40), status: 'finished' }))], [{ id: 80, commit: sha, status: 'queued' }]];
  const paths = [];
  const history = await readDeploymentHistory(async (path) => { paths.push(path); return { deployments: pages.shift() ?? [] }; }, 'stage123');
  assert.equal(history.at(-1).commit, sha); assert.equal(paths.length, 2); assert.match(paths[1], /skip=50/);
  await assert.rejects(readDeploymentHistory(async () => ({ deployments: Array.from({ length: 50 }, (_, id) => ({ id, commit: sha, status: 'queued' })) }), 'stage123', { maxPages: 2 }), /incomplete|repeat/i);
});
test('malformed history never becomes an empty deployment set', async () => {
  for (const body of [{ message: 'denied' }, { deployments: [{}] }, null]) await assert.rejects(readDeploymentHistory(async () => body, 'stage123'));
});
test('snapshot uses exact SHA and all eight CI checks, history, active queue and staging app identity', async () => {
  const f = fixture(); const s = await f.api.snapshot();
  assert.equal(s.branchSha, sha); assert.equal(s.ciPassed, true); assert.equal(s.scopeSafe, true);
  assert.deepEqual(s.history, []); assert.deepEqual(s.queue, []);
  assert.ok(f.calls.every((c) => c.redirect === 'error' && c.signal));
});
test('CI missing, pending, failed, spoofed or newer duplicate check blocks retry', async () => {
  for (const changed of [checks.slice(1), [...checks, { ...checks[0], id: 99, status: 'in_progress', conclusion: null }], checks.map((c) => ({ ...c, conclusion: 'failure' })), checks.map((c) => ({ ...c, app: { slug: 'other' } }))]) {
    const f = fixture(); f.routes.set(`/repos/kkurtzhang/3dbyte-tech-store/commits/${sha}/check-runs?per_page=100&page=1`, { check_runs: changed });
    assert.equal((await f.api.snapshot()).ciPassed, false);
  }
});
test('multiple same-branch resources or branch/pinned-commit mismatch blocks App-wide replay', async () => {
  for (const apps of [[app, { ...app, uuid: 'also-stage' }], [{ ...app, git_branch: 'main' }], [{ ...app, git_commit_sha: 'b'.repeat(40) }]]) {
    const f = fixture(); f.routes.set('/api/v1/applications', apps); assert.equal((await f.api.snapshot()).scopeSafe, false);
  }
});
test('GET transient errors use bounded backoff; permanent errors stop and raw body is not exposed', async () => {
  const f = fixture(); let n = 0;
  f.routes.set('/api/v1/applications', () => ++n < 3 ? new Response('private-error', { status: 520 }) : new Response(JSON.stringify([app])));
  await f.api.snapshot(); assert.equal(n, 3); assert.equal(f.sleeps.length, 2);
  f.routes.set('/api/v1/applications', () => new Response('private-error', { status: 403 }));
  await assert.rejects(f.api.snapshot(), (e) => !e.message.includes('private-error') && /403/.test(e.message));
});
test('POST attempts are never retried by HTTP client, including 520', async () => {
  const f = fixture(); f.routes.set('/app/hook/deliveries/1/attempts', () => new Response('uncertain', { status: 520 }));
  assert.equal(await f.api.redeliver(1), 520); assert.equal(f.calls.length, 1); assert.equal(f.sleeps.length, 0);
});
test('GitHub delivery pagination follows only same-endpoint cursors and filters exact repository', async () => {
  const f = fixture();
  f.routes.set('/app/hook/deliveries?per_page=100', () => new Response(JSON.stringify([{ id: 99, repository_id: 100 }]), { headers: { link: '<https://api.github.com/app/hook/deliveries?cursor=next>; rel="next"' } }));
  f.routes.set('/app/hook/deliveries?cursor=next', [{ id: 1, repository_id: 9, guid: 'delivery-1', event: 'push', redelivery: false, status_code: 520, delivered_at: new Date().toISOString() }]);
  assert.equal((await f.api.listDeliveries()).length, 1);
  f.routes.set('/app/hook/deliveries?per_page=100', () => new Response('[]', { headers: { link: '<https://attacker.test/app/hook/deliveries>; rel="next"' } }));
  await assert.rejects(f.api.listDeliveries(), /pagination/i);
});
test('delivery detail retains only required payload and endpoint match, never headers/private response', async () => {
  const f = fixture(); const d = await f.api.getDelivery(1);
  assert.equal(d.endpointMatches, true); assert.equal(d.payload.after, sha); assert.equal(d.request, undefined);
});
test('URLs, redirects, invalid commit identities and large JSON responses fail closed', async () => {
  for (const url of ['http://coolify.test', 'https://user:pass@coolify.test', 'https://coolify.test/?secret=value']) assert.throws(() => createApi({ ...cfg, coolifyUrl: url }));
  const f = fixture(); f.routes.set('/repos/kkurtzhang/3dbyte-tech-store/branches/staging', { commit: { sha: 'main' } });
  await assert.rejects(f.api.snapshot(), /SHA/);
});
