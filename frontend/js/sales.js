// ================================================================
// js/sales.js — Daily sales report page
// ================================================================

import { apiGetDailySales, apiGetBills } from "./api.js";
import { escapeHtml, formatCurrency, formatDate, showToast } from "./app.js";
import { friendlyError } from "./auth.js";

const ICONS = {
  calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  trend: '<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>',
  receipt: '<svg viewBox="0 0 24 24"><path d="M4 2h16v20l-3-2-3 2-3-2-3 2-3-2V2z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>',
  empty: '<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>',
};

export async function renderSales(container) {
  const today = new Date().toISOString().slice(0, 10);

  container.innerHTML = `
    <div id="sales-inner">
      <div class="page-toolbar">
        <div class="page-toolbar-left">
          <label for="sales-date" style="font-weight:600;color:var(--text-strong);font-size:0.875rem;white-space:nowrap">Select Date</label>
          <input type="date" id="sales-date" class="form-input" style="width:auto;padding:10px 14px;max-width:200px" value="${today}" />
        </div>
      </div>
      <div id="sales-content">
        <div class="loading-overlay"><div class="spinner"></div><p>Loading sales data…</p></div>
      </div>
    </div>
  `;

  document.getElementById("sales-date").addEventListener("change", () => loadSales());

  await loadSales();
}

