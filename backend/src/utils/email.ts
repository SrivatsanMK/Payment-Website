import transporter from '../config/mail';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: any[];
}

export const sendEmail = async ({ to, subject, html, attachments }: EmailOptions): Promise<boolean> => {
  const from = process.env.EMAIL_FROM || '"Dealer Payment System" <noreply@dealer.com>';
  
  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text: html.replace(/<[^>]*>/g, ''), // Strip tags for text fallback
      attachments,
    });
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    return false;
  }
};

/**
 * Sends a one-time OTP for password recovery.
 */
export const sendOTPEmail = async (email: string, name: string, otp: string): Promise<boolean> => {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff; color: #333333;">
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">
        <h2 style="color: #4f46e5; margin: 0;">Dealer Payment Hub</h2>
      </div>
      <p>Hello <strong>${name}</strong>,</p>
      <p>We received a request to access your account security. Use the verification code below to proceed. This code is valid for <strong>5 minutes</strong>.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; padding: 12px 24px; background-color: #f3f4f6; border-radius: 8px; border: 1px dashed #4f46e5; color: #4f46e5; display: inline-block;">
          ${otp}
        </span>
      </div>
      
      <p style="font-size: 13px; color: #6b7280; text-align: center; margin-top: 30px;">
        If you did not request this, please secure your account credentials immediately.
      </p>
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject: 'Your Password Reset OTP - Dealer Payments',
    html,
  });
};

/**
 * Sends a new invoice creation email notification.
 */
export const sendInvoiceEmail = async (
  email: string, 
  name: string, 
  invoiceNumber: string, 
  amount: number, 
  dueDate: string,
  products: any[] = [],
  subtotal: number = 0,
  discountAmount: number = 0,
  gstRate: number = 0
): Promise<boolean> => {
  const cgst = gstRate / 2;
  const sgst = gstRate / 2;
  
  let productsHtml = '';
  if (products && products.length > 0) {
    productsHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
        <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #64748b;">
          <th style="padding: 12px; text-align: left;">Item</th>
          <th style="padding: 12px; text-align: center;">Qty</th>
          <th style="padding: 12px; text-align: right;">Price</th>
          <th style="padding: 12px; text-align: right;">Total</th>
        </tr>
        ${products.map(p => `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px; color: #334155; font-weight: 500;">${p.name}</td>
            <td style="padding: 12px; text-align: center; color: #64748b;">${p.quantity}</td>
            <td style="padding: 12px; text-align: right; color: #64748b;">₹${parseFloat(p.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td style="padding: 12px; text-align: right; color: #334155; font-weight: 500;">₹${(p.price * p.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        `).join('')}
      </table>
      
      <div style="margin-top: 20px; border-top: 2px solid #e2e8f0; padding-top: 15px;">
        <h4 style="margin: 0 0 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Billing Breakdown</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Items Subtotal</td>
            <td style="padding: 6px 0; text-align: right; color: #334155; font-weight: 500;">₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          ${discountAmount > 0 ? `
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Discount</td>
            <td style="padding: 6px 0; text-align: right; color: #ef4444; font-weight: 500;">-₹${discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 6px 0; color: #64748b;">% CGST (${cgst}%)</td>
            <td style="padding: 6px 0; text-align: right; color: #334155; font-weight: 500;">₹${(Math.max(0, subtotal - discountAmount) * (cgst / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">% SGST (${sgst}%)</td>
            <td style="padding: 6px 0; text-align: right; color: #334155; font-weight: 500;">₹${(Math.max(0, subtotal - discountAmount) * (sgst / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr style="border-top: 1px solid #e2e8f0;">
            <td style="padding: 12px 0; color: #4f46e5; font-weight: bold; font-size: 16px;">Grand Total</td>
            <td style="padding: 12px 0; text-align: right; color: #4f46e5; font-weight: bold; font-size: 16px;">₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        </table>
      </div>
    `;
  }

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff; color: #333333;">
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">
        <h2 style="color: #4f46e5; margin: 0;">New Invoice Issued</h2>
      </div>
      <p>Hello <strong>${name}</strong>,</p>
      <p>A new invoice has been issued to your account. Below are the invoice summary details:</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 10px;">
          <div>
            <span style="font-size: 12px; color: #64748b; text-transform: uppercase;">Invoice Details</span><br>
            <strong style="color: #334155;">${invoiceNumber}</strong>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 12px; color: #64748b; text-transform: uppercase;">Invoice Date</span><br>
            <strong style="color: #334155;">${dueDate}</strong>
          </div>
        </div>
        
        ${productsHtml || `
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Total Amount</th>
              <td style="padding: 10px; border: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          </table>
        `}
      </div>
      
      <p>Please log in to your account dashboard to view the complete details and complete the payment using UPI, QR Code, or other options.</p>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">Log in & Pay Now</a>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject: `Invoice ${invoiceNumber} Created - Dealer Payments`,
    html,
  });
};

/**
 * Sends payment confirmation receipt.
 */
