// ================================================================
// js/products.js — Products page + Low Stock page
// ================================================================

import {
  apiGetProducts,
  apiGetLowStockProducts,
  apiCreateProduct,
  apiUpdateProduct,
  apiDeleteProduct,
} from "./api.js";
import { escapeHtml, formatCurrency, showToast } from "./app.js";
import { friendlyError, setLoading } from "./auth.js";

const ICONS = {
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  box: '<svg viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
  alert: '<svg viewBox="0 0 24 24"><path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  empty: '<svg viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
};

let productCache = [];

// =================== PRODUCTS PAGE ===================
export async function renderProducts(container) {
  container.innerHTML = `
    <div id="products-inner">
      <div class="page-toolbar">
        <div class="page-toolbar-left">
          <div class="search-box">
            ${ICONS.search}
            <input type="text" id="product-search" placeholder="Search products…" />
          </div>
        </div>
        <button class="btn btn-primary" id="add-product-btn">${ICONS.plus}<span>Add Product</span></button>
      </div>
      <div class="panel">
        <div class="loading-overlay" id="products-loading"><div class="spinner"></div><p>Loading products…</p></div>
        <div id="products-table-area"></div>
      </div>
    </div>
  `;

  document.getElementById("add-product-btn").addEventListener("click", () => openProductModal());
  document.getElementById("product-search").addEventListener("input", (e) => {
    renderProductTable(productCache, e.target.value.trim().toLowerCase());
  });

  await loadProducts(container);
}

async function loadProducts(container) {
  const loadingEl = document.getElementById("products-loading");
  const tableArea = document.getElementById("products-table-area");

  try {
    const data = await apiGetProducts();
    productCache = normalizeList(data);
    loadingEl.style.display = "none";
    renderProductTable(productCache, "");
  } catch (err) {
    loadingEl.style.display = "none";
    tableArea.innerHTML = `<div class="empty-state">${ICONS.empty}<h3>Couldn't load products</h3><p>${escapeHtml(friendlyError(err.message))}</p></div>`;
  }
}

function renderProductTable(products, query) {
  const tableArea = document.getElementById("products-table-area");
  if (!tableArea) return;

  const filtered = query
    ? products.filter((p) =>
        (p.name || "").toLowerCase().includes(query) ||
        String(p.id || "").includes(query)
      )
    : products;

  if (filtered.length === 0) {
    tableArea.innerHTML = `<div class="empty-state">${ICONS.box}<h3>No products found</h3><p>${query ? "Try a different search." : "Add your first product to get started."}</p></div>`;
    return;
  }

  tableArea.innerHTML = `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr><th>ID</th><th>Product Name</th><th>Price</th><th>Stock</th><th>Reorder Level</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${filtered.map((p) => productRow(p)).join("")}
        </tbody>
      </table>
    </div>
  `;

  // Bind actions
  tableArea.querySelectorAll(".icon-btn.edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id, 10);
      const product = productCache.find((p) => p.id === id);
      if (product) openProductModal(product);
    });
  });
  tableArea.querySelectorAll(".icon-btn.delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id, 10);
      const product = productCache.find((p) => p.id === id);
      if (product) confirmDelete(product);
    });
  });
}

function productRow(p) {
  const stock = p.stockQuantity;
  const reorder = p.reorderThreshold;
  const isLow = stock <= reorder;
  const price = p.price;

  return `
    <tr>
      <td class="t-strong">#${p.id ?? "—"}</td>
      <td class="t-strong">${escapeHtml(p.name)}</td>
      <td class="t-price">${formatCurrency(price)}</td>
      <td>${stock}</td>
      <td>${reorder}</td>
      <td>${isLow
        ? '<span class="badge badge-warning">Low Stock</span>'
        : '<span class="badge badge-success">In Stock</span>'}
      </td>
      <td>
        <div class="action-btns">
          <button class="icon-btn edit" data-id="${p.id}" title="Edit">${ICONS.edit}</button>
          <button class="icon-btn delete" data-id="${p.id}" title="Delete">${ICONS.trash}</button>
        </div>
      </td>
    </tr>`;
}

// ---------- Add / Edit Modal ----------
function openProductModal(product = null) {
  const isEdit = !!product;
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">${isEdit ? "Edit Product" : "Add Product"}</span>
        <button class="modal-close">${ICONS.close}</button>
      </div>
      <div class="modal-body">
        <form id="product-form" novalidate>
          <div class="form-group">
            <label for="p-name">Product Name</label>
            <input type="text" id="p-name" class="form-input" placeholder="e.g. Nescafe Coffee 100g" value="${escapeHtml(product?.name || "")}" required />
            <div class="form-error" id="p-name-err"></div>
          </div>
          <div class="form-group">
            <label for="p-price">Price (₹)</label>
            <input type="number" id="p-price" class="form-input" placeholder="0.00" step="0.01" min="0" value="${product?.price ?? product?.unitPrice ?? ""}" required />
            <div class="form-error" id="p-price-err"></div>
          </div>
          <div class="form-group">
            <label for="p-stock">Stock Quantity</label>
            <input type="number" id="p-stock" class="form-input" placeholder="0" min="0" value="${product ? product.stockQuantity : ""}" required />
            <div class="form-error" id="p-stock-err"></div>
          </div>
          <div class="form-group">
            <label for="p-reorder">Reorder Threshold</label>
            <input type="number" id="p-reorder" class="form-input" placeholder="0" min="0" value="${product?.reorderThreshold ?? product?.reorderLevel ?? ""}" required />
            <div class="form-error" id="p-reorder-err"></div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="modal-save">${isEdit ? "Save Changes" : "Add Product"}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector(".modal-close").addEventListener("click", close);
  overlay.querySelector("#modal-cancel").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  const saveBtn = overlay.querySelector("#modal-save");
  saveBtn.addEventListener("click", async () => {
    if (!validateProductForm(overlay)) return;

    const payload = {
      name: overlay.querySelector("#p-name").value.trim(),
      price: parseFloat(overlay.querySelector("#p-price").value),
      stockQuantity: parseInt(overlay.querySelector("#p-stock").value, 10),
      reorderThreshold: parseInt(overlay.querySelector("#p-reorder").value, 10),
    };

    setLoading(saveBtn, true, "Saving…");
    try {
      if (isEdit) {
        await apiUpdateProduct(product.id, payload);
        showToast("success", "Product updated", `${payload.name} has been updated.`);
      } else {
        await apiCreateProduct(payload);
        showToast("success", "Product added", `${payload.name} has been added to inventory.`);
      }
      close();
      // Reload
      const container = document.getElementById("page-content");
      await loadProducts(container);
    } catch (err) {
      showToast("error", "Save failed", friendlyError(err.message));
    } finally {
      setLoading(saveBtn, false, isEdit ? "Save Changes" : "Add Product");
    }
  });
}

