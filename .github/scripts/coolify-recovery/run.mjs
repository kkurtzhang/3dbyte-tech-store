import { pathToFileURL } from 'node:url';
import { createApi } from './api.mjs';
import { recover } from './recover.mjs';
import { FileState, initializeState } from './state.mjs';

const ACTION = 'Inspect GitHub App delivery history and Coolify history/queue before retrying. Resolve the reported condition; never delete retry state to reset a limit.';
export async function main(env = process.env, args = process.argv.slice(2)) {
  if (args[0] === '--initialize-state' && args.length === 2) {
    await initializeState(args[1]);
    return { status: 'state-initialized', terminal: false };
  }
  if (env.COOLIFY_WEBHOOK_RECOVERY_ENABLED !== 'true') return { status: 'disabled', terminal: false };
  if (args.length && (args.length !== 1 || args[0] !== '--once')) throw new Error('Only --once is supported; scheduling is a separate approved setup');
  if (env.COOLIFY_WEBHOOK_RECEIVER_REVIEWED !== 'true') return { status: 'receiver-review-required', terminal: true, action: 'Verify the installed Coolify version pins push payload SHA, atomically deduplicates queued/in-progress commits, and the App replay targets only this staging resource before enablement.' };
  const required = ['COOLIFY_WEBHOOK_RECOVERY_STATE_DIR', 'GITHUB_APP_JWT', 'GITHUB_READ_TOKEN', 'COOLIFY_API_TOKEN', 'COOLIFY_API_URL', 'COOLIFY_STAGING_APPLICATION_UUID', 'COOLIFY_APP_WEBHOOK_URL'];
  if (required.some((key) => !env[key])) return { status: 'setup-required', terminal: true, action: 'Provision reviewed short-lived App JWT, read-only repository/checks access, Coolify read access and private durable retry state. No credentials were accessed by this draft task.' };
  const config = {
    enabled: true, receiverReviewed: true, repository: 'kkurtzhang/3dbyte-tech-store',
    application: env.COOLIFY_STAGING_APPLICATION_UUID, coolifyUrl: env.COOLIFY_API_URL,
    webhookUrl: env.COOLIFY_APP_WEBHOOK_URL, appJwt: env.GITHUB_APP_JWT,
    readToken: env.GITHUB_READ_TOKEN, coolifyToken: env.COOLIFY_API_TOKEN,
  };
  const store = new FileState(env.COOLIFY_WEBHOOK_RECOVERY_STATE_DIR);
  let result;
  try { result = await recover({ api: createApi(config), store, config }); }
  catch { result = { status: 'read-or-state-failure', terminal: true, action: 'Verify private state/lock, credentials, HTTP status and complete API pagination. Reads failed closed; no blind redelivery. An interrupted intent requires manual reconciliation.' }; }
  if (result.terminal && !result.action) result.action = ACTION;
  if (result.status !== 'locked') await store.audit(result);
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await main();
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (result.terminal) process.exitCode = 1;
  } catch {
    process.stderr.write('Recovery setup/state failed. No raw responses or credentials are logged. Inspect the private state and runbook.\n');
    process.exitCode = 1;
  }
}
