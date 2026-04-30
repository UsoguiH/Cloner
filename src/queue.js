import { customAlphabet } from 'nanoid';
import path from 'node:path';
import fs from 'node:fs';

const newId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

export class JobQueue {
  constructor({ jobsDir, worker, concurrency = 1 }) {
    this.jobsDir = jobsDir;
    this.worker = worker;
    this.concurrency = concurrency;
    this.jobs = new Map();
    this.pending = [];
    this.running = 0;
    this.subscribers = new Map();
    this._rehydrate();
  }

  _rehydrate() {
    if (!fs.existsSync(this.jobsDir)) return;
    for (const id of fs.readdirSync(this.jobsDir)) {
      const dir = path.join(this.jobsDir, id);
      if (!fs.statSync(dir).isDirectory()) continue;
      const metaPath = path.join(dir, 'job.json');
      if (!fs.existsSync(metaPath)) continue;
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        // Anything not 'completed' or 'failed' on disk is stale — server died mid-run.
        if (meta.status !== 'completed' && meta.status !== 'failed') {
          meta.status = 'failed';
          meta.error = meta.error || 'server restarted while job was running';
        }
        meta.jobDir = dir;
        this.jobs.set(id, meta);
      } catch {}
    }
  }

  _persist(job) {
    const meta = {
      id: job.id,
      url: job.url,
      options: job.options,
      status: job.status,
      progress: job.progress,
      error: job.error,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
    };
    try {
      fs.writeFileSync(
        path.join(job.jobDir, 'job.json'),
        JSON.stringify(meta, null, 2)
      );
    } catch {}
  }

  enqueue({ url, options }) {
    const id = newId();
    const job = {
      id,
      url,
      options,
      status: 'pending',
      progress: { phase: 'queued', captured: 0, total: 0, message: '' },
      error: null,
      createdAt: Date.now(),
      startedAt: null,
      finishedAt: null,
      jobDir: path.join(this.jobsDir, id),
    };
    fs.mkdirSync(job.jobDir, { recursive: true });
    this.jobs.set(id, job);
    this._persist(job);
    this.pending.push(id);
    this._drain();
    return job;
  }

  get(id) {
    return this.jobs.get(id);
  }

  list() {
    return [...this.jobs.values()].sort((a, b) => b.createdAt - a.createdAt);
  }

  subscribe(id, fn) {
    if (!this.subscribers.has(id)) this.subscribers.set(id, new Set());
    this.subscribers.get(id).add(fn);
    return () => {
      const set = this.subscribers.get(id);
      if (set) set.delete(fn);
    };
  }

  _emit(id, event) {
    const set = this.subscribers.get(id);
    if (!set) return;
    for (const fn of set) {
      try { fn(event); } catch {}
    }
  }

  _updateProgress(job, patch) {
    job.progress = { ...job.progress, ...patch };
    this._emit(job.id, { type: 'progress', progress: job.progress });
  }

  async _drain() {
    while (this.running < this.concurrency && this.pending.length > 0) {
      const id = this.pending.shift();
      const job = this.jobs.get(id);
      if (!job) continue;
      this.running++;
      this._run(job).finally(() => {
        this.running--;
        this._drain();
      });
    }
  }

  async _run(job) {
    job.status = 'running';
    job.startedAt = Date.now();
    this._emit(job.id, { type: 'status', status: job.status });
    try {
      await this.worker(job, {
        onProgress: (patch) => this._updateProgress(job, patch),
      });
      job.status = 'completed';
    } catch (err) {
      job.status = 'failed';
      job.error = err && err.message ? err.message : String(err);
      console.error(`[job ${job.id}] failed:`, err);
    } finally {
      job.finishedAt = Date.now();
      this._persist(job);
      this._emit(job.id, {
        type: 'status',
        status: job.status,
        error: job.error,
        finishedAt: job.finishedAt,
      });
    }
  }
}
