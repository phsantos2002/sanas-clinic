/**
 * Benchmarks por objetivo de campanha e multiplicadores por segmento de negócio.
 * Valores base representam medianas do mercado brasileiro (Meta Ads, 2024-2025).
 */

export type BenchmarkMetrics = {
  ctr: { good: number; average: number; bad: number };
  cpm: { good: number; average: number; bad: number };
  cpc: { good: number; average: number; bad: number };
  cpl: { good: number; average: number; bad: number };
  frequency: { good: number; average: number; bad: number };
};

// Benchmarks base por objetivo de campanha
const BENCHMARKS: Record<string, BenchmarkMetrics> = {
  MESSAGES: {
    ctr: { good: 2.0, average: 1.2, bad: 0.6 },
    cpm: { good: 25, average: 45, bad: 70 },
    cpc: { good: 1.0, average: 2.5, bad: 5.0 },
    cpl: { good: 5, average: 15, bad: 35 },
    frequency: { good: 1.5, average: 2.5, bad: 3.5 },
  },
  CONVERSIONS: {
    ctr: { good: 1.5, average: 0.9, bad: 0.4 },
    cpm: { good: 30, average: 55, bad: 90 },
    cpc: { good: 2.0, average: 4.0, bad: 8.0 },
    cpl: { good: 15, average: 40, bad: 80 },
    frequency: { good: 1.8, average: 3.0, bad: 4.0 },
  },
  LEADS: {
    ctr: { good: 1.8, average: 1.0, bad: 0.5 },
    cpm: { good: 28, average: 50, bad: 80 },
    cpc: { good: 1.5, average: 3.5, bad: 7.0 },
    cpl: { good: 8, average: 25, bad: 50 },
    frequency: { good: 1.5, average: 2.5, bad: 3.5 },
  },
  ENGAGEMENT: {
    ctr: { good: 3.0, average: 1.5, bad: 0.8 },
    cpm: { good: 15, average: 30, bad: 50 },
    cpc: { good: 0.5, average: 1.5, bad: 3.0 },
    cpl: { good: 10, average: 30, bad: 60 },
    frequency: { good: 2.0, average: 3.0, bad: 4.5 },
  },
  TRAFFIC: {
    ctr: { good: 2.5, average: 1.2, bad: 0.5 },
    cpm: { good: 12, average: 25, bad: 45 },
    cpc: { good: 0.3, average: 1.0, bad: 2.5 },
    cpl: { good: 12, average: 35, bad: 70 },
    frequency: { good: 2.0, average: 3.5, bad: 5.0 },
  },
};

// Multiplicadores por segmento de negócio (aplicados sobre os benchmarks base)
const SEGMENT_MULTIPLIERS: Record<string, { cpm: number; cpc: number; cpl: number }> = {
  HEALTH: { cpm: 1.3, cpc: 1.4, cpl: 1.5 },
  EDUCATION: { cpm: 1.1, cpc: 1.0, cpl: 0.9 },
  ECOMMERCE: { cpm: 1.0, cpc: 0.9, cpl: 1.0 },
  SERVICES: { cpm: 1.1, cpc: 1.1, cpl: 1.2 },
  REAL_ESTATE: { cpm: 1.4, cpc: 1.5, cpl: 1.8 },
  FOOD: { cpm: 0.8, cpc: 0.7, cpl: 0.7 },
  FITNESS: { cpm: 1.0, cpc: 1.0, cpl: 1.0 },
  BEAUTY: { cpm: 0.9, cpc: 0.9, cpl: 0.8 },
  LEGAL: { cpm: 1.5, cpc: 1.6, cpl: 2.0 },
  OTHER: { cpm: 1.0, cpc: 1.0, cpl: 1.0 },
};

// Multiplicador por cobertura geográfica
const COVERAGE_MULTIPLIERS: Record<string, { cpm: number }> = {
  LOCAL: { cpm: 0.85 },
  REGIONAL: { cpm: 1.0 },
  NATIONAL: { cpm: 1.15 },
  INTERNATIONAL: { cpm: 1.3 },
};

const DEFAULT_BENCHMARK = BENCHMARKS.MESSAGES;

export function getBenchmark(
  objective: string | null | undefined,
  segment?: string | null,
  coverage?: string | null
): BenchmarkMetrics {
  const base = BENCHMARKS[objective ?? ""] ?? DEFAULT_BENCHMARK;
  const segMult = SEGMENT_MULTIPLIERS[segment ?? ""] ?? SEGMENT_MULTIPLIERS.OTHER;
  const covMult = COVERAGE_MULTIPLIERS[coverage ?? ""] ?? COVERAGE_MULTIPLIERS.REGIONAL;

  return {
    ctr: { ...base.ctr },
    cpm: {
      good: Math.round(base.cpm.good * segMult.cpm * covMult.cpm),
      average: Math.round(base.cpm.average * segMult.cpm * covMult.cpm),
      bad: Math.round(base.cpm.bad * segMult.cpm * covMult.cpm),
    },
    cpc: {
      good: +(base.cpc.good * segMult.cpc).toFixed(2),
      average: +(base.cpc.average * segMult.cpc).toFixed(2),
      bad: +(base.cpc.bad * segMult.cpc).toFixed(2),
    },
    cpl: {
      good: +(base.cpl.good * segMult.cpl).toFixed(2),
      average: +(base.cpl.average * segMult.cpl).toFixed(2),
      bad: +(base.cpl.bad * segMult.cpl).toFixed(2),
    },
    frequency: { ...base.frequency },
  };
}

export type MetricQuality = "good" | "average" | "bad";

/**
 * Classifica uma métrica comparando com o benchmark.
 * Para métricas "lower is better" (cpm, cpc, cpl, frequency): valor menor = melhor.
 * Para métricas "higher is better" (ctr): valor maior = melhor.
 */
export function classifyMetric(
  metric: keyof BenchmarkMetrics,
  value: number,
  benchmark: BenchmarkMetrics
): MetricQuality {
  const thresholds = benchmark[metric];
  const higherIsBetter = metric === "ctr";

  if (higherIsBetter) {
    if (value >= thresholds.good) return "good";
    if (value >= thresholds.average) return "average";
    return "bad";
  } else {
    if (value <= thresholds.good) return "good";
    if (value <= thresholds.average) return "average";
    return "bad";
  }
}

export const METRIC_COLORS: Record<MetricQuality, string> = {
  good: "text-emerald-600",
  average: "text-amber-600",
  bad: "text-red-600",
};

export const METRIC_BG_COLORS: Record<MetricQuality, string> = {
  good: "bg-emerald-50",
  average: "bg-amber-50",
  bad: "bg-red-50",
};
