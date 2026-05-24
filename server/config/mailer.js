const axios = require("axios");
const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

// Brevo SMTP configuration (fallback / dev mode)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // STARTTLS upgrades automatically
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD, // Brevo SMTP Key (not API key)
  },
});

// Verify SMTP connection on startup if not in production or if SMTP is explicitly preferred
if (!process.env.SMTP_API_KEY) {
  transporter.verify((error) => {
    if (error) {
      logger.warn(`SMTP connection failed: ${error.message}. Emails will not be sent via SMTP.`);
    } else {
      logger.info("SMTP mailer connected (Brevo) — ready to send emails");
    }
  });
}

/**
 * Send an email via Brevo REST API (preferred in production to avoid SMTP port blocking) or SMTP fallback
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML body
 * @returns {Promise<object>} - Send result info
 */
const sendMail = async (to, subject, html) => {
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_EMAIL;

  // 1. Try Brevo REST API first if API key is present (unblocked in production)
  if (process.env.SMTP_API_KEY) {
    try {
      logger.info(`Attempting to send email via Brevo REST API to ${to}...`);
      const response = await axios.post(
        "https://api.brevo.com/v3/smtp/email",
        {
          sender: { name: "CodeX Live", email: fromEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        },
        {
          headers: {
            "api-key": process.env.SMTP_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );
      logger.info(`Email sent via Brevo REST API to ${to}: ${response.data.messageId || "Success"}`);
      return response.data;
    } catch (apiError) {
      const errorMsg = apiError.response?.data?.message || apiError.message;
      logger.warn(`Brevo REST API failed: ${errorMsg}. Falling back to SMTP...`);
    }
  }

  // 2. Fallback to SMTP
  try {
    logger.info(`Sending email via SMTP to ${to}...`);
    const info = await transporter.sendMail({
      from: `"CodeX Live" <${fromEmail}>`,
      to,
      subject,
      html,
    });
    logger.info(`Email sent via SMTP to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send email via SMTP to ${to}: ${error.message}`);
    throw error;
  }
};

module.exports = { sendMail, transporter };
