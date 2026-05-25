const crypto = require("crypto");
const razorpay = require("../config/razorpay");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const asyncHandler = require("../utils/asyncHandler");
const { emitOrderPaid } = require("../realtime/socket");

/**
 * @desc    Create Razorpay payment order
 * @route   POST /api/payments/create
 * @access  Public or Protected depending on your flow
 */
const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  const order = await Order.findOne({ orderId });

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Factory order not found"
    });
  }

  if (order.payment?.isPaid) {
    return res.status(400).json({
      success: false,
      message: "This order is already paid"
    });
  }

  const amount = Math.round(Number(order.pricing?.estimatedTotal || 0) * 100);

  if (!amount || amount < 100) {
    return res.status(400).json({
      success: false,
      message: "Invalid payable amount"
    });
  }

  const razorpayOrder = await razorpay.orders.create({
    amount,
    currency: "INR",
    receipt: order.orderId,
    notes: {
      factoryOrderId: order.orderId,
      customerName: order.name,
      phone: order.phone
    }
  });

  const payment = await Payment.create({
    order: order._id,
    orderId: order.orderId,
    razorpayOrderId: razorpayOrder.id,
    amount,
    currency: "INR",
    status: "created"
  });

  order.payment.paymentStatus = "created";
  order.payment.paymentId = payment._id;
  await order.save();

  res.status(200).json({
    success: true,
    key: process.env.RAZORPAY_KEY_ID,
    data: {
      factoryOrderId: order.orderId,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      customer: {
        name: order.name,
        phone: order.phone,
        email: order.email
      }
    }
  });
});

/**
 * @desc    Verify Razorpay payment
 * @route   POST /api/payments/verify
 * @access  Public
 */
const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = req.body;

  const payment = await Payment.findOne({
    razorpayOrderId: razorpay_order_id
  });

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: "Payment record not found"
    });
  }

  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generatedSignature !== razorpay_signature) {
    payment.status = "failed";
    await payment.save();

    return res.status(400).json({
      success: false,
      message: "Payment verification failed"
    });
  }

  payment.razorpayPaymentId = razorpay_payment_id;
  payment.razorpaySignature = razorpay_signature;
  payment.status = "paid";
  await payment.save();

  const order = await Order.findById(payment.order);

  order.payment.isPaid = true;
  order.payment.paymentStatus = "paid";
  order.payment.paidAt = new Date();

  if (order.status === "pending") {
    order.status = "approved";
    order.statusHistory.push({
      status: "approved",
      note: "Payment verified successfully"
    });
  }

  await order.save();

  emitOrderPaid(order);

  res.status(200).json({
    success: true,
    message: "Payment verified successfully",
    data: {
      orderId: order.orderId,
      paymentStatus: order.payment.paymentStatus,
      status: order.status
    }
  });
});

/**
 * @desc    Razorpay webhook
 * @route   POST /api/payments/webhook
 * @access  Razorpay
 */
const razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (signature !== expectedSignature) {
    return res.status(400).json({
      success: false,
      message: "Invalid webhook signature"
    });
  }

  const event = req.body.event;

  if (event === "payment.captured") {
    const entity = req.body.payload.payment.entity;

    await Payment.findOneAndUpdate(
      { razorpayPaymentId: entity.id },
      {
        status: "paid",
        metadata: entity
      }
    );
  }

  res.status(200).json({
    success: true,
    received: true
  });
});

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
  razorpayWebhook
};