/**
 * LoadSphere Metric Calculation Utilities
 * 
 * Strict statistical and metric formatting functions:
 * - Handles zero requests gracefully (no NaN or Infinity)
 * - Explicit distinction between zero (0) and missing/unavailable metrics (null)
 * - Safe percentile calculation and distributions
 */

export function calculateErrorRate(failedRequests: number, totalRequests: number): number {
  if (totalRequests <= 0) return 0;
  if (failedRequests <= 0) return 0;
  const rate = (failedRequests / totalRequests) * 100;
  return Math.min(100, Math.max(0, Number(rate.toFixed(2))));
}

export function calculateThroughput(totalRequests: number, durationSeconds: number): number {
  if (durationSeconds <= 0 || totalRequests <= 0) return 0;
  return Number((totalRequests / durationSeconds).toFixed(1));
}

export function calculateDistributionPercentage(count: number, total: number): number {
  if (total <= 0 || count <= 0) return 0;
  return Number(((count / total) * 100).toFixed(1));
}

export function formatLatency(latencyMs: number | null | undefined): string {
  if (latencyMs === null || latencyMs === undefined || isNaN(latencyMs)) {
    return 'Unavailable';
  }
  return `${latencyMs.toFixed(1)} ms`;
}

export function formatThroughput(rps: number | null | undefined): string {
  if (rps === null || rps === undefined || isNaN(rps)) {
    return 'Unavailable';
  }
  return `${rps.toLocaleString()} req/s`;
}

export function formatPercentage(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return 'Unavailable';
  }
  return `${val.toFixed(1)}%`;
}

export function formatRequestCount(count: number | null | undefined): string {
  if (count === null || count === undefined || isNaN(count)) {
    return 'Unavailable';
  }
  return count.toLocaleString();
}

export function formatAlgorithmName(algo: string): string {
  switch (algo) {
    case 'round-robin':
      return 'Round Robin';
    case 'least-connections':
      return 'Least Connections';
    case 'dynamic-load-balancing':
      return 'Dynamic Load Balancing';
    default:
      return algo;
  }
}

/**
 * Calculates empirical percentiles (P50, P90, P95, P99)
 */
export function calculatePercentile(values: number[], percentile: number): number | null {
  if (!values || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  const clampedIndex = Math.max(0, Math.min(index, sorted.length - 1));
  return sorted[clampedIndex];
}

/**
 * Evaluates best-performing algorithm across multiple test runs under identical workload
 */
export interface AlgorithmWinnerSummary {
  lowestLatency: { algorithm: string; value: number } | null;
  highestThroughput: { algorithm: string; value: number } | null;
  lowestErrorRate: { algorithm: string; value: number } | null;
  mostBalanced: { algorithm: string; deviationScore: number } | null;
}

export function evaluateAlgorithmWinners(
  results: { algorithm: string; avgLatencyMs: number; throughputRps: number; errorRate: number; serverDistribution: { percentage: number }[] }[]
): AlgorithmWinnerSummary {
  if (!results || results.length === 0) {
    return {
      lowestLatency: null,
      highestThroughput: null,
      lowestErrorRate: null,
      mostBalanced: null,
    };
  }

  let lowestLatency = results[0];
  let highestThroughput = results[0];
  let lowestErrorRate = results[0];
  
  // Balance is measured by lowest standard deviation across the 3 server distribution percentages (ideal is ~33.3% each)
  const calcDev = (dist: { percentage: number }[]) => {
    if (!dist || dist.length === 0) return 999;
    const avg = dist.reduce((acc, d) => acc + d.percentage, 0) / dist.length;
    const variance = dist.reduce((acc, d) => acc + Math.pow(d.percentage - avg, 2), 0) / dist.length;
    return Math.sqrt(variance);
  };

  let bestBalanced = { algorithm: results[0].algorithm, score: calcDev(results[0].serverDistribution) };

  for (const r of results) {
    if (r.avgLatencyMs < lowestLatency.avgLatencyMs) lowestLatency = r;
    if (r.throughputRps > highestThroughput.throughputRps) highestThroughput = r;
    if (r.errorRate < lowestErrorRate.errorRate) lowestErrorRate = r;

    const dev = calcDev(r.serverDistribution);
    if (dev < bestBalanced.score) {
      bestBalanced = { algorithm: r.algorithm, score: dev };
    }
  }

  return {
    lowestLatency: { algorithm: lowestLatency.algorithm, value: lowestLatency.avgLatencyMs },
    highestThroughput: { algorithm: highestThroughput.algorithm, value: highestThroughput.throughputRps },
    lowestErrorRate: { algorithm: lowestErrorRate.algorithm, value: lowestErrorRate.errorRate },
    mostBalanced: { algorithm: bestBalanced.algorithm, deviationScore: Number(bestBalanced.score.toFixed(2)) },
  };
}
