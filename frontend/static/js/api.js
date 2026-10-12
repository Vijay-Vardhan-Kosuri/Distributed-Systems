/**
 * LoadSphere API Client Module
 */

const Api = {
    baseUrl: '/api/v1',
    token: null,
    currentRole: 'ADMIN',

    setRole(role) {
        this.currentRole = role;
    },

    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    },


    async get(endpoint) {
        const resp = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ detail: resp.statusText }));
            throw new Error(err.detail || 'API request failed');
        }
        return await resp.json();
    },

    async post(endpoint, data = {}) {
        const resp = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ detail: resp.statusText }));
            throw new Error(err.detail || 'API request failed');
        }
        return await resp.json();
    },

    async put(endpoint, data = {}) {
        const resp = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ detail: resp.statusText }));
            throw new Error(err.detail || 'API request failed');
        }
        return await resp.json();
    },

    // Specific endpoints
    getKPISummary() { return this.get('/metrics/summary'); },
    getServers() { return this.get('/servers'); },
    updateMaintenance(serverId, isEnabled, weight = 1.0) {
        return this.put(`/servers/${serverId}/maintenance`, { is_enabled: isEnabled, weight });
    },
    simulateCondition(serverId, action, delayMs = 300) {
        return this.post(`/servers/${serverId}/simulate`, { action, delay_ms: delayMs });
    },
    getAlgorithm() { return this.get('/algorithm'); },
    setAlgorithm(algo, wConn, wLat, wLoad) {
        return this.post('/algorithm', {
            algorithm: algo,
            weight_connections: wConn,
            weight_latency: wLat,
            weight_load: wLoad
        });
    },
    setHealthPolicy(interval, timeout, failThresh, recThresh) {
        return this.post('/algorithm/health-policy', {
            interval_seconds: interval,
            timeout_seconds: timeout,
            failure_threshold: failThresh,
            recovery_threshold: recThresh
        });
    },
    startLoadTest(testData) { return this.post('/tests', testData); },
    getTestStatus(testId) { return this.get(`/tests/${testId}`); },
    stopLoadTest(testId) { return this.post(`/tests/${testId}/stop`); },
    getExperiments() { return this.get('/experiments'); },
    getOperationalReport() { return this.get('/reports/summary'); },
    getUsers() { return this.get('/users'); },
    createUser(userData) { return this.post('/users', userData); },
    getRequestLogs(limit = 20) { return this.get(`/logs/requests?limit=${limit}`); },
    getHealthLogs(limit = 20) { return this.get(`/logs/health-checks?limit=${limit}`); },
    getAuditLogs(limit = 20) { return this.get(`/logs/audit?limit=${limit}`); },
    sendTestProxyRequest() { return this.get('/proxy/api/process'); }
};
