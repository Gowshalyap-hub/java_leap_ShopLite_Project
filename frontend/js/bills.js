// ================================================================
// js/bills.js — Bills history + invoice detail modal
// ================================================================

import { apiGetBills, apiGetBill } from "./api.js";
import { escapeHtml, formatCurrency, formatDate, formatDateTime, showToast } from "./app.js";
import { friendlyError, setLoading } from "./auth.js";

const ICONS = {
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>',
  receipt: '<svg viewBox="0 0 24 24"><path d="M4 2h16v20l-3-2-3 2-3-2-3 2-3-2V2z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>',
  cart: '<svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.6 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>',
  empty: '<svg viewBox="0 0 24 24"><path d="M4 2h16v20l-3-2-3 2-3-2-3 2-3-2V2z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>',
  print: '<svg viewBox="0 0 24 24"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
};

export async function renderBills(container) {
  container.innerHTML = `
    <div id="bills-inner">
      <div class="page-toolbar">
        <div class="page-toolbar-left">
          <div class="search-box">
            ${ICONS.search}
            <input type="text" id="bills-search" placeholder="Search by bill ID…" />
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="loading-overlay" id="bills-loading"><div class="spinner"></div><p>Loading bills…</p></div>
        <div id="bills-table-area"></div>
      </div>
    </div>
  `;

  document.getElementById("bills-search").addEventListener("input", (e) => {
    renderBillsTable(billsCache, e.target.value.trim().toLowerCase());
  });

  await loadBills();
}

let billsCache = [];

async function loadBills() {
  const loadingEl = document.getElementById("bills-loading");
  const tableArea = document.getElementById("bills-table-area");

  try {
    billsCache = normalizeList(await apiGetBills());
    // Sort by date desc
    billsCache.sort((a, b) => {
      const da = new Date(a.date || a.createdAt || a.billDate || 0);
      const db = new Date(b.date || b.createdAt || b.billDate || 0);
      return db - da;
    });
    loadingEl.style.display = "none";
    renderBillsTable(billsCache, "");
  } catch (err) {
    loadingEl.style.display = "none";
    tableArea.innerHTML = `<div class="empty-state">${ICONS.empty}<h3>Couldn't load bills</h3><p>${escapeHtml(friendlyError(err.message))}</p></div>`;
  }
}

function renderBillsTable(bills, query) {
  const tableArea = document.getElementById("bills-table-area");
  if (!tableArea) return;

  const filtered = query ? bills.filter((b) => String(b.id).includes(query)) : bills;

  if (filtered.length === 0) {
    tableArea.innerHTML = `<div class="empty-state">${ICONS.receipt}<h3>No bills found</h3><p>${query ? "Try a different search." : "Create bills from the Billing page."}</p></div>`;
    return;
  }

  tableArea.innerHTML = `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr><th>Bill ID</th><th>Date</th><th>Total Amount</th><th>Status</th><th>Details</th></tr>
        </thead>
        <tbody>
          ${filtered.map((b) => {
            const total = b.totalAmount ?? b.total ?? 0;
            const date = b.date || b.createdAt || b.billDate;
            return `
              <tr>
                <td class="t-strong">#${b.id ?? "—"}</td>
                <td>${formatDate(date)}</td>
                <td class="t-price">${formatCurrency(total)}</td>
                <td>${billStatusBadge(b.finalized)}</td>
                <td>
                  <button class="icon-btn view" data-id="${b.id}" title="View Details">${ICONS.eye}</button>
                </td>
              </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;

  tableArea.querySelectorAll(".icon-btn.view").forEach((btn) => {
    btn.addEventListener("click", () => openBillDetail(parseInt(btn.dataset.id, 10)));
  });
}

function billStatusBadge(finalized) {
  if (finalized === true || finalized === "true" || finalized === "FINALIZED") {
    return '<span class="badge badge-success">Finalized</span>';
  }
  return '<span class="badge badge-info">Draft</span>';
}

// ---------- Invoice Detail Modal ----------
async function openBillDetail(billId) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal modal-lg">
      <div class="modal-header">
        <span class="modal-title">Bill Details</span>
        <button class="modal-close">${ICONS.close}</button>
      </div>
      <div class="modal-body">
        <div class="loading-overlay" style="padding:var(--space-8)"><div class="spinner"></div><p>Loading bill…</p></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector(".modal-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  const body = overlay.querySelector(".modal-body");

  try {
    const bill = await apiGetBill(billId);
    renderInvoice(body, bill);
  } catch (err) {
    body.innerHTML = `<div class="empty-state">${ICONS.receipt}<h3>Couldn't load bill</h3><p>${escapeHtml(friendlyError(err.message))}</p></div>`;
  }
}

function renderInvoice(container, bill) {
  const items = bill.items || bill.billItems || bill.products || [];
  const total = bill.totalAmount ?? bill.total ?? 0;
  const date = bill.date || bill.createdAt || bill.billDate;
  const isFinalized = bill.finalized === true || bill.finalized === "true" || bill.finalized === "FINALIZED";

  let itemsHTML = "";
  if (items.length === 0) {
    itemsHTML = `<p style="color:var(--text-muted);text-align:center;padding:var(--space-4)">No items found in this bill.</p>`;
  } else {
    itemsHTML = `
      <table class="invoice-table">
        <thead>
          <tr><th>Product</th><th class="right">Qty</th><th class="right">Price</th><th class="right">Subtotal</th></tr>
        </thead>
        <tbody>
          ${items.map((item) => {
            const product = item.product || {};
            const name = product.name || item.productName || `Product #${product.id || "?"}`;
            const qty = item.quantity ?? 0;
            const price = item.price ?? product.price ?? 0;
            const subtotal = item.subtotal ?? item.subTotal ?? price * qty;
            return `
              <tr>
                <td class="t-strong">${escapeHtml(name)}</td>
                <td class="right">${qty}</td>
                <td class="right">${formatCurrency(price)}</td>
                <td class="right t-strong">${formatCurrency(subtotal)}</td>
              </tr>`;
          }).join("")}
        </tbody>
      </table>
    `;
  }

  container.innerHTML = `
    <div class="invoice">
      <div class="invoice-header">
        <div class="invoice-brand">
          <div class="brand-logo-icon">${ICONS.cart}</div>
          <div>
            <h3>ShopLite</h3>
            <div style="font-size:0.8rem;color:var(--text-muted)">Invoice Receipt</div>
          </div>
        </div>
        <div class="invoice-meta">
          <div class="bill-id">#${bill.id ?? "—"}</div>
          <div class="bill-date">${formatDateTime(date)}</div>
        </div>
      </div>

      ${itemsHTML}

      <div class="invoice-total">
        <div class="invoice-total-box">
          <div class="invoice-total-row grand">
            <span>Total</span>
            <span>${formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      <div class="invoice-status-bar">
        ${ICONS.check}
        <span>${isFinalized ? "Bill Finalized" : "Draft — Not Finalized"}</span>
      </div>
    </div>
  `;
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.bills)) return data.bills;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}
