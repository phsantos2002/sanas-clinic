/**
 * lib/queue.ts — Lightweight in-process job queue
 *
 * Design goals:
 * - Zero external dependencies (works without Redis/BullMQ/QStash)
 * - Async processing with concurrency control
 * - Drop-in swap: replace `enqueue` implementation to plug BullMQ or QStash
 * - Automatic retry with exponential backoff (up to MAX_RETRIES)
 * - Per-queue concurrency limit to prevent resource starvation
 *
 * Usage:
 *   const webhookQueue = createQueue("webhook", { concurrency: 5 });
 *   await webhookQueue.enqueue(() => processIncomingMessage(params));
 */

import { logger } from "@/lib/logger";

export interface QueueOptions {
  /** Max parallel jobs. Default: 10 */
  concurrency?: number;
  /** Max attempts per job before giving up. Default: 3 */
  maxRetries?: number;
  /** Base delay (ms) for exponential backoff. Default: 500 */
  backoffMs?: number;
}

export interface JobResult<T> {
  success: boolean;
  result?: T;
  error?: unknown;
  attempts: number;
}

type JobFn<T> = () => Promise<T>;

interface QueuedJob<T> {
  fn: JobFn<T>;
  resolve: (result: JobResult<T>) => void;
  attempt: number;
}

/**
 * Creates a named in-process queue with concurrency control and retries.
 * Returns `enqueue(fn)` which resolves when the job completes (or exhausts retries).
 *
 * In production at scale, replace the body of `enqueue` to dispatch to
 * BullMQ (Redis) or QStash (HTTP) while keeping the same call signature.
 */
export function createQueue<T = void>(name: string, options: QueueOptions = {}) {
  const concurrency = options.concurrency ?? 10;
  const maxRetries = options.maxRetries ?? 3;
  const backoffMs = options.backoffMs ?? 500;

  const log = logger.child({ queue: name });
  const pending: QueuedJob<T>[] = [];
  let running = 0;

  function drain() {
    while (running < concurrency && pending.length > 0) {
      const job = pending.shift()!;
      running++;
      run(job);
    }
  }

  async function run(job: QueuedJob<T>) {
    const start = Date.now();
    try {
      const result = await job.fn();
      running--;
      log.debug("queue_job_success", { attempt: job.attempt, durationMs: Date.now() - start });
      job.resolve({ success: true, result, attempts: job.attempt });
    } catch (err) {
      running--;
      if (job.attempt < maxRetries) {
        const delay = backoffMs * Math.pow(2, job.attempt - 1);
        log.warn("queue_job_retry", {
          attempt: job.attempt,
          nextAttempt: job.attempt + 1,
          delayMs: delay,
          err,
        });
        await sleep(delay);
        const retried: QueuedJob<T> = { ...job, attempt: job.attempt + 1 };
        pending.unshift(retried); // priority: retries go to front
      } else {
        log.error("queue_job_failed", { attempts: job.attempt, err });
        job.resolve({ success: false, error: err, attempts: job.attempt });
      }
    }
    drain();
  }

  /**
   * Enqueue a job. Returns a promise that resolves with the job result
   * once the job completes (or fails after all retries).
   *
   * Fire-and-forget pattern: `webhookQueue.enqueue(fn).catch(() => {})`.
   * Awaited pattern: `const { success } = await webhookQueue.enqueue(fn)`.
   */
  function enqueue(fn: JobFn<T>): Promise<JobResult<T>> {
    return new Promise<JobResult<T>>((resolve) => {
      pending.push({ fn, resolve, attempt: 1 });
      drain();
    });
  }

  function stats() {
    return { running, pending: pending.length };
  }

  return { enqueue, stats, name };
}

// ── Pre-built queues ──────────────────────────────────────

/**
 * Webhook processing queue.
 * Concurrency 5: allows burst handling without overwhelming the DB.
 */
export const webhookQueue = createQueue("webhook", {
  concurrency: 5,
  maxRetries: 3,
  backoffMs: 1000,
});

/**
 * AI reply queue.
 * Lower concurrency: AI API calls are expensive and rate-limited.
 */
export const aiQueue = createQueue("ai", {
  concurrency: 3,
  maxRetries: 2,
  backoffMs: 2000,
});

// ── Utilities ─────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
