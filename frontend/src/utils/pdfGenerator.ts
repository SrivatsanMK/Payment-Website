import jsPDF from 'jspdf';
import { numberToWords } from './numberToWords';

/**
 * Loads an image from public directory as Base64 Data URL.
 * Adds a cache-busting timestamp to ensure the latest file is always fetched.
 */
const getImageBase64 = async (url: string): Promise<string | null> => {
  try {
    const cacheBust = `${url}?v=${Date.now()}`;
    const response = await fetch(cacheBust, { cache: 'no-store' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
};

/**
 * Helper to format dates as DD-MM-YYYY
 */
const formatDate = (dateInput: any): string => {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Helper to add 30 days to date
 */
const getDueDate = (createdAt: any): string => {
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return '-';
  d.setDate(d.getDate() + 30);
  return formatDate(d);
};

export const generateInvoicePdf = async (invoice: any, settings: any = {}): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;

  // Load logo fresh from public folder with cache-busting (always gets latest file)
  const logoBase64 = await getImageBase64('/invoice-logo.png');

  // Colors matching official reference image
  const navyColor: [number, number, number] = [0, 45, 98];       // #002D62
  const darkSlateColor: [number, number, number] = [15, 23, 42];  // #0F172A
  const slateColor: [number, number, number] = [51, 65, 85];     // #334155
  const lightSlateColor: [number, number, number] = [100, 116, 139]; // #64748B
  const borderColor: [number, number, number] = [203, 213, 225]; // #CBD5E1
  const greenAccent: [number, number, number] = [22, 163, 74];   // #16A34A
  const lightGreenBg: [number, number, number] = [220, 252, 231]; // #DCFCE7

  // ═══════════════════════════════════════════════════════════
  // 1. TOP HEADER SECTION
  // ═══════════════════════════════════════════════════════════

  // Company Logo (Top Left - Clean Auto Aspect Ratio)
  if (logoBase64) {
    try {
      // Original logo aspect ratio (1.5 : 1)
      const originalWidth = 1536;
      const originalHeight = 1024;

      // Desired display width & height
      const logoWidth = 72;
      const logoHeight = (logoWidth * originalHeight) / originalWidth; // 48mm

      doc.addImage(
        logoBase64,
        "PNG",
        8,          // X
        4,          // Y
        logoWidth,
        logoHeight
      );
    } catch (e) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(...greenAccent);
      doc.text("GREEN GLIDE LOGISTICS", 10, 18);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...greenAccent);
    doc.text("GREEN GLIDE LOGISTICS", 10, 18);
  }

  // Meta Table Box (Top Right under title)
  const metaBoxX = 126;
  const metaBoxY = 17;
  const metaBoxW = 74;
  const metaBoxH = 27;

  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.rect(metaBoxX, metaBoxY, metaBoxW, metaBoxH);

  // Meta rows
  const metaRows = [
    { key: "Invoice No.", val: invoice.invoiceNumber || "INV-2025-0001" },
    { key: "Invoice Date", val: formatDate(invoice.createdAt) },
    { key: "Due Date", val: getDueDate(invoice.createdAt) },
    { key: "Place of Supply", val: settings.placeOfSupply || "Tamil Nadu (33)" }
  ];

  let metaY = metaBoxY + 5.5;
  metaRows.forEach((row, idx) => {
    if (idx > 0) {
      doc.setDrawColor(...borderColor);
      doc.line(metaBoxX, metaY - 4, metaBoxX + metaBoxW, metaY - 4);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...slateColor);
    doc.text(`${row.key}   :`, metaBoxX + 3, metaY);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkSlateColor);
    doc.text(row.val, metaBoxX + metaBoxW - 3, metaY, { align: "right" });

    metaY += 5.5;
  });

  // ═══════════════════════════════════════════════════════════
  // 2. COMPANY CONTACT STRIP
  // ═══════════════════════════════════════════════════════════
  const contactY = 57;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...slateColor);

  const companyAddress = "45 Sundaram Street, R. S. Puram, Coimbatore 641001";
  const companyPhone = "+91 98765 43210";
  const companyEmail = "greenglidelogistics@gmail.com";
  const contactText = `${companyAddress}   |   ${companyPhone}   |   ${companyEmail}`;
  doc.text(contactText, pageWidth / 2, contactY, { align: "center" });

  doc.setDrawColor(...borderColor);
  doc.line(10, contactY + 3, 200, contactY + 3);

  // ═══════════════════════════════════════════════════════════
  // 3. BILL TO & TRANSPORT CARDS (SHIP TO REMOVED)
  // ═══════════════════════════════════════════════════════════
  const cardY = 64;
  const cardH = 30;
  const customer = invoice.customer || {};

  // --- BILL TO CARD ---
  const billX = 10;
  const billW = 115;
  doc.setDrawColor(...borderColor);
  doc.rect(billX, cardY, billW, cardH);

  // Header strip
  doc.setFillColor(...navyColor);
  doc.rect(billX, cardY, billW, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("BILL TO", billX + 4, cardY + 5);

  // Content
  doc.setTextColor(...darkSlateColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(customer.name || "Customer Name", billX + 4, cardY + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...slateColor);
  doc.text(customer.address || "Coimbatore, Tamil Nadu 641001, India", billX + 4, cardY + 18, { maxWidth: billW - 8 });
  doc.text(`Phone: ${customer.phone || "+91 90000 00000"}`, billX + 4, cardY + 24);
  doc.text(`GSTIN: ${customer.gstNumber || "33AAAAA0000A1Z5"}`, billX + 4, cardY + 29);

  // --- TRANSPORT DETAILS BOX ---
  const transX = 129;
  const transW = 71;
  doc.setDrawColor(...borderColor);
  doc.rect(transX, cardY, transW, cardH);

  let transY = cardY + 11;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...slateColor);

  doc.text("Transport Mode   :", transX + 4, transY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkSlateColor);
  doc.text(invoice.transportMode || "Road", transX + transW - 4, transY, { align: "right" });

  transY += 10;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...slateColor);
  doc.text("Vehicle No.           :", transX + 4, transY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkSlateColor);
  doc.text(invoice.vehicleNumber || invoice.vehicleNo || "TN 38 AB 1234", transX + transW - 4, transY, { align: "right" });


  // ═══════════════════════════════════════════════════════════
  // 4. PRODUCTS & SERVICES TABLE
  // ═══════════════════════════════════════════════════════════
  const tableY = 98;
  const tableH = 82;

  // Exact non-overlapping column definitions
  const columns = [
    { header: "#", x: 10, width: 8, align: "center" },
    { header: "Description of Goods", x: 18, width: 56, align: "left" },
    { header: "HSN / SAC", x: 74, width: 18, align: "center" },
    { header: "Quantity", x: 92, width: 18, align: "right" },
    { header: "Unit Price (Rs.)", x: 110, width: 24, align: "right" },
    { header: "Discount (Rs.)", x: 134, width: 24, align: "right" },
    { header: "GST (%)", x: 158, width: 16, align: "center" },
    { header: "Amount (Rs.)", x: 174, width: 26, align: "right" }
  ];

  // Outer Table Box
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.rect(10, tableY, 190, tableH);

  // Header Background Fill
  doc.setFillColor(...navyColor);
  doc.rect(10, tableY, 190, 8, "F");

  // Draw Header Labels
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);

  columns.forEach((col) => {
    let posX = col.x + 2;
    if (col.align === "right") posX = col.x + col.width - 2;
    if (col.align === "center") posX = col.x + (col.width / 2);

    doc.text(col.header, posX, tableY + 5.5, { align: col.align as any });
  });

  // Vertical Grid Lines across entire table height
  doc.setDrawColor(...borderColor);
  let curColX = 10;
  columns.forEach((col, idx) => {
    if (idx > 0) {
      doc.line(curColX, tableY, curColX, tableY + tableH);
    }
    curColX += col.width;
  });

  // Render Product Rows
  const products = invoice.products || [];
  let rowY = tableY + 8;
  const rowHeight = 7.5;
  const gstRate = invoice.gst || 0;
  const discountPerItem = (invoice.discount || 0) / (products.length || 1);

  let subtotal = 0;

  products.forEach((prod: any, idx: number) => {
    if (idx >= 9) return; // Prevent overflowing table box

    const lineTotal = prod.price * prod.quantity;
    subtotal += lineTotal;

    const rowMidY = rowY + 5.2;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...darkSlateColor);

    // 1. Line Index (#)
    doc.text(String(idx + 1), columns[0].x + (columns[0].width / 2), rowMidY, { align: "center" });

    // 2. Product Name / Description
    doc.setFont("helvetica", "bold");
    doc.text(prod.name || "Standard Goods Item", columns[1].x + 2, rowMidY, { maxWidth: columns[1].width - 4 });

    // 3. HSN / SAC
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slateColor);
    doc.text(prod.hsn || "0603", columns[2].x + (columns[2].width / 2), rowMidY, { align: "center" });

    // 4. Quantity
    doc.text(Number(prod.quantity).toLocaleString('en-IN'), columns[3].x + columns[3].width - 2, rowMidY, { align: "right" });

    // 5. Unit Price
    doc.text(Number(prod.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), columns[4].x + columns[4].width - 2, rowMidY, { align: "right" });

    // 6. Discount
    const discText = discountPerItem > 0 ? Number(discountPerItem).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-";
    doc.text(discText, columns[5].x + columns[5].width - 2, rowMidY, { align: "right" });

    // 7. GST Rate
    doc.text(`${gstRate}%`, columns[6].x + (columns[6].width / 2), rowMidY, { align: "center" });

    // 8. Line Total Amount
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkSlateColor);
    doc.text(Number(lineTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), columns[7].x + columns[7].width - 2, rowMidY, { align: "right" });

    // Horizontal Row Separator Line
    doc.setDrawColor(...borderColor);
    doc.line(10, rowY + rowHeight, 200, rowY + rowHeight);

    rowY += rowHeight;
  });


  // ═══════════════════════════════════════════════════════════
  // 5. BOTTOM SUMMARY & TOTALS SECTION
  // ═══════════════════════════════════════════════════════════
  const summaryY = 186;
  const discount = invoice.discount || 0;
  const taxableAmount = Math.max(0, subtotal - discount);
  const cgstRate = gstRate / 2;
  const sgstRate = gstRate / 2;
  const cgstAmt = taxableAmount * (cgstRate / 100);
  const sgstAmt = taxableAmount * (sgstRate / 100);
  const grandTotal = invoice.finalAmount || (taxableAmount + cgstAmt + sgstAmt);

  // --- LEFT SUMMARY BOXES ---
  const leftBoxW = 112;

  // Box 1: Amount in Words
  doc.setDrawColor(...borderColor);
  doc.rect(10, summaryY, leftBoxW, 16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...navyColor);
  doc.text("Amount in Words", 14, summaryY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkSlateColor);
  doc.text(numberToWords(grandTotal), 14, summaryY + 11.5, { maxWidth: leftBoxW - 8 });

  // Box 2: Notes / Terms & Conditions
  const notesY = summaryY + 19;
  const notesH = 29;
  doc.setDrawColor(...borderColor);
  doc.rect(10, notesY, leftBoxW, notesH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...navyColor);
  doc.text("Notes / Terms & Conditions", 14, notesY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...slateColor);
  doc.text("1. Goods once sold will not be taken back.", 14, notesY + 11.5);
  doc.text("2. Please make payment within the due date.", 14, notesY + 16.5);
  doc.text("3. Subject to Coimbatore Jurisdiction.", 14, notesY + 21.5);


  // --- RIGHT TOTALS TABLE ---
  const rightX = 127;
  const rightW = 73;
  const totalsY = summaryY;
  const totalsH = 48;

  doc.setDrawColor(...borderColor);
  doc.rect(rightX, totalsY, rightW, totalsH);

  const totalsRows = [
    { label: "Subtotal", val: `Rs. ${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { label: `CGST (${cgstRate}%)`, val: `Rs. ${cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { label: `SGST (${sgstRate}%)`, val: `Rs. ${sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
  ];

  let curTotY = totalsY + 6.5;
  totalsRows.forEach((row) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...slateColor);
    doc.text(row.label, rightX + 4, curTotY);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkSlateColor);
    doc.text(row.val, rightX + rightW - 4, curTotY, { align: "right" });

    doc.setDrawColor(...borderColor);
    doc.line(rightX, curTotY + 3.5, rightX + rightW, curTotY + 3.5);

    curTotY += 9;
  });

  // Grand Total Highlighted Row (Light Green fill)
  const grandY = totalsY + 34;
  doc.setFillColor(...lightGreenBg);
  doc.rect(rightX, grandY, rightW, 14, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...navyColor);
  doc.text("Grand Total", rightX + 4, grandY + 8.5);

  doc.setFontSize(11);
  doc.text(`Rs. ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightX + rightW - 4, grandY + 8.5, { align: "right" });


  // ═══════════════════════════════════════════════════════════
  // 6. FOOTER & SYSTEM-GENERATED NOTICE (SIGNATURE REMOVED)
  // ═══════════════════════════════════════════════════════════
  const footerY = 242;

  // Green accent horizontal line
  doc.setDrawColor(...greenAccent);
  doc.setLineWidth(0.6);
  doc.line(10, footerY, 200, footerY);

  // Signatory Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...navyColor);
  doc.text("For Green Glide Logistics", 196, footerY + 10, { align: "right" });

  // System-generated notice text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...slateColor);
  doc.text("This is a system-generated document. No signature is required", 196, footerY + 18, { align: "right" });

  // Thank You Banner (Bottom Center)
  const thankY = 278;
  doc.setDrawColor(...greenAccent);
  doc.setLineWidth(0.4);
  doc.line(55, thankY - 1.5, 75, thankY - 1.5);
  doc.line(135, thankY - 1.5, 155, thankY - 1.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...navyColor);
  doc.text("Thank You For Your Business!", pageWidth / 2, thankY, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...lightSlateColor);
  doc.text("We appreciate your trust and look forward to serving you again.", pageWidth / 2, thankY + 4.5, { align: "center" });

  return doc;
};