function validateProductForm(overlay) {
  let valid = true;
  const clear = (id) => overlay.querySelector(id).textContent = "";
  const set = (id, msg) => { overlay.querySelector(id).textContent = msg; valid = false; };

  clear("#p-name-err"); clear("#p-price-err"); clear("#p-stock-err"); clear("#p-reorder-err");

  const name = overlay.querySelector("#p-name").value.trim();
  const price = overlay.querySelector("#p-price").value;
  const stock = overlay.querySelector("#p-stock").value;
  const reorder = overlay.querySelector("#p-reorder").value;

  if (!name) set("#p-name-err", "Product name is required.");
  if (price === "" || parseFloat(price) < 0) set("#p-price-err", "Enter a valid price.");
  if (stock === "" || parseInt(stock, 10) < 0) set("#p-stock-err", "Enter a valid stock quantity.");
  if (reorder === "" || parseInt(reorder, 10) < 0) set("#p-reorder-err", "Enter a valid reorder level.");

  return valid;
}

// ---------- Delete Confirmation ----------
function confirmDelete(product) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal" style="max-width:400px">
      <div class="modal-header">
        <span class="modal-title">Delete Product</span>
        <button class="modal-close">${ICONS.close}</button>
      </div>
      <div class="modal-body">
        <p style="color:var(--text-default)">Are you sure you want to delete <strong style="color:var(--text-strong)">${escapeHtml(product.name)}</strong>? This cannot be undone.</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="del-cancel">Cancel</button>
        <button class="btn btn-danger" id="del-confirm">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector(".modal-close").addEventListener("click", close);
  overlay.querySelector("#del-cancel").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  overlay.querySelector("#del-confirm").addEventListener("click", async () => {
    const btn = overlay.querySelector("#del-confirm");
    setLoading(btn, true, "Deleting…");
    try {
      await apiDeleteProduct(product.id);
      showToast("success", "Product deleted", `${product.name} has been removed.`);
      close();
      const container = document.getElementById("page-content");
      await loadProducts(container);
    } catch (err) {
      showToast("error", "Delete failed", friendlyError(err.message));
      setLoading(btn, false, "Delete");
    }
  });
}

// =================== LOW STOCK PAGE ===================
export async function renderLowStock(container) {
  container.innerHTML = `
    <div id="lowstock-inner">
      <div class="lowstock-banner">
        ${ICONS.alert}
        <div>
          <h3>Low Stock Products</h3>
          <p>Items at or below their reorder threshold need restocking soon.</p>
        </div>
      </div>
      <div class="panel">
        <div class="loading-overlay" id="ls-loading"><div class="spinner"></div><p>Loading low stock items…</p></div>
        <div id="ls-table-area"></div>
      </div>
    </div>
  `;
  const loadingEl = document.getElementById("ls-loading");
  const tableArea = document.getElementById("ls-table-area");

  try {
    const data = await apiGetLowStockProducts();
    const items = normalizeList(data);
    loadingEl.style.display = "none";

    if (items.length === 0) {
      tableArea.innerHTML = `<div class="empty-state">${ICONS.box}<h3>All stocked up!</h3><p>No products are below their reorder level.</p></div>`;
      return;
    }

    tableArea.innerHTML = `
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>ID</th><th>Product</th><th>Current Stock</th><th>Reorder Threshold</th><th>Status</th></tr></thead>
          <tbody>
            ${items.map((p) => {
              const stock = p.stockQuantity;
              const reorder = p.reorderThreshold;
              const isOut = stock === 0;
              return `
                <tr>
                  <td class="t-strong">#${p.id ?? "—"}</td>
                  <td class="t-strong">${escapeHtml(p.name)}</td>
                  <td>${stock}</td>
                  <td>${reorder}</td>
                  <td>${isOut
                    ? '<span class="badge badge-warning">Out of Stock</span>'
                    : '<span class="badge badge-warning">Low Stock</span>'}
                  </td>
                </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    loadingEl.style.display = "none";
    tableArea.innerHTML = `<div class="empty-state">${ICONS.alert}<h3>Couldn't load low stock data</h3><p>${escapeHtml(friendlyError(err.message))}</p></div>`;
  }
}

// ---------- Helpers ----------
function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.products)) return data.products;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}
