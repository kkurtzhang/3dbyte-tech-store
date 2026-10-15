import { createHash, randomBytes } from "node:crypto";
import Redis from "ioredis";

import type { AssistantSupportResult } from "@3dbyte-tech-store/shared-types";
import type { ConsentDraft, ConsentPayload } from "./consent-validation";

export const PROPOSAL_TTL_MS = 10 * 60_000;
export const RECEIPT_TTL_MS = 2 * 60_000;
export const consentHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const consentToken = () => randomBytes(32).toString("hex");
export type ConsentRecord = {
  context: string;
  expiresAt: number;
  status: "draft" | "preview" | "processing" | "submitted";
  draft?: ConsentDraft;
  payload?: ConsentPayload;
  receiptHash?: string;
  receiptExpiresAt?: number;
  digest?: string;
  result?: AssistantSupportResult;
};

// Compare the entire prior snapshot and retain its TTL. Preview rotation and
// confirmation compete on the same key, so at most one transition succeeds.
export const CONSENT_CAS_SCRIPT = `
local old = redis.call('GET', KEYS[1])
if not old or old ~= ARGV[1] then return 0 end
local replacement = cjson.decode(ARGV[2])
if replacement.status == 'processing' then
  local now = redis.call('TIME')
  local nowMs = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)
  if not replacement.receiptExpiresAt or replacement.receiptExpiresAt <= nowMs then return 0 end
end
local ttl = redis.call('PTTL', KEYS[1])
if ttl <= 0 then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'PX', ttl)
return 1
`;
export class ConsentConflict extends Error {}
let redis: Redis | undefined;
function client() {
  const url = process.env.REDIS_URL?.trim();
  if (!url) throw new Error("Consent storage unavailable");
  if (!redis) {
    redis = new Redis(url, {
      lazyConnect: true,
      connectTimeout: 2000,
      commandTimeout: 2000,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
    });
    redis.on("error", () => undefined);
  }
  return redis;
}
const key = (id: string) => `assistant:ticket-consent:v1:${id}`;
export const consentStore = {
  async create(id: string, record: ConsentRecord) {
    const result = await client().set(
      key(id),
      JSON.stringify(record),
      "PX",
      PROPOSAL_TTL_MS,
      "NX",
    );
    if (result !== "OK") throw new ConsentConflict();
  },
  async read(
    id: string,
    context: string,
  ): Promise<{ raw: string; record: ConsentRecord }> {
    const raw = await client().get(key(id));
    if (!raw) throw new ConsentConflict();
    const record = JSON.parse(raw) as ConsentRecord;
    if (record.context !== context || record.expiresAt <= Date.now())
      throw new ConsentConflict();
    return { raw, record };
  },
  async replace(id: string, raw: string, record: ConsentRecord) {
    if (
      (await client().eval(
        CONSENT_CAS_SCRIPT,
        1,
        key(id),
        raw,
        JSON.stringify(record),
      )) !== 1
    )
      throw new ConsentConflict();
  },
};
