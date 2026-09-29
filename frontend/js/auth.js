// ================================================================
// js/auth.js — Login / Register page logic
// ================================================================

import { apiLogin, apiRegister } from "./api.js";

// ---------- SVG icons ----------
const ICONS = {
  mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  cart: '<svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.6 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>',
  box: '<svg viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
  receipt: '<svg viewBox="0 0 24 24"><path d="M4 2h16v20l-3-2-3 2-3-2-3 2-3-2V2z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>',
};

export function renderAuthPage(mode) {
  const app = document.getElementById("app");
  if (mode === "register") {
    app.innerHTML = registerHTML();
    bindRegisterEvents();
  } else {
    app.innerHTML = loginHTML();
    bindLoginEvents();
  }
}

// ---------- Login ----------
function loginHTML() {
  return `
  <div class="auth-wrapper">
    <div class="auth-brand">
      <div class="brand-logo-large">
        <div class="brand-logo-icon-lg">${ICONS.cart}</div>
        <span class="brand-name">ShopLite</span>
      </div>
      <div class="auth-hero">
        <h2>Manage your shop with clarity.</h2>
        <p>Track inventory, create bills, and monitor daily sales — all from one clean, fast dashboard built for small retailers.</p>
        <div class="auth-feature-list">
          <div class="auth-feature"><span class="dot">${ICONS.box}</span> Real-time inventory & low-stock alerts</div>
          <div class="auth-feature"><span class="dot">${ICONS.receipt}</span> Fast point-of-sale billing</div>
          <div class="auth-feature"><span class="dot">${ICONS.cart}</span> Daily sales reports & analytics</div>
        </div>
      </div>
      <div class="auth-footer-note">© ${new Date().getFullYear()} ShopLite — Academic Project</div>
    </div>
    <div class="auth-form-side">
      <div class="auth-card">
        <h1>Welcome back</h1>
        <p class="subtitle">Sign in to your ShopLite account</p>
        <form id="login-form" novalidate>
          <div class="form-group">
            <label for="login-email">Email</label>
            <div class="input-wrapper">
              <span class="input-icon">${ICONS.mail}</span>
              <input type="email" id="login-email" class="form-input" placeholder="you@shop.com" autocomplete="email" required />
            </div>
          </div>
          <div class="form-group">
            <label for="login-password">Password</label>
            <div class="input-wrapper">
              <span class="input-icon">${ICONS.lock}</span>
              <input type="password" id="login-password" class="form-input" placeholder="••••••••" autocomplete="current-password" required />
            </div>
          </div>
          <div class="form-error" id="login-error"></div>
          <button type="submit" class="btn btn-primary btn-block btn-lg" id="login-btn">
            <span class="btn-label">Sign In</span>
          </button>
        </form>
        <p class="auth-switch">Don't have an account? <a href="#" id="link-register">Create one</a></p>
      </div>
    </div>
  </div>`;
}

function bindLoginEvents() {
  const form = document.getElementById("login-form");
  const errorEl = document.getElementById("login-error");
  const btn = document.getElementById("login-btn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
      errorEl.textContent = "Please enter both email and password.";
      return;
    }

    setLoading(btn, true, "Signing in…");
    try {
      const data = await apiLogin(email, password);
      // Expect { token, ... } or { accessToken, ... }
      const token = data.token || data.accessToken || (typeof data === "string" ? data : null);
      const name = data.name || data.user?.name || email.split("@")[0];
      if (token) localStorage.setItem("shoplite_token", JSON.stringify(token));
      localStorage.setItem("shoplite_user", JSON.stringify({ name, email }));
      window.dispatchEvent(new CustomEvent("shoplite:auth-change"));
    } catch (err) {
      errorEl.textContent = friendlyError(err.message);
    } finally {
      setLoading(btn, false, "Sign In");
    }
  });

  document.getElementById("link-register").addEventListener("click", (e) => {
    e.preventDefault();
    renderAuthPage("register");
  });
}

