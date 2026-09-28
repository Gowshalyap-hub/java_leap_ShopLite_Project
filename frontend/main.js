import "./style.css";
import { api } from "./api.js";

const app = document.querySelector("#app");

let products = [];
let bills = [];
let currentView = "products";
let editingProductId = null;

const titleCase = (s) =>
  s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const fmtMoney = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(n || 0));

// ─────────────────────── RENDER SHELL ───────────────────────
function renderShell() {
  app.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-icon">SB</span>
        <span class="brand-name">StoreBoard</span>
      </div>

      <nav class="nav">

        <button class="nav-item active" data-view="products">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 7l-8-4-8 4 8 4 8-4z"/>
            <path d="M4 7v10l8 4 8-4V7"/>
            <path d="M12 11v10"/>
          </svg>
          Products
        </button>

        <button class="nav-item" data-view="low-stock">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Low Stock
        </button>

        <button class="nav-item" data-view="bills">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          Bills
        </button>

        <button class="nav-item" data-view="sales">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="20" x2="12" y2="10"/>
            <line x1="18" y1="20" x2="18" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="16"/>
          </svg>
          Sales Report
        </button>

      </nav>
    </aside>

    <main class="content">

      <header class="content-header">
        <h1 id="page-title">Products</h1>
        <div class="header-actions" id="header-actions"></div>
      </header>

      <section id="view-container"></section>

      <div id="modal-root"></div>

    </main>
  `;

  app.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () =>
      switchView(btn.dataset.view)
    );
  });
}

// ─────────────────────── VIEW SWITCHING ───────────────────────
function switchView(view) {
  currentView = view;

  app
    .querySelectorAll(".nav-item")
    .forEach((b) => b.classList.remove("active"));

  app
    .querySelector(`.nav-item[data-view="${view}"]`)
    .classList.add("active");

  const titles = {
    products: "Products",
    "low-stock": "Low Stock Alerts",
    bills: "Bills",
    sales: "Sales Report",
  };

  app.querySelector("#page-title").textContent = titles[view];

  if (view === "products") renderProductsView();
  if (view === "low-stock") renderLowStockView();
  if (view === "bills") renderBillsView();
  if (view === "sales") renderSalesView();
}

// ─────────────────────── PRODUCTS VIEW ───────────────────────
function renderProductsView() {
  const actions = app.querySelector("#header-actions");

  actions.innerHTML = `
    <button class="btn btn-primary" id="add-product-btn">
      + Add Product
    </button>
  `;

  actions
    .querySelector("#add-product-btn")
    .addEventListener("click", () =>
      openProductModal()
    );

  const container = app.querySelector("#view-container");

  container.innerHTML =
    `<div class="loading">Loading products…</div>`;

  api.getProducts()
    .then((data) => {
      products = Array.isArray(data)
        ? data
        : data?.products || [];

      renderProductsTable();
    })
    .catch((err) => {
      container.innerHTML = `
        <div class="error-box">
          Could not load products:
          ${esc(err.message)}
        </div>
      `;
    });
}

function renderProductsTable() {
  const container = app.querySelector("#view-container");

  if (products.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>
          No products yet. Click "Add Product"
          to create your first one.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">

      <table class="data-table">

        <thead>
          <tr>
            <th>Name</th>
            <th>Price</th>
            <th>Stock</th>
            <th class="col-actions">Actions</th>
          </tr>
        </thead>

        <tbody>

          ${products.map((p) => `
            <tr>

              <td>${esc(p.name)}</td>

              <td>${fmtMoney(p.price)}</td>

              <td>
                <span class="stock-badge ${stockClass(p)}">
                  ${p.stockQuantity ?? p.stock ?? p.quantity ?? 0}
                </span>
              </td>

              <td class="col-actions">

                <button
                  class="btn-icon"
                  data-edit="${p.id}"
                  title="Edit"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>

                <button
                  class="btn-icon btn-danger-soft"
                  data-del="${p.id}"
                  title="Delete"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>

              </td>

            </tr>
          `).join("")}

        </tbody>

      </table>

    </div>
  `;

  container
    .querySelectorAll("[data-edit]")
    .forEach((b) =>
      b.addEventListener("click", () =>
        openProductModal(b.dataset.edit)
      )
    );

  container
    .querySelectorAll("[data-del]")
    .forEach((b) =>
      b.addEventListener("click", () =>
        deleteProduct(b.dataset.del)
      )
    );
}

function stockClass(p) {
  const s =
    p.stockQuantity ??
    p.stock ??
    p.quantity ??
    0;

  if (s <= 5) return "stock-low";
  if (s <= 15) return "stock-mid";

  return "stock-ok";
}

