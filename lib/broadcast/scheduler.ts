/**
 * Broadcast scheduling helpers — anti-ban hygiene.
 *
 * Combines:
 *  - Jitter: random ±25% on each delay (avoid robotic patterns)
 *  - Quiet hours: refuse to send between 22h and 7h (BR timezone) by default
 *  - Warm-up: new instances ramp up gradually over 7 days
 *  - Cascade detection: 5 failures in a row triggers auto-pause
 */

const DEFAULT_QUIET_START_HOUR = 22; // 22h
const DEFAULT_QUIET_END_HOUR = 7; // 7h
const BR_TIMEZONE = "America/Sao_Paulo";

/**
 * Apply ±25% random jitter to a base delay in ms.
 * Prevents sending messages on perfectly periodic intervals (a hallmark of bots).
 */
export function applyJitter(baseMs: number): number {
  const variation = baseMs * 0.25;
  return Math.round(baseMs + (Math.random() * 2 - 1) * variation);
}

/**
 * Returns true if the current time (in BR) is within quiet hours.
 * Default: 22:00 → 06:59 next day = no sends.
 */
export function isQuietHours(now: Date = new Date()): boolean {
  // Get BR hour without depending on the server's timezone
  const brHour = parseInt(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      hour12: false,
      timeZone: BR_TIMEZONE,
    }).format(now),
    10
  );
  if (DEFAULT_QUIET_START_HOUR > DEFAULT_QUIET_END_HOUR) {
    // Range crosses midnight: 22..23 OR 0..6
    return brHour >= DEFAULT_QUIET_START_HOUR || brHour < DEFAULT_QUIET_END_HOUR;
  }
  return brHour >= DEFAULT_QUIET_START_HOUR && brHour < DEFAULT_QUIET_END_HOUR;
}

/**
 * Returns the maximum messages-per-minute the instance is allowed to send,
 * based on how many days it has been connected.
 *
 * Day 0 (today): 5/min
 * Day 1:        10/min
 * Day 2:        15/min
 * Day 3:        20/min
 * Day 4:        25/min
 * Day 5:        30/min
 * Day 6:        40/min
 * Day 7+:       60/min (full speed)
 */
export function getWarmUpRate(connectedSinceMs: number, now: number = Date.now()): number {
  const daysConnected = Math.max(0, Math.floor((now - connectedSinceMs) / (1000 * 60 * 60 * 24)));
  const ladder = [5, 10, 15, 20, 25, 30, 40];
  if (daysConnected >= ladder.length) return 60;
  return ladder[daysConnected];
}

/**
 * Convert a target msgs-per-minute rate into the delay (ms) between consecutive sends.
 */
export function rateToDelayMs(msgsPerMinute: number): number {
  if (msgsPerMinute <= 0) return 60_000;
  return Math.round(60_000 / msgsPerMinute);
}

/**
 * Cascade-failure detector: track consecutive failures, returns true when threshold hit.
 */
export class CascadeDetector {
  private consecutiveFailures = 0;
  constructor(private readonly threshold = 5) {}

  recordSuccess(): void {
    this.consecutiveFailures = 0;
  }

  recordFailure(): boolean {
    this.consecutiveFailures += 1;
    return this.consecutiveFailures >= this.threshold;
  }

  reset(): void {
    this.consecutiveFailures = 0;
  }
}
