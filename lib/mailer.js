const nodemailer = require("nodemailer");

const isMailConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!isMailConfigured()) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
};

const sendMailSafe = async ({ to, subject, text, html }) => {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("SMTP not configured: skipping email send");
    return { skipped: true };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transporter.sendMail({ from, to, subject, text, html });
  return { skipped: false };
};

const sendComplaintReceived = async (complaint) => {
  const subject = `Ticket registered — ${complaint.ref_number}`;
  const text = `Hello ${complaint.name},

Your support ticket has been registered successfully.

Reference: ${complaint.ref_number}
Category: ${complaint.category}
Subject: ${complaint.subject}
Priority: ${complaint.priority}

Track status anytime using your reference number on the portal.

Thank you,
ComplainHub`;

  return sendMailSafe({
    to: complaint.email,
    subject,
    text,
    html: `<p>Hello ${complaint.name},</p><p>Your <strong>ticket</strong> is registered.</p><p><strong>Reference:</strong> ${complaint.ref_number}</p>`
  });
};

const sendStatusUpdate = async (complaint) => {
  const subject = `Ticket update — ${complaint.ref_number}`;
  const text = `Hello ${complaint.name},

Your ticket status has been updated.

Reference: ${complaint.ref_number}
New status: ${complaint.status}

Thank you,
ComplainHub`;

  return sendMailSafe({
    to: complaint.email,
    subject,
    text,
    html: `<p>Hello ${complaint.name},</p><p><strong>Reference:</strong> ${complaint.ref_number}</p><p><strong>Status:</strong> ${complaint.status}</p>`
  });
};

module.exports = {
  isMailConfigured,
  sendComplaintReceived,
  sendStatusUpdate,
  sendMailSafe
};