// ─────────────────────── PRODUCT MODAL ───────────────────────
function openProductModal(id = null) {
  editingProductId = id;

  const product = id
    ? products.find(
        (p) => String(p.id) === String(id)
      )
    : null;

  showModal(`
    <h2>
      ${product ? "Edit Product" : "Add Product"}
    </h2>

    <form id="product-form" class="modal-form">

      <label class="field">
        <span>Name</span>

        <input
          type="text"
          name="name"
          value="${product ? esc(product.name) : ""}"
          required
        />
      </label>

      <label class="field">
        <span>Price ($)</span>

        <input
          type="number"
          step="0.01"
          min="0"
          name="price"
          value="${product ? product.price : ""}"
          required
        />
      </label>

      <label class="field">
        <span>Stock Quantity</span>

        <input
          type="number"
          min="0"
          name="stockQuantity"
          value="${
            product
              ? (product.stockQuantity ?? 0)
              : ""
          }"
          required
        />
      </label>

      <label class="field">
        <span>Reorder Threshold</span>

        <input
          type="number"
          min="0"
          name="reorderThreshold"
          value="${
            product
              ? (product.reorderThreshold ?? 10)
              : 10
          }"
          required
        />
      </label>

      <div class="modal-actions">

        <button
          type="button"
          class="btn btn-ghost"
          data-close
        >
          Cancel
        </button>

        <button
          type="submit"
          class="btn btn-primary"
        >
          ${product ? "Save Changes" : "Create"}
        </button>

      </div>

    </form>
  `);

  app
    .querySelector("#product-form")
    .addEventListener("submit", (e) => {

      e.preventDefault();

      const fd = new FormData(e.target);

      const payload = {
        name: fd.get("name"),
        price: parseFloat(fd.get("price")),
        stockQuantity: parseInt(
          fd.get("stockQuantity"),
          10
        ),
        reorderThreshold: parseInt(
          fd.get("reorderThreshold"),
          10
        ),
      };

      const operation = product
        ? api.updateProduct(
            product.id,
            payload
          )
        : api.createProduct(payload);

      operation
        .then(() => {
          closeModal();
          renderProductsView();
        })
        .catch((err) => {

          let errBox =
            app.querySelector(".modal-error");

          if (!errBox) {
            errBox =
              document.createElement("div");

            errBox.className =
              "modal-error";

            e.target.prepend(errBox);
          }

          errBox.textContent =
            err.message;
        });
    });
}

function deleteProduct(id) {
  const product = products.find(
    (p) => String(p.id) === String(id)
  );

  showModal(`
    <h2>Delete Product</h2>

    <p class="modal-text">
      Are you sure you want to delete
      <strong>
        ${esc(product?.name || "this product")}
      </strong>?
      This cannot be undone.
    </p>

    <div class="modal-actions">

      <button
        type="button"
        class="btn btn-ghost"
        data-close
      >
        Cancel
      </button>

      <button
        type="button"
        class="btn btn-danger"
        id="confirm-delete"
      >
        Delete
      </button>

    </div>
  `);

  app
    .querySelector("#confirm-delete")
    .addEventListener("click", () => {

      api.deleteProduct(id)
        .then(() => {
          closeModal();
          renderProductsView();
        })
        .catch((err) => {
          closeModal();
          alert(
            "Delete failed: " +
            err.message
          );
        });
    });
}

