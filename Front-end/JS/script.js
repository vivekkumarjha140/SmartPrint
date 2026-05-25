/* =====================================================
   PrintForge Studio Website JavaScript
   Features:
   - Sticky navbar scroll effect
   - Mobile hamburger menu
   - Smooth nav close on link click
   - Active section highlighting
   - Gallery filtering
   - LocalStorage order system
   - Form validation
   - Reveal animations
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const siteHeader = document.getElementById("siteHeader");
  const menuToggle = document.getElementById("menuToggle");
  const navMenu = document.getElementById("navMenu");
  const navLinks = document.querySelectorAll(".nav-link");

  const filterButtons = document.querySelectorAll(".filter-btn");
  const galleryCards = document.querySelectorAll(".gallery-card");

  const orderForm = document.getElementById("orderForm");
  const successMessage = document.getElementById("successMessage");

  const revealElements = document.querySelectorAll(".reveal");

  /* ===============================
     STICKY NAVBAR SCROLL EFFECT
  ================================ */

  function handleHeaderScroll() {
    if (window.scrollY > 30) {
      siteHeader.classList.add("scrolled");
    } else {
      siteHeader.classList.remove("scrolled");
    }
  }

  window.addEventListener("scroll", handleHeaderScroll);
  handleHeaderScroll();

  /* ===============================
     MOBILE MENU TOGGLE
  ================================ */

  menuToggle.addEventListener("click", () => {
    menuToggle.classList.toggle("active");
    navMenu.classList.toggle("active");
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      menuToggle.classList.remove("active");
      navMenu.classList.remove("active");
    });
  });

  /* ===============================
     ACTIVE NAVIGATION ON SCROLL
  ================================ */

  const sections = document.querySelectorAll("section[id]");

  function activateNavLink() {
    const scrollPosition = window.scrollY + 130;

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute("id");

      if (
        scrollPosition >= sectionTop &&
        scrollPosition < sectionTop + sectionHeight
      ) {
        navLinks.forEach((link) => {
          link.classList.remove("active");

          if (link.getAttribute("href") === `#${sectionId}`) {
            link.classList.add("active");
          }
        });
      }
    });
  }

  window.addEventListener("scroll", activateNavLink);
  activateNavLink();

  /* ===============================
     FILTERABLE GALLERY
  ================================ */

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filterValue = button.dataset.filter;

      filterButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      galleryCards.forEach((card) => {
        const cardCategory = card.dataset.category;

        if (filterValue === "all" || filterValue === cardCategory) {
          card.classList.remove("hide");
        } else {
          card.classList.add("hide");
        }
      });
    });
  });

  /* ===============================
     FORM VALIDATION HELPERS
  ================================ */

 function showError(input, message) {

  const formGroup = input.closest(".form-group");

  if (!formGroup) return;

  const errorMessage =
    formGroup.querySelector(".error-message");

  formGroup.classList.add("error");

  if (errorMessage) {
    errorMessage.textContent = message;
  }
}

function clearError(input) {

  const formGroup = input.closest(".form-group");

  if (!formGroup) return;

  const errorMessage =
    formGroup.querySelector(".error-message");

  formGroup.classList.remove("error");

  if (errorMessage) {
    errorMessage.textContent = "";
  }
}

  function isValidPhone(phone) {
    /*
      Accepts common phone formats:
      +1 555 123 4567
      555-123-4567
      5551234567
    */
    const phoneRegex = /^[+]?[\d\s\-()]{7,20}$/;
    return phoneRegex.test(phone);
  }

  function validateForm() {
    let isValid = true;

    const name = document.getElementById("name");
    const phone = document.getElementById("phone");
    const quantity = document.getElementById("quantity");
    const design = document.getElementById("design");

    const nameValue = name.value.trim();
    const phoneValue = phone.value.trim();
    const quantityValue = Number(quantity.value);
    const designValue = design.value;

    // Name validation
    if (nameValue.length < 2) {
      showError(name, "Please enter your full name.");
      isValid = false;
    } else {
      clearError(name);
    }

    // Phone validation
    if (!isValidPhone(phoneValue)) {
      showError(phone, "Please enter a valid phone number.");
      isValid = false;
    } else {
      clearError(phone);
    }

    // Quantity validation
    if (!quantityValue || quantityValue < 10) {
      showError(quantity, "Minimum order quantity is 10 pieces.");
      isValid = false;
    } else {
      clearError(quantity);
    }

    // Design validation
    if (!designValue) {
      showError(design, "Please select a design or product type.");
      isValid = false;
    } else {
      clearError(design);
    }

    return isValid;
  }

  /* ===============================
     LOCALSTORAGE ORDER SYSTEM
  ================================ */


