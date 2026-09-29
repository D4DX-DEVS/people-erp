const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const orgConfig = require('../config/orgConfig');

// Page constants (A4 in points)
const PAGE_W = 595;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2; // 515
const BOX_X = MARGIN;
const BOX_W = CONTENT_W;
const PAD = 12;                      // inner padding on both sides of a box
const INNER_X = MARGIN + PAD;        // left inner edge
const INNER_R = PAGE_W - MARGIN - PAD; // right inner edge — values stop here
const HEAD_H = 22;                   // section heading band
const TOP_PAD = 9;                   // band bottom → first row
const BOT_PAD = 3;                   // last row → box bottom
const LOGO_W  = 110;                 // header logo box width (wordmark-friendly)
const LOGO_H  = 52;                  // header logo box height
const ROW_H = 18;                    // row height within tables
const SEC_GAP = 10;                  // gap between sections

// Column grid
const LABEL_W = 105;                 // left label column
const L_VAL_X = MARGIN + 120;        // left value column start
const L_VAL_W = 140;                 // left value column width
const R_COL_X = MARGIN + 268;        // right label column start
const R_LABEL_W = 90;                // right label column width
const R_VAL_X = MARGIN + 360;        // right value column start
const R_VAL_W = INNER_R - (MARGIN + 360); // right value width, stops at inner edge

// Print-safe neutral palette
const INK = '#111827';
const MUTED = '#6b7280';
const RULE = '#c9cdd3';
const BAND = '#f2f4f6';

