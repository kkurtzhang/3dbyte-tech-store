import { constants } from 'node:fs';
import { lstat, mkdir, open, rename, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const noFollow = constants.O_NOFOLLOW ?? 0;
async function durableFile(path, text, exclusive = false) {
  const file = await open(path, constants.O_WRONLY | constants.O_CREAT | (exclusive ? constants.O_EXCL : constants.O_TRUNC) | noFollow, 0o600);
  try { await file.writeFile(text); await file.sync(); } finally { await file.close(); }
}
async function syncDirectory(dir) {
  const file = await open(dir, constants.O_RDONLY);
  try { await file.sync(); } finally { await file.close(); }
}
export async function initializeState(dir) {
  await mkdir(dir, { mode: 0o700 }); // must be new; never silently reset a ledger
  await durableFile(join(dir, 'ledger.json'), JSON.stringify({ version: 1, entries: {} }), true);
  await syncDirectory(dir);
}
export class FileState {
  constructor(dir) { this.dir = resolve(dir); }
  async withLock(run) {
    const stat = await lstat(this.dir);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077)) throw new Error('Recovery state must be a private persistent directory');
    const path = join(this.dir, 'worker.lock');
    let lock;
    try { lock = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow, 0o600); }
    catch (error) { if (error.code === 'EEXIST') return { status: 'locked', terminal: false }; throw error; }
    try { await lock.writeFile(String(process.pid)); await lock.sync(); return await run(); }
    finally { await lock.close(); await unlink(path); await syncDirectory(this.dir); }
  }
  async read() {
    const file = await open(join(this.dir, 'ledger.json'), constants.O_RDONLY | noFollow);
    let value;
    try {
      const stat = await file.stat();
      if (!stat.isFile() || stat.size > 4_194_304 || (stat.mode & 0o077)) throw new Error('Invalid recovery ledger');
      value = JSON.parse(await file.readFile('utf8'));
    } finally { await file.close(); }
    if (value.version !== 1 || !value.entries || Array.isArray(value.entries) || typeof value.entries !== 'object') throw new Error('Invalid recovery ledger');
    for (const entry of Object.values(value.entries)) {
      if (!Array.isArray(entry.attempts) || entry.attempts.length > 3 || entry.attempts.some((a) => !Number.isFinite(a.requestedAt) || !Array.isArray(a.beforeIds))) throw new Error('Invalid recovery attempts');
    }
    return value;
  }
  async save(value) {
    const temporary = join(this.dir, 'ledger.next');
    await durableFile(temporary, JSON.stringify(value));
    await rename(temporary, join(this.dir, 'ledger.json'));
    await syncDirectory(this.dir);
  }
  async audit(result) {
    // Only the engine's allowlisted summary, never API response bodies/headers.
    const file = await open(join(this.dir, 'audit.jsonl'), constants.O_WRONLY | constants.O_CREAT | constants.O_APPEND | noFollow, 0o600);
    try { await file.writeFile(`${JSON.stringify({ at: new Date().toISOString(), ...result })}\n`); await file.sync(); }
    finally { await file.close(); }
  }
}