export const sendPaymentConfirmationEmail = async (
  email: string,
  name: string,
  invoiceNumber: string,
  amount: number,
  transactionId: string,
  method: string
): Promise<boolean> => {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff; color: #333333;">
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #10b981; padding-bottom: 10px;">
        <h2 style="color: #10b981; margin: 0;">Payment Confirmation</h2>
      </div>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Thank you for your payment. We have successfully processed your transaction. Here is your receipt summary:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background-color: #f9fafb;">
          <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Invoice Number</th>
          <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>${invoiceNumber}</strong></td>
        </tr>
        <tr>
          <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Amount Paid</th>
          <td style="padding: 10px; border: 1px solid #e5e7eb; color: #059669; font-weight: bold;">₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr style="background-color: #f9fafb;">
          <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Transaction ID</th>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${transactionId || 'N/A'}</td>
        </tr>
        <tr>
          <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Payment Method</th>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${method}</td>
        </tr>
      </table>
      
      <p>All records have been updated in your dashboard. If you have any questions, please contact our support team.</p>
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject: `Payment Receipt for ${invoiceNumber} - Dealer Payments`,
    html,
  });
};

/**
 * Sends an email notification when an invoice is updated.
 */
export const sendInvoiceUpdateEmail = async (
  email: string,
  name: string,
  invoiceNumber: string,
  changeMessage: string
): Promise<boolean> => {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff; color: #333333;">
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">
        <h2 style="color: #f59e0b; margin: 0;">Invoice Updated</h2>
      </div>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your invoice <strong>${invoiceNumber}</strong> has been updated by the Admin. Here are the details of the update:</p>
      
      <div style="margin: 20px 0; padding: 15px; background-color: #fffbeb; border-left: 4px solid #f59e0b; color: #92400e;">
        ${changeMessage}
      </div>
      
      <p>Please log in to your account dashboard to view the complete updated invoice details.</p>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">Log in & View Invoice</a>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject: `Update on Invoice ${invoiceNumber} - Dealer Payments`,
    html,
  });
};

/**
 * Sends an alert to the Admin when a customer clicks the "Pay via UPI Apps" button.
 */
export const sendPaymentAttemptAlertEmail = async (
  adminEmail: string,
  adminName: string,
  customerName: string,
  invoiceNumber: string,
  amount: number,
  timestamp: string
): Promise<boolean> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #121212; color: #ffffff; border-radius: 8px;">
      <p style="margin-top: 0;">Hi <strong>${adminName}</strong>,</p>
      <p style="color: #e0e0e0; line-height: 1.5;">
        A customer has just clicked the payment button for a direct UPI transfer. Please verify if the funds have reached your account and manually update the invoice status.
      </p>
      
      <h3 style="color: #ffffff; border-bottom: 1px solid #333; padding-bottom: 8px; margin-top: 30px;">Payment Attempt Details</h3>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr style="border-bottom: 1px solid #333;">
          <th style="padding: 12px 0; text-align: left; color: #a0a0a0; font-weight: bold;">Customer</th>
          <td style="padding: 12px 0; text-align: left; color: #ffffff;">${customerName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #333;">
          <th style="padding: 12px 0; text-align: left; color: #a0a0a0; font-weight: bold;">Invoice #</th>
          <td style="padding: 12px 0; text-align: left; color: #ffffff;">${invoiceNumber}</td>
        </tr>
        <tr style="border-bottom: 1px solid #333;">
          <th style="padding: 12px 0; text-align: left; color: #a0a0a0; font-weight: bold;">Amount</th>
          <td style="padding: 12px 0; text-align: left; color: #ffffff;">₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr style="border-bottom: 1px solid #333;">
          <th style="padding: 12px 0; text-align: left; color: #a0a0a0; font-weight: bold;">Timestamp</th>
          <td style="padding: 12px 0; text-align: left; color: #ffffff;">${timestamp}</td>
        </tr>
      </table>
    </div>
  `;
  
  return sendEmail({
    to: adminEmail,
    subject: `⚠️ Payment Alert: ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} initiated by ${customerName}`,
    html,
  });
};

/**
 * Sends payment confirmation receipt with PDF attachment.
 */
export const sendPaymentConfirmationWithPdfEmail = async (
  email: string,
  name: string,
  invoiceNumber: string,
  amount: number,
  adminName: string,
  adminPhone: string,
  base64PdfString: string
): Promise<boolean> => {
  // Strip out "data:application/pdf;filename=generated.pdf;base64," prefix if it exists
  const base64Data = base64PdfString.replace(/^data:application\/pdf.*?;base64,/, "");

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff; color: #333333;">
      <p>Dear <strong>${name}</strong>,</p>
      
      <p>Thank you for your recent payment of <strong>₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>. This email confirms that your payment for invoice <strong>${invoiceNumber}</strong> has been successfully received and processed.</p>
      
      <p>For your convenience, we have attached a copy of the finalized invoice to this email.</p>
      
      <p>You can also view and download this invoice at any time by logging into your account on our website:<br/>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="color: #4f46e5; font-weight: bold;">Login to Customer Portal</a></p>
      
      <p>If you have any questions regarding this transaction, please feel free to reach out. Thank you for your business!</p>
      
      <p>Best regards,<br/>
      <strong>${adminName}</strong><br/>
      ${adminPhone}</p>
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject: `Payment Confirmation & Invoice Attached - ${invoiceNumber}`,
    html,
    attachments: [
      {
        filename: `Invoice_${invoiceNumber}.pdf`,
        content: base64Data,
        encoding: 'base64'
      }
    ]
  });
};
