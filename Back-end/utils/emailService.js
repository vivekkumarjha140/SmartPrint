const nodemailer = require("nodemailer");
const {
  customerConfirmationTemplate,
  adminNotificationTemplate,
  invoiceTemplate
} = require("./emailTemplates");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const fromAddress = `"${process.env.MAIL_FROM_NAME || "PrintForge Studio"}" <${process.env.MAIL_FROM_EMAIL}>`;

const sendEmail = async ({ to, subject, html }) => {
  if (!to) return;

  await transporter.sendMail({
    from: fromAddress,
    to,
    subject,
    html
  });
};

const sendCustomerConfirmationEmail = async (order) => {
  if (!order.email) return;

  await sendEmail({
    to: order.email,
    subject: `Order Request Received - ${order.orderId}`,
    html: customerConfirmationTemplate(order)
  });
};

const sendAdminNotificationEmail = async (order) => {
  await sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: `New Printing Order - ${order.orderId}`,
    html: adminNotificationTemplate(order)
  });
};

const sendInvoiceEmail = async (order) => {
  if (!order.email) return;

  await sendEmail({
    to: order.email,
    subject: `Invoice for Your PrintForge Order - ${order.orderId}`,
    html: invoiceTemplate(order)
  });
};

module.exports = {
  sendCustomerConfirmationEmail,
  sendAdminNotificationEmail,
  sendInvoiceEmail
};