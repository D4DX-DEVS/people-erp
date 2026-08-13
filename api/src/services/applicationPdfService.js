const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const orgConfig = require('../config/orgConfig');

// ─── Layout constants ─────────────────────────────────────────────────────────
// Mirrors the on-screen ApplicationFormDataView: section header + 2-column grid
// of label/value boxes, full-width tables for row/column fields.
const L = 50;                 // left content edge
const R = 545;                // right content edge
const CW = R - L;             // 495pt content width
const GUT = 14;               // grid gutter
const COL_W = (CW - GUT) / 2; // 240.5pt per grid column
const PAD = 7;                // value box inner padding
const MIN_BOX_H = 22;         // matches min-h-[2rem] on screen
const BLANK_BOX_H = 26;       // taller empty box on blank forms
const CONT_TOP = 64;          // content top on continuation pages
const FOOTER_RESERVE = 58;    // space kept free at the bottom of every page
const MAX_EMBED_BYTES = 4 * 1024 * 1024; // largest inline image embedded in the PDF

const C = {
  text: '#111827',
  value: '#1f2937',
  muted: '#6b7280',
  placeholder: '#9ca3af',
  boxBg: '#f8fafc',
  boxBorder: '#e2e8f0',
  rule: '#e5e7eb',
  headBg: '#f1f5f9',
  zebra: '#fafafa',
  link: '#2563eb',
  blankLine: '#cbd5e1'
};

const STATUS_COLORS = {
  pending: { bg: '#fef3c7', fg: '#92400e' },
  under_review: { bg: '#dbeafe', fg: '#1e40af' },
  interview_scheduled: { bg: '#e0e7ff', fg: '#3730a3' },
  approved: { bg: '#dcfce7', fg: '#166534' },
  disbursed: { bg: '#d1fae5', fg: '#065f46' },
  completed: { bg: '#d1fae5', fg: '#065f46' },
  rejected: { bg: '#fee2e2', fg: '#991b1b' },
  cancelled: { bg: '#f1f5f9', fg: '#475569' }
};

class ApplicationPdfService {
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
    // Noto Sans Malayalam — supports both Latin and Malayalam Unicode
    const fontsDir = path.join(__dirname, '../assets/fonts');
    this.fontRegular = path.join(fontsDir, 'NotoSansMalayalam-Regular.ttf');
    this.fontBold = path.join(fontsDir, 'NotoSansMalayalam-Bold.ttf');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  // Register Malayalam fonts on a PDFDocument instance
  _registerFonts(doc) {
    doc.registerFont('Regular', this.fontRegular);
    doc.registerFont('Bold', this.fontBold);
    // Latin fonts are PDFKit built-ins — no registration needed
  }

  // ─── Script-aware text rendering ────────────────────────────────────────────

  // Returns true if the string contains any Malayalam character (U+0D00–U+0D7F)
  _hasMalayalam(text) {
    return /[ഀ-ൿ]/.test(String(text));
  }

  // Split a string into runs of Malayalam vs. non-Malayalam characters
  _splitByScript(text) {
    const str = String(text || '');
    if (!str) return [];
    const runs = [];
    let buf = '';
    let lastIsMal = null;
    for (const ch of str) {
      const code = ch.codePointAt(0);
      const isMal = code >= 0x0D00 && code <= 0x0D7F;
      if (lastIsMal === null) lastIsMal = isMal;
      if (isMal !== lastIsMal) {
        if (buf) runs.push({ text: buf, isMalayalam: lastIsMal });
        buf = ch;
        lastIsMal = isMal;
      } else {
        buf += ch;
      }
    }
    if (buf) runs.push({ text: buf, isMalayalam: lastIsMal });
    return runs;
  }

