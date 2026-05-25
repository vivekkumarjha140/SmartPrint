/* =====================================================
   ADMIN DASHBOARD LOGIC
   Uses existing backend endpoint: GET /api/orders
===================================================== */
if (!localStorage.getItem("adminAccessToken")) {
  window.location.href = "admin-login.html";
}

let accessToken = localStorage.getItem("adminAccessToken");

async function apiFetch(url, options = {}) {
  const currentToken = localStorage.getItem("adminAccessToken");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    Authorization: currentToken ? `Bearer ${currentToken}` : ""
  };

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: "include"
  });

  if (response.status === 401) {
    try {
      const refreshRes = await fetch("http://127.0.0.1:5000/api/auth/refresh-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newToken = refreshData.accessToken;

        localStorage.setItem("adminAccessToken", newToken);
        accessToken = newToken;

        return await fetch(url, {
          ...options,
          headers: {
            ...headers,
            Authorization: `Bearer ${newToken}`
          },
          credentials: "include"
        });
      }

      throw new Error("Session expired");
    } catch (err) {
      localStorage.removeItem("adminAccessToken");
      localStorage.removeItem("adminUser");
      window.location.href = "admin-login.html";
      throw err;
    }
  }

  return response;
}

document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = window.PRINTFORGE_API_BASE || "http://127.0.0.1:5000/api";

  const socket = window.io
    ? io("http://127.0.0.1:5000", {
        withCredentials: true,
        auth: {
          token: localStorage.getItem("adminAccessToken")
        }
      })
    : null;

  if (socket) {
    socket.emit("admin:join");

    socket.on("order:new", (order) => {
      console.log("New order:", order);
      showToast("success", "New Order", `${order.design} - ${order.quantity} pcs`);
    });

    socket.on("payment:received", (data) => {
      showToast("success", "Payment Received", `Order ${data.orderId} paid`);
    });

    socket.on("order:status-updated", (data) => {
      console.log("Status updated:", data);
    });
  }

  const totalOrdersEl = document.getElementById("totalOrders");
  const totalUnitsEl = document.getElementById("totalUnits");
  const estimatedRevenueEl = document.getElementById("estimatedRevenue");
  const averageQuantityEl = document.getElementById("averageQuantity");

  const ordersTableBody = document.getElementById("ordersTableBody");
  const orderSearch = document.getElementById("orderSearch");
  const designFilter = document.getElementById("designFilter");
  const pagination = document.getElementById("pagination");
  const refreshDashboardBtn = document.getElementById("refreshDashboardBtn");

  const themeToggle = document.getElementById("themeToggle");
  const themeIcon = themeToggle?.querySelector(".theme-icon");

  const modal = document.getElementById("pfModal");
  const modalContent = document.getElementById("pfModalContent");
  const logoutBtn = document.getElementById("logoutBtn");

  logoutBtn?.addEventListener("click", async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
    } finally {
      localStorage.removeItem("adminAccessToken");
      localStorage.removeItem("adminUser");
      window.location.href = "admin-login.html";
    }
  });

  const chartCanvas = document.getElementById("ordersChart");
  const chartContext = chartCanvas?.getContext("2d");

  const state = {
    orders: [],
    filteredOrders: [],
    currentPage: 1,
    perPage: 8,
    search: "",
    design: "all"
  };

  const priceMap = {
    "Custom T-Shirts": 12,
    "Sports Jerseys": 18,
    "College Merch": 14,
    "Custom Hoodies": 28,
    "Corporate Uniforms": 22
  };

  /* ===============================
     THEME
  ================================ */

  const savedTheme = localStorage.getItem("pf-theme") || "light";

  if (savedTheme === "dark") {
    document.documentElement.classList.add("dark");
    if (themeIcon) themeIcon.textContent = "☀️";
  }

  themeToggle?.addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("pf-theme", isDark ? "dark" : "light");
    if (themeIcon) themeIcon.textContent = isDark ? "☀️" : "🌙";
  });

  /* ===============================
     TOAST
  ================================ */

  function showToast(type, title, message) {
    const container = document.getElementById("toastContainer");

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    toast.innerHTML = `
      <div class="toast-icon">${type === "success" ? "✓" : type === "error" ? "!" : "i"}</div>
      <div>
        <strong>${title}</strong>
        <p>${message}</p>
      </div>
      <button type="button">×</button>
    `;

    const close = () => {
      toast.classList.add("hide");
      setTimeout(() => toast.remove(), 250);
    };

    toast.querySelector("button").addEventListener("click", close);

    container.appendChild(toast);

    setTimeout(close, 4200);
  }

  /* ===============================
     MODAL
  ================================ */

  function openModal(html) {
    modalContent.innerHTML = html;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  }

  document.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", closeModal);
  });

  /* ===============================
     HELPERS
  ================================ */

  function formatCurrency(value) {
    return `$${Number(value || 0).toLocaleString()}`;
  }

  function formatDate(date) {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  }

  function estimateOrderValue(order) {
    const unit = priceMap[order.design] || 12;
    return unit * Number(order.quantity || 0);
  }

  function normalizeOrder(order) {
    return {
      id: order._id || order.id,
      name: order.name || "Unknown",
      phone: order.phone || "N/A",
      quantity: Number(order.quantity || 0),
      design: order.design || "Custom T-Shirts",
      artwork: order.artwork || { url: "" },
      createdAt: order.createdAt || new Date().toISOString(),
      status: order.status || "New Inquiry",
      estimatedValue: order.pricing?.estimatedTotal || order.estimatedTotal || estimateOrderValue(order)
    };
  }

