// API client for frontend
// Uses same origin in production, proxied in dev
const API_BASE = '';

async function handleResponse(response) {
  const text = await response.text();
  if (!response.ok) {
    let errorMsg = response.statusText;
    try {
      const error = JSON.parse(text);
      errorMsg = error.error || errorMsg;
    } catch (e) {
      // Response body was not JSON
      errorMsg = text || errorMsg;
    }
    throw new Error(errorMsg);
  }
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
  }
}

export const api = {
  async getStore() {
    const response = await fetch(`${API_BASE}/api/store`);
    return handleResponse(response);
  },

  async getFixtures() {
    const response = await fetch(`${API_BASE}/api/fixtures`);
    return handleResponse(response);
  },

  async getFixture(id) {
    const response = await fetch(`${API_BASE}/api/fixtures/${id}`);
    return handleResponse(response);
  },

  async saveProducts(fixtureId, products) {
    const response = await fetch(`${API_BASE}/api/fixtures/${fixtureId}/products`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(products)
    });
    return handleResponse(response);
  },

  async importCSV(file, type) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/api/import/csv?type=${encodeURIComponent(type)}`, {
      method: 'POST',
      body: formData
    });
    return handleResponse(response);
  },

  async getEditLog(fixtureId) {
    const response = await fetch(`${API_BASE}/api/fixtures/${fixtureId}/edit-log`);
    return handleResponse(response);
  },

  async logEdit(fixtureId, userName, action, details) {
    const response = await fetch(`${API_BASE}/api/fixtures/${fixtureId}/edit-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userName, action, details })
    });
    return handleResponse(response);
  }
};
