// API integration layer — all endpoint calls live here.
// Change BASE_URL to point at your backend server.
const API_BASE_URL = "http://localhost:8080";

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const config = {
    headers: { "Content-Type": "application/json" },
    ...options,
  };
  if (config.body && typeof config.body !== "string") {
    config.body = JSON.stringify(config.body);
  }
  const res = await fetch(url, config);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const err = await res.json();
      detail = err.message || err.error || JSON.stringify(err);
    } catch (_) {
      /* non-JSON error body */
    }
    throw new Error(`API ${res.status}: ${detail}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  // ---- Products ----
  getProducts: () => request("/api/products"),

  getProduct: (id) => request(`/api/products/${id}`),

  createProduct: (data) =>
    request("/api/products", { method: "POST", body: data }),

  updateProduct: (id, data) =>
    request(`/api/products/${id}`, { method: "PUT", body: data }),

  deleteProduct: (id) =>
    request(`/api/products/${id}`, { method: "DELETE" }),

  getLowStock: () => request("/api/products/low-stock"),

  // ---- Bills ----
  getBills: () => request("/api/bills"),

  getBill: (id) => request(`/api/bills/${id}`),

  createBill: (data) =>
    request("/api/bills", { method: "POST", body: data }),

  getSales: (date) => request(`/api/bills/sales?date=${date}`),
};
