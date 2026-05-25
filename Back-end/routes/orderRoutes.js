const express = require("express");

const {
  createOrder,
  getOrders,
  trackOrder,
  getOrderHistory,
  updateOrderStatus,
  sendOrderInvoice
} = require("../controllers/orderController");

const {
  protect,
  authorize
} = require("../middleware/authMiddleware");

const {
  validateCreateOrder,
  validateStatusUpdate,
  validateOrderQuery
} = require("../middleware/validationMiddleware");

const { uploadArtwork } = require("../middleware/uploadMiddleware");

const router = express.Router();

/**
 * Public customer routes
 */
router.post(
  "/",
  uploadArtwork.single("artwork"),
  validateCreateOrder,
  createOrder
);

router.get("/track/:orderId", trackOrder);

router.get("/history", getOrderHistory);

/**
 * Protected admin routes
 */
router.get(
  "/",
  protect,
  authorize("admin", "manager", "staff"),
  validateOrderQuery,
  getOrders
);

router.patch(
  "/:id/status",
  protect,
  authorize("admin", "manager"),
  validateStatusUpdate,
  updateOrderStatus
);

router.post(
  "/:id/send-invoice",
  protect,
  authorize("admin", "manager"),
  sendOrderInvoice
);

module.exports = router;