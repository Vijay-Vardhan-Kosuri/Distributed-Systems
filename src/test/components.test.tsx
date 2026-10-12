import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { KpiCard } from '../components/KpiCard.tsx';
import { ServerCard } from '../components/ServerCard.tsx';
import { BackendServer } from '../types/loadsphere.ts';
import { Activity } from 'lucide-react';

describe('UI Component Tests', () => {
  describe('KpiCard', () => {
    it('renders title, value, unit, and description properly', () => {
      render(
        <KpiCard
          title="Requests Per Second"
          value="450"
          unit="req/s"
          icon={Activity}
          description="Instant aggregate throughput"
        />
      );

      expect(screen.getByText('Requests Per Second')).toBeDefined();
      expect(screen.getByText('450')).toBeDefined();
      expect(screen.getByText('req/s')).toBeDefined();
      expect(screen.getByText('Instant aggregate throughput')).toBeDefined();
    });

    it('renders "Unavailable" text when passed', () => {
      render(
        <KpiCard
          title="P95 Latency"
          value="Unavailable"
          icon={Activity}
          description="95th percentile tail latency"
        />
      );

      expect(screen.getByText('Unavailable')).toBeDefined();
    });
  });

  describe('ServerCard', () => {
    const mockServer: BackendServer = {
      id: 'srv-1',
      name: 'Server 1',
      address: 'http://10.0.1.101:8081',
      status: 'healthy',
      availability: 99.9,
      requestCount: 15000,
      activeConnections: 24,
      avgResponseTimeMs: 18.2,
      throughputRps: 120.5,
      errorCount: 2,
      errorRate: 0.01,
      cpuUsagePercent: 35.0,
      memoryUsagePercent: 52.0,
      lastHealthCheck: '2026-10-12T06:00:00Z',
      lastFailureTime: null,
      lastRecoveryTime: null,
    };

    it('renders healthy server status and metrics', () => {
      render(<ServerCard server={mockServer} />);

      expect(screen.getByText('Server 1')).toBeDefined();
      expect(screen.getByText('Healthy')).toBeDefined();
      expect(screen.getByText('http://10.0.1.101:8081')).toBeDefined();
      expect(screen.getByText('18.2 ms')).toBeDefined();
    });

    it('displays traffic diverted banner when server is unhealthy', () => {
      const unhealthyServer: BackendServer = {
        ...mockServer,
        status: 'unhealthy',
      };

      render(<ServerCard server={unhealthyServer} />);

      expect(screen.getByText(/Unhealthy \(No Traffic\)/)).toBeDefined();
      expect(screen.getByText(/Traffic Diverted:/)).toBeDefined();
    });

    it('allows admin to trigger failover simulation', () => {
      const onSimulate = vi.fn();
      render(<ServerCard server={mockServer} canManageServer={true} onSimulateStatus={onSimulate} />);

      const triggerBtn = screen.getByText('Trigger Outage');
      expect(triggerBtn).toBeDefined();

      fireEvent.click(triggerBtn);
      expect(onSimulate).toHaveBeenCalledWith('srv-1', 'unhealthy');
    });
  });
});
