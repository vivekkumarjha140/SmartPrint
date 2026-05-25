const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true
    },

    orderId: {
      type: String,
      required: true,
      index: true
    },

    razorpayOrderId: {
      type: String,
      required: true,
      index: true
    },

    razorpayPaymentId: {
      type: String,
      default: "",
      index: true
    },

    razorpaySignature: {
      type: String,
      default: ""
    },

    amount: {
      type: Number,
      required: true
    },

    currency: {
      type: String,
      default: "INR"
    },

    status: {
      type: String,
      enum: ["created", "paid", "failed", "refunded"],
      default: "created",
      index: true
    },

    method: {
      type: String,
      default: "razorpay"
    },

    metadata: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);