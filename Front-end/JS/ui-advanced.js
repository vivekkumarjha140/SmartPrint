/* =====================================================
   ADVANCED UI LOGIC
   Works as an upgrade layer on top of existing frontend.
===================================================== */


document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = window.PRINTFORGE_API_BASE || "http://localhost:5000/api";

  const orderForm = document.getElementById("orderForm");
  const themeToggle = document.getElementById("themeToggle");
  const themeIcon = themeToggle?.querySelector(".theme-icon");

  const quantityInput = document.getElementById("quantity");
  const designSelect = document.getElementById("design");
  const artworkFile = document.getElementById("artworkFile");
  const filePreview = document.getElementById("filePreview");

  const previewTotal = document.getElementById("previewTotal");
  const previewDesign = document.getElementById("previewDesign");
  const previewQuantity = document.getElementById("previewQuantity");
  const previewUnit = document.getElementById("previewUnit");
  const previewDiscount = document.getElementById("previewDiscount");

  const trackingForm = document.getElementById("trackingForm");
  const trackingPhone = document.getElementById("trackingPhone");
  const trackingResult = document.getElementById("trackingResult");

  const customerHistory = document.getElementById("customerHistory");
  const clearHistoryBtn = document.getElementById("clearHistoryBtn");

  const profileName = document.getElementById("profileName");
  const profilePhone = document.getElementById("profilePhone");

  /* ===============================
     THEME PERSISTENCE
  ================================ */

  const savedTheme = localStorage.getItem("pf-theme") || "light";

  if (savedTheme === "dark") {
    document.documentElement.classList.add("dark");
    if (themeIcon) themeIcon.textContent = "☀️";
  }

  themeToggle?.addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle("dark");

    localStorage.setItem("pf-theme", isDark ? "dark" : "light");

    if (themeIcon) {
      themeIcon.textContent = isDark ? "☀️" : "🌙";
    }

    showToast({
      type: "info",
      title: isDark ? "Dark mode enabled" : "Light mode enabled",
      message: "Your theme preference has been saved."
    });
  });

  /* ===============================
     TOAST NOTIFICATIONS
  ================================ */

  function showToast({ type = "info", title = "Notification", message = "" }) {
    let container = document.getElementById("toastContainer");

    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const iconMap = {
      success: "✓",
      error: "!",
      info: "i"
    };

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    toast.innerHTML = `
      <div class="toast-icon">${iconMap[type] || "i"}</div>
      <div>
        <strong>${title}</strong>
        <p>${message}</p>
      </div>
      <button type="button" aria-label="Close notification">×</button>
    `;

    const closeToast = () => {
      toast.classList.add("hide");
      setTimeout(() => toast.remove(), 260);
    };

    toast.querySelector("button").addEventListener("click", closeToast);

    container.appendChild(toast);

    setTimeout(closeToast, 4200);
  }

  window.PFToast = showToast;

  /* ===============================
     MODAL HELPERS
  ================================ */

  const modal = document.getElementById("pfModal");
  const modalContent = document.getElementById("pfModalContent");

  function openModal(html) {
    if (!modal || !modalContent) return;

    modalContent.innerHTML = html;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    if (!modal) return;

    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  }

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  window.PFModal = {
    open: openModal,
    close: closeModal
  };

  /* ===============================
     DYNAMIC PRICING
  ================================ */

  const priceMap = {
    "Custom T-Shirts": 12,
    "Sports Jerseys": 18,
    "College Merch": 14,
    "Custom Hoodies": 28,
    "Corporate Uniforms": 22
  };

  function getDiscount(quantity) {
    if (quantity >= 500) return 0.22;
    if (quantity >= 250) return 0.16;
    if (quantity >= 100) return 0.1;
    if (quantity >= 50) return 0.06;
    return 0;
  }

  function calculateEstimate() {
    const design = designSelect?.value || "";
    const quantity = Number(quantityInput?.value) || 0;

    const unitPrice = priceMap[design] || 0;
    const discount = getDiscount(quantity);
    const subtotal = unitPrice * quantity;
    const total = subtotal - subtotal * discount;

    return {
      design,
      quantity,
      unitPrice,
      discount,
      total
    };
  }

  function updateOrderPreview() {
    if (!previewTotal) return;

    const estimate = calculateEstimate();

    previewDesign.textContent = estimate.design || "Not selected";
    previewQuantity.textContent = `${estimate.quantity} pcs`;
    previewUnit.textContent = `$${estimate.unitPrice.toFixed(2)}`;
    previewDiscount.textContent = `${Math.round(estimate.discount * 100)}%`;
    previewTotal.textContent = `$${estimate.total.toFixed(2)}`;
  }

  quantityInput?.addEventListener("input", updateOrderPreview);
  designSelect?.addEventListener("change", updateOrderPreview);
  updateOrderPreview();

  /* ===============================
     FILE UPLOAD PREVIEW
  ================================ */

  artworkFile?.addEventListener("change", () => {
    const file = artworkFile.files[0];

    if (!filePreview) return;

    if (!file) {
      filePreview.innerHTML = `<span>No artwork uploaded yet</span>`;
      return;
    }

    if (!file.type.startsWith("image/")) {
      filePreview.innerHTML = `<span>Unsupported file type</span>`;
      showToast({
        type: "error",
        title: "Invalid file",
        message: "Please upload an image file."
      });
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      filePreview.innerHTML = `
        <img src="${reader.result}" alt="Uploaded artwork preview">
      `;
    };

    reader.readAsDataURL(file);
  });

  /* ===============================
     LOCAL CUSTOMER HISTORY
  ================================ */

  function getLocalHistory() {
    return JSON.parse(localStorage.getItem("pf-customer-orders") || "[]");
  }

  function saveLocalOrder(order) {
    const history = getLocalHistory();

    history.unshift(order);

    localStorage.setItem(
      "pf-customer-orders",
      JSON.stringify(history.slice(0, 12))
    );
  }

  function updateProfile() {
    const history = getLocalHistory();

    if (!history.length) return;

    profileName && (profileName.textContent = history[0].name);
    profilePhone && (profilePhone.textContent = history[0].phone);
  }

  function renderCustomerHistory() {
    if (!customerHistory) return;

    const history = getLocalHistory();

    if (!history.length) {
      customerHistory.innerHTML = `
        <p class="muted-text">No local order history yet. Submit an order to see it here.</p>
      `;
      return;
    }

    customerHistory.innerHTML = history
      .map((order) => {
        const date = new Date(order.createdAt).toLocaleDateString();

        return `
          <div class="history-item">
            <strong>${order.design} — ${order.quantity} pcs</strong>
            <span>${order.name} · ${order.phone}</span><br>
            <span>Estimate: $${Number(order.estimatedTotal || 0).toFixed(2)} · ${date}</span>
          </div>
        `;
      })
      .join("");
  }

  clearHistoryBtn?.addEventListener("click", () => {
    localStorage.removeItem("pf-customer-orders");
    renderCustomerHistory();
    updateProfile();

    showToast({
      type: "info",
      title: "History cleared",
      message: "Local customer order history has been removed."
    });
  });

  setTimeout(() => {
    renderCustomerHistory();
    updateProfile();
  }, 500);

  /* ===============================
     ORDER TRACKING UI
  ================================ */

  trackingForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const phone = trackingPhone.value.trim();
    const history = getLocalHistory();

    const matches = history.filter((order) => order.phone.includes(phone));

    if (!phone) {
      trackingResult.innerHTML = `<p class="muted-text">Please enter a phone number.</p>`;
      return;
    }

    if (!matches.length) {
      trackingResult.innerHTML = `
        <p class="muted-text">No recent local orders found for this phone number.</p>
      `;
      return;
    }

    trackingResult.innerHTML = matches
      .map((order) => {
        return `
          <div class="history-item">
            <strong>${order.design}</strong>
            <span>Status: New Inquiry</span><br>
            <span>Quantity: ${order.quantity} pcs</span>
          </div>
        `;
      })
      .join("");
  });

  /* ===============================
     ENHANCED FORM SUBMISSION
     This intercepts submit and prevents duplicate handlers.
  ================================ */

  function validateOrderPayload(payload) {
    if (!payload.name || payload.name.length < 2) {
      return "Please enter your full name.";
    }

    if (!payload.phone || payload.phone.length < 7) {
      return "Please enter a valid phone number.";
    }

    if (!payload.quantity || payload.quantity < 10) {
      return "Minimum order quantity is 10 pieces.";
    }

    if (!payload.design) {
      return "Please select a product or design type.";
    }

    return null;
  }

  orderForm?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const submitButton = orderForm.querySelector('button[type="submit"]');

      const estimate = calculateEstimate();

      const payload = {
        name: document.getElementById("name")?.value.trim(),
        phone: document.getElementById("phone")?.value.trim(),
        quantity: Number(document.getElementById("quantity")?.value),
        design: document.getElementById("design")?.value,
        estimatedTotal: estimate.total,
        createdAt: new Date().toISOString()
      };

      const validationError = validateOrderPayload(payload);

      if (validationError) {
        showToast({
          type: "error",
          title: "Check your order",
          message: validationError
        });
        return;
      }

      try {
        submitButton?.classList.add("loading");
        submitButton && (submitButton.disabled = true);

        const response = await fetch(`${API_BASE}/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Unable to submit order.");
        }

        const savedOrder = {
          ...payload,
          id: result.data?._id || crypto.randomUUID?.() || Date.now().toString()
        };

        saveLocalOrder(savedOrder);
        renderCustomerHistory();
        updateProfile();

        showToast({
          type: "success",
          title: "Order request submitted",
          message: "Your inquiry was saved successfully. Our team will contact you soon."
        });

        openModal(`
          <h2>Order Request Received</h2>
          <p>Your custom printing request has been submitted successfully.</p>

          <div class="history-item">
            <strong>${payload.design}</strong>
            <span>${payload.quantity} pieces</span><br>
            <span>Estimated total: $${payload.estimatedTotal.toFixed(2)}</span>
          </div>

          <p class="muted-text">
            This is an estimated price. Final quotation will be confirmed after artwork review.
          </p>
        `);

        orderForm.reset();
        updateOrderPreview();

        if (filePreview) {
          filePreview.innerHTML = `<span>No artwork uploaded yet</span>`;
        }
      } catch (error) {
        showToast({
          type: "error",
          title: "Submission failed",
          message: error.message || "Please try again later."
        });
      } finally {
        submitButton?.classList.remove("loading");
        submitButton && (submitButton.disabled = false);
      }
    },
    true
  );

  /* ===============================
     PREMIUM POINTER HOVER EFFECT
  ================================ */

  document
    .querySelectorAll(".service-card, .featured-card, .gallery-card")
    .forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();

        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;

        card.style.setProperty("--mx", `${x}%`);
        card.style.setProperty("--my", `${y}%`);
      });
    });

  /* ===============================
     LAZY LOAD FALLBACK
  ================================ */

  document.querySelectorAll("img:not([loading])").forEach((img) => {
    img.setAttribute("loading", "lazy");
  });
});