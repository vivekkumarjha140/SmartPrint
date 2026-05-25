const mongoose = require("mongoose");

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "in_production",
        "ready",
        "delivered",
        "cancelled"
      ],
      required: true
    },

    note: {
      type: String,
      trim: true,
      default: ""
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    _id: false
  }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true
    },

    name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      index: true
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      index: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      index: true
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"]
    },

    design: {
      type: String,
      required: [true, "Design selection is required"],
      trim: true,
      index: true
    },

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "in_production",
        "ready",
        "delivered",
        "cancelled"
      ],
      default: "pending",
      index: true
    },

    pricing: {
      unitPrice: {
        type: Number,
        default: 0
      },

      discountPercent: {
        type: Number,
        default: 0
      },

      estimatedTotal: {
        type: Number,
        default: 0
      }
    },

    artwork: {
      url: {
        type: String,
        default: ""
      },

      publicId: {
        type: String,
        default: ""
      },

      originalName: {
        type: String,
        default: ""
      },

      fileType: {
        type: String,
        default: ""
      }
    },

    statusHistory: {
      type: [statusHistorySchema],
      default: []
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    payment: {
      isPaid: {
        type: Boolean,
        default: false,
        index: true
      },

      paymentStatus: {
        type: String,
        enum: ["unpaid", "created", "paid", "failed", "refunded"],
        default: "unpaid",
        index: true
      },

      paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment",
        default: null
      },

      paidAt: {
        type: Date,
        default: null
      }
    },

    delivery: {
      smsSent: {
        type: Boolean,
        default: false
      },

      whatsappSent: {
        type: Boolean,
        default: false
      },

      lastNotificationAt: {
        type: Date,
        default: null
      }
    }
  },
  {
    timestamps: true
  }
);

/**
 * Generate human-readable unique order ID.
 */
orderSchema.pre("validate", function (next) {
  if (!this.orderId) {
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    const time = Date.now().toString(36).toUpperCase();

    this.orderId = `PF-${time}-${random}`;
  }

  next();
});

/**
 * Indexes for faster admin filtering/searching.
 */
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ design: 1, createdAt: -1 });
orderSchema.index({ phone: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
