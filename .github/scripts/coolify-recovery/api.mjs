const GH = 'https://api.github.com';
const HEALTH = 'https://store.staging.3dbytetech.com.au/api/health';
const REQUIRED = ['deployment-config', 'address-reindex-policy', 'lint', 'type-check', 'test', 'build', 'e2e-smoke', 'security-scan'];
const SHA = /^[a-f0-9]{40}$/;
const MAX_BYTES = 2_097_152;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const transient = (s) => s === 408 || s === 429 || s >= 500;
function secureUrl(value) {
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.username || u.password || u.search || u.hash || u.pathname !== '/') throw new Error('API origin must be HTTPS without credentials, path or query');
  return u.origin;
}
function rows(body) {
  const value = Array.isArray(body) ? body : body?.deployments;
  if (!Array.isArray(value) || value.some((d) => !d || typeof d.commit !== 'string' || typeof d.status !== 'string')) throw new Error('Invalid deployment history response');
  return value;
}
export async function readDeploymentHistory(request, application, { take = 50, maxPages = 20 } = {}) {
  const all = [];
  const seen = new Set();
  for (let page = 0; page < maxPages; page++) {
    const items = rows(await request(`/api/v1/deployments/applications/${application}?take=${take}&skip=${page * take}`));
    for (const item of items) {
      const id = item.deployment_uuid ?? item.id;
      if (id !== undefined && seen.has(id)) throw new Error('Repeated history page; deployment history incomplete');
      if (id !== undefined) seen.add(id);
      all.push({ commit: item.commit, status: item.status, deployment_uuid: item.deployment_uuid, id: item.id });
    }
    if (items.length < take) return all;
  }
  throw new Error('Deployment history incomplete: pagination limit reached');
}
async function jsonBody(response) {
  if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Response size limit');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Missing JSON response');
  const parts = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new Error('Response size limit');
      parts.push(value);
    }
    return JSON.parse(Buffer.concat(parts).toString('utf8'));
  } finally { await reader.cancel().catch(() => {}); }
}
export function createApi(config, { fetchImpl = fetch, sleep = pause, random = Math.random, now = Date.now } = {}) {
  const origin = secureUrl(config.coolifyUrl);
  const hook = new URL(config.webhookUrl);
  if (hook.origin !== origin || hook.pathname !== '/webhooks/source/github/events' || hook.search || hook.hash || hook.username || hook.password) throw new Error('Unexpected Coolify App webhook URL');
  if (config.repository !== 'kkurtzhang/3dbyte-tech-store' || !/^[a-zA-Z0-9_-]{1,100}$/.test(config.application)) throw new Error('Invalid staging scope');
  const deadline = now() + 90_000;
  async function request(url, token, method = 'GET', tolerateHttp = false) {
    const count = method === 'GET' ? 3 : 1;
    for (let attempt = 0; attempt < count; attempt++) {
      const budget = Math.min(10_000, deadline - now());
      if (budget <= 0) throw new Error('Recovery request deadline exceeded');
      let response;
      try {
        response = await fetchImpl(url, { method, redirect: 'error', signal: AbortSignal.timeout(budget), headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(url.startsWith(GH) ? { 'X-GitHub-Api-Version': '2022-11-28' } : {}) } });
      } catch {
        if (method !== 'GET' || attempt === count - 1) throw new Error('HTTP request outcome unknown');
      }
      if (response && (response.ok || tolerateHttp)) {
        if (method === 'POST') { await response.body?.cancel(); return { status: response.status }; }
        return { body: await jsonBody(response), headers: response.headers };
      }
      if (response && (!transient(response.status) || attempt === count - 1)) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}; inspect authorization or service health`); }
      const header = response?.headers.get('retry-after');
      const retryAfter = header && /^\d+$/.test(header) ? Number(header) * 1000 : Math.max(0, Date.parse(header ?? '') - now());
      await response?.body?.cancel();
      // Retry-After is honored within this tick's total budget; long waits defer
      // to the next scheduler tick instead of ignoring server rate limits.
      const delay = Math.max(Math.ceil(1000 * 2 ** attempt * (0.75 + random() / 2)), Number.isFinite(retryAfter) ? retryAfter : 0);
      if (delay >= deadline - now()) throw new Error('Rate limit exceeds recovery deadline');
      await sleep(delay);
    }
    throw new Error('HTTP retry limit');
  }
  const gh = async (path, token = config.readToken) => (await request(`${GH}${path}`, token)).body;
  const coolify = async (path) => (await request(`${origin}${path}`, config.coolifyToken)).body;
  async function paginatedGh(path, token, field) {
    const all = []; const visited = new Set();
    let url = `${GH}${path}`;
    for (let page = 0; page < 50; page++) {
      if (visited.has(url)) throw new Error('Repeated GitHub pagination cursor');
      visited.add(url);
      const response = await request(url, token);
      const items = field ? response.body?.[field] : response.body;
      if (!Array.isArray(items)) throw new Error('Invalid GitHub history');
      all.push(...items);
      const next = response.headers.get('link')?.match(/<([^>]+)>;\s*rel="next"/);
      if (!next) return all;
      const candidate = new URL(next[1]);
      if (candidate.origin !== GH || candidate.pathname !== new URL(url).pathname || candidate.username || candidate.password) throw new Error('Unsafe GitHub pagination URL');
      url = candidate.href;
    }
    throw new Error('GitHub history incomplete: pagination limit reached');
  }
  return {
    async listDeliveries() {
      const repo = await gh(`/repos/${config.repository}`);
      if (!Number.isSafeInteger(repo.id)) throw new Error('Invalid repository identity');
      const items = await paginatedGh('/app/hook/deliveries?per_page=100', config.appJwt);
      return items.filter((d) => d.repository_id === repo.id).map((d) => {
        if (!Number.isSafeInteger(d.id) || !/^[a-zA-Z0-9-]{1,100}$/.test(d.guid) || !Number.isFinite(Date.parse(d.delivered_at)) || typeof d.redelivery !== 'boolean' || !(d.status_code === null || Number.isInteger(d.status_code))) throw new Error('Invalid webhook delivery metadata');
        return { id: d.id, guid: d.guid, event: d.event, redelivery: d.redelivery, status_code: d.status_code, delivered_at: d.delivered_at };
      });
    },
    async getDelivery(id) {
      if (!Number.isSafeInteger(id)) throw new Error('Invalid delivery ID');
      const d = await gh(`/app/hook/deliveries/${id}`, config.appJwt);
      return { id: d.id, guid: d.guid, event: d.event, status_code: d.status_code, redelivery: d.redelivery, delivered_at: d.delivered_at, payload: d.request?.payload, endpointMatches: d.url === hook.href };
    },
    async snapshot() {
      const branch = await gh(`/repos/${config.repository}/branches/staging`);
      const sha = branch?.commit?.sha;
      if (!SHA.test(sha)) throw new Error('Invalid staging SHA');
      const checks = await paginatedGh(`/repos/${config.repository}/commits/${sha}/check-runs?per_page=100&page=1`, config.readToken, 'check_runs');
      const latest = new Map();
      for (const c of checks) if (!latest.has(c.name) || latest.get(c.name).id < c.id) latest.set(c.name, c);
      const ciPassed = REQUIRED.every((name) => { const c = latest.get(name); return c?.app?.slug === 'github-actions' && c.status === 'completed' && c.conclusion === 'success'; });
      const apps = await coolify('/api/v1/applications');
      if (!Array.isArray(apps)) throw new Error('Invalid Coolify resource inventory');
      // App redelivery fans out: reject any additional same-repo/staging resource,
      // even if the intended resource is correctly configured.
      const matching = apps.filter((a) => a.git_repository === config.repository && a.git_branch === 'staging');
      const app = matching[0];
      const scopeSafe = matching.length === 1 && app.uuid === config.application && app.settings?.is_auto_deploy_enabled === true && (!app.git_commit_sha || app.git_commit_sha === 'HEAD' || app.git_commit_sha === sha);
      const history = await readDeploymentHistory(coolify, config.application);
      const queue = rows(await coolify('/api/v1/deployments')).filter((d) => String(d.application_id) === String(app?.id));
      // No header/token on the public health request. A failed health read is
      // deliberately inconclusive and prevents this tick from requesting a retry.
      const health = (await request(HEALTH)).body;
      if (!health || !SHA.test(health.releaseSha)) throw new Error('Unresolved deployed release identity');
      return { branchSha: sha, ciPassed, scopeSafe, history, queue, releaseSha: health.releaseSha };
    },
    async redeliver(id) {
      if (!Number.isSafeInteger(id)) throw new Error('Invalid delivery ID');
      return (await request(`${GH}/app/hook/deliveries/${id}/attempts`, config.appJwt, 'POST', true)).status;
    },
  };
}