class PDFReceiptService {
  constructor() {
    this.logoPath = orgConfig.logoPath;
    this.outputDir = path.join(__dirname, '../../receipts');
    
    this.org = {
      name: orgConfig.displayName.toUpperCase(),
      regNumber: orgConfig.regNumber,
      address: orgConfig.address,
      phone: orgConfig.phone,
      email: orgConfig.email,
      website: orgConfig.website
    };
    
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async generatePaymentReceipt(paymentData) {
    try {
      const fileName = `receipt-${paymentData.paymentNumber}.pdf`;
      const filePath = path.join(this.outputDir, fileName);
      
      const doc = new PDFDocument({
        size: 'A4',
        margin: MARGIN,
        autoFirstPage: true,
        info: {
          Title: `Payment Receipt - ${paymentData.paymentNumber}`,
          Author: orgConfig.erpTitle,
          Subject: 'Payment Receipt',
          Creator: `${orgConfig.erpTitle} System`
        }
      });

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      this._addHeader(doc);
      this._addReceiptTitle(doc);
      this._addPaymentDetails(doc, paymentData);
      this._addBeneficiaryDetails(doc, paymentData);
      this._addFinancialBreakdown(doc, paymentData);
      this._addBankDetails(doc, paymentData);
      this._addFooter(doc);

      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
        doc.on('error', reject);
      });

    } catch (error) {
      console.error('❌ Error generating PDF receipt:', error);
      throw error;
    }
  }

  // ─── private helpers ────────────────────────────────────────────────────────

  /** Height of a section box holding `rows` rows */
  _sectionHeight(rows) {
    return HEAD_H + TOP_PAD + rows * ROW_H + BOT_PAD;
  }

  /**
   * Draw a value that always stays on a single line: shrink a little to make a
   * long one fit, and only then trim it with an ellipsis. Wrapping here would
   * run the text into the row below.
   */
  _value(doc, text, x, y, width, size = 9) {
    let fontSize = size;
    doc.font('Helvetica-Bold').fontSize(fontSize);
    while (fontSize > 7 && doc.widthOfString(text) > width) {
      fontSize -= 0.5;
      doc.fontSize(fontSize);
    }

    let out = text;
    if (doc.widthOfString(out) > width) {
      while (out.length > 1 && doc.widthOfString(`${out}…`) > width) out = out.slice(0, -1);
      out = `${out.replace(/\s+$/, '')}…`;
    }

    doc.fillColor(INK).text(out, x, y + (size - fontSize) / 2, { width, lineBreak: false });
  }

  /** Render a label + value pair at exact coordinates, clamped to column widths */
  _field(doc, labelX, labelW, valueX, valueW, y, label, value) {
    doc.fontSize(8.5).font('Helvetica').fillColor(MUTED)
       .text(label, labelX, y + 1, { width: labelW, lineBreak: false });
    this._value(doc, String(value || 'N/A'), valueX, y, valueW);
  }

  /** Draw a section box with its shaded heading band */
  _section(doc, y, h, title) {
    // Heading band first, then the outline on top so the border stays crisp
    doc.save().rect(BOX_X + 0.5, y + 0.5, BOX_W - 1, HEAD_H).fill(BAND).restore();
    doc.lineWidth(0.8).strokeColor(RULE).rect(BOX_X, y, BOX_W, h).stroke();
    doc.lineWidth(0.8).strokeColor(RULE)
       .moveTo(BOX_X, y + HEAD_H).lineTo(BOX_X + BOX_W, y + HEAD_H).stroke();

    doc.fontSize(9).font('Helvetica-Bold').fillColor(INK)
       .text(title, INNER_X, y + 7, { lineBreak: false, characterSpacing: 0.6 });
  }

  /** First content row of a section box */
  _rowY(startY) {
    return startY + HEAD_H + TOP_PAD;
  }

  // ─── sections ───────────────────────────────────────────────────────────────

  _addHeader(doc) {
    let hasLogo = false;
    try {
      if (this.logoPath && fs.existsSync(this.logoPath)) {
        // 'fit' scales the logo proportionally inside the box, so a wide wordmark
        // and a square mark both render undistorted. Org presets can point at an
        // SVG wordmark, which pdfkit cannot rasterize — fall back to text-only.
        doc.image(this.logoPath, MARGIN, 42, { fit: [LOGO_W, LOGO_H], align: 'left', valign: 'center' });
        hasLogo = true;
      }
    } catch (e) { /* unsupported image format — header still renders without it */ }

    const textX = hasLogo ? MARGIN + LOGO_W + 10 : MARGIN;
    const textW  = hasLogo ? CONTENT_W - LOGO_W - 10 : CONTENT_W;

    doc.fontSize(15).font('Helvetica-Bold').fillColor(INK)
       .text(this.org.name, textX, 44, { width: textW, lineBreak: false, characterSpacing: 0.3 });

    doc.fontSize(8).font('Helvetica').fillColor(MUTED)
       .text(`Registered NGO  |  Reg. No: ${this.org.regNumber}`, textX, 64, { width: textW, lineBreak: false })
       .text(this.org.address,                                    textX, 77, { width: textW, lineBreak: false })
       .text(`${this.org.phone}  |  ${this.org.email}  |  ${this.org.website}`, textX, 90, { width: textW, lineBreak: false });

    doc.lineWidth(1.2).strokeColor(INK)
       .moveTo(MARGIN, 112).lineTo(PAGE_W - MARGIN, 112).stroke();
    doc.y = 124;
  }

  _addReceiptTitle(doc) {
    const y = doc.y;
    doc.fontSize(13).font('Helvetica-Bold').fillColor(INK)
       .text('PAYMENT RECEIPT', MARGIN, y, {
         align: 'center', width: CONTENT_W, lineBreak: false, characterSpacing: 2
       });

    // short centred rule under the title
    const ruleW = 70;
    const ruleX = MARGIN + (CONTENT_W - ruleW) / 2;
    doc.lineWidth(1).strokeColor(INK)
       .moveTo(ruleX, y + 19).lineTo(ruleX + ruleW, y + 19).stroke();

    doc.y = y + 32;
  }

  _addPaymentDetails(doc, paymentData) {
    const BOX_H = this._sectionHeight(3);
    const startY = doc.y;
    this._section(doc, startY, BOX_H, 'PAYMENT INFORMATION');

    let y = this._rowY(startY);
    this._field(doc, INNER_X, LABEL_W, L_VAL_X, L_VAL_W, y, 'Receipt Number', paymentData.paymentNumber);
    this._field(doc, R_COL_X, R_LABEL_W, R_VAL_X, R_VAL_W, y, 'Application No', paymentData.application?.applicationNumber);

    y += ROW_H;
    this._field(doc, INNER_X, LABEL_W, L_VAL_X, L_VAL_W, y, 'Payment Date', this.formatDate(paymentData.timeline?.completedAt || paymentData.createdAt));
    this._field(doc, R_COL_X, R_LABEL_W, R_VAL_X, R_VAL_W, y, 'Scheme', paymentData.scheme?.name);

    y += ROW_H;
    this._field(doc, INNER_X, LABEL_W, L_VAL_X, L_VAL_W, y, 'Payment Method', this.formatPaymentMethod(paymentData.method));
    this._field(doc, R_COL_X, R_LABEL_W, R_VAL_X, R_VAL_W, y, 'Project', paymentData.project?.name);

    doc.y = startY + BOX_H + SEC_GAP;
  }

  _addBeneficiaryDetails(doc, paymentData) {
    const bankAccount = paymentData.beneficiary?.financial?.bankAccount;
    const BOX_H = this._sectionHeight(2);
    const startY = doc.y;
    this._section(doc, startY, BOX_H, 'BENEFICIARY DETAILS');

    let y = this._rowY(startY);
    this._field(doc, INNER_X, LABEL_W, L_VAL_X, L_VAL_W, y, 'Name', paymentData.beneficiary?.name);
    if (bankAccount) {
      this._field(doc, R_COL_X, R_LABEL_W, R_VAL_X, R_VAL_W, y, 'Account No', `****${bankAccount.accountNumber?.slice(-4) || 'XXXX'}`);
    }

    y += ROW_H;
    this._field(doc, INNER_X, LABEL_W, L_VAL_X, L_VAL_W, y, 'Phone', paymentData.beneficiary?.phone);
    if (bankAccount) {
      this._field(doc, R_COL_X, R_LABEL_W, R_VAL_X, R_VAL_W, y, 'Bank', bankAccount.bankName);
    }

    doc.y = startY + BOX_H + SEC_GAP;
  }

  _addFinancialBreakdown(doc, paymentData) {
    // Zero-value deductions are left out — an empty fee line is just noise
    const amounts = [{ label: 'Gross Amount', value: paymentData.amount }];

    const processingFee = paymentData.financial?.processingFee || 0;
    const bankCharges = paymentData.financial?.bankCharges || 0;
    if (processingFee) amounts.push({ label: 'Processing Fee', value: processingFee });
    if (bankCharges) amounts.push({ label: 'Bank Charges', value: bankCharges });

    if (paymentData.financial?.taxes?.tds?.applicable) {
      amounts.push({ label: `TDS (${paymentData.financial.taxes.tds.rate}%)`, value: paymentData.financial.taxes.tds.amount || 0 });
    }
    if (paymentData.financial?.taxes?.gst?.applicable) {
      amounts.push({ label: `GST (${paymentData.financial.taxes.gst.rate}%)`, value: paymentData.financial.taxes.gst.amount || 0 });
    }

    const netAmount = paymentData.financial?.netAmount || paymentData.amount;
    const NET_H = 26;      // highlighted total row
    const WORDS_H = 32;    // label + value, value may wrap to a second line
    const BOX_H = HEAD_H + TOP_PAD + amounts.length * ROW_H + 4 + NET_H + WORDS_H;
    const startY = doc.y;
    this._section(doc, startY, BOX_H, 'FINANCIAL BREAKDOWN');

    const AMT_VAL_X = MARGIN + 320;
    const AMT_VAL_W = INNER_R - AMT_VAL_X; // right-aligned, stops at the inner edge

    let y = this._rowY(startY);
    amounts.forEach((item) => {
      doc.fontSize(9).font('Helvetica').fillColor(MUTED)
         .text(item.label, INNER_X, y, { width: 220, lineBreak: false });
      doc.fontSize(9).font('Helvetica').fillColor(INK)
         .text(`Rs. ${this.formatAmount(item.value)}`, AMT_VAL_X, y, { width: AMT_VAL_W, align: 'right', lineBreak: false });
      y += ROW_H;
    });

    // Total row, shaded edge to edge inside the box
    y += 4;
    doc.save().rect(BOX_X + 1, y - 6, BOX_W - 2, NET_H).fill(BAND).restore();
    doc.lineWidth(0.8).strokeColor(RULE)
       .moveTo(BOX_X + 1, y - 6).lineTo(BOX_X + BOX_W - 1, y - 6).stroke()
       .moveTo(BOX_X + 1, y - 6 + NET_H).lineTo(BOX_X + BOX_W - 1, y - 6 + NET_H).stroke();

    doc.fontSize(10).font('Helvetica-Bold').fillColor(INK)
       .text('NET AMOUNT PAID', INNER_X, y + 1, { width: 220, lineBreak: false, characterSpacing: 0.4 });
    doc.fontSize(11).font('Helvetica-Bold').fillColor(INK)
       .text(`Rs. ${this.formatAmount(netAmount)}`, AMT_VAL_X, y, { width: AMT_VAL_W, align: 'right', lineBreak: false });

    // Amount in words
    y += NET_H + 4;
    doc.fontSize(8).font('Helvetica').fillColor(MUTED)
       .text('Amount in Words', INNER_X, y, { lineBreak: false });
    doc.fontSize(9).font('Helvetica-Bold').fillColor(INK)
       .text(this.numberToWords(netAmount), INNER_X, y + 12, {
         width: CONTENT_W - PAD * 2,
         lineBreak: true
       });

    doc.y = startY + BOX_H + SEC_GAP;
  }

  _addBankDetails(doc, paymentData) {
    if (paymentData.method !== 'bank_transfer' || !paymentData.bankTransfer) return;
    const { transactionId, utrNumber } = paymentData.bankTransfer;
    if (!transactionId && !utrNumber) return;

    const rows = [transactionId, utrNumber].filter(Boolean).length;
    const BOX_H = this._sectionHeight(rows);
    const startY = doc.y;
    this._section(doc, startY, BOX_H, 'TRANSACTION DETAILS');

    let y = this._rowY(startY);
    if (transactionId) {
      this._field(doc, INNER_X, LABEL_W, L_VAL_X, INNER_R - L_VAL_X, y, 'Transaction ID', transactionId);
      y += ROW_H;
    }
    if (utrNumber) {
      this._field(doc, INNER_X, LABEL_W, L_VAL_X, INNER_R - L_VAL_X, y, 'UTR Number', utrNumber);
    }

    doc.y = startY + BOX_H + SEC_GAP;
  }

  _addFooter(doc) {
    const startY = doc.y + 8;

    // Left: terms & conditions
    doc.fontSize(8).font('Helvetica-Bold').fillColor(INK)
       .text('Terms & Conditions', MARGIN, startY, { lineBreak: false });
    doc.fontSize(7.5).font('Helvetica').fillColor(MUTED)
       .text('•  This is a computer-generated receipt and does not require a physical signature.', MARGIN, startY + 14, { width: 310, lineBreak: false })
       .text('•  For queries, please contact our finance department.',                            MARGIN, startY + 26, { width: 310, lineBreak: false })
       .text('•  This receipt is valid for all official purposes.',                               MARGIN, startY + 38, { width: 310, lineBreak: false });

    // Right: signature block — org above the rule, signatory below it
    doc.fontSize(7.5).font('Helvetica').fillColor(MUTED)
       .text(`For ${this.org.name}`, R_COL_X, startY, { width: PAGE_W - MARGIN - R_COL_X, lineBreak: false });
    doc.lineWidth(0.8).strokeColor(RULE)
       .moveTo(R_COL_X, startY + 40).lineTo(PAGE_W - MARGIN, startY + 40).stroke();
    doc.fontSize(8).font('Helvetica-Bold').fillColor(INK)
       .text('Authorized Signatory', R_COL_X, startY + 45, { width: PAGE_W - MARGIN - R_COL_X, lineBreak: false });

    // Bottom separator + generated-on line
    const bottomY = startY + 68;
    doc.lineWidth(0.8).strokeColor(RULE)
       .moveTo(MARGIN, bottomY).lineTo(PAGE_W - MARGIN, bottomY).stroke();
    doc.fontSize(7.5).font('Helvetica').fillColor(MUTED)
       .text(`Generated on ${this.formatDate(new Date())}  |  ${orgConfig.erpTitle}`, MARGIN, bottomY + 6, {
         align: 'center',
         width: CONTENT_W,
         lineBreak: false
       });
  }

  /**
   * Format date to readable string
   */
  formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Format payment method
   */
  formatPaymentMethod(method) {
    const methods = {
      'bank_transfer': 'Bank Transfer',
      'cheque': 'Cheque',
      'cash': 'Cash',
      'digital_wallet': 'Digital Wallet',
      'upi': 'UPI'
    };
    return methods[method] || method;
  }

  /**
   * Format amount with commas
   */
  formatAmount(amount) {
    if (!amount) return '0.00';
    return parseFloat(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * Convert number to words (Indian format)
   */
  numberToWords(amount) {
    if (!amount) return 'Zero Rupees Only';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    function convertHundreds(num) {
      let result = '';
      
      if (num > 99) {
        result += ones[Math.floor(num / 100)] + ' Hundred ';
        num %= 100;
      }
      
      if (num > 19) {
        result += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
      } else if (num > 9) {
        result += teens[num - 10] + ' ';
        return result;
      }
      
      if (num > 0) {
        result += ones[num] + ' ';
      }
      
      return result;
    }
    
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);
    
    let result = '';
    
    if (rupees === 0) {
      result = 'Zero';
    } else {
      const crores = Math.floor(rupees / 10000000);
      const lakhs = Math.floor((rupees % 10000000) / 100000);
      const thousands = Math.floor((rupees % 100000) / 1000);
      const hundreds = rupees % 1000;
      
      if (crores > 0) {
        result += convertHundreds(crores) + 'Crore ';
      }
      
      if (lakhs > 0) {
        result += convertHundreds(lakhs) + 'Lakh ';
      }
      
      if (thousands > 0) {
        result += convertHundreds(thousands) + 'Thousand ';
      }
      
      if (hundreds > 0) {
        result += convertHundreds(hundreds);
      }
    }
    
    result += 'Rupees';
    
    if (paise > 0) {
      result += ' and ' + convertHundreds(paise) + 'Paise';
    }
    
    result += ' Only';
    
    return result.trim();
  }
}

module.exports = PDFReceiptService;