async function loadSales() {
  const dateInput = document.getElementById("sales-date");
  const content = document.getElementById("sales-content");
  if (!dateInput || !content) return;

  const date = dateInput.value;
  content.innerHTML = `<div class="loading-overlay"><div class="spinner"></div><p>Loading sales data…</p></div>`;

  try {
    // Fetch sales summary and all bills
    const [salesResult, billsResult] = await Promise.allSettled([
      apiGetDailySales(date),
      apiGetBills(),
    ]);

    const salesData = salesResult.status === "fulfilled" ? salesResult.value : null;
    const allBills = billsResult.status === "fulfilled" ? normalizeList(billsResult.value) : [];

    // Filter bills for selected date
    const dayBills = allBills.filter((b) => {
      const billDate = b.date || b.createdAt || b.billDate;
      if (!billDate) return false;
      return billDate.toString().slice(0, 10) === date;
    });

    const totalSales = extractSalesAmount(salesData);
    const billsCount = dayBills.length;
    const avgBill = billsCount > 0 ? totalSales / billsCount : 0;

    // Build hourly bar chart data
    const hourlyData = buildHourlyData(dayBills);
    const maxHourly = Math.max(...hourlyData.map((h) => h.amount), 1);

    content.innerHTML = `
      <div class="sales-header-card">
        <div class="sales-label">Total Sales on ${formatDate(date)}</div>
        <div class="sales-amount">${formatCurrency(totalSales)}</div>
        <div class="sales-sub">
          <div class="sales-sub-item">
            <div class="num">${billsCount}</div>
            <div class="lbl">Bills</div>
          </div>
          <div class="sales-sub-item">
            <div class="num">${formatCurrency(avgBill)}</div>
            <div class="lbl">Avg / Bill</div>
          </div>
        </div>
      </div>

      <div class="dashboard-grid" style="grid-template-columns:1.4fr 1fr">
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Hourly Sales Distribution</span>
          </div>
          <div class="panel-body" style="padding:var(--space-4)">
            <div class="sales-chart" id="sales-chart">
              ${hourlyData.map((h) => `
                <div class="bar-group">
                  <div class="bar-value">${h.amount > 0 ? formatCurrency(h.amount).replace(".00","") : ""}</div>
                  <div class="bar" style="height: ${Math.max((h.amount / maxHourly) * 180, 4)}px"></div>
                  <div class="bar-label">${h.label}</div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Sales Summary</span>
          </div>
          <div class="panel-body">
            <div style="display:flex;flex-direction:column;gap:var(--space-4)">
              <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:var(--space-3);border-bottom:1px solid var(--slate-100)">
                <div style="display:flex;align-items:center;gap:var(--space-3)">
                  <div class="stat-icon green" style="width:36px;height:36px">${ICONS.trend}</div>
                  <span style="font-size:0.875rem;color:var(--text-default)">Total Revenue</span>
                </div>
                <span class="t-price">${formatCurrency(totalSales)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:var(--space-3);border-bottom:1px solid var(--slate-100)">
                <div style="display:flex;align-items:center;gap:var(--space-3)">
                  <div class="stat-icon blue" style="width:36px;height:36px">${ICONS.receipt}</div>
                  <span style="font-size:0.875rem;color:var(--text-default)">Total Bills</span>
                </div>
                <span class="t-strong">${billsCount}</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:var(--space-3);border-bottom:1px solid var(--slate-100)">
                <div style="display:flex;align-items:center;gap:var(--space-3)">
                  <div class="stat-icon amber" style="width:36px;height:36px">${ICONS.calendar}</div>
                  <span style="font-size:0.875rem;color:var(--text-default)">Average Bill Value</span>
                </div>
                <span class="t-price">${formatCurrency(avgBill)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div style="display:flex;align-items:center;gap:var(--space-3)">
                  <div class="stat-icon violet" style="width:36px;height:36px">${ICONS.trend}</div>
                  <span style="font-size:0.875rem;color:var(--text-default)">Items Sold</span>
                </div>
                <span class="t-strong">${countItems(dayBills)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      ${dayBills.length > 0 ? `
        <div class="panel" style="margin-top:var(--space-6)">
          <div class="panel-header">
            <span class="panel-title">Bills on ${formatDate(date)}</span>
          </div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>Bill ID</th><th>Time</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                ${dayBills.map((b) => {
                  const d = new Date(b.date || b.createdAt || b.billDate);
                  const time = isNaN(d) ? "—" : d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                  return `
                    <tr>
                      <td class="t-strong">#${b.id ?? "—"}</td>
                      <td>${time}</td>
                      <td class="t-price">${formatCurrency(b.totalAmount ?? b.total ?? 0)}</td>
                      <td>${b.finalized ? '<span class="badge badge-success">Finalized</span>' : '<span class="badge badge-info">Draft</span>'}</td>
                    </tr>`;
                }).join("")}
              </tbody>
            </table>
          </div>
        </div>
      ` : `
        <div class="panel" style="margin-top:var(--space-6)">
          <div class="empty-state">${ICONS.empty}<h3>No sales on this day</h3><p>Try selecting a different date.</p></div>
        </div>
      `}
    `;
  } catch (err) {
    content.innerHTML = `<div class="empty-state">${ICONS.empty}<h3>Couldn't load sales</h3><p>${escapeHtml(friendlyError(err.message))}</p></div>`;
  }
}

function buildHourlyData(bills) {
  // Group into 4 buckets: Morning (6-12), Afternoon (12-16), Evening (16-20), Night (20-6)
  const buckets = [
    { label: "Morning", amount: 0 },
    { label: "Afternoon", amount: 0 },
    { label: "Evening", amount: 0 },
    { label: "Night", amount: 0 },
  ];

  bills.forEach((b) => {
    const d = new Date(b.date || b.createdAt || b.billDate);
    if (isNaN(d)) return;
    const h = d.getHours();
    const amount = b.totalAmount ?? b.total ?? 0;
    if (h >= 6 && h < 12) buckets[0].amount += amount;
    else if (h >= 12 && h < 16) buckets[1].amount += amount;
    else if (h >= 16 && h < 20) buckets[2].amount += amount;
    else buckets[3].amount += amount;
  });

  return buckets;
}

function countItems(bills) {
  let count = 0;
  bills.forEach((b) => {
    const items = b.items || b.billItems || [];
    items.forEach((item) => {
      count += item.quantity || 0;
    });
  });
  return count;
}

function extractSalesAmount(data) {
  if (!data) return 0;
  if (typeof data === "number") return data;
  return data.totalSales || data.total || data.totalAmount || data.salesTotal || 0;
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.bills)) return data.bills;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}
