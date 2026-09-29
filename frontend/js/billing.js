// ================================================================
// js/billing.js — POS-style billing interface
// ================================================================

import { apiGetProducts, apiCreateBill } from "./api.js";
import { escapeHtml, formatCurrency, showToast } from "./app.js";
import { friendlyError, setLoading } from "./auth.js";

const ICONS = {
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  cart: '<svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.6 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>',
  box: '<svg viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>',
  empty: '<svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.6 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>',
};

let allProducts = [];
let cart = []; // { productId, name, price, stock, quantity }

export async function renderBilling(container) {
  container.innerHTML = `
    <div id="billing-inner">
      <div class="loading-overlay"><div class="spinner"></div><p>Loading products…</p></div>
    </div>
  `;
  const inner = document.getElementById("billing-inner");

  try {
    allProducts = normalizeList(await apiGetProducts());
    cart = []; // reset cart on page load

    inner.innerHTML = `
      <div class="billing-layout">
        <!-- LEFT: Product selection -->
        <div>
          <div class="panel" style="margin-bottom:var(--space-5)">
            <div class="panel-header" style="border-bottom:1px solid var(--slate-200)">
              <div class="search-box" style="max-width:none;flex:1">
                ${ICONS.search}
                <input type="text" id="billing-search" placeholder="Search products to add…" />
              </div>
            </div>
            <div id="billing-product-grid" style="padding:var(--space-5)"></div>
          </div>
        </div>

        <!-- RIGHT: Cart -->
        <div class="bill-cart">
          <div class="cart-header">
            <h3>Current Bill</h3>
            <span class="badge badge-info" id="cart-count-badge">0 items</span>
          </div>
          <div class="cart-items" id="cart-items"></div>
          <div class="cart-footer" id="cart-footer"></div>
        </div>
      </div>
    `;

    renderProductGrid("");
    renderCart();

    document.getElementById("billing-search").addEventListener("input", (e) => {
      renderProductGrid(e.target.value.trim().toLowerCase());
    });
  } catch (err) {
    inner.innerHTML = `<div class="empty-state">${ICONS.box}<h3>Couldn't load products</h3><p>${escapeHtml(friendlyError(err.message))}</p></div>`;
  }
}

