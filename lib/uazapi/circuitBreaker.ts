/**
 * Process-local circuit breaker for Uazapi requests.
 *
 * State machine:
 *   CLOSED → trip after N consecutive failures within window → OPEN
 *   OPEN → after cooldown → HALF_OPEN
 *   HALF_OPEN → next request: success → CLOSED, failure → OPEN
 *
 * Keyed by serverUrl so different instances don't affect each other.
 * Persists across requests within the same serverless instance (warm).
 * Cold starts reset state — acceptable trade-off without Redis.
 */

type State = "CLOSED" | "OPEN" | "HALF_OPEN";

type CircuitState = {
  state: State;
  consecutiveFailures: number;
  openedAt: number;
};

const FAILURE_THRESHOLD = 5; // open after 5 consecutive failures
const COOLDOWN_MS = 30_000; // 30s before trying half-open

const circuits = new Map<string, CircuitState>();

function getOrInit(key: string): CircuitState {
  let s = circuits.get(key);
  if (!s) {
    s = { state: "CLOSED", consecutiveFailures: 0, openedAt: 0 };
    circuits.set(key, s);
  }
  return s;
}

/**
 * Returns true if the request is allowed; false if the circuit is open.
 * If half-open, allows ONE request through (the caller will report back via recordSuccess/Failure).
 */
export function canRequest(key: string): boolean {
  const s = getOrInit(key);
  if (s.state === "CLOSED") return true;

  if (s.state === "OPEN") {
    if (Date.now() - s.openedAt >= COOLDOWN_MS) {
      s.state = "HALF_OPEN";
      console.log(JSON.stringify({ event: "circuit_half_open", key }));
      return true;
    }
    return false;
  }

  // HALF_OPEN: only let one request through; caller reports outcome
  return true;
}

export function recordSuccess(key: string): void {
  const s = getOrInit(key);
  if (s.state === "HALF_OPEN") {
    console.log(JSON.stringify({ event: "circuit_closed", key }));
  }
  s.state = "CLOSED";
  s.consecutiveFailures = 0;
  s.openedAt = 0;
}

export function recordFailure(key: string): void {
  const s = getOrInit(key);
  s.consecutiveFailures += 1;
  if (s.state === "HALF_OPEN" || s.consecutiveFailures >= FAILURE_THRESHOLD) {
    if (s.state !== "OPEN") {
      s.state = "OPEN";
      s.openedAt = Date.now();
      console.warn(
        JSON.stringify({
          event: "circuit_opened",
          key,
          consecutiveFailures: s.consecutiveFailures,
          cooldownMs: COOLDOWN_MS,
        })
      );
    }
  }
}

export function getCircuitState(key: string): State {
  return getOrInit(key).state;
}
