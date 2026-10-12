/**
 * LoadSphere Crisp HTML5 Canvas Chart Engine
 * Hand-coded zero external dependency high-resolution chart renderer.
 */

const Charts = {
    // Latency Line Trend
    renderLatencyTrend(canvasId, dataPoints) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        if (!dataPoints || dataPoints.length === 0) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Awaiting live request latency data...', width / 2, height / 2);
            return;
        }

        const padding = { top: 20, right: 20, bottom: 30, left: 45 };
        const chartW = width - padding.left - padding.right;
        const chartH = height - padding.top - padding.bottom;

        // Max value
        const maxVal = Math.max(50, ...dataPoints.map(d => d.latency_ms || 0)) * 1.15;

        // Draw horizontal grid lines
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'right';

        const gridSteps = 4;
        for (let i = 0; i <= gridSteps; i++) {
            const y = padding.top + (chartH / gridSteps) * i;
            const val = Math.round(maxVal - (maxVal / gridSteps) * i);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            ctx.fillText(`${val}ms`, padding.left - 6, y + 3);
        }

        // Draw Line
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        const stepX = chartW / Math.max(1, dataPoints.length - 1);

        dataPoints.forEach((pt, idx) => {
            const x = padding.left + idx * stepX;
            const y = padding.top + chartH - ((pt.latency_ms || 0) / maxVal) * chartH;
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Area Gradient Fill
        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
        ctx.fillStyle = gradient;
        ctx.lineTo(padding.left + (dataPoints.length - 1) * stepX, padding.top + chartH);
        ctx.lineTo(padding.left, padding.top + chartH);
        ctx.closePath();
        ctx.fill();

        // Draw Points
        dataPoints.forEach((pt, idx) => {
            const x = padding.left + idx * stepX;
            const y = padding.top + chartH - ((pt.latency_ms || 0) / maxVal) * chartH;
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });
    },

    // Traffic Donut Chart
    renderTrafficDonut(canvasId, legendId, distribution) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];
        const labels = Object.keys(distribution || {});
        const values = Object.values(distribution || {});
        const total = values.reduce((a, b) => a + b, 0);

        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(centerX, centerY) - 20;
        const innerRadius = radius * 0.62;

        if (total === 0) {
            // Draw empty gray ring
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = radius - innerRadius;
            ctx.beginPath();
            ctx.arc(centerX, centerY, (radius + innerRadius) / 2, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No traffic yet', centerX, centerY + 4);
            return;
        }

        let startAngle = -Math.PI / 2;
        labels.forEach((label, i) => {
            const sliceAngle = (values[i] / total) * 2 * Math.PI;
            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
            ctx.closePath();
            ctx.fill();
            startAngle += sliceAngle;
        });

        // Center Text
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${total}`, centerX, centerY - 2);
        ctx.fillStyle = '#64748b';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText('REQUESTS', centerX, centerY + 14);

        // Update Legend
        const legendEl = document.getElementById(legendId);
        if (legendEl) {
            legendEl.innerHTML = labels.map((label, i) => {
                const pct = Math.round((values[i] / total) * 100);
                return `
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: ${colors[i % colors.length]};"></div>
                        <span><strong>${label}:</strong> ${values[i]} (${pct}%)</span>
                    </div>
                `;
            }).join('');
        }
    }
};
