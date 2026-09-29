// ================================================================
// js/app.js — Main router, layout shell, navigation
// ================================================================

import { renderAuthPage } from "./auth.js";
import { renderDashboard } from "./dashboard.js";
import { renderProducts } from "./products.js";
import { renderBilling } from "./billing.js";
import { renderBills } from "./bills.js";
import { renderSales } from "./sales.js";
import { renderLowStock } from "./products.js";
import { showToast } from "./toast.js";

const ICONS = {
  cart: '<svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.6 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>',
  dashboard: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
  box: '<svg viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
  billing: '<svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.6 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/><path d="M9 11h6"/></svg>',
  receipt: '<svg viewBox="0 0 24 24"><path d="M4 2h16v20l-3-2-3 2-3-2-3 2-3-2V2z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>',
  sales: '<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>',
  alert: '<svg viewBox="0 0 24 24"><path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  logout: '<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18"/></svg>',
};

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: ICONS.dashboard },
  { id: "products", label: "Products", icon: ICONS.box },
  { id: "billing", label: "Billing", icon: ICONS.billing },
  { id: "bills", label: "Bills", icon: ICONS.receipt },
  { id: "sales", label: "Daily Sales", icon: ICONS.sales },
  { id: "lowstock", label: "Low Stock", icon: ICONS.alert },
];

let currentRoute = "dashboard";

export function initApp() {
  // Listen for auth changes
  window.addEventListener("shoplite:auth-change", () => route());
  window.addEventListener("shoplite:navigate", (e) => {
    if (e.detail) navigateTo(e.detail);
  });
  route();
}

function isLoggedIn() {
  return !!localStorage.getItem("shoplite_user");
}

function route() {
  if (isLoggedIn()) {
    renderShell();
    navigateTo(currentRoute);
  } else {
    renderAuthPage("login");
  }
}

function renderShell() {
  const app = document.getElementById("app");
  let user = { name: "User", email: "" };
  try {
    user = JSON.parse(localStorage.getItem("shoplite_user")) || user;
  } catch { /* ignore */ }

  const initials = (user.name || "U").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  app.innerHTML = `
    <div class="app-layout">
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="brand-logo-icon">${ICONS.cart}</div>
          <span class="brand-name">ShopLite</span>
        </div>
        <nav class="nav-section">
          <div class="nav-label">Main Menu</div>
          ${NAV_ITEMS.map((item) => `
            <div class="nav-item ${item.id === currentRoute ? "active" : ""}" data-route="${item.id}">
              ${item.icon}
              <span>${item.label}</span>
            </div>
          `).join("")}
        </nav>
        <div class="sidebar-footer">
          <div class="user-info">
            <div class="user-avatar">${initials}</div>
            <div style="min-width:0;flex:1">
              <div class="user-name">${escapeHtml(user.name)}</div>
              <div class="user-role">Shop Owner</div>
            </div>
          </div>
          <button class="logout-btn" id="logout-btn">
            ${ICONS.logout}
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <div class="main-area">
        <header class="topbar">
          <div class="topbar-left">
            <button class="mobile-menu-btn" id="mobile-menu-btn">${ICONS.menu}</button>
            <h1 id="page-title">Dashboard</h1>
          </div>
          <div class="topbar-date">
            ${ICONS.calendar}
            <span id="topbar-date-text"></span>
          </div>
        </header>
        <main class="page-content" id="page-content"></main>
      </div>
    </div>
  `;

  // Bind nav
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.addEventListener("click", () => {
      navigateTo(el.dataset.route);
      closeSidebar();
    });
  });

  // Logout
  document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.removeItem("shoplite_token");
    localStorage.removeItem("shoplite_user");
    currentRoute = "dashboard";
    showToast("info", "Signed out", "You have been logged out.");
    window.dispatchEvent(new CustomEvent("shoplite:auth-change"));
  });

  // Mobile menu
  document.getElementById("mobile-menu-btn").addEventListener("click", toggleSidebar);
  document.getElementById("sidebar-overlay").addEventListener("click", closeSidebar);

  // Set date
  document.getElementById("topbar-date-text").textContent = formatDateLong(new Date());
}

function navigateTo(routeId) {
  currentRoute = routeId;

  // Update nav active state
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.route === routeId);
  });

  const content = document.getElementById("page-content");
  if (!content) return;

  const titles = {
    dashboard: "Dashboard",
    products: "Products",
    billing: "Billing",
    bills: "Bills",
    sales: "Daily Sales",
    lowstock: "Low Stock",
  };
  const titleEl = document.getElementById("page-title");
  if (titleEl) titleEl.textContent = titles[routeId] || "ShopLite";

  // Scroll content to top
  content.closest(".main-area")?.scrollTo(0, 0);

  switch (routeId) {
    case "dashboard":
      renderDashboard(content);
      break;
    case "products":
      renderProducts(content);
      break;
    case "billing":
      renderBilling(content);
      break;
    case "bills":
      renderBills(content);
      break;
    case "sales":
      renderSales(content);
      break;
    case "lowstock":
      renderLowStock(content);
      break;
    default:
      renderDashboard(content);
  }
}

function toggleSidebar() {
  document.getElementById("sidebar")?.classList.toggle("open");
  document.getElementById("sidebar-overlay")?.classList.toggle("show");
}

function closeSidebar() {
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebar-overlay")?.classList.remove("show");
}

// ---------- Utils ----------

export function escapeHtml(str) {
  if (str == null) return "";
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

export function formatCurrency(n) {
  const num = Number(n) || 0;
  return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateLong(d) {
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export { showToast };
