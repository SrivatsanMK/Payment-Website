import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || '587');
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

let transporter: nodemailer.Transporter;

if (smtpHost && smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
} else {
  // Mock transporter that logs to console
  transporter = {
    sendMail: async (mailOptions: any) => {
      console.log('----------------------------------------------------');
      console.log('EMAIL SIMULATOR (No SMTP credentials provided in .env)');
      console.log(`To: ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`Body (Text): ${mailOptions.text}`);
      console.log('----------------------------------------------------');
      return { messageId: 'mock-id-' + Date.now() };
    },
  } as unknown as nodemailer.Transporter;
}

export default transporter;
