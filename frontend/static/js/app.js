/**
 * LoadSphere Application Orchestrator
 * Single Page App Navigation, State Updates, Role Enforcement, and Interactivity.
 */

const App = {
    currentView: 'overview',
    refreshInterval: null,
    latencyHistory: [],

    init() {
        this.setupNavigation();
        this.setupHeaderControls();
        this.setupEventListeners();
        this.setupLoginHandlers();

        // Check authentication state
        const savedSession = localStorage.getItem('loadsphere_session');
        if (savedSession) {
            try {
                const user = JSON.parse(savedSession);
                this.applyUserSession(user);
                this.showAppLayout();
                this.startAutoRefresh(5000);
                this.refreshOverview();
                return;
            } catch (e) {
                localStorage.removeItem('loadsphere_session');
            }
        }

        // Show dedicated login screen if not logged in
        this.showLoginScreen();
    },

    showLoginScreen() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-layout').style.display = 'none';
        if (this.refreshInterval) clearInterval(this.refreshInterval);
    },

    showAppLayout() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-layout').style.display = 'flex';
    },

    setupLoginHandlers() {
        const form = document.getElementById('form-login');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('login-username').value.trim();
                const password = document.getElementById('login-password').value.trim();
                await this.login(username, password);
            });
        }
    },

    async loginWithPreset(username, password) {
        document.getElementById('login-username').value = username;
        document.getElementById('login-password').value = password;
        await this.login(username, password);
    },

    async login(username, password) {
        const errBanner = document.getElementById('login-error-banner');
        const submitBtn = document.getElementById('btn-submit-login');
        errBanner.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.innerText = 'Authenticating...';

        try {
            const data = await Api.post('/auth/login', { username, password });
            Api.token = data.access_token;
            Api.setRole(data.role);

            const sessionData = {
                username: data.username,
                role: data.role,
                token: data.access_token
            };
            localStorage.setItem('loadsphere_session', JSON.stringify(sessionData));

            this.applyUserSession(sessionData);
            this.showAppLayout();
            this.showToast(`Signed in as ${data.username} (${data.role})`, 'success');
            this.startAutoRefresh(5000);
            this.refreshOverview();
        } catch (err) {
            errBanner.innerText = err.message || 'Authentication failed. Please verify credentials.';
            errBanner.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Sign In to LoadSphere';
        }
    },

    applyUserSession(user) {
        Api.token = user.token;
        Api.setRole(user.role);
        document.getElementById('user-display-role').innerText = user.role;
        document.getElementById('user-display-name').innerText = user.username.toUpperCase() + ' User';
        document.getElementById('user-avatar-initials').innerText = user.username.slice(0, 2).toUpperCase();

        // Enforce role-based menu visibility: User Management is present ONLY for ADMIN
        const isAdmin = (user.role === 'ADMIN');
        const adminSection = document.getElementById('admin-section-label');
        const userNavItem = document.getElementById('nav-item-users');
        if (adminSection) adminSection.style.display = isAdmin ? 'block' : 'none';
        if (userNavItem) userNavItem.style.display = isAdmin ? 'flex' : 'none';
    },

    logout() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        localStorage.removeItem('loadsphere_session');
        Api.token = null;
        this.showLoginScreen();
        this.showToast('You have been signed out', 'info');
    },

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetView = btn.getAttribute('data-view');
                this.navigate(targetView);
            });
        });
    },

    navigate(viewName) {
        // Enforce route protection: only ADMIN can access user management
        if (viewName === 'users' && Api.currentRole !== 'ADMIN') {
            this.showToast('Access Denied: User Management is available only for Administrators', 'error');
            this.navigate('overview');
            return;
        }

        this.currentView = viewName;
        // Update sidebar nav active class
        document.querySelectorAll('.nav-item').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-view') === viewName);
        });
        // Switch view section visibility
        document.querySelectorAll('.view').forEach(v => {
            v.classList.toggle('active', v.id === `view-${viewName}`);
        });

        // Trigger view-specific loads
        if (viewName === 'overview') this.refreshOverview();
        else if (viewName === 'servers') this.loadServersView();
        else if (viewName === 'routing') this.loadRoutingView();
        else if (viewName === 'comparison') this.loadComparisonView();
        else if (viewName === 'experiments') this.loadExperiments();
        else if (viewName === 'reports') this.loadReportsView();

        else if (viewName === 'users') this.loadUsersView();
    },

    setupHeaderControls() {
        // Refresh rate dropdown
        const refreshSel = document.getElementById('select-refresh-rate');
        if (refreshSel) {
            refreshSel.addEventListener('change', (e) => {
                const ms = parseInt(e.target.value);
                this.startAutoRefresh(ms);
            });
        }

        // Quick Ping / Test request button
        const pingBtn = document.getElementById('btn-quick-ping');
        if (pingBtn) {
            pingBtn.addEventListener('click', async () => {
                try {
                    const res = await Api.sendTestProxyRequest();
                    this.showToast(`Routed to ${res.server_name || 'Node'} successfully (${res.port || '800x'})`, 'success');
                    this.refreshOverview();
                } catch (err) {
                    this.showToast(`Request failed: ${err.message}`, 'error');
                }
            });
        }

        // Explicit Logout button
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    },


    setupEventListeners() {
        // Algorithm save button
        document.getElementById('btn-save-algorithm').addEventListener('click', async () => {
            const selectedAlgo = document.querySelector('input[name="routing-algorithm"]:checked').value;
            const wConn = parseFloat(document.getElementById('slider-weight-conn').value);
            const wLat = parseFloat(document.getElementById('slider-weight-lat').value);
            const wLoad = parseFloat(document.getElementById('slider-weight-load').value);

            try {
                await Api.setAlgorithm(selectedAlgo, wConn, wLat, wLoad);
                this.showToast(`Production algorithm updated to ${selectedAlgo}`, 'success');
                this.refreshOverview();
            } catch (err) {
                this.showToast(`Failed to update algorithm: ${err.message}`, 'error');
            }
        });

        // Health policy save
        document.getElementById('btn-save-policy').addEventListener('click', async () => {
            const interval = parseFloat(document.getElementById('policy-interval').value);
            const timeout = parseFloat(document.getElementById('policy-timeout').value);
            const failThresh = parseInt(document.getElementById('policy-fail-thresh').value);
            const recThresh = parseInt(document.getElementById('policy-rec-thresh').value);

            try {
                await Api.setHealthPolicy(interval, timeout, failThresh, recThresh);
                this.showToast('Health monitoring policy updated', 'success');
            } catch (err) {
                this.showToast(`Failed: ${err.message}`, 'error');
            }
        });

        // Sliders value badges
        ['conn', 'lat', 'load'].forEach(key => {
            const slider = document.getElementById(`slider-weight-${key}`);
            const badge = document.getElementById(`val-weight-${key}`);
            slider.addEventListener('input', () => {
                badge.innerText = parseFloat(slider.value).toFixed(2);
            });
        });

        // Load test form
        document.getElementById('form-loadtest').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('test-name').value;
            const users = parseInt(document.getElementById('test-users').value);
            const spawnRate = parseInt(document.getElementById('test-spawn-rate').value);
            const duration = parseInt(document.getElementById('test-duration').value);
            const algo = document.getElementById('test-algo').value;
            const endpoint = document.getElementById('test-endpoint').value;

            try {
                const res = await Api.startLoadTest({
                    name,
                    virtual_users: users,
                    spawn_rate: spawnRate,
                    duration_seconds: duration,
                    algorithm: algo,
                    target_endpoint: endpoint
                });
                this.showToast(`Load test launched (ID: ${res.experiment_id})`, 'info');
                this.monitorTestProgress(res.experiment_id);
            } catch (err) {
                this.showToast(`Failed to start test: ${err.message}`, 'error');
            }
        });

        // Add user form
        document.getElementById('form-create-user').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await Api.createUser({
                    username: document.getElementById('new-username').value,
                    full_name: document.getElementById('new-fullname').value,
                    email: document.getElementById('new-email').value,
                    password: document.getElementById('new-password').value,
                    role: document.getElementById('new-role').value
                });
                this.closeModals();
                this.showToast('Account created successfully', 'success');
                this.loadUsersView();
            } catch (err) {
                this.showToast(`Failed: ${err.message}`, 'error');
            }
        });
    },

    startAutoRefresh(ms) {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        if (ms > 0) {
            this.refreshInterval = setInterval(() => {
                if (this.currentView === 'overview') this.refreshOverview();
                else if (this.currentView === 'servers') this.loadServersView();
            }, ms);
        }
    },

    async refreshOverview() {
        try {
            const [kpi, servers, history, recentReqs] = await Promise.all([
                Api.getKPISummary(),
                Api.getServers(),
                Api.get('/metrics/history'),
                Api.getRequestLogs(10)
            ]);

            // Update Status Pill
            const pill = document.getElementById('cluster-status-pill');
            const pillText = document.getElementById('cluster-status-text');
            pill.className = `system-status-pill ${kpi.system_status.toLowerCase()}`;
            pillText.innerText = kpi.system_status === 'OPERATIONAL' ? 'All Systems Operational' : `System ${kpi.system_status}`;

            // Update Current Algorithm Badge
            document.getElementById('current-algo-name').innerText = kpi.active_algorithm.replace('_', ' ');

            // KPI Cards
            document.getElementById('kpi-total-requests').innerText = kpi.total_requests.toLocaleString();
            document.getElementById('kpi-avg-latency').innerHTML = `${kpi.avg_latency_ms} <span class="kpi-unit">ms</span>`;
            document.getElementById('kpi-p95-latency').innerText = `${kpi.p95_latency_ms} ms`;
            document.getElementById('kpi-throughput').innerHTML = `${kpi.throughput_rps} <span class="kpi-unit">req/s</span>`;
            document.getElementById('kpi-error-rate').innerText = `${kpi.error_rate}%`;
            document.getElementById('kpi-failed-count').innerText = `${kpi.failed_requests} failed requests`;
            document.getElementById('kpi-healthy-servers').innerText = `${kpi.healthy_servers_count} / ${kpi.total_servers_count}`;
            document.getElementById('kpi-active-conns').innerText = `${kpi.active_requests} active requests`;

            // Servers Grid
            this.renderOverviewServersGrid(servers);

            // Render Charts
            Charts.renderLatencyTrend('latency-trend-chart', history);
            Charts.renderTrafficDonut('distribution-chart', 'distribution-legend', kpi.server_distribution);
            document.getElementById('distribution-cv-badge').innerText = `CV: ${kpi.load_imbalance_cv.toFixed(4)}`;

            // Render Recent Requests Table
            this.renderRecentRequestsTable(recentReqs);

        } catch (err) {
            console.error('Error refreshing overview:', err);
        }
    },

    renderOverviewServersGrid(servers) {
        const grid = document.getElementById('overview-servers-grid');
        grid.innerHTML = servers.map(s => {
            let statusClass = 'status-healthy';
            let statusText = 'Healthy';
            if (!s.is_healthy) {
                statusClass = 'status-failed';
                statusText = 'Unhealthy (Failed)';
            } else if (!s.is_enabled) {
                statusClass = 'status-warning';
                statusText = 'Maintenance (Disabled)';
            }

            return `
                <div class="server-node-card">
                    <div class="server-card-header">
                        <div class="server-name-tag">
                            <div class="server-icon-badge">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
                            </div>
                            <div>
                                <div class="server-name">${s.name}</div>
                                <div class="server-port">Port :${s.port}</div>
                            </div>
                        </div>
                        <span class="node-status-badge ${statusClass}">${statusText}</span>
                    </div>

                    <div class="server-metrics-row">
                        <div class="server-metric-item">
                            <span class="sm-label">Active Conns</span>
                            <span class="sm-value">${s.active_connections}</span>
                        </div>
                        <div class="server-metric-item">
                            <span class="sm-label">Latency</span>
                            <span class="sm-value">${s.last_latency_ms.toFixed(1)} ms</span>
                        </div>
                        <div class="server-metric-item">
                            <span class="sm-label">Total Handled</span>
                            <span class="sm-value">${s.total_requests}</span>
                        </div>
                    </div>

                    <div class="server-load-bar-wrap">
                        <div class="sl-label">
                            <span>CPU Utilization</span>
                            <span>${s.cpu_usage.toFixed(1)}%</span>
                        </div>
                        <div class="progress-track">
                            <div class="progress-fill ${s.cpu_usage > 70 ? 'danger' : s.cpu_usage > 40 ? 'warning' : ''}" style="width: ${Math.min(100, s.cpu_usage)}%;"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderRecentRequestsTable(logs) {
        const tbody = document.getElementById('table-recent-requests');
        if (!logs || logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No requests recorded yet. Click "Send Test Request" above.</td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(r => `
            <tr>
                <td style="font-family: var(--font-mono); font-size: 0.75rem;">${r.request_id.slice(0, 8)}...</td>
                <td>${new Date(r.timestamp).toLocaleTimeString()}</td>
                <td><span class="badge badge-subtle">${r.method}</span> <code>${r.path}</code></td>
                <td><strong>${r.selected_server_name || 'None'}</strong></td>
                <td>${r.algorithm_used.replace('_', ' ')}</td>
                <td>${r.duration_ms.toFixed(1)} ms</td>
                <td>
                    <span class="badge ${r.response_status < 400 ? 'badge-success' : 'badge-danger'}">
                        ${r.response_status}
                    </span>
                </td>
            </tr>
        `).join('');
    },

    async loadServersView() {
        const [servers, healthLogs] = await Promise.all([
            Api.getServers(),
            Api.getHealthLogs(15)
        ]);

        const container = document.getElementById('detailed-servers-container');
        container.innerHTML = servers.map(s => {
            return `
                <div class="card mb-4">
                    <div class="card-header">
                        <div>
                            <h3 class="card-title">${s.name} (${s.host}:${s.port})</h3>
                            <p class="card-desc">Endpoint: <code>${s.url}</code></p>
                        </div>
                        <div class="flex-between gap-2">
                            <span class="node-status-badge ${s.is_healthy ? 'status-healthy' : 'status-failed'}">
                                ${s.is_healthy ? 'Healthy' : 'Unhealthy'}
                            </span>
                            <span class="node-status-badge ${s.is_enabled ? 'status-healthy' : 'status-warning'}">
                                ${s.is_enabled ? 'Routing Enabled' : 'Disabled for Maintenance'}
                            </span>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="kpi-grid mb-3">
                            <div class="kpi-card">
                                <div class="kpi-title">Active Requests</div>
                                <div class="kpi-value">${s.active_connections}</div>
                            </div>
                            <div class="kpi-card">
                                <div class="kpi-title">Consecutive Checks</div>
                                <div class="kpi-value">${s.is_healthy ? s.consecutive_successes + ' Passed' : s.consecutive_failures + ' Failed'}</div>
                            </div>
                            <div class="kpi-card">
                                <div class="kpi-title">Hardware Telemetry</div>
                                <div class="kpi-value">${s.cpu_usage.toFixed(1)}% <span class="kpi-unit">CPU</span></div>
                                <div class="kpi-meta">${s.memory_usage.toFixed(1)}% Memory</div>
                            </div>
                        </div>

                        <!-- Maintenance & Simulation Controls -->
                        <div class="border-top pt-3 flex-between">
                            <div class="flex-between gap-2">
                                <button class="btn btn-sm ${s.is_enabled ? 'btn-secondary' : 'btn-primary'}" onclick="App.toggleMaintenance('${s.id}', ${!s.is_enabled})">
                                    ${s.is_enabled ? 'Disable (Maintenance)' : 'Enable Node'}
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="App.simulateCondition('${s.id}', 'failure')">
                                    Simulate Failure
                                </button>
                                <button class="btn btn-sm btn-secondary" onclick="App.simulateCondition('${s.id}', 'delay', 400)">
                                    Simulate Delay (+400ms)
                                </button>
                                <button class="btn btn-sm btn-primary" onclick="App.simulateCondition('${s.id}', 'recover')">
                                    Recover Node (Restore 200 OK)
                                </button>
                            </div>
                            <div class="text-sm text-muted">
                                Weight: <strong>${s.weight}x</strong>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Render health logs table
        const tbody = document.getElementById('table-health-logs');
        tbody.innerHTML = healthLogs.map(h => `
            <tr>
                <td>${new Date(h.timestamp).toLocaleTimeString()}</td>
                <td><strong>${h.server_name}</strong></td>
                <td><span class="badge ${h.is_successful ? 'badge-success' : 'badge-danger'}">${h.is_successful ? 'PROBE SUCCESS' : 'PROBE FAILED'}</span></td>
                <td>${h.status_code || 'Timeout/Err'}</td>
                <td>${h.latency_ms.toFixed(1)} ms</td>
                <td>${h.old_state || '-'} &rarr; ${h.new_state || '-'}</td>
                <td class="text-muted">${h.failure_reason || 'Normal HTTP 200'}</td>
            </tr>
        `).join('');
    },

    async toggleMaintenance(serverId, enable) {
        try {
            await Api.updateMaintenance(serverId, enable);
            this.showToast(`Server status updated`, 'success');
            this.loadServersView();
        } catch (err) {
            this.showToast(`Error: ${err.message}`, 'error');
        }
    },

    async simulateCondition(serverId, action, delayMs) {
        try {
            await Api.simulateCondition(serverId, action, delayMs);
            this.showToast(`Simulated ${action} on ${serverId}`, 'info');
            this.loadServersView();
        } catch (err) {
            this.showToast(`Error: ${err.message}`, 'error');
        }
    },

    async loadRoutingView() {
        const data = await Api.getAlgorithm();
        const activeAlgo = data.active_algorithm;
        const radio = document.querySelector(`input[name="routing-algorithm"][value="${activeAlgo}"]`);
        if (radio) radio.checked = true;

        if (data.dynamic_weights) {
            document.getElementById('slider-weight-conn').value = data.dynamic_weights.weight_connections;
            document.getElementById('val-weight-conn').innerText = data.dynamic_weights.weight_connections.toFixed(2);
            document.getElementById('slider-weight-lat').value = data.dynamic_weights.weight_latency;
            document.getElementById('val-weight-lat').innerText = data.dynamic_weights.weight_latency.toFixed(2);
            document.getElementById('slider-weight-load').value = data.dynamic_weights.weight_load;
            document.getElementById('val-weight-load').innerText = data.dynamic_weights.weight_load.toFixed(2);
        }

        if (data.health_policy) {
            document.getElementById('policy-interval').value = data.health_policy.interval_seconds;
            document.getElementById('policy-timeout').value = data.health_policy.timeout_seconds;
            document.getElementById('policy-fail-thresh').value = data.health_policy.failure_threshold;
            document.getElementById('policy-rec-thresh').value = data.health_policy.recovery_threshold;
        }
    },

    async monitorTestProgress(expId) {
        const badge = document.getElementById('test-status-badge');
        const fill = document.getElementById('test-progress-fill');
        const btnStart = document.getElementById('btn-start-test');
        const btnStop = document.getElementById('btn-stop-test');

        btnStart.disabled = true;
        btnStop.disabled = false;
        btnStop.onclick = () => Api.stopLoadTest(expId);
        badge.innerText = 'RUNNING';
        badge.className = 'badge badge-primary';

        const pollInterval = setInterval(async () => {
            try {
                const res = await Api.getTestStatus(expId);
                const live = res.live || {};
                const prog = live.progress || 0;

                fill.style.width = `${prog}%`;
                document.getElementById('test-live-progress').innerText = `${prog}%`;
                document.getElementById('test-live-reqs').innerText = live.requests_sent || 0;
                document.getElementById('test-live-succ').innerText = live.successes || 0;
                document.getElementById('test-live-fail').innerText = live.failures || 0;

                if (res.status === 'COMPLETED' || res.status === 'STOPPED') {
                    clearInterval(pollInterval);
                    btnStart.disabled = false;
                    btnStop.disabled = true;
                    badge.innerText = res.status;
                    badge.className = 'badge badge-success';
                    this.showToast(`Load test ${res.status.toLowerCase()}!`, 'success');
                    this.refreshOverview();
                }
            } catch (err) {
                clearInterval(pollInterval);
                btnStart.disabled = false;
                btnStop.disabled = true;
            }
        }, 800);
    },

    async loadExperiments() {
        const exps = await Api.getExperiments();
        const tbody = document.getElementById('table-experiments');
        tbody.innerHTML = exps.map(e => {
            const r = e.result || {};
            return `
                <tr>
                    <td style="font-family: var(--font-mono); font-size: 0.75rem;">${e.id}</td>
                    <td><strong>${e.name}</strong><br><span class="text-xs text-muted">${new Date(e.started_at).toLocaleString()}</span></td>
                    <td>${e.algorithm.replace('_', ' ')}</td>
                    <td>${e.virtual_users}</td>
                    <td>${e.duration_seconds}s</td>
                    <td><strong>${r.throughput_rps || '-'}</strong> req/s</td>
                    <td>${r.avg_latency_ms || '-'} ms</td>
                    <td><span class="badge ${e.status === 'COMPLETED' ? 'badge-success' : 'badge-subtle'}">${e.status}</span></td>
                    <td>
                        <a href="/api/v1/experiments/${e.id}/export/csv" class="btn btn-sm btn-secondary" download>Export CSV</a>
                    </td>
                </tr>
            `;
        }).join('');
    },

    async loadReportsView() {
        const report = await Api.getOperationalReport();
        document.getElementById('report-timestamp').innerText = `Generated on: ${report.report_generated_at}`;
        document.getElementById('report-sla-badge').innerText = `${report.sla_compliance_percent}% SLA`;
        document.getElementById('report-total-reqs').innerText = report.total_requests.toLocaleString();
        document.getElementById('report-succ-reqs').innerText = report.successful_requests.toLocaleString();

        const tbody = document.getElementById('table-report-nodes');
        tbody.innerHTML = report.servers.map(s => `
            <tr>
                <td><strong>${s.name}</strong></td>
                <td>:${s.port}</td>
                <td><span class="badge ${s.status === 'Healthy' ? 'badge-success' : 'badge-danger'}">${s.status}</span></td>
                <td>${s.uptime_percent}%</td>
                <td>${s.total_handled.toLocaleString()}</td>
                <td>${s.total_handled > 0 ? Math.round((s.successful / s.total_handled) * 100) : 100}%</td>
                <td>${s.avg_latency} ms</td>
            </tr>
        `).join('');
    },

    async loadUsersView() {
        const [users, audits] = await Promise.all([
            Api.getUsers(),
            Api.getAuditLogs(15)
        ]);

        const tbodyUsers = document.getElementById('table-users');
        tbodyUsers.innerHTML = users.map(u => `
            <tr>
                <td>${u.id}</td>
                <td><strong>${u.username}</strong></td>
                <td>${u.full_name}</td>
                <td>${u.email}</td>
                <td><span class="badge badge-primary">${u.role}</span></td>
                <td><span class="badge ${u.is_active ? 'badge-success' : 'badge-danger'}">${u.is_active ? 'Active' : 'Disabled'}</span></td>
                <td>${new Date(u.created_at).toLocaleDateString()}</td>
            </tr>
        `).join('');

        const tbodyAudits = document.getElementById('table-audit-logs');
        tbodyAudits.innerHTML = audits.map(a => `
            <tr>
                <td>${new Date(a.timestamp).toLocaleTimeString()}</td>
                <td><strong>${a.username}</strong></td>
                <td><span class="badge badge-subtle">${a.role}</span></td>
                <td><code>${a.action}</code></td>
                <td>${a.target_type} ${a.target_id || ''}</td>
                <td class="text-muted text-sm">${a.details || ''}</td>
            </tr>
        `).join('');
    },

    openAddUserModal() {
        document.getElementById('modal-add-user').classList.add('show');
    },

    closeModals() {
        document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('show'));
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
};

window.addEventListener('DOMContentLoaded', () => {
    App.init();
});
