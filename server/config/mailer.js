const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

// Brevo (formerly Sendinblue) SMTP configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // STARTTLS upgrades automatically
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD, // Brevo SMTP Key (not API key)
  },
});

// Verify connection on startup
transporter.verify((error) => {
  if (error) {
    logger.warn(`SMTP connection failed: ${error.message}. Emails will not be sent.`);
  } else {
    logger.info("SMTP mailer connected (Brevo) — ready to send emails");
  }
});

/**
 * Send an email via Brevo SMTP
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML body
 * @returns {Promise<object>} - Nodemailer send result
 */
const sendMail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"CodeX Live" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_EMAIL}>`,
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send email to ${to}: ${error.message}`);
    throw error;
  }
};

module.exports = { sendMail, transporter };
