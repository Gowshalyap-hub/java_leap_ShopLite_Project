// ================================================================
// js/dashboard.js — Dashboard page
// ================================================================

import { apiGetProducts, apiGetLowStockProducts, apiGetBills, apiGetDailySales } from "./api.js";
import { escapeHtml, formatCurrency, formatDate, formatDateTime, showToast } from "./app.js";
import { friendlyError } from "./auth.js";

const ICONS = {
  box: '<svg viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
  alert: '<svg viewBox="0 0 24 24"><path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  receipt: '<svg viewBox="0 0 24 24"><path d="M4 2h16v20l-3-2-3 2-3-2-3 2-3-2V2z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>',
  trend: '<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  cart: '<svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.6 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  empty: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M8 14h2M8 18h6"/></svg>',
};

export async function renderDashboard(container) {
  let user = { name: "User" };
  try { user = JSON.parse(localStorage.getItem("shoplite_user")) || user; } catch { /* ignore */ }

  container.innerHTML = `
    <div id="dashboard-inner">
      <div class="loading-overlay"><div class="spinner"></div><p>Loading dashboard…</p></div>
    </div>
  `;
  const inner = document.getElementById("dashboard-inner");

  try {
    const today = new Date().toISOString().slice(0, 10);
    const [products, lowStock, bills, salesData] = await Promise.allSettled([
      apiGetProducts(),
      apiGetLowStockProducts(),
      apiGetBills(),
      apiGetDailySales(today),
    ]);

    const productList = products.status === "fulfilled" ? normalizeList(products.value) : [];
    const lowStockList = lowStock.status === "fulfilled" ? normalizeList(lowStock.value) : [];
    const billsList = bills.status === "fulfilled" ? normalizeList(bills.value) : [];
    const todaySales = salesData.status === "fulfilled" ? salesData.value : null;

    const totalProducts = productList.length;
    const lowStockCount = lowStockList.length;
    const totalBills = billsList.length;
    const todaySalesAmount = extractSalesAmount(todaySales);

    const recentBills = [...billsList].sort((a, b) => {
      const da = new Date(a.date || a.createdAt || a.billDate || 0);
      const db = new Date(b.date || b.createdAt || b.billDate || 0);
      return db - da;
    }).slice(0, 5);

    inner.innerHTML = `
      <div style="margin-bottom:var(--space-6)">
        <h2 style="font-size:1.5rem">Welcome back, ${escapeHtml(user.name)} 👋</h2>
        <p style="color:var(--text-muted);margin-top:4px">Here's what's happening in your shop today.</p>
      </div>

      <div class="stat-grid">
        ${statCard("blue", ICONS.box, "Total Products", totalProducts)}
        ${statCard("amber", ICONS.alert, "Low Stock Items", lowStockCount)}
        ${statCard("violet", ICONS.receipt, "Total Bills", totalBills)}
        ${statCard("green", ICONS.trend, "Today's Sales", formatCurrency(todaySalesAmount))}
      </div>

      <div class="dashboard-grid">
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Recent Bills</span>
            <button class="btn btn-secondary btn-sm" data-nav="bills">View All</button>
          </div>
          <div class="table-wrapper">
            ${recentBills.length === 0
              ? emptyState("No bills yet", "Create your first bill from the Billing page.", ICONS.receipt)
              : `<table class="data-table">
                <thead><tr><th>Bill ID</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  ${recentBills.map((b) => `
                    <tr>
                      <td class="t-strong">#${b.id ?? "—"}</td>
                      <td>${formatDate(b.date || b.createdAt || b.billDate)}</td>
                      <td class="t-price">${formatCurrency(b.totalAmount ?? b.total ?? 0)}</td>
                      <td>${billStatusBadge(b.finalized)}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>`
            }
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Low Stock Alert</span>
            <button class="btn btn-secondary btn-sm" data-nav="lowstock">Details</button>
          </div>
          <div class="panel-body" style="padding-top:var(--space-3)">
            ${lowStockList.length === 0
              ? `<div style="text-align:center;padding:var(--space-6);color:var(--text-muted)">
                  <div style="font-size:0.9rem">All products are well stocked.</div>
                </div>`
              : lowStockList.slice(0, 5).map((p) => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--slate-100)">
                  <div>
                    <div style="font-weight:600;color:var(--text-strong);font-size:0.875rem">${escapeHtml(p.name)}</div>
                    <div style="font-size:0.78rem;color:var(--text-muted)">Stock: ${p.stock ?? p.stockQuantity ?? 0} / Reorder: ${p.reorderThreshold ?? p.reorderLevel ?? 0}</div>
                  </div>
                  <span class="badge badge-warning">Low</span>
                </div>
              `).join("")
            }
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Quick Actions</span>
        </div>
        <div class="panel-body">
          <div class="quick-actions">
            ${quickAction("qa-blue", ICONS.plus, "Add Product", "New inventory item", "products")}
            ${quickAction("qa-green", ICONS.cart, "Create Bill", "New POS transaction", "billing")}
            ${quickAction("qa-amber", ICONS.eye, "View Bills", "Billing history", "bills")}
          </div>
        </div>
      </div>
    `;

    // Bind quick action and nav buttons
    inner.querySelectorAll("[data-nav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        window.dispatchEvent(new CustomEvent("shoplite:navigate", { detail: btn.dataset.nav }));
      });
    });
  } catch (err) {
    inner.innerHTML = `<div class="empty-state">${ICONS.empty}<h3>Couldn't load dashboard</h3><p>${escapeHtml(friendlyError(err.message))}</p></div>`;
  }
}

function statCard(color, icon, label, value) {
  return `
    <div class="stat-card ${color}">
      <div class="stat-header">
        <div class="stat-icon ${color}">${icon}</div>
      </div>
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>`;
}

function quickAction(iconClass, icon, label, sub, route) {
  return `
    <div class="quick-action-card" data-nav="${route}">
      <div class="quick-action-icon ${iconClass}">${icon}</div>
      <div class="qa-label">${label}</div>
      <div class="qa-sub">${sub}</div>
    </div>`;
}

function billStatusBadge(finalized) {
  if (finalized === true || finalized === "true" || finalized === "FINALIZED") {
    return '<span class="badge badge-success">Finalized</span>';
  }
  return '<span class="badge badge-info">Draft</span>';
}

function extractSalesAmount(data) {
  if (!data) return 0;
  if (typeof data === "number") return data;
  return data.totalSales || data.total || data.totalAmount || data.salesTotal || 0;
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.products)) return data.products;
  if (data && Array.isArray(data.bills)) return data.bills;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}
