const baseLayout = ({ title, content }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        body {
          margin: 0;
          padding: 0;
          background: #f4f4f5;
          font-family: Arial, sans-serif;
          color: #111827;
        }

        .wrapper {
          width: 100%;
          padding: 32px 16px;
        }

        .container {
          max-width: 640px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 16px 40px rgba(0,0,0,0.08);
        }

        .header {
          background: #0f1115;
          color: #ffffff;
          padding: 28px;
        }

        .header h1 {
          margin: 0;
          font-size: 24px;
        }

        .content {
          padding: 28px;
        }

        .card {
          background: #f7f7f8;
          border-radius: 14px;
          padding: 18px;
          margin: 18px 0;
        }

        .button {
          display: inline-block;
          background: #e63946;
          color: #ffffff !important;
          padding: 12px 18px;
          border-radius: 999px;
          text-decoration: none;
          font-weight: bold;
          margin-top: 14px;
        }

        .footer {
          padding: 22px 28px;
          color: #6b7280;
          font-size: 13px;
          border-top: 1px solid #e5e7eb;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <h1>${title}</h1>
          </div>

          <div class="content">
            ${content}
          </div>

          <div class="footer">
            PrintForge Studio · Premium Custom Garment Printing
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

const customerConfirmationTemplate = (order) => {
  return baseLayout({
    title: "Your Order Request Was Received",
    content: `
      <p>Hi ${order.name},</p>

      <p>Thank you for contacting PrintForge Studio. We received your custom printing request.</p>

      <div class="card">
        <p><strong>Order ID:</strong> ${order.orderId}</p>
        <p><strong>Design:</strong> ${order.design}</p>
        <p><strong>Quantity:</strong> ${order.quantity}</p>
        <p><strong>Status:</strong> ${order.status}</p>
        <p><strong>Estimated Total:</strong> $${Number(order.pricing.estimatedTotal || 0).toFixed(2)}</p>
      </div>

      <p>Our production team will review your artwork and contact you with the final quotation.</p>
    `
  });
};

const adminNotificationTemplate = (order) => {
  return baseLayout({
    title: "New Custom Printing Order",
    content: `
      <p>A new order request has been submitted.</p>

      <div class="card">
        <p><strong>Order ID:</strong> ${order.orderId}</p>
        <p><strong>Customer:</strong> ${order.name}</p>
        <p><strong>Phone:</strong> ${order.phone}</p>
        <p><strong>Email:</strong> ${order.email || "Not provided"}</p>
        <p><strong>Design:</strong> ${order.design}</p>
        <p><strong>Quantity:</strong> ${order.quantity}</p>
        <p><strong>Estimated Total:</strong> $${Number(order.pricing.estimatedTotal || 0).toFixed(2)}</p>
      </div>
    `
  });
};

const invoiceTemplate = (order) => {
  return baseLayout({
    title: "Your PrintForge Invoice",
    content: `
      <p>Hi ${order.name},</p>

      <p>Your invoice details are below.</p>

      <div class="card">
        <p><strong>Invoice For:</strong> ${order.orderId}</p>
        <p><strong>Product:</strong> ${order.design}</p>
        <p><strong>Quantity:</strong> ${order.quantity}</p>
        <p><strong>Unit Price:</strong> $${Number(order.pricing.unitPrice || 0).toFixed(2)}</p>
        <p><strong>Discount:</strong> ${order.pricing.discountPercent || 0}%</p>
        <p><strong>Total:</strong> $${Number(order.pricing.estimatedTotal || 0).toFixed(2)}</p>
      </div>

      <p>Thank you for choosing PrintForge Studio.</p>
    `
  });
};

module.exports = {
  customerConfirmationTemplate,
  adminNotificationTemplate,
  invoiceTemplate
};