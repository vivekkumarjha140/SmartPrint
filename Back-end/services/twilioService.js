const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const normalizePhone = (phone) => {
  if (!phone) return "";
  return phone.startsWith("+") ? phone : `+91${phone}`;
};

const sendSMS = async ({ to, message }) => {
  if (!process.env.TWILIO_ACCOUNT_SID) return null;

  return client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: normalizePhone(to)
  });
};

const sendWhatsApp = async ({ to, message }) => {
  if (!process.env.TWILIO_ACCOUNT_SID) return null;

  return client.messages.create({
    body: message,
    from: process.env.TWILIO_WHATSAPP_NUMBER,
    to: `whatsapp:${normalizePhone(to)}`
  });
};

const sendOrderStatusNotification = async (order) => {
  const message = `PrintForge Update: Your order ${order.orderId} is now ${order.status}.`;

  const results = await Promise.allSettled([
    sendSMS({ to: order.phone, message }),
    sendWhatsApp({ to: order.phone, message })
  ]);

  return results;
};

const sendDeliveryNotification = async (order) => {
  const message = `PrintForge: Your custom garment order ${order.orderId} has been delivered. Thank you for choosing us!`;

  const results = await Promise.allSettled([
    sendSMS({ to: order.phone, message }),
    sendWhatsApp({ to: order.phone, message })
  ]);

  return results;
};

module.exports = {
  sendSMS,
  sendWhatsApp,
  sendOrderStatusNotification,
  sendDeliveryNotification
};