/* =====================================================
   CLEAN & OPTIMIZED FETCH ORDERS
===================================================== */
async function fetchOrders() {
  renderSkeleton();

  try {
    const response = await apiFetch(`${API_BASE}/orders`);

    const result = await response.json();

    console.log("Orders Response:", result);

    if (!response.ok) {
      throw new Error(result.message || "Unable to load orders.");
    }

    // Data load logic
    state.orders = Array.isArray(result.data)
      ? result.data.map(normalizeOrder)
      : [];

    state.currentPage = 1;

    // UI Updates
    populateDesignFilter();
    applyFilters();
    renderAnalytics();
    renderChart();

    showToast(
      "success",
      "Dashboard updated",
      "Latest orders loaded successfully."
    );

  } catch (error) {
    console.error("Fetch Orders Error:", error);

    ordersTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 20px; color: #e63946;">
          ${error.message}
        </td>
      </tr>
    `;

    showToast(
      "error",
      "Failed to load orders",
      error.message
    );
  }
}

  function renderSkeleton() {
    ordersTableBody.innerHTML = Array.from({ length: 5 })
      .map(() => {
        return `
          <tr>
            <td colspan="7">
              <div class="skeleton-line"></div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  /* ===============================
     FILTERING + SEARCH
  ================================ */

  function populateDesignFilter() {
    const designs = [...new Set(state.orders.map((order) => order.design))];

    designFilter.innerHTML = `
      <option value="all">All Designs</option>
      ${designs.map((design) => `<option value="${design}">${design}</option>`).join("")}
    `;
  }

  function applyFilters() {
    const search = state.search.toLowerCase();

    state.filteredOrders = state.orders.filter((order) => {
      const matchesSearch =
        order.name.toLowerCase().includes(search) ||
        order.phone.toLowerCase().includes(search) ||
        order.design.toLowerCase().includes(search);

      const matchesDesign =
        state.design === "all" || order.design === state.design;

      return matchesSearch && matchesDesign;
    });

    renderTable();
    renderPagination();
  }

  orderSearch?.addEventListener("input", (event) => {
    state.search = event.target.value;
    state.currentPage = 1;
    applyFilters();
  });

  designFilter?.addEventListener("change", (event) => {
    state.design = event.target.value;
    state.currentPage = 1;
    applyFilters();
  });

  refreshDashboardBtn?.addEventListener("click", fetchOrders);

  /* ===============================
     ANALYTICS
  ================================ */

  function renderAnalytics() {
    const totalOrders = state.orders.length;

    const totalUnits = state.orders.reduce(
      (sum, order) => sum + order.quantity,
      0
    );

    const estimatedRevenue = state.orders.reduce(
      (sum, order) => sum + order.estimatedValue,
      0
    );

    const averageQuantity = totalOrders
      ? Math.round(totalUnits / totalOrders)
      : 0;

    totalOrdersEl.textContent = totalOrders;
    totalUnitsEl.textContent = totalUnits;
    estimatedRevenueEl.textContent = formatCurrency(estimatedRevenue);
    averageQuantityEl.textContent = averageQuantity;
  }

  /* ===============================
     TABLE
  ================================ */

  function getPaginatedOrders() {
    const start = (state.currentPage - 1) * state.perPage;
    const end = start + state.perPage;

    return state.filteredOrders.slice(start, end);
  }

  function renderTable() {
    const orders = getPaginatedOrders();

    if (!orders.length) {
      ordersTableBody.innerHTML = `
        <tr>
          <td colspan="7">No orders found.</td>
        </tr>
      `;
      return;
    }

    ordersTableBody.innerHTML = orders
      .map((order) => {
        return `
          <tr>
            <td><strong>${order.name}</strong></td>
            <td>${order.phone}</td>
            <td>${order.design}</td>
            <td>${order.quantity}</td>
            <td><span class="status-pill">${order.status}</span></td>
            <td>${formatDate(order.createdAt)}</td>
            <td>
              <button class="table-action-btn" data-view-order="${order.id}">
                View
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

    document.querySelectorAll("[data-view-order]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.viewOrder;
        const order = state.orders.find((item) => item.id === id);

        if (!order) return;

        openModal(`
          <h2>Order Details</h2>

          <div class="history-item">
            <strong>${order.name}</strong>
            <span>${order.phone}</span>
          </div>

          <div class="history-item">
          <img src="${order.artwork.url}" loading="lazy" decoding="async" alt="Uploaded artwork">
            <strong>${order.design}</strong>
            <span>${order.quantity} pieces</span><br>
            <span>Estimated value: ${formatCurrency(order.estimatedValue)}</span>
          </div>

          <div class="history-item">
            <strong>Status</strong>
            <span>${order.status}</span><br>
            <span>Submitted: ${formatDate(order.createdAt)}</span>
          </div>
        `);
      });
    });
  }

  /* ===============================
     PAGINATION
  ================================ */

  function renderPagination() {
    const totalPages = Math.ceil(state.filteredOrders.length / state.perPage);

    if (totalPages <= 1) {
      pagination.innerHTML = "";
      return;
    }

    pagination.innerHTML = Array.from({ length: totalPages })
      .map((_, index) => {
        const page = index + 1;

        return `
          <button class="${page === state.currentPage ? "active" : ""}" data-page="${page}">
            ${page}
          </button>
        `;
      })
      .join("");

    pagination.querySelectorAll("[data-page]").forEach((button) => {
      button.addEventListener("click", () => {
        state.currentPage = Number(button.dataset.page);
        renderTable();
        renderPagination();
      });
    });
  }

  /* ===============================
     VANILLA CANVAS CHART
  ================================ */

  function renderChart() {
    if (!chartCanvas || !chartContext) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = chartCanvas.getBoundingClientRect();

    chartCanvas.width = rect.width * dpr;
    chartCanvas.height = rect.height * dpr;

    chartContext.scale(dpr, dpr);
    chartContext.clearRect(0, 0, rect.width, rect.height);

    const grouped = state.orders.reduce((acc, order) => {
      acc[order.design] = (acc[order.design] || 0) + 1;
      return acc;
    }, {});

    const labels = Object.keys(grouped);
    const values = Object.values(grouped);

    if (!labels.length) {
      chartContext.fillStyle = "#666b76";
      chartContext.font = "14px Inter";
      chartContext.fillText("No order data available", 24, 42);
      return;
    }

    const max = Math.max(...values);
    const padding = 36;
    const gap = 18;
    const chartWidth = rect.width - padding * 2;
    const chartHeight = rect.height - padding * 2;
    const barWidth = chartWidth / labels.length - gap;

    labels.forEach((label, index) => {
      const value = grouped[label];
      const barHeight = (value / max) * chartHeight;

      const x = padding + index * (barWidth + gap);
      const y = rect.height - padding - barHeight;

      const gradient = chartContext.createLinearGradient(0, y, 0, rect.height);
      gradient.addColorStop(0, "#e63946");
      gradient.addColorStop(1, "rgba(230, 57, 70, 0.25)");

      chartContext.fillStyle = gradient;
      roundRect(chartContext, x, y, barWidth, barHeight, 10);
      chartContext.fill();

      chartContext.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--pf-text")
        .trim() || "#0f1115";

      chartContext.font = "700 13px Inter";
      chartContext.fillText(value, x + barWidth / 2 - 4, y - 8);

      chartContext.fillStyle = "#666b76";
      chartContext.font = "12px Inter";

      const shortLabel =
        label.length > 13 ? `${label.slice(0, 13)}...` : label;

      chartContext.fillText(shortLabel, x, rect.height - 12);
    });
  }

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  window.addEventListener("resize", renderChart);

  fetchOrders();
});

async function adminLogin(email, password) {
    const response = await fetch("http://127.0.0.1:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password })
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Login failed");

    localStorage.setItem("adminAccessToken", result.accessToken);
    accessToken = result.accessToken;
    localStorage.setItem("adminUser", JSON.stringify(result.user));
    
    window.location.href = "admin.html";
    return result;
}

async function fetchAdminOrders() {
  const token = localStorage.getItem("adminAccessToken");

  const response = await apiFetch("http://127.0.0.1:5000/api/orders?page=1&limit=10", {
    headers: {
      Authorization: `Bearer ${token}`
    },
    credentials: "include"
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Unable to fetch orders");
  }

  return result;
}

async function fetchDashboardStats() {

  const token =
    localStorage.getItem("adminAccessToken");

  const response = await apiFetch(
    "http://127.0.0.1:5000/api/dashboard/stats",
    {
      headers: {
        Authorization: `Bearer ${token}`
      },
      credentials: "include"
    }
  );

  const result = await response.json();

  if (!response.ok) {

    throw new Error(
      result.message ||
      "Unable to fetch dashboard stats"
    );

  }

  return result.data;

}

async function updateOrderStatus(
  orderMongoId,
  status,
  note
) {

  const token =
    localStorage.getItem("adminAccessToken");

  const response = await apiFetch(
    `http://127.0.0.1:5000/api/orders/${orderMongoId}/status`,
    {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      credentials: "include",

      body: JSON.stringify({
        status,
        note
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {

    throw new Error(
      result.message ||
      "Status update failed"
    );

  }

  return result.data;

}
