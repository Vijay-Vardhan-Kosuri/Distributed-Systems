import { describe, it, expect } from 'vitest';
import {
  calculateErrorRate,
  calculateThroughput,
  calculateDistributionPercentage,
  formatLatency,
  formatPercentage,
  calculatePercentile,
  evaluateAlgorithmWinners,
} from './metrics.ts';

describe('LoadSphere Metric Utilities', () => {
  describe('calculateErrorRate', () => {
    it('returns 0 when total requests is 0 (prevents division by zero)', () => {
      expect(calculateErrorRate(0, 0)).toBe(0);
      expect(calculateErrorRate(5, 0)).toBe(0);
    });

    it('calculates error rate accurately', () => {
      expect(calculateErrorRate(10, 1000)).toBe(1.0);
      expect(calculateErrorRate(5, 200)).toBe(2.5);
    });

    it('caps between 0 and 100', () => {
      expect(calculateErrorRate(-10, 100)).toBe(0);
      expect(calculateErrorRate(150, 100)).toBe(100);
    });
  });

  describe('calculateThroughput', () => {
    it('returns 0 when duration is 0', () => {
      expect(calculateThroughput(100, 0)).toBe(0);
    });

    it('calculates throughput RPS properly', () => {
      expect(calculateThroughput(1500, 30)).toBe(50.0);
    });
  });

  describe('calculateDistributionPercentage', () => {
    it('handles zero total gracefully', () => {
      expect(calculateDistributionPercentage(0, 0)).toBe(0);
    });

    it('calculates percentage accurately', () => {
      expect(calculateDistributionPercentage(333, 1000)).toBe(33.3);
    });
  });

  describe('formatLatency', () => {
    it('returns "Unavailable" for null or undefined', () => {
      expect(formatLatency(null)).toBe('Unavailable');
      expect(formatLatency(undefined)).toBe('Unavailable');
      expect(formatLatency(NaN)).toBe('Unavailable');
    });

    it('formats valid number with units', () => {
      expect(formatLatency(14.28)).toBe('14.3 ms');
      expect(formatLatency(0)).toBe('0.0 ms');
    });
  });

  describe('formatPercentage', () => {
    it('returns "Unavailable" for null or undefined', () => {
      expect(formatPercentage(null)).toBe('Unavailable');
    });

    it('formats valid percentage', () => {
      expect(formatPercentage(99.94)).toBe('99.9%');
    });
  });

  describe('calculatePercentile', () => {
    it('returns null for empty array', () => {
      expect(calculatePercentile([], 95)).toBeNull();
    });

    it('calculates correct percentiles', () => {
      const data = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      expect(calculatePercentile(data, 50)).toBe(50);
      expect(calculatePercentile(data, 90)).toBe(90);
      expect(calculatePercentile(data, 95)).toBe(100);
    });
  });

  describe('evaluateAlgorithmWinners', () => {
    it('returns null winners if no test runs available', () => {
      const summary = evaluateAlgorithmWinners([]);
      expect(summary.lowestLatency).toBeNull();
    });

    it('evaluates lowest latency, highest throughput, lowest error rate objectively', () => {
      const results = [
        {
          algorithm: 'round-robin',
          avgLatencyMs: 24.5,
          throughputRps: 180,
          errorRate: 0.2,
          serverDistribution: [{ percentage: 33.3 }, { percentage: 33.4 }, { percentage: 33.3 }],
        },
        {
          algorithm: 'least-connections',
          avgLatencyMs: 19.8,
          throughputRps: 210,
          errorRate: 0.1,
          serverDistribution: [{ percentage: 35.0 }, { percentage: 32.0 }, { percentage: 33.0 }],
        },
        {
          algorithm: 'dynamic-load-balancing',
          avgLatencyMs: 16.2,
          throughputRps: 235,
          errorRate: 0.05,
          serverDistribution: [{ percentage: 34.0 }, { percentage: 33.0 }, { percentage: 33.0 }],
        },
      ];

      const winners = evaluateAlgorithmWinners(results);
      expect(winners.lowestLatency?.algorithm).toBe('dynamic-load-balancing');
      expect(winners.highestThroughput?.algorithm).toBe('dynamic-load-balancing');
      expect(winners.lowestErrorRate?.algorithm).toBe('dynamic-load-balancing');
      expect(winners.mostBalanced?.algorithm).toBe('round-robin');
    });
  });
});
