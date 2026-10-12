import {
  MetricDataPoint,
  AlgorithmTestResult,
  ServerEvent,
} from '../types/loadsphere.ts';

export function exportMetricsToCsv(data: MetricDataPoint[], filename: string = 'loadsphere_metrics.csv'): void {
  if (!data || data.length === 0) return;

  const headers = [
    'Timestamp',
    'RequestsPerSecond',
    'SuccessfulRequests',
    'FailedRequests',
    'ErrorRatePercent',
    'AvgLatencyMs',
    'P50LatencyMs',
    'P95LatencyMs',
    'P99LatencyMs',
    'Server1Requests',
    'Server2Requests',
    'Server3Requests',
    'Algorithm',
  ];

  const rows = data.map(d => [
    `"${d.timestamp}"`,
    d.requestsPerSecond,
    d.successfulRequests,
    d.failedRequests,
    d.errorRate,
    d.avgLatencyMs,
    d.p50LatencyMs,
    d.p95LatencyMs,
    d.p99LatencyMs,
    d.server1Requests,
    d.server2Requests,
    d.server3Requests,
    `"${d.algorithm}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function exportTestResultsToCsv(results: AlgorithmTestResult[], filename: string = 'loadsphere_test_benchmarks.csv'): void {
  if (!results || results.length === 0) return;

  const headers = [
    'TestID',
    'TestName',
    'Algorithm',
    'Workload',
    'Timestamp',
    'DurationSec',
    'TotalRequests',
    'ThroughputRps',
    'AvgLatencyMs',
    'P50LatencyMs',
    'P95LatencyMs',
    'P99LatencyMs',
    'ErrorRatePercent',
    'Server1Requests',
    'Server1Percentage',
    'Server2Requests',
    'Server2Percentage',
    'Server3Requests',
    'Server3Percentage',
  ];

  const rows = results.map(r => {
    const s1 = r.serverDistribution.find(s => s.serverId === 'srv-1') || { requestCount: 0, percentage: 0 };
    const s2 = r.serverDistribution.find(s => s.serverId === 'srv-2') || { requestCount: 0, percentage: 0 };
    const s3 = r.serverDistribution.find(s => s.serverId === 'srv-3') || { requestCount: 0, percentage: 0 };

    return [
      `"${r.testId}"`,
      `"${r.testName}"`,
      `"${r.algorithm}"`,
      `"${r.workloadName}"`,
      `"${r.timestamp}"`,
      r.durationSeconds,
      r.totalRequests,
      r.throughputRps,
      r.avgLatencyMs,
      r.p50LatencyMs,
      r.p95LatencyMs,
      r.p99LatencyMs,
      r.errorRate,
      s1.requestCount,
      s1.percentage,
      s2.requestCount,
      s2.percentage,
      s3.requestCount,
      s3.percentage,
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function exportEventsToCsv(events: ServerEvent[], filename: string = 'loadsphere_incident_history.csv'): void {
  if (!events || events.length === 0) return;

  const headers = ['Timestamp', 'Severity', 'Type', 'ServerID', 'ServerName', 'Message'];
  const rows = events.map(e => [
    `"${e.timestamp}"`,
    `"${e.severity}"`,
    `"${e.type}"`,
    `"${e.serverId || ''}"`,
    `"${e.serverName || ''}"`,
    `"${e.message.replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;');
}

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