// ─────────────────────── LOW STOCK VIEW ───────────────────────
function renderLowStockView() {
  app.querySelector("#header-actions").innerHTML = `
    <button class="btn btn-ghost" id="refresh-low">
      Refresh
    </button>
  `;

  app
    .querySelector("#refresh-low")
    .addEventListener(
      "click",
      renderLowStockView
    );

  const container =
    app.querySelector("#view-container");

  container.innerHTML =
    `<div class="loading">
      Checking stock levels…
    </div>`;

  api.getLowStock()
    .then((data) => {

      const items =
        Array.isArray(data)
          ? data
          : data?.products || [];

      if (items.length === 0) {
        container.innerHTML = `
          <div class="empty-state success">
            <div class="empty-icon">&#10003;</div>
            <p>
              All products are well stocked.
            </p>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="alert-banner">
          ${items.length}
          product(s) need restocking.
        </div>

        <div class="table-wrap">

          <table class="data-table">

            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Stock Left</th>
              </tr>
            </thead>

            <tbody>

              ${items.map((p) => `
                <tr>

                  <td>${esc(p.name)}</td>

                  <td>${fmtMoney(p.price)}</td>

                  <td>
                    <span class="stock-badge stock-low">
                      ${p.stockQuantity ?? 0}
                    </span>
                  </td>

                </tr>
              `).join("")}

            </tbody>

          </table>

        </div>
      `;

    })
    .catch((err) => {

      container.innerHTML = `
        <div class="error-box">
          Could not load low stock data:
          ${esc(err.message)}
        </div>
      `;

    });
}

// ─────────────────────── BILLS VIEW ───────────────────────
function renderBillsView() {
  const actions =
    app.querySelector("#header-actions");

  actions.innerHTML = `
    <button
      class="btn btn-primary"
      id="create-bill-btn"
    >
      + New Bill
    </button>
  `;

  actions
    .querySelector("#create-bill-btn")
    .addEventListener(
      "click",
      openBillModal
    );

  const container =
    app.querySelector("#view-container");

  container.innerHTML =
    `<div class="loading">
      Loading bills…
    </div>`;

  api.getBills()
    .then((data) => {

      bills =
        Array.isArray(data)
          ? data
          : data?.bills || [];

      renderBillsTable();

    })
    .catch((err) => {

      container.innerHTML = `
        <div class="error-box">
          Could not load bills:
          ${esc(err.message)}
        </div>
      `;

    });
}

function renderBillsTable() {
  const container =
    app.querySelector("#view-container");

  if (bills.length === 0) {

    container.innerHTML = `
      <div class="empty-state">
        <p>
          No bills yet.
          Click "New Bill" to create one.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = `
    <div class="table-wrap">

      <table class="data-table">

        <thead>

          <tr>
            <th>Bill #</th>
            <th>Date</th>
            <th>Items</th>
            <th>Total</th>
            <th class="col-actions">View</th>
          </tr>

        </thead>

        <tbody>

          ${bills.map((b) => `
            <tr>

              <td>${esc(String(b.id))}</td>

              <td>
                ${esc(
                  formatDate(
                    b.billDate ||
                    b.date ||
                    b.createdAt
                  )
                )}
              </td>

              <td>${countItems(b)}</td>

              <td>
                ${fmtMoney(
                  b.totalAmount ||
                  b.total ||
                  0
                )}
              </td>

              <td class="col-actions">

                <button
                  class="btn-icon"
                  data-bill="${b.id}"
                  title="View"
                >
                  <svg width="16" height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>

              </td>

            </tr>
          `).join("")}

        </tbody>

      </table>

    </div>
  `;

  container
    .querySelectorAll("[data-bill]")
    .forEach((b) =>
      b.addEventListener(
        "click",
        () => viewBill(b.dataset.bill)
      )
    );
}

function countItems(bill) {
  const items =
    bill.items ||
    bill.products ||
    bill.lineItems ||
    [];

  return Array.isArray(items)
    ? items.length
    : 0;
}

function formatDate(d) {
  if (!d) return "—";

  const dt = new Date(d);

  if (isNaN(dt))
    return String(d);

  return dt.toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
}

function viewBill(id) {

  const bill =
    bills.find(
      (b) =>
        String(b.id) === String(id)
    );

  if (bill) {
    renderBillDetail(bill);
    return;
  }

  api.getBill(id)
    .then((data) =>
      renderBillDetail(data)
    )
    .catch((err) => {
      alert(
        "Could not load bill: " +
        err.message
      );
    });
}

function renderBillDetail(bill) {

  const items =
    bill.items ||
    bill.products ||
    bill.lineItems ||
    [];

  showModal(`
    <h2>
      Bill #${esc(String(bill.id))}
    </h2>

    <p class="modal-text muted">
      ${esc(
        formatDate(
          bill.billDate ||
          bill.date ||
          bill.createdAt
        )
      )}
    </p>

    <table class="data-table modal-table">

      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Price</th>
        </tr>
      </thead>

      <tbody>

        ${
          items.length
            ? items.map((it) => `
              <tr>

                <td>
                  ${esc(
                    it.product?.name ||
                    it.name ||
                    it.productName ||
                    "Item"
                  )}
                </td>

                <td>
                  ${it.quantity ??
                    it.qty ??
                    1}
                </td>

                <td>
                  ${fmtMoney(
                    it.price ??
                    it.unitPrice ??
                    0
                  )}
                </td>

              </tr>
            `).join("")
            : `
              <tr>
                <td
                  colspan="3"
                  class="muted"
                >
                  No item details available
                </td>
              </tr>
            `
        }

      </tbody>

    </table>

    <div class="bill-total">

      <span>Total</span>

      <strong>
        ${fmtMoney(
          bill.totalAmount ||
          bill.total ||
          0
        )}
      </strong>

    </div>

    <div class="modal-actions">

      <button
        type="button"
        class="btn btn-ghost"
        data-close
      >
        Close
      </button>

    </div>
  `);
}

// ─────────────────────── BILL MODAL ───────────────────────
function openBillModal() {

  if (products.length === 0) {
    alert(
      "Add products first before creating a bill."
    );
    return;
  }

  let lineItems = [];

  const renderLineItems = () => {

    const tbody =
      app.querySelector(
        "#bill-items-body"
      );

    if (!tbody) return;

    if (lineItems.length === 0) {

      tbody.innerHTML = `
        <tr>
          <td
            colspan="4"
            class="muted center"
          >
            No items added yet
          </td>
        </tr>
      `;

    } else {

      tbody.innerHTML =
        lineItems.map((li, i) => `
          <tr>

            <td>
              ${esc(li.name)}
            </td>

            <td>
              ${li.quantity}
            </td>

            <td>
              ${fmtMoney(
                li.price * li.quantity
              )}
            </td>

            <td class="col-actions">

              <button
                type="button"
                class="btn-icon btn-danger-soft"
                data-remove="${i}"
                title="Remove"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <line
                    x1="18"
                    y1="6"
                    x2="6"
                    y2="18"
                  />
                  <line
                    x1="6"
                    y1="6"
                    x2="18"
                    y2="18"
                  />
                </svg>
              </button>

            </td>

          </tr>
        `).join("");

      tbody
        .querySelectorAll(
          "[data-remove]"
        )
        .forEach((b) =>
          b.addEventListener(
            "click",
            () => {

              lineItems.splice(
                parseInt(
                  b.dataset.remove,
                  10
                ),
                1
              );

              renderLineItems();
              updateBillTotal();

            }
          )
        );
    }
  };

  const updateBillTotal = () => {

    const total =
      lineItems.reduce(
        (s, li) =>
          s +
          li.price *
          li.quantity,
        0
      );

    const el =
      app.querySelector(
        "#bill-total"
      );

    if (el)
      el.textContent =
        fmtMoney(total);
  };

  showModal(`

    <h2>New Bill</h2>

    <form
      id="bill-form"
      class="modal-form"
    >

      <label class="field">

        <span>Add Product</span>

        <div class="inline-row">

          <select
            id="bill-product-select"
            required
          >

            <option
              value=""
              disabled
              selected
            >
              Choose a product…
            </option>

            ${products.map((p) => `
              <option
                value="${p.id}"
                data-price="${p.price}"
                data-name="${esc(p.name)}"
              >
                ${esc(p.name)}
                — ${fmtMoney(p.price)}
                (${p.stockQuantity ?? 0} in stock)
              </option>
            `).join("")}

          </select>

          <input
            type="number"
            id="bill-qty"
            min="1"
            value="1"
            style="width:80px"
          />

          <button
            type="button"
            class="btn btn-secondary"
            id="add-line-item"
          >
            Add
          </button>

        </div>

      </label>

      <table class="data-table modal-table">

        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Subtotal</th>
            <th class="col-actions"></th>
          </tr>
        </thead>

        <tbody
          id="bill-items-body"
        ></tbody>

      </table>

      <div class="bill-total">

        <span>Total</span>

        <strong id="bill-total">
          ${fmtMoney(0)}
        </strong>

      </div>

      <div class="modal-actions">

        <button
          type="button"
          class="btn btn-ghost"
          data-close
        >
          Cancel
        </button>

        <button
          type="submit"
          class="btn btn-primary"
        >
          Create Bill
        </button>

      </div>

    </form>

  `);

  renderLineItems();

  app
    .querySelector("#add-line-item")
    .addEventListener(
      "click",
      () => {

        const sel =
          app.querySelector(
            "#bill-product-select"
          );

        const qtyInput =
          app.querySelector(
            "#bill-qty"
          );

        if (!sel.value) {
          alert(
            "Please choose a product."
          );
          return;
        }

        const opt =
          sel.selectedOptions[0];

        const quantity =
          parseInt(
            qtyInput.value,
            10
          );

        if (
          !quantity ||
          quantity <= 0
        ) {
          alert(
            "Quantity must be greater than 0."
          );
          return;
        }

        lineItems.push({
          productId: sel.value,
          name: opt.dataset.name,
          price: parseFloat(
            opt.dataset.price
          ),
          quantity: quantity,
        });

        sel.value = "";
        qtyInput.value = 1;

        renderLineItems();
        updateBillTotal();
      }
    );

  app
    .querySelector("#bill-form")
    .addEventListener(
      "submit",
      (e) => {

        e.preventDefault();

        if (lineItems.length === 0) {
          alert(
            "Add at least one item to the bill."
          );
          return;
        }

        // FIX:
        // Spring Boot backend expects:
        // finalized + items + product.id + quantity

        const payload = {

          finalized: true,

          items: lineItems.map(
            (li) => ({
              product: {
                id: Number(
                  li.productId
                ),
              },

              quantity:
                li.quantity,
            })
          ),

        };

        api.createBill(payload)
          .then(() => {

            closeModal();

            renderBillsView();

          })
          .catch((err) => {

            alert(
              "Failed to create bill: " +
              err.message
            );

          });

      }
    );
}

// ─────────────────────── SALES REPORT VIEW ───────────────────────
function renderSalesView() {

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  const actions =
    app.querySelector(
      "#header-actions"
    );

  actions.innerHTML = `

    <input
      type="date"
      id="sales-date"
      value="${today}"
      class="date-input"
    />

    <button
      class="btn btn-primary"
      id="fetch-sales"
    >
      Get Report
    </button>

  `;

  const container =
    app.querySelector(
      "#view-container"
    );

  container.innerHTML = `
    <div class="sales-placeholder">

      <p>
        Select a date and click
        "Get Report" to view sales
        for that day.
      </p>

    </div>
  `;

  actions
    .querySelector("#fetch-sales")
    .addEventListener(
      "click",
      () => {

        const date =
          actions.querySelector(
            "#sales-date"
          ).value;

        if (!date) return;

        container.innerHTML = `
          <div class="loading">
            Fetching sales for
            ${esc(date)}…
          </div>
        `;

        api.getSales(date)
          .then((data) => {

            renderSalesReport(
              data,
              date
            );

          })
          .catch((err) => {

            container.innerHTML = `
              <div class="error-box">
                Could not load sales:
                ${esc(err.message)}
              </div>
            `;

          });

      }
    );
}

function renderSalesReport(
  data,
  date
) {

  const container =
    app.querySelector(
      "#view-container"
    );

  const totalSales =
    typeof data === "number"
      ? data
      : (
          data?.totalSales ??
          data?.total ??
          data?.totalRevenue ??
          0
        );

  const billCount =
    data?.billCount ??
    data?.count ??
    data?.totalBills ??
    0;

  const items =
    data?.bills ||
    data?.items ||
    data?.details ||
    [];

  container.innerHTML = `

    <div class="sales-summary">

      <div class="summary-card">

        <span class="summary-label">
          Date
        </span>

        <span class="summary-value">
          ${esc(
            formatDate(date)
          )}
        </span>

      </div>

      <div class="summary-card">

        <span class="summary-label">
          Total Sales
        </span>

        <span class="summary-value highlight">
          ${fmtMoney(totalSales)}
        </span>

      </div>

      <div class="summary-card">

        <span class="summary-label">
          Bills
        </span>

        <span class="summary-value">
          ${billCount}
        </span>

      </div>

    </div>

    ${
      Array.isArray(items) &&
      items.length
        ? `
          <div class="table-wrap">

            <table class="data-table">

              <thead>
                <tr>
                  <th>Bill #</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>

                ${items.map((b) => `
                  <tr>

                    <td>
                      ${esc(
                        String(b.id)
                      )}
                    </td>

                    <td>
                      ${fmtMoney(
                        b.total ||
                        b.totalAmount ||
                        0
                      )}
                    </td>

                  </tr>
                `).join("")}

              </tbody>

            </table>

          </div>
        `
        : `
          <div class="empty-state">
            <p>
              No bills recorded on
              this date.
            </p>
          </div>
        `
    }

  `;
}

// ─────────────────────── MODAL HELPERS ───────────────────────
function showModal(html) {

  const root =
    app.querySelector(
      "#modal-root"
    );

  root.innerHTML = `

    <div
      class="modal-overlay"
      data-close
    >

      <div
        class="modal"
        onclick="event.stopPropagation()"
      >

        ${html}

      </div>

    </div>

  `;

  root
    .querySelectorAll(
      "[data-close]"
    )
    .forEach((el) =>
      el.addEventListener(
        "click",
        closeModal
      )
    );
}

function closeModal() {

  app.querySelector(
    "#modal-root"
  ).innerHTML = "";
}

// ─────────────────────── UTIL ───────────────────────
function esc(str) {

  const div =
    document.createElement(
      "div"
    );

  div.textContent =
    String(str ?? "");

  return div.innerHTML;
}

// ─────────────────────── INIT ───────────────────────
renderShell();
switchView("products");