// ---------- Register ----------
function registerHTML() {
  return `
  <div class="auth-wrapper">
    <div class="auth-brand">
      <div class="brand-logo-large">
        <div class="brand-logo-icon-lg">${ICONS.cart}</div>
        <span class="brand-name">ShopLite</span>
      </div>
      <div class="auth-hero">
        <h2>Start managing your shop today.</h2>
        <p>Create a free account to begin tracking products, generating bills, and watching your sales grow.</p>
        <div class="auth-feature-list">
          <div class="auth-feature"><span class="dot">${ICONS.box}</span> Real-time inventory & low-stock alerts</div>
          <div class="auth-feature"><span class="dot">${ICONS.receipt}</span> Fast point-of-sale billing</div>
          <div class="auth-feature"><span class="dot">${ICONS.cart}</span> Daily sales reports & analytics</div>
        </div>
      </div>
      <div class="auth-footer-note">© ${new Date().getFullYear()} ShopLite — Academic Project</div>
    </div>
    <div class="auth-form-side">
      <div class="auth-card">
        <h1>Create account</h1>
        <p class="subtitle">Get started with ShopLite in seconds</p>
        <form id="register-form" novalidate>
          <div class="form-group">
            <label for="reg-name">Full Name</label>
            <div class="input-wrapper">
              <span class="input-icon">${ICONS.user}</span>
              <input type="text" id="reg-name" class="form-input" placeholder="John Doe" autocomplete="name" required />
            </div>
          </div>
          <div class="form-group">
            <label for="reg-email">Email</label>
            <div class="input-wrapper">
              <span class="input-icon">${ICONS.mail}</span>
              <input type="email" id="reg-email" class="form-input" placeholder="you@shop.com" autocomplete="email" required />
            </div>
          </div>
          <div class="form-group">
            <label for="reg-password">Password</label>
            <div class="input-wrapper">
              <span class="input-icon">${ICONS.lock}</span>
              <input type="password" id="reg-password" class="form-input" placeholder="At least 6 characters" autocomplete="new-password" required />
            </div>
          </div>
          <div class="form-group">
            <label for="reg-confirm">Confirm Password</label>
            <div class="input-wrapper">
              <span class="input-icon">${ICONS.lock}</span>
              <input type="password" id="reg-confirm" class="form-input" placeholder="Re-enter password" autocomplete="new-password" required />
            </div>
          </div>
          <div class="form-error" id="reg-error"></div>
          <div class="form-success" id="reg-success"></div>
          <button type="submit" class="btn btn-primary btn-block btn-lg" id="register-btn">
            <span class="btn-label">Create Account</span>
          </button>
        </form>
        <p class="auth-switch">Already have an account? <a href="#" id="link-login">Sign in</a></p>
      </div>
    </div>
  </div>`;
}

function bindRegisterEvents() {
  const form = document.getElementById("register-form");
  const errorEl = document.getElementById("reg-error");
  const successEl = document.getElementById("reg-success");
  const btn = document.getElementById("register-btn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";
    successEl.textContent = "";

    const name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;
    const confirm = document.getElementById("reg-confirm").value;

    if (!name || !email || !password) {
      errorEl.textContent = "All fields are required.";
      return;
    }
    if (password.length < 6) {
      errorEl.textContent = "Password must be at least 6 characters.";
      return;
    }
    if (password !== confirm) {
      errorEl.textContent = "Passwords do not match.";
      return;
    }

    setLoading(btn, true, "Creating…");
    try {
      await apiRegister(name, email, password);
      successEl.textContent = "Account created! Redirecting to login…";
      setTimeout(() => renderAuthPage("login"), 1200);
    } catch (err) {
      errorEl.textContent = friendlyError(err.message);
    } finally {
      setLoading(btn, false, "Create Account");
    }
  });

  document.getElementById("link-login").addEventListener("click", (e) => {
    e.preventDefault();
    renderAuthPage("login");
  });
}

// ---------- Shared helpers ----------

export function setLoading(btn, loading, label) {
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-sm"></span><span class="btn-label">' + label + "</span>";
  } else {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-label">' + label + "</span>";
  }
}

export function friendlyError(msg) {
  const m = (msg || "").toLowerCase();
  if (m.includes("network") || m.includes("failed to fetch")) {
    return "Cannot connect to the server. Please make sure the backend is running.";
  }
  if (m.includes("401") || m.includes("unauthorized") || m.includes("invalid credentials")) {
    return "Invalid email or password. Please try again.";
  }
  if (m.includes("409") || m.includes("conflict") || m.includes("already") || m.includes("duplicate")) {
    return "An account with this email already exists.";
  }
  if (m.includes("404") || m.includes("not found")) {
    return "The requested item was not found.";
  }
  if (m.includes("stock") || m.includes("insufficient")) {
    return "Insufficient stock available for one or more items.";
  }
  return msg || "Something went wrong. Please try again.";
}