if (orderForm) {

  orderForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    successMessage.classList.remove("show");

    if (!validateForm()) {
      return;
    }

    try {

      const formData = new FormData();

      formData.append(
        "name",
        document.getElementById("name").value.trim()
      );

      formData.append(
        "phone",
        document.getElementById("phone").value.trim()
      );

      formData.append(
        "email",
        document.getElementById("email")?.value.trim() || ""
      );

      formData.append(
        "quantity",
        document.getElementById("quantity").value
      );

      formData.append(
        "design",
        document.getElementById("design").value
      );

      const artworkFile =
        document.getElementById("artworkFile")?.files[0];

      if (artworkFile) {
        formData.append("artwork", artworkFile);
      }

      console.log("Submitting Order...");

      for (let pair of formData.entries()) {
        console.log(pair[0], pair[1]);
      }

      const response = await fetch(
        "http://127.0.0.1:5000/api/orders",
        {
          method: "POST",
          body: formData
        }
      );

      const result = await response.json();

      console.log("Backend Response:", result);

      if (!response.ok) {

        const validationErrors = result.errors
          ?.map((err) => err.message)
          ?.join("\n");

        throw new Error(
          validationErrors ||
          result.message ||
          "Order submission failed"
        );
      }

      console.log("Order saved:", result.data);

      const createdOrderId = result.data.orderId;

      if (confirm("Order created. Pay now?")) {
        payForOrder(createdOrderId);
      }
      orderForm.reset();

      successMessage.classList.add("show");

      setTimeout(() => {
        successMessage.classList.remove("show");
      }, 6000);

    } catch (error) {

      console.error("Order Submit Error:", error);

      alert(error.message);

    }

  });

  /* Clear input errors while user types */
  orderForm.querySelectorAll("input, select").forEach((field) => {

    field.addEventListener("input", () => clearError(field));

    field.addEventListener("change", () => clearError(field));

  });

}

  /* ===============================
     REVEAL ANIMATIONS ON SCROLL
  ================================ */

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
    }
  );

  revealElements.forEach((element) => {
    revealObserver.observe(element);
  });

  async function trackOrder(orderId) {
  const response = await fetch(`http://127.0.0.1:5000/api/orders/track/${orderId}`);

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Order not found");
  }

  return result.data;
}

// Backend Connection
fetch("http://127.0.0.1:5000")
.then(res => res.text())
.then(data => {
    console.log(data);
});

/* ===============================
   REALTIME ORDER TRACKING
================================ */

const params = new URLSearchParams(window.location.search);

const orderId = params.get("orderId");

if (orderId) {

  const socket = io("http://127.0.0.1:5000");

  socket.emit("customer:join", orderId);

  socket.on("order:status-updated", (data) => {

    console.log("Live tracking update:", data);

    const statusElement =
      document.getElementById("orderStatus");

    if (statusElement && data.status) {
      statusElement.textContent = data.status;
    }

  });

}

async function payForOrder(factoryOrderId) {
  const createRes = await fetch("http://127.0.0.1:5000/api/payments/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      orderId: factoryOrderId
    })
  });

  const createResult = await createRes.json();

  if (!createRes.ok) {
    throw new Error(createResult.message || "Unable to create payment");
  }

  const paymentData = createResult.data;

  const options = {
    key: createResult.key,
    amount: paymentData.amount,
    currency: paymentData.currency,
    name: "PrintForge Studio",
    description: `Payment for order ${paymentData.factoryOrderId}`,
    order_id: paymentData.razorpayOrderId,

    prefill: {
      name: paymentData.customer.name,
      email: paymentData.customer.email,
      contact: paymentData.customer.phone
    },

    theme: {
      color: "#e63946"
    },

    handler: async function (response) {
      const verifyRes = await fetch("http://127.0.0.1:5000/api/payments/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(response)
      });

      const verifyResult = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyResult.message || "Payment verification failed");
      }

      alert("Payment successful!");
      console.log(verifyResult);
    }
  };

  const razorpay = new Razorpay(options);
  razorpay.open();
}

async function getAIRecommendation() {

  const response = await fetch(
    "http://127.0.0.1:5000/api/ai/recommend",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        businessType: "fitness brand",
        audience: "young athletes",
        colorPreference: "black and red",
        garmentType: "performance t-shirt",
        occasion: "merch launch"
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "AI recommendation failed"
    );
  }

  console.log("AI Recommendation:", result.data);
}

getAIRecommendation();

});