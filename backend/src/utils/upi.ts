import QRCode from 'qrcode';

interface UPIParams {
  upiId: string;
  businessName: string;
  amount: number;
  invoiceNumber: string;
}

/**
 * Generates a standard UPI Payment link.
 */
export const generateUPILink = ({ businessName, invoiceNumber }: UPIParams): string => {
  const encodedName = encodeURIComponent(businessName);
  const encodedTxn = encodeURIComponent(invoiceNumber);

  // Hardcoded sample UPI ID requested by user. Removed &am= parameter so customer enters amount manually.
  const sampleUpiId = "akashmanohar871@oksbi";

  return `upi://pay?pa=${sampleUpiId}&pn=${encodedName}&cu=INR&tn=${encodedTxn}`;
};

/**
 * Generates a Base64 QR Code string for a UPI Payment link.
 */
export const generateUPIQRCode = async (params: UPIParams): Promise<string> => {
  const upiLink = generateUPILink(params);
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(upiLink, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return qrCodeDataUrl; // Base64 Data URL (e.g. data:image/png;base64,...)
  } catch (error) {
    console.error('Error generating UPI QR Code:', error);
    throw new Error('Failed to generate UPI QR Code');
  }
};