function renderProductGrid(query) {
  const grid = document.getElementById("billing-product-grid");
  if (!grid) return;

  const filtered = query
    ? allProducts.filter((p) => (p.name || "").toLowerCase().includes(query))
    : allProducts;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="padding:var(--space-8)">${ICONS.box}<h3>No products found</h3><p>${query ? "Try a different search." : "Add products first."}</p></div>`;
    return;
  }

  grid.innerHTML = `<div class="product-grid">${filtered.map((p) => productCardHTML(p)).join("")}</div>`;

  grid.querySelectorAll(".add-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id, 10);
      const product = allProducts.find((p) => p.id === id);
      if (product) addToCart(product);
    });
  });
}

function productCardHTML(p) {
  const stock = p.stock ?? p.stockQuantity ?? 0;
  const price = p.price ?? p.unitPrice ?? 0;
  const initials = (p.name || "?").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  const inCart = cart.find((c) => c.productId === p.id);
  const available = stock - (inCart?.quantity || 0);

  return `
    <div class="product-card">
      <div class="product-card-top">
        <div class="product-initials">${initials}</div>
        ${stock <= 0 ? '<span class="badge badge-warning">Out</span>' : ''}
      </div>
      <div class="pc-name">${escapeHtml(p.name)}</div>
      <div class="pc-price">${formatCurrency(price)}</div>
      <div class="pc-stock">${ICONS.box} ${stock} in stock</div>
      <button class="add-btn" data-id="${p.id}" ${available <= 0 ? "disabled" : ""}>
        ${ICONS.plus}<span>${available <= 0 ? "Out of stock" : "Add to bill"}</span>
      </button>
    </div>`;
}

// ---------- Cart Logic ----------
function addToCart(product) {
  const stock = product.stock ?? product.stockQuantity ?? 0;
  const price = product.price ?? product.unitPrice ?? 0;
  const existing = cart.find((c) => c.productId === product.id);

  if (existing) {
    if (existing.quantity >= stock) {
      showToast("error", "Stock limit reached", `Only ${stock} units of ${product.name} available.`);
      return;
    }
    existing.quantity++;
  } else {
    if (stock <= 0) {
      showToast("error", "Out of stock", `${product.name} is not available.`);
      return;
    }
    cart.push({ productId: product.id, name: product.name, price, stock, quantity: 1 });
  }

  renderCart();
  renderProductGrid(document.getElementById("billing-search")?.value?.trim().toLowerCase() || "");
}

function changeQty(productId, delta) {
  const item = cart.find((c) => c.productId === productId);
  if (!item) return;

  const newQty = item.quantity + delta;
  if (newQty <= 0) {
    cart = cart.filter((c) => c.productId !== productId);
  } else if (newQty > item.stock) {
    showToast("error", "Stock limit reached", `Only ${item.stock} units available.`);
    return;
  } else {
    item.quantity = newQty;
  }

  renderCart();
  renderProductGrid(document.getElementById("billing-search")?.value?.trim().toLowerCase() || "");
}

function removeFromCart(productId) {
  cart = cart.filter((c) => c.productId !== productId);
  renderCart();
  renderProductGrid(document.getElementById("billing-search")?.value?.trim().toLowerCase() || "");
}

function renderCart() {
  const itemsEl = document.getElementById("cart-items");
  const footerEl = document.getElementById("cart-footer");
  const badge = document.getElementById("cart-count-badge");
  if (!itemsEl || !footerEl) return;

  const totalQty = cart.reduce((s, c) => s + c.quantity, 0);
  badge.textContent = `${totalQty} item${totalQty !== 1 ? "s" : ""}`;

  if (cart.length === 0) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        ${ICONS.empty}
        <p>No items in the bill yet.<br>Add products from the left.</p>
      </div>`;
    footerEl.innerHTML = "";
    return;
  }

  itemsEl.innerHTML = cart.map((item) => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${escapeHtml(item.name)}</div>
        <div class="cart-item-price">${formatCurrency(item.price)} each</div>
      </div>
      <div class="qty-control">
        <button class="qty-btn" data-action="dec" data-id="${item.productId}">${ICONS.minus}</button>
        <span class="qty-val">${item.quantity}</span>
        <button class="qty-btn" data-action="inc" data-id="${item.productId}">${ICONS.plus}</button>
      </div>
      <div class="cart-item-subtotal">${formatCurrency(item.price * item.quantity)}</div>
      <button class="cart-item-remove" data-id="${item.productId}">${ICONS.trash}</button>
    </div>
  `).join("");

  // Bind qty controls
  itemsEl.querySelectorAll(".qty-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id, 10);
      const delta = btn.dataset.action === "inc" ? 1 : -1;
      changeQty(id, delta);
    });
  });
  itemsEl.querySelectorAll(".cart-item-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeFromCart(parseInt(btn.dataset.id, 10));
    });
  });

  const subtotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  footerEl.innerHTML = `
    <div class="cart-item-count">${cart.length} product${cart.length !== 1 ? "s" : ""} · ${totalQty} unit${totalQty !== 1 ? "s" : ""}</div>
    <div class="cart-total-row">
      <span class="cart-total-label">Total Amount</span>
      <span class="cart-total-value">${formatCurrency(subtotal)}</span>
    </div>
    <button class="btn btn-primary btn-block btn-lg" id="finalize-btn">
      ${ICONS.check}<span>Finalize Bill</span>
    </button>
  `;

  document.getElementById("finalize-btn").addEventListener("click", finalizeBill);
}

async function finalizeBill() {
  const btn = document.getElementById("finalize-btn");
  if (cart.length === 0) return;

  setLoading(btn, true, "Processing…");
  try {
    await apiCreateBill(cart, true);
    showToast("success", "Bill finalized", "The bill has been created successfully.");
    cart = [];
    // Reload products to reflect stock changes
    allProducts = normalizeList(await apiGetProducts());
    renderCart();
    renderProductGrid("");
  } catch (err) {
    showToast("error", "Billing failed", friendlyError(err.message));
    setLoading(btn, false, "Finalize Bill");
  }
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.products)) return data.products;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}
