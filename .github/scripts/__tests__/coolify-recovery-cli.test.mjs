import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { main } from '../coolify-recovery/run.mjs';

test('CLI stays inert with no configuration; receiver review and setup are explicit gates', async () => {
  assert.equal((await main({}, [])).status, 'disabled');
  assert.equal((await main({ COOLIFY_WEBHOOK_RECOVERY_ENABLED: 'true' }, [])).status, 'receiver-review-required');
  assert.equal((await main({ COOLIFY_WEBHOOK_RECOVERY_ENABLED: 'true', COOLIFY_WEBHOOK_RECEIVER_REVIEWED: 'true' }, [])).status, 'setup-required');
  await assert.rejects(main({ COOLIFY_WEBHOOK_RECOVERY_ENABLED: 'true' }, ['--loop']), /Only --once/);
});
test('real CLI subprocess does not inherit credentials and needs no network to initialize private state', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'coolify-cli-'));
  try {
    const script = new URL('../coolify-recovery/run.mjs', import.meta.url).pathname;
    const env = { PATH: process.env.PATH };
    const disabled = spawnSync(process.execPath, [script, '--once'], { env, encoding: 'utf8' });
    assert.equal(disabled.status, 0); assert.equal(JSON.parse(disabled.stdout).status, 'disabled');
    const init = spawnSync(process.execPath, [script, '--initialize-state', join(parent, 'private')], { env, encoding: 'utf8' });
    assert.equal(init.status, 0); assert.equal(JSON.parse(init.stdout).status, 'state-initialized');
    const reset = spawnSync(process.execPath, [script, '--initialize-state', join(parent, 'private')], { env, encoding: 'utf8' });
    assert.equal(reset.status, 1); assert.match(reset.stderr, /setup\/state failed/);
  } finally { await rm(parent, { recursive: true, force: true }); }
});

test('complete CLI/API/state boundary sees accepted-but-520 deployment and emits an audit without replay', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'coolify-cli-http-'));
  const oldFetch = globalThis.fetch;
  const sha = 'a'.repeat(40); const calls = [];
  const dir = join(parent, 'private');
  const env = { COOLIFY_WEBHOOK_RECOVERY_ENABLED: 'true', COOLIFY_WEBHOOK_RECEIVER_REVIEWED: 'true', COOLIFY_WEBHOOK_RECOVERY_STATE_DIR: dir, GITHUB_APP_JWT: 'fixture-app', GITHUB_READ_TOKEN: 'fixture-read', COOLIFY_API_TOKEN: 'fixture-coolify', COOLIFY_API_URL: 'https://coolify.test', COOLIFY_STAGING_APPLICATION_UUID: 'stage123', COOLIFY_APP_WEBHOOK_URL: 'https://coolify.test/webhooks/source/github/events' };
  const detail = { id: 1, guid: 'delivery-1', event: 'push', redelivery: false, repository_id: 9, status_code: 520, delivered_at: new Date(Date.now() - 600_000).toISOString() };
  const payload = { ref: 'refs/heads/staging', after: sha, forced: false, deleted: false, repository: { full_name: 'kkurtzhang/3dbyte-tech-store' } };
  let denied = false;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, method: init.method });
    assert.equal(init.method, 'GET', 'no replay of an accepted deployment');
    let body;
    const path = new URL(url).pathname;
    if (path.endsWith('/branches/staging')) body = { commit: { sha } };
    else if (path.endsWith('/check-runs')) body = { check_runs: ['deployment-config', 'address-reindex-policy', 'lint', 'type-check', 'test', 'build', 'e2e-smoke', 'security-scan'].map((name, id) => ({ name, id, app: { slug: 'github-actions' }, status: 'completed', conclusion: 'success' })) };
    else if (path === '/api/v1/applications') {
      if (denied) return new Response('PRIVATE RESPONSE', { status: 403 });
      body = [{ id: 5, uuid: 'stage123', git_branch: 'staging', git_repository: 'kkurtzhang/3dbyte-tech-store', settings: { is_auto_deploy_enabled: true } }];
    } else if (path === '/api/v1/deployments/applications/stage123') body = { deployments: [{ id: 1, commit: sha, status: 'queued' }] };
    else if (path === '/api/v1/deployments') body = [];
    else if (path === '/api/health') { assert.equal(init.headers.Authorization, undefined); body = { releaseSha: 'b'.repeat(40) }; }
    else if (path.endsWith('/3dbyte-tech-store')) body = { id: 9 };
    else if (path === '/app/hook/deliveries') body = [detail];
    else if (path === '/app/hook/deliveries/1') body = { ...detail, url: env.COOLIFY_APP_WEBHOOK_URL, request: { payload } };
    else assert.fail(`Unexpected request ${path}`);
    return new Response(JSON.stringify(body));
  };
  try {
    await main({}, ['--initialize-state', dir]);
    assert.equal((await main(env, ['--once'])).status, 'deployment-observed');
    denied = true;
    const failure = await main(env, ['--once']);
    assert.equal(failure.status, 'read-or-state-failure'); assert.equal(failure.reason, 'http-403');
    const { readFile } = await import('node:fs/promises');
    const audit = await readFile(join(dir, 'audit.jsonl'), 'utf8');
    assert.match(audit, /deployment-observed/); assert.doesNotMatch(audit, /PRIVATE RESPONSE|fixture-app|fixture-coolify/);
  } finally { globalThis.fetch = oldFetch; await rm(parent, { recursive: true, force: true }); }
});
