import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'd:/My Project/Payment Website/backend/.env' });

const testMail = async () => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: parseInt(process.env.SMTP_PORT || '587') === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: 'isyedibrahin10@gmail.com', // Sending specifically to the customer email
      subject: "Test Diagnostic Email",
      text: "This is a direct test to verify delivery to this inbox. If you see this, email delivery works!",
    });

    console.log('Direct email sent successfully to isyedibrahin10@gmail.com: %s', info.messageId);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
};

testMail();
