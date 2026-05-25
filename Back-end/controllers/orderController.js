const cloudinary = require("../config/cloudinary");
const Order = require("../models/Order");
const asyncHandler = require("../utils/asyncHandler");
const { emitNewOrder, emitOrderStatusUpdate } = require("../realtime/socket");
const {sendOrderStatusNotification,sendDeliveryNotification} = require("../services/twilioService");
const { clearCacheByPattern } = require("../middleware/cacheMiddleware");

const {
  sendCustomerConfirmationEmail,
  sendAdminNotificationEmail,
  sendInvoiceEmail
} = require("../utils/emailService");

const priceMap = {
  "Custom T-Shirts": 12,
  "Sports Jerseys": 18,
  "College Merch": 14,
  "Custom Hoodies": 28,
  "Corporate Uniforms": 22
};

const getDiscount = (quantity) => {
  if (quantity >= 500) return 22;
  if (quantity >= 250) return 16;
  if (quantity >= 100) return 10;
  if (quantity >= 50) return 6;
  return 0;
};

const calculatePricing = (design, quantity) => {
  const unitPrice = priceMap[design] || 12;
  const discountPercent = getDiscount(quantity);

  const subtotal = unitPrice * quantity;
  const discountAmount = subtotal * (discountPercent / 100);
  const estimatedTotal = subtotal - discountAmount;

  return {
    unitPrice,
    discountPercent,
    estimatedTotal
  };
};

const uploadToCloudinary = (fileBuffer, folder = "printforge-artwork") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto"
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(fileBuffer);
  });
};

/**
 * @desc    Create order
 * @route   POST /api/orders
 * @access  Public
 */
const createOrder = asyncHandler(async (req, res) => {
  const { name, phone, email, quantity, design } = req.body;

  const numericQuantity = Number(quantity);
  const pricing = calculatePricing(design, numericQuantity);

  let artwork = {
    url: "",
    publicId: "",
    originalName: "",
    fileType: ""
  };

  if (req.file) {
    const uploadResult = await uploadToCloudinary(req.file.buffer);
    const optimizedUrl = cloudinary.url(uploadResult.public_id, {
        fetch_format: "auto",
        quality: "auto",
        width: 1200,
        crop: "limit",
        secure: true
      });

    artwork = {
      url: optimizedUrl,
      publicId: uploadResult.public_id,
      originalName: req.file.originalname,
      fileType: req.file.mimetype
    };
  }

  const order = await Order.create({
    name,
    phone,
    email,
    quantity: numericQuantity,
    design,
    pricing,
    artwork,
    status: "pending",
    statusHistory: [
      {
        status: "pending",
        note: "Order request submitted by customer"
      }
    ]
  });

  /**
   * Email should not block order creation.
   */
  Promise.allSettled([
    sendCustomerConfirmationEmail(order),
    sendAdminNotificationEmail(order)
  ]).catch((error) => {
    console.error("Email sending failed:", error.message);
  });

  // Emit real-time notification for the new order
    emitNewOrder(order);

    await clearCacheByPattern("dashboard:*");

    res.status(201).json({
      success: true,
      message: "Order submitted successfully",
      data: order
    });
});

/**
 * @desc    Get all orders with pagination/filter/search
 * @route   GET /api/orders
 * @access  Private/Admin
 */
const getOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    design,
    search,
    from,
    to
  } = req.query;

  const query = {};

  if (status && status !== "all") {
    query.status = status;
  }

  if (design && design !== "all") {
    query.design = design;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { orderId: { $regex: search, $options: "i" } },
      { design: { $regex: search, $options: "i" } }
    ];
  }

  if (from || to) {
    query.createdAt = {};

    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }

  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  const skip = (pageNumber - 1) * limitNumber;

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .populate("createdBy", "name email role"),

    Order.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    count: orders.length,
    total,
    page: pageNumber,
    pages: Math.ceil(total / limitNumber),
    data: orders
  });
});

/**
 * @desc    Track order by public order ID
 * @route   GET /api/orders/track/:orderId
 * @access  Public
 */
const trackOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId }).select(
    "orderId name phone design quantity status statusHistory createdAt updatedAt"
  );

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found"
    });
  }

  res.status(200).json({
    success: true,
    data: order
  });
});

/**
 * @desc    Customer order history by phone
 * @route   GET /api/orders/history?phone=xxxx
 * @access  Public
 */
const getOrderHistory = asyncHandler(async (req, res) => {
  const { phone } = req.query;

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: "Phone number is required"
    });
  }

  const orders = await Order.find({ phone })
    .sort({ createdAt: -1 })
    .select("orderId name phone design quantity status pricing createdAt");

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders
  });
});

/**
 * @desc    Update order status
 * @route   PATCH /api/orders/:id/status
 * @access  Private/Admin or Manager
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note = "" } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found"
    });
  }

  order.status = status;

  order.statusHistory.push({
    status,
    note,
    updatedBy: req.user._id,
    updatedAt: new Date()
  });

  await order.save();
  emitOrderStatusUpdate(order);
  await clearCacheByPattern("dashboard:*");

  Promise.allSettled([
  sendOrderStatusNotification(order),
  status === "delivered" ? sendDeliveryNotification(order) : Promise.resolve()
]).then(async () => {
  order.delivery.lastNotificationAt = new Date();

  if (status === "delivered") {
    order.delivery.smsSent = true;
    order.delivery.whatsappSent = true;
  }

  await order.save();
}).catch((error) => {
  console.error("Twilio notification failed:", error.message);
});

  /**
   * Optional: send invoice automatically when delivered.
   */
  if (status === "delivered") {
    Promise.allSettled([sendInvoiceEmail(order)]).catch((error) => {
      console.error("Invoice email failed:", error.message);
    });
  }

  res.status(200).json({
    success: true,
    message: "Order status updated successfully",
    data: order
  });
});

/**
 * @desc    Send invoice email manually
 * @route   POST /api/orders/:id/send-invoice
 * @access  Private/Admin or Manager
 */
const sendOrderInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found"
    });
  }

  if (!order.email) {
    return res.status(400).json({
      success: false,
      message: "Customer email is not available"
    });
  }

  await sendInvoiceEmail(order);

  res.status(200).json({
    success: true,
    message: "Invoice email sent successfully"
  });
});

module.exports = {
  createOrder,
  getOrders,
  trackOrder,
  getOrderHistory,
  updateOrderStatus,
  sendOrderInvoice
};