  /**
   * Render text with automatic per-script font switching.
   * Malayalam segments use NotoSansMalayalam; everything else uses Helvetica.
   * @param {PDFDocument} doc
   * @param {string} text
   * @param {number|null} x  - absolute x (first segment only); pass null to stay at cursor
   * @param {number|null} y  - absolute y (first segment only)
   * @param {object} opts    - PDFKit text options
   * @param {boolean} bold
   */
  _t(doc, text, x, y, opts = {}, bold = false) {
    if (!text && text !== 0) return;
    const str = String(text);
    const runs = this._splitByScript(str);
    if (runs.length === 0) return;

    runs.forEach((run, idx) => {
      const isLast = idx === runs.length - 1;
      // Choose font: Malayalam → registered Noto font; Latin/other → Helvetica built-in
      if (run.isMalayalam) {
        doc.font(bold ? 'Bold' : 'Regular');
      } else {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
      }
      // All non-last runs must use continued:true to stay on the same line
      const runOpts = { ...opts, continued: isLast ? (opts.continued || false) : true };
      if (idx === 0 && x !== null && x !== undefined) {
        doc.text(run.text, x, y, runOpts);
      } else {
        doc.text(run.text, runOpts);
      }
    });
  }

  /** Height a string will occupy at the given size/width (script-aware font pick) */
  _measure(doc, text, size, width, bold = false) {
    const str = String(text === null || text === undefined ? '' : text);
    if (!str) return 0;
    const mal = this._hasMalayalam(str);
    doc.font(mal ? (bold ? 'Bold' : 'Regular') : (bold ? 'Helvetica-Bold' : 'Helvetica')).fontSize(size);
    return doc.heightOfString(str, { width });
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Generate a filled application PDF (with all submitted data)
   * @param {Object} application - Populated application document
   * @param {Object} formConfig - The FormConfiguration document for the scheme
   * @returns {Promise<string>} Path to generated PDF
   */
  async generateFilledApplicationPdf(application, formConfig) {
    const fileName = `application-${application.applicationNumber || application._id}.pdf`;
    const filePath = path.join(this.outputDir, fileName);

    const doc = this._createDoc({
      Title: `Application - ${application.applicationNumber}`,
      Subject: 'Application Form'
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    this._registerFonts(doc);
    this._attachRunningHeader(doc, [
      application.scheme?.name || 'Application',
      application.applicationNumber ? `No: ${application.applicationNumber}` : ''
    ].filter(Boolean).join('  ·  '));

    this._addHeader(doc);
    this._addApplicationTitle(doc, application);
    this._addBeneficiaryInfo(doc, application);
    this._addFormData(doc, formConfig, this._plainFormData(application.formData), false);
    this._addDocumentsList(doc, application.documents || []);
    this._addFooters(doc);
    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  /**
   * Generate a blank application form PDF (all fields empty)
   * @param {Object} formConfig - The FormConfiguration document
   * @param {string} schemeName - Name of the scheme
   * @returns {Promise<string>} Path to generated PDF
   */
  async generateBlankFormPdf(formConfig, schemeName) {
    const safeScheme = (schemeName || 'scheme').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `blank-form-${safeScheme}-${Date.now()}.pdf`;
    const filePath = path.join(this.outputDir, fileName);

    const doc = this._createDoc({
      Title: `Application Form - ${schemeName}`,
      Subject: 'Blank Application Form'
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    this._registerFonts(doc);
    this._attachRunningHeader(doc, schemeName || formConfig?.title || 'Application Form');

    this._addHeader(doc);
    this._addBlankFormTitle(doc, schemeName, formConfig);
    this._addFormData(doc, formConfig, {}, true);
    this._addFooters(doc);
    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  // ─── Document / page scaffolding ────────────────────────────────────────────

  _createDoc(info) {
    return new PDFDocument({
      size: 'A4',
      margin: L,
      bufferPages: true, // needed for "Page X of Y" footers
      info: { Author: orgConfig.erpTitle, ...info }
    });
  }

  /** Slim repeated header on every continuation page (page 1 gets the full letterhead) */
  _attachRunningHeader(doc, title) {
    doc.on('pageAdded', () => {
      doc.fontSize(8).fillColor(C.muted);
      this._t(doc, title, L, 34, { width: CW, lineBreak: false });
      doc.moveTo(L, 50).lineTo(R, 50).lineWidth(0.5).strokeColor(C.rule).stroke();
      doc.lineWidth(1).strokeColor('#000000').fillColor(C.text);
      doc.x = L;
      doc.y = CONT_TOP;
    });
  }

  _contentBottom(doc) {
    return doc.page.height - FOOTER_RESERVE;
  }

  /** Add a page if `needed` points don't fit below the cursor */
  _ensureSpace(doc, needed) {
    if (doc.y + needed > this._contentBottom(doc)) {
      doc.addPage();
      return true;
    }
    return false;
  }

  _addFooters(doc) {
    const range = doc.bufferedPageRange();
    const stamp = `Generated by ${orgConfig.erpTitle} on ${new Date().toLocaleString('en-IN')}`;
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      // Allow drawing inside the bottom margin without triggering a page break
      doc.page.margins.bottom = 0;
      const y = doc.page.height - 40;
      doc.moveTo(L, y - 10).lineTo(R, y - 10).lineWidth(0.5).strokeColor(C.rule).stroke();
      doc.lineWidth(1).strokeColor('#000000');
      doc.fontSize(7.5).fillColor(C.muted);
      this._t(doc, stamp, L, y, { width: CW * 0.7, lineBreak: false });
      doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
        .text(`Page ${i - range.start + 1} of ${range.count}`, R - CW * 0.3, y, {
          width: CW * 0.3, align: 'right', lineBreak: false
        });
      doc.fillColor(C.text);
    }
  }

  // ─── Header / title blocks ──────────────────────────────────────────────────

  _addHeader(doc) {
    try {
      if (fs.existsSync(this.logoPath)) {
        doc.image(this.logoPath, L, 46, { width: 62 });
      }
    } catch (e) { /* no logo */ }

    doc.fontSize(17).font('Helvetica-Bold').fillColor(C.text).text(this.org.name, 124, 50);
    doc.fontSize(8.5).fillColor(C.muted);
    this._t(doc, `Reg. No: ${this.org.regNumber}`, 124, 72);
    this._t(doc, `${this.org.address}`, 124, 84);
    this._t(doc, `Phone: ${this.org.phone} | Email: ${this.org.email}`, 124, 96);

    doc.moveTo(L, 118).lineTo(R, 118).lineWidth(0.8).strokeColor(C.rule).stroke();
    doc.lineWidth(1).strokeColor('#000000').fillColor(C.text);
    doc.y = 132;
  }

  _addApplicationTitle(doc, application) {
    doc.fontSize(16).fillColor(C.text);
    this._t(doc, application.scheme?.name || 'Application Form', L, doc.y, { align: 'center', width: CW }, true);
    doc.y += 4;

    doc.fontSize(10).fillColor(C.muted);
    this._t(doc, `Application No: ${application.applicationNumber || '—'}`, L, doc.y, { align: 'center', width: CW });
    doc.y += 6;

    this._statusPill(doc, this._formatStatus(application.status), application.status, L + CW / 2, doc.y);

    doc.fontSize(9).fillColor(C.muted);
    this._t(doc, `Applied: ${this._formatDate(application.createdAt)}`, L, doc.y, { align: 'center', width: CW });
    doc.fillColor(C.text);
    doc.y += 12;
  }

  _addBlankFormTitle(doc, schemeName, formConfig) {
    doc.fontSize(16).fillColor(C.text);
    this._t(doc, schemeName || formConfig?.title || 'Application Form', L, doc.y, { align: 'center', width: CW }, true);
    doc.y += 4;
    doc.fontSize(9.5).fillColor(C.muted);
    this._t(doc, 'Application Form — Please Fill All Required Fields (*)', L, doc.y, { align: 'center', width: CW });
    doc.fillColor(C.text);
    doc.y += 14;
  }

  _statusPill(doc, label, status, centerX, y) {
    const palette = STATUS_COLORS[status] || { bg: C.headBg, fg: C.muted };
    doc.font('Helvetica-Bold').fontSize(8.5);
    const w = doc.widthOfString(label) + 20;
    const h = 16;
    doc.roundedRect(centerX - w / 2, y, w, h, 8).fill(palette.bg);
    doc.fillColor(palette.fg).text(label, centerX - w / 2, y + 4.6, { width: w, align: 'center', lineBreak: false });
    doc.fillColor(C.text);
    doc.y = y + h + 8;
  }

  // ─── Applicant summary ──────────────────────────────────────────────────────

  _addBeneficiaryInfo(doc, application) {
    const b = application.beneficiary || {};
    const rows = [
      { label: 'Name', value: b.name || 'N/A' },
      { label: 'Phone', value: b.phone || 'N/A' }
    ];

    const location = [application.unit?.name, application.area?.name, application.district?.name]
      .filter(Boolean).join(', ');
    if (location) rows.push({ label: 'Location', value: location });
    if (application.scheme?.name) rows.push({ label: 'Scheme', value: application.scheme.name });
    if (application.project?.name) rows.push({ label: 'Project', value: application.project.name });
    if (application.requestedAmount) {
      rows.push({ label: 'Requested Amount', value: `Rs. ${Number(application.requestedAmount).toLocaleString('en-IN')}` });
    }

    this._renderSectionHeader(doc, 'Applicant Information');
    this._renderGrid(doc, rows.map(r => ({
      key: r.label,
      field: { label: r.label },
      value: r.value
    })), false);
  }

  // ─── Form data (the part that mirrors the on-screen view) ───────────────────

  /**
   * Renders every configured page as a section: 2-column label/value grid for
   * regular fields, full-width tables for row/column (matrix) fields.
   */
  _addFormData(doc, formConfig, formData, isBlank) {
    const configPages = (formConfig && Array.isArray(formConfig.pages)) ? formConfig.pages : [];
    const data = formData || {};
    const consumed = new Set();
    let rendered = false;

    configPages.forEach((page, pageIdx) => {
      const fields = this._pageFields(page);
      if (fields.length === 0) return;

      const entries = this._orderedEntries(fields, data, isBlank, consumed);
      if (entries.length === 0) return;

      const grid = [];
      const tables = [];
      for (const entry of entries) {
        if (this._isTableEntry(entry.field, entry.value, isBlank)) tables.push(entry);
        else grid.push(entry);
      }

      // Every form page after the first starts on its own PDF page
      if (rendered) doc.addPage();
      rendered = true;

      this._renderSectionHeader(doc, page.title || `Page ${pageIdx + 1}`);
      if (grid.length) this._renderGrid(doc, grid, isBlank);
      for (const entry of tables) this._renderTableField(doc, entry, data, isBlank);
      doc.y += 4;
    });

    // Any submitted value that no configured field claims — same as the
    // "Other Details" catch-all in the on-screen view.
    if (!isBlank) {
      const leftovers = Object.keys(data)
        .filter(k => !consumed.has(k) && !k.endsWith('__rowMeta') && !['_id', '__v', 'id'].includes(k))
        .map(k => ({ key: k, field: null, value: data[k] }));
      if (leftovers.length) {
        const grid = leftovers.filter(e => !this._isTableEntry(e.field, e.value, false));
        const tables = leftovers.filter(e => this._isTableEntry(e.field, e.value, false));
        this._renderSectionHeader(doc, 'Other Details');
        if (grid.length) this._renderGrid(doc, grid, false);
        for (const entry of tables) this._renderTableField(doc, entry, data, false);
      }
    }
  }

  /** Renderable fields of a page (defensively includes section-nested fields) */
  _pageFields(page) {
    const all = [...(page.fields || [])];
    if (Array.isArray(page.sections)) {
      for (const section of page.sections) {
        if (Array.isArray(section.fields)) all.push(...section.fields);
      }
    }
    return all.filter(f => f && f.enabled !== false && !['title', 'html', 'group', 'page'].includes(f.type));
  }

  /**
   * Field order: submitted-data order first (matches what the applicant sees
   * on screen), then any configured field that has no value, so nothing is lost.
   */
  _orderedEntries(fields, data, isBlank, consumed) {
    const byKey = new Map(fields.map(f => [`field_${f.id}`, f]));
    const out = [];

    if (!isBlank) {
      for (const key of Object.keys(data)) {
        if (key.endsWith('__rowMeta')) continue;
        const field = byKey.get(key);
        if (!field) continue;
        out.push({ key, field, value: data[key] });
        byKey.delete(key);
        consumed.add(key);
      }
    }

    for (const [key, field] of byKey) {
      out.push({ key, field, value: isBlank ? undefined : data[key] });
      consumed.add(key);
    }
    return out;
  }

  _renderSectionHeader(doc, title) {
    this._ensureSpace(doc, 46);
    doc.fontSize(9).fillColor(C.muted);
    this._t(doc, String(title).toUpperCase(), L, doc.y, { width: CW, characterSpacing: 0.6 }, true);
    doc.y += 3;
    doc.moveTo(L, doc.y).lineTo(R, doc.y).lineWidth(0.6).strokeColor(C.rule).stroke();
    doc.lineWidth(1).strokeColor('#000000').fillColor(C.text);
    doc.y += 10;
  }

  // ─── 2-column field grid ────────────────────────────────────────────────────

  _renderGrid(doc, entries, isBlank) {
    for (let i = 0; i < entries.length; i += 2) {
      const pair = [entries[i], entries[i + 1]].filter(Boolean);
      const cells = pair.map(entry => this._prepareCell(doc, entry, COL_W, isBlank));
      const rowH = Math.max(...cells.map(c => c.height));

      this._ensureSpace(doc, rowH + 4);
      const y = doc.y;
      cells.forEach((cell, idx) => this._drawCell(doc, cell, L + idx * (COL_W + GUT), y));
      doc.y = y + rowH + 12;
    }
  }

  /** Measure a label/value cell up front so both grid columns can align */
  _prepareCell(doc, entry, w, isBlank) {
    const innerW = w - PAD * 2;
    const rawLabel = entry.field?.label || this._humanizeKey(entry.key);
    const label = `${rawLabel}${isBlank && entry.field?.required ? ' *' : ''}`;
    const labelH = this._measure(doc, label, 8, w, true);

    const cell = { w, innerW, label, labelH, kind: 'text', boxH: MIN_BOX_H };

    if (isBlank) {
      cell.kind = 'blank';
      cell.boxH = BLANK_BOX_H;
      cell.help = entry.field?.helpText || '';
      cell.helpH = cell.help ? this._measure(doc, cell.help, 7, w) + 2 : 0;
      cell.height = labelH + 3 + cell.helpH + cell.boxH;
      return cell;
    }

    const file = this._fileInfo(entry.value);
    if (file) {
      const img = file.buffer ? this._openImage(doc, file.buffer) : null;
      if (img) {
        const scale = Math.min(innerW / img.width, 130 / img.height, 1);
        cell.kind = 'image';
        cell.image = file.buffer;
        cell.imgW = img.width * scale;
        cell.imgH = img.height * scale;
        cell.caption = file.name;
        cell.captionH = this._measure(doc, file.name, 7.5, innerW);
        cell.boxH = cell.imgH + cell.captionH + PAD * 2 + 4;
      } else {
        cell.kind = 'file';
        cell.caption = file.isPdf ? `${file.name} (PDF)` : file.name;
        cell.link = file.url || null;
        cell.captionH = this._measure(doc, cell.caption, 8.5, innerW);
        cell.boxH = Math.max(MIN_BOX_H, cell.captionH + PAD * 2);
      }
      cell.height = labelH + 3 + cell.boxH;
      return cell;
    }

    if (entry.field?.type === 'file' && this._isEmpty(entry.value)) {
      cell.text = 'No file uploaded';
      cell.empty = true;
    } else {
      const display = this._getDisplayValue(entry.field, entry.value);
      cell.empty = this._isEmpty(entry.value) || display === '—';
      cell.text = cell.empty ? '—' : display;
    }
    const textH = this._measure(doc, cell.text, 9.5, innerW);
    cell.boxH = Math.max(MIN_BOX_H, textH + PAD * 2);

    // Absurdly long values: drop the box and let the text flow across pages
    if (cell.boxH > this._usableHeight(doc)) {
      cell.kind = 'flow';
      cell.boxH = textH;
    }
    cell.height = labelH + 3 + cell.boxH;
    return cell;
  }

  _drawCell(doc, cell, x, y) {
    doc.fontSize(8).fillColor(C.muted);
    this._t(doc, cell.label, x, y, { width: cell.w }, true);
    let cy = y + cell.labelH + 3;

    if (cell.kind === 'blank') {
      if (cell.help) {
        doc.fontSize(7).fillColor(C.placeholder);
        this._t(doc, cell.help, x, cy, { width: cell.w });
        cy += cell.helpH;
      }
      doc.roundedRect(x, cy, cell.w, cell.boxH, 3).lineWidth(0.7)
        .fillAndStroke('#ffffff', C.blankLine);
      doc.lineWidth(1).strokeColor('#000000').fillColor(C.text);
      return;
    }

    if (cell.kind === 'flow') {
      doc.fontSize(9.5).fillColor(C.value);
      this._t(doc, cell.text, x, cy, { width: cell.w });
      doc.fillColor(C.text);
      return;
    }

    doc.roundedRect(x, cy, cell.w, cell.boxH, 3).lineWidth(0.7)
      .fillAndStroke(C.boxBg, C.boxBorder);
    doc.lineWidth(1).strokeColor('#000000');

    if (cell.kind === 'image') {
      try {
        doc.image(cell.image, x + PAD, cy + PAD, { width: cell.imgW, height: cell.imgH });
      } catch (e) { /* unreadable image — caption still renders */ }
      doc.fontSize(7.5).fillColor(C.link);
      this._t(doc, cell.caption, x + PAD, cy + PAD + cell.imgH + 4, { width: cell.innerW });
    } else if (cell.kind === 'file') {
      doc.fontSize(8.5).fillColor(C.link);
      this._t(doc, cell.caption, x + PAD, cy + PAD, {
        width: cell.innerW, underline: true, ...(cell.link ? { link: cell.link } : {})
      });
    } else {
      doc.fontSize(9.5).fillColor(cell.empty ? C.placeholder : C.value);
      this._t(doc, cell.text, x + PAD, cy + PAD, { width: cell.innerW });
    }
    doc.fillColor(C.text);
  }

  // ─── Matrix / table fields ──────────────────────────────────────────────────

  _isTableEntry(field, value, isBlank) {
    const type = field?.type;
    if (type === 'row' || type === 'column') return true;
    if (isBlank) return false;
    if (this._isFlatTableObject(value)) return true;
    return Array.isArray(value) && value.some(v => Array.isArray(v));
  }

  _isFlatTableObject(val) {
    if (!val || typeof val !== 'object' || Array.isArray(val)) return false;
    const keys = Object.keys(val);
    return keys.length > 0 && keys.every(k => /^\d+_\d+$/.test(k));
  }

  _flatTableTo2D(obj) {
    let maxRow = 0, maxCol = 0;
    for (const k of Object.keys(obj)) {
      const [r, c] = k.split('_').map(Number);
      if (r > maxRow) maxRow = r;
      if (c > maxCol) maxCol = c;
    }
    const out = Array.from({ length: maxRow + 1 }, () => Array(maxCol + 1).fill(''));
    for (const [k, v] of Object.entries(obj)) {
      const [r, c] = k.split('_').map(Number);
      out[r][c] = v === null || v === undefined ? '' : String(v);
    }
    return out;
  }

  _renderTableField(doc, entry, formData, isBlank) {
    const field = entry.field || {};
    const isMatrix = field.type === 'row' || field.type === 'column';
    const columnTitles = Array.isArray(field.columnTitles) ? field.columnTitles : [];
    const rowTitles = Array.isArray(field.rowTitles) ? field.rowTitles : [];
    const hasRowLabels = rowTitles.some(t => t);
    const firstColumnHeader = field.firstColumnHeader || '';

    const raw = entry.value;
    const data = Array.isArray(raw) && raw.some(r => Array.isArray(r))
      ? raw.map(r => (Array.isArray(r) ? r.map(v => (v === null || v === undefined ? '' : String(v))) : [String(r ?? '')]))
      : this._isFlatTableObject(raw) ? this._flatTableTo2D(raw) : [];

    const rowMeta = Array.isArray(formData?.[`${entry.key}__rowMeta`]) ? formData[`${entry.key}__rowMeta`] : null;

    // Column count: for matrix fields `columns` is the table width; otherwise it
    // is a layout span, so derive the width from the data itself.
    const configuredCols = isMatrix ? Math.max(Number(field.columns) || 0, columnTitles.length) : columnTitles.length;
    const dataCols = data.length ? Math.max(...data.map(r => r.length)) : 0;
    const colCount = Math.max(configuredCols, dataCols, 1);

    const rowCount = data.length || (rowMeta ? rowMeta.length : (Number(field.rows) || 2));
    const tableData = data.length
      ? data
      : Array.from({ length: rowCount }, () => Array(colCount).fill(''));

    const labelColW = hasRowLabels ? Math.min(120, CW * 0.28) : 0;
    const colW = (CW - labelColW) / colCount;
    const cellPad = 5;

    const getRowLabel = (i) => {
      if (rowMeta && rowMeta[i]) {
        const base = rowTitles[rowMeta[i].sourceRow] || `Row ${rowMeta[i].sourceRow + 1}`;
        return rowMeta[i].duplicateIndex > 0 ? `${base} (${rowMeta[i].duplicateIndex})` : base;
      }
      return rowTitles[i] || `Row ${i + 1}`;
    };

    const headers = [];
    if (hasRowLabels) headers.push(firstColumnHeader);
    for (let i = 0; i < colCount; i++) headers.push(columnTitles[i] || `Column ${i + 1}`);

    const widths = hasRowLabels ? [labelColW, ...Array(colCount).fill(colW)] : Array(colCount).fill(colW);

    const rowHeight = (cells, size, bold) => {
      let h = 0;
      cells.forEach((txt, i) => {
        h = Math.max(h, this._measure(doc, txt || '', size, widths[i] - cellPad * 2, bold));
      });
      return Math.max(18, h + cellPad * 2);
    };

    const headerH = rowHeight(headers, 8, true);

    // Field label above the table
    const labelText = field.label || this._humanizeKey(entry.key);
    const labelH = this._measure(doc, labelText, 8, CW, true);
    this._ensureSpace(doc, labelH + headerH + 30);
    doc.fontSize(8).fillColor(C.muted);
    this._t(doc, labelText, L, doc.y, { width: CW }, true);
    doc.y += 4;

    const drawRow = (cells, y, h, opts = {}) => {
      let x = L;
      cells.forEach((txt, i) => {
        const w = widths[i];
        const bg = opts.headerRow ? C.headBg : (opts.labelCol && i === 0 ? '#f8fafc' : opts.bg);
        if (bg) doc.rect(x, y, w, h).fill(bg);
        doc.rect(x, y, w, h).lineWidth(0.5).stroke(C.boxBorder);
        const bold = !!opts.headerRow || (opts.labelCol && i === 0);
        doc.fontSize(8).fillColor(opts.headerRow || (opts.labelCol && i === 0) ? C.text : C.value);
        const txtStr = String(txt || '');
        if (txtStr) {
          this._t(doc, txtStr, x + cellPad, y + cellPad, { width: w - cellPad * 2 }, bold);
        } else if (!isBlank && !opts.headerRow) {
          doc.fillColor(C.placeholder);
          this._t(doc, '—', x + cellPad, y + cellPad, { width: w - cellPad * 2 });
        }
        x += w;
      });
      doc.lineWidth(1).strokeColor('#000000').fillColor(C.text);
    };

    let y = doc.y;
    drawRow(headers, y, headerH, { headerRow: true, labelCol: hasRowLabels });
    y += headerH;

    for (let r = 0; r < rowCount; r++) {
      const cells = [];
      if (hasRowLabels) cells.push(getRowLabel(r));
      for (let c = 0; c < colCount; c++) cells.push(isBlank ? '' : (tableData[r]?.[c] || ''));

      const h = rowHeight(cells, 8, false);
      if (y + h > this._contentBottom(doc)) {
        doc.y = y;
        doc.addPage();
        y = doc.y;
        drawRow(headers, y, headerH, { headerRow: true, labelCol: hasRowLabels });
        y += headerH;
      }
      drawRow(cells, y, h, { bg: r % 2 === 1 ? C.zebra : null, labelCol: hasRowLabels });
      y += h;
    }

    doc.y = y + 12;
  }

  // ─── Documents ──────────────────────────────────────────────────────────────

  _addDocumentsList(doc, documents) {
    if (!documents || documents.length === 0) return;

    this._renderSectionHeader(doc, 'Submitted Documents');
    documents.forEach((item, idx) => {
      const label = item.fieldLabel || item.type || 'Document';
      const name = item.filename || item.originalName || 'Uploaded';
      const text = `${idx + 1}.  ${label}: ${name}`;
      const h = this._measure(doc, text, 9, CW - 10);
      this._ensureSpace(doc, h + 8);
      doc.fontSize(9).fillColor(C.value);
      this._t(doc, text, L + 4, doc.y, { width: CW - 10 });
      doc.y += 6;
    });
    doc.fillColor(C.text);
  }

  // ─── Value helpers ──────────────────────────────────────────────────────────

  /** Mongoose sub-documents/Maps → plain object, so key order and access work */
  _plainFormData(formData) {
    if (!formData) return {};
    if (typeof formData.toObject === 'function') return formData.toObject();
    if (formData instanceof Map) return Object.fromEntries(formData);
    return formData;
  }

  _usableHeight(doc) {
    return this._contentBottom(doc) - CONT_TOP;
  }

  _isEmpty(value) {
    return value === null || value === undefined || value === ''
      || (Array.isArray(value) && value.length === 0);
  }

  _humanizeKey(key) {
    if (/^field_\d+$/i.test(key)) return `Field ${key.match(/\d+/)[0]}`;
    return String(key)
      .replace(/field_/gi, '')
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ') || key;
  }

  /** Detect uploaded-file values (remote URL or inline base64 data URL) */
  _fileInfo(value) {
    if (value && typeof value === 'object' && typeof value.dataUrl === 'string') {
      const name = value.fileName || value.originalName || 'file';
      const mime = value.mimeType || (value.dataUrl.match(/^data:([^;]+);/) || [])[1] || '';
      return {
        name,
        isPdf: mime === 'application/pdf' || /\.pdf$/i.test(name),
        buffer: this._dataUrlToImageBuffer(value.dataUrl, mime),
        url: null
      };
    }
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
      const name = decodeURIComponent(value.split('/').pop().split('?')[0] || 'file');
      return { name, isPdf: /\.pdf(\?.*)?$/i.test(value), buffer: null, url: value };
    }
    return null;
  }

  /** Only PNG/JPEG can be embedded by PDFKit */
  _dataUrlToImageBuffer(dataUrl, mime) {
    try {
      const type = mime || (dataUrl.match(/^data:([^;]+);/) || [])[1] || '';
      if (!/^image\/(png|jpe?g)$/i.test(type)) return null;
      const idx = dataUrl.indexOf('base64,');
      if (idx === -1) return null;
      const buf = Buffer.from(dataUrl.slice(idx + 7), 'base64');
      // Keep generated PDFs a sane size — huge scans fall back to a filename row
      return buf.length > MAX_EMBED_BYTES ? null : buf;
    } catch (e) {
      return null;
    }
  }

  _openImage(doc, buffer) {
    try {
      const img = doc.openImage(buffer);
      return (img && img.width && img.height) ? img : null;
    } catch (e) {
      return null;
    }
  }

  _getDisplayValue(field, rawValue) {
    if (this._isEmpty(rawValue)) return '—';

    if (Array.isArray(rawValue)) {
      if (rawValue.some(v => Array.isArray(v))) {
        return rawValue.map((row, r) => `Row ${r + 1}: ${(Array.isArray(row) ? row : [row]).join(' | ')}`).join('\n');
      }
      return rawValue.join(', ');
    }

    if (typeof rawValue === 'boolean') return rawValue ? 'Yes' : 'No';

    if (typeof rawValue === 'object') {
      if (rawValue instanceof Date) return this._formatDate(rawValue);
      try {
        return JSON.stringify(rawValue);
      } catch (e) {
        return String(rawValue);
      }
    }

    return String(rawValue);
  }

  _formatDate(dateVal) {
    if (!dateVal) return 'N/A';
    return new Date(dateVal).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  _formatStatus(status) {
    if (!status) return 'N/A';
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}

module.exports = new ApplicationPdfService();
