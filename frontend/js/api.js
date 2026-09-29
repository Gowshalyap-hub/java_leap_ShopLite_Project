// ================================================================
// js/api.js — All API communication for ShopLite
// No fetch() calls should exist outside this file.
// ================================================================

const API_BASE_URL = "http://localhost:8080";

// ---------- Internal helpers ----------

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  let token = null;
  try {
    const stored = localStorage.getItem("shoplite_token");
    if (stored) token = JSON.parse(stored);
  } catch {
    /* ignore */
  }

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw new Error("Network error — cannot reach the server. Please check your connection.");
  }

  // Try to parse JSON regardless of status
  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    const message =
      (data && (data.message || data.error || data.errors)) ||
      `Request failed with status ${res.status}`;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }

  return data;
}

// ---------- Auth ----------

export async function apiRegister(name, email, password) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function apiLogin(email, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// ---------- Products ----------

export async function apiGetProducts() {
  return request("/api/products");
}

export async function apiGetProduct(id) {
  return request(`/api/products/${id}`);
}

export async function apiCreateProduct(product) {
  return request("/api/products", {
    method: "POST",
    body: JSON.stringify(product),
  });
}

export async function apiUpdateProduct(id, product) {
  return request(`/api/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(product),
  });
}

export async function apiDeleteProduct(id) {
  return request(`/api/products/${id}`, {
    method: "DELETE",
  });
}

export async function apiGetLowStockProducts() {
  return request("/api/products/low-stock");
}

// ---------- Bills ----------

export async function apiGetBills() {
  return request("/api/bills");
}

export async function apiGetBill(id) {
  return request(`/api/bills/${id}`);
}

export async function apiCreateBill(items, finalized = true) {
  const body = {
    finalized,
    items: items.map((item) => ({
      product: { id: item.productId },
      quantity: item.quantity,
    })),
  };
  return request("/api/bills", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiGetDailySales(date) {
  // date = YYYY-MM-DD
  return request(`/api/bills/sales?date=${encodeURIComponent(date)}`);
}
