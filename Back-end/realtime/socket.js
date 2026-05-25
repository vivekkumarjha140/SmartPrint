let ioInstance = null;

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const verifyAdminSocket = async (socket) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET
    );

    if (decoded.type === "refresh") {
      return null;
    }

    const user = await User.findById(decoded.id).select("role isActive");

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  } catch (error) {
    return null;
  }
};

const initSocket = (server) => {
  const { Server } = require("socket.io");

  const io = new Server(server, {
    cors: {
      origin: [
        process.env.CLIENT_URL,
        "http://127.0.0.1:5500",
        "http://localhost:5500"
      ].filter(Boolean),
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("admin:join", async () => {
      const user = await verifyAdminSocket(socket);

      if (!user || !["admin", "manager", "staff"].includes(user.role)) {
        socket.emit("auth:error", {
          message: "Not authorized for admin realtime updates"
        });
        return;
      }

      socket.join("admins");
    });

    socket.on("customer:join", (orderId) => {
      if (orderId) {
        socket.join(`order:${orderId}`);
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  ioInstance = io;
  return io;
};

const getIO = () => ioInstance;

const emitNewOrder = (order) => {
  if (!ioInstance) return;

  ioInstance.to("admins").emit("order:new", {
    orderId: order.orderId,
    name: order.name,
    design: order.design,
    quantity: order.quantity,
    status: order.status,
    createdAt: order.createdAt
  });
};

const emitOrderStatusUpdate = (order) => {
  if (!ioInstance) return;

  ioInstance.to("admins").emit("order:status-updated", {
    orderId: order.orderId,
    status: order.status
  });

  ioInstance.to(`order:${order.orderId}`).emit("order:status-updated", {
    orderId: order.orderId,
    status: order.status,
    statusHistory: order.statusHistory
  });
};

const emitOrderPaid = (order) => {
  if (!ioInstance) return;

  ioInstance.to("admins").emit("payment:received", {
    orderId: order.orderId,
    amount: order.pricing?.estimatedTotal,
    status: order.status
  });

  ioInstance.to(`order:${order.orderId}`).emit("payment:verified", {
    orderId: order.orderId,
    paymentStatus: "paid"
  });
};

module.exports = {
  initSocket,
  getIO,
  emitNewOrder,
  emitOrderStatusUpdate,
  emitOrderPaid
};
