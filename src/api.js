// API client for frontend
// Uses same origin in production, proxied in dev
const API_BASE = '';

async function handleResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (!response.ok) {
    let errorMsg = `${response.status} ${response.statusText}`;
    if (contentType.includes('application/json') && text) {
      try {
        const error = JSON.parse(text);
        errorMsg = error.error || errorMsg;
      } catch (e) { /* ignore parse errors */ }
    }
    throw new Error(errorMsg);
  }

  // Guard against non-JSON responses (e.g. HTML fallback when server is down)
  if (!contentType.includes('application/json')) {
    throw new Error('サーバーからJSON以外のレスポンスが返りました。サーバーが正常に起動しているか確認してください。');
  }

  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`JSONパースエラー: ${text.substring(0, 100)}`);
  }
}

async function fetchWithRetry(url, options = {}, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, options);
      return await handleResponse(response);
    } catch (err) {
      if (i === retries) throw err;
      // Wait briefly before retrying
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
}

export const api = {
  async getStore() {
    return fetchWithRetry(`${API_BASE}/api/store`);
  },

  async getFixtures() {
    return fetchWithRetry(`${API_BASE}/api/fixtures`);
  },

  async getFixture(id) {
    return fetchWithRetry(`${API_BASE}/api/fixtures/${id}`);
  },

  async saveProducts(fixtureId, products) {
    return fetchWithRetry(`${API_BASE}/api/fixtures/${fixtureId}/products`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(products)
    }, 1);
  },

  async importCSV(file, type) {
    const formData = new FormData();
    formData.append('file', file);
    return fetchWithRetry(`${API_BASE}/api/import/csv?type=${encodeURIComponent(type)}`, {
      method: 'POST',
      body: formData
    }, 0);
  },

  async getEditLog(fixtureId) {
    return fetchWithRetry(`${API_BASE}/api/fixtures/${fixtureId}/edit-log`);
  },

  async logEdit(fixtureId, userName, action, details) {
    return fetchWithRetry(`${API_BASE}/api/fixtures/${fixtureId}/edit-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName, action, details })
    }, 0);
  }
};
