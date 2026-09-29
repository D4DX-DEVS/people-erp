const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const orgConfig = require('../config/orgConfig');

// ─── Layout constants ─────────────────────────────────────────────────────────
// A4 portrait, bordered-table layout: centred letterhead with the logo at the
// left, a passport photo box beside the form title, an unnumbered summary
// table, then one numbered section per configured form page (label / value
// tables, matrix tables), a documents table and an office-use signature block.
const L = 50;                  // left content edge
const R = 545;                 // right content edge
const CW = R - L;              // 495pt content width
const TAB_L = L + 12;          // tables sit slightly inside the section headings
const TW = R - TAB_L;          // 483pt table width
const PAD_X = 6;               // cell inner padding
const PAD_Y = 6;
const MIN_ROW_H = 24;
const BLANK_ROW_H = 28;        // taller rows on printable blank forms
const BLANK_TEXTAREA_H = 64;
const TOP_MARGIN = 50;
const FOOTER_RESERVE = 56;     // keep clear of the page-number footer
const PHOTO_W = 99;            // passport photo box, 35mm x 45mm
const PHOTO_H = 127;
const HEAD_TOP = 40;           // top edge of the page-1 header band
// Logo box is wide rather than square: a wordmark logo (e.g. Baithuzzakath's)
// needs room to breathe, and 'fit' scales a square mark down to match anyway.
const LOGO_W = 110;             // header logo box width (wordmark-friendly)
const LOGO_H = 56;              // header logo box height
const HEAD_GAP = 12;           // header band to the first table
const MAX_EMBED_BYTES = 4 * 1024 * 1024; // largest photo embedded in the PDF
const PHOTO_FETCH_MS = 8000;   // give up on a slow CDN rather than stall the download
const GRID = [0.22, 0.28, 0.22, 0.28]; // label | value | label | value

const FS = {
  org: 16, orgLine: 8.5, title: 16, section: 11, subLabel: 9.5,
  label: 8.5, value: 9, small: 8, footer: 7.5
};

const C = {
  text: '#000000',
  muted: '#555555',
  border: '#8c8c8c',
  labelBg: '#f2f2f2',
  headBg: '#d9d9d9',
  link: '#1a4fb4'
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
    return doc.heightOfString(str, { width, lineGap: 0 });
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

    const formData = this._plainFormData(application.formData);
    const photoField = this._profilePhotoField(formConfig);
    const photo = photoField ? await this._loadPhoto(formData[`field_${photoField.id}`]) : null;

    const doc = this._createDoc({
      Title: `Application - ${application.applicationNumber}`,
      Subject: 'Application Form'
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    this._registerFonts(doc);

    this._addHeader(doc, this._formTitle(application.scheme?.name), photo, false);
    this._renderTable(doc, GRID.map(f => TW * f), this._filledSummaryRows(application));
    const fileEntries = this._addFormData(doc, formConfig, formData, false);
    this._addDocumentsTable(doc, fileEntries, application.documents || [], false);
    this._addOfficeUse(doc);
    this._addFooters(doc, application.applicationNumber ? `Application No. ${application.applicationNumber}` : '');
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

    const title = schemeName || formConfig?.title || 'Application';
    this._addHeader(doc, this._formTitle(title), null, true);
    this._renderTable(doc, GRID.map(f => TW * f), [
      this._pairRow('Application No.', '', 'Date', '', BLANK_ROW_H),
      this._pairRow('Scheme', title, 'Requested Amount', '', BLANK_ROW_H)
    ]);
    const fileEntries = this._addFormData(doc, formConfig, {}, true);
    this._addDocumentsTable(doc, fileEntries, [], true);
    this._addOfficeUse(doc);
    this._addFooters(doc, title);
    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  // ─── Document / page scaffolding ────────────────────────────────────────────

  _createDoc(info) {
    const doc = new PDFDocument({
      size: 'A4',
      margin: TOP_MARGIN,
      bufferPages: true, // needed for "Page X of Y" footers
      info: { Author: orgConfig.erpTitle, ...info }
    });
    doc.on('pageAdded', () => { doc.x = L; });
    return doc;
  }

  _contentBottom(doc) {
    return doc.page.height - FOOTER_RESERVE;
  }

  _usableHeight(doc) {
    return this._contentBottom(doc) - TOP_MARGIN;
  }

  /** Add a page if `needed` points don't fit below the cursor */
  _ensureSpace(doc, needed) {
    if (doc.y + needed > this._contentBottom(doc)) {
      doc.addPage();
      return true;
    }
    return false;
  }

  _addFooters(doc, leftText) {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      // Allow drawing inside the bottom margin without triggering a page break
      doc.page.margins.bottom = 0;
      const y = doc.page.height - 30;
      doc.fontSize(FS.footer).fillColor(C.muted);
      if (leftText) this._t(doc, leftText, L, y, { width: CW * 0.7, lineBreak: false });
      doc.font('Helvetica').fontSize(FS.footer).fillColor(C.muted)
        .text(`Page ${i - range.start + 1} of ${range.count}`, R - CW * 0.3, y, {
          width: CW * 0.3, align: 'right', lineBreak: false
        });
      doc.fillColor(C.text);
    }
  }

  // ─── Page-1 header ──────────────────────────────────────────────────────────

  /**
   * Logo at the left, organisation identity and the form title centred in the
   * space beside it, passport photo box in the top-right corner. The title
   * fills the band next to the lower part of that box, so the whole header
   * costs no more height than the photo box itself.
   */
  _addHeader(doc, title, photo, isBlank) {
    const bx = R - PHOTO_W;
    this._drawPhotoBox(doc, bx, HEAD_TOP, photo);

    let logoBottom = HEAD_TOP;
    try {
      if (fs.existsSync(this.logoPath)) {
        // 'fit' scales the logo proportionally inside the box, so a wide
        // wordmark and a square mark both render undistorted.
        doc.image(this.logoPath, L, HEAD_TOP, { fit: [LOGO_W, LOGO_H], align: 'left', valign: 'center' });
        logoBottom = HEAD_TOP + LOGO_H;
      }
    } catch (e) { /* no logo */ }

    // Identity lines centred in the gap between the logo and the photo box
    const cx = logoBottom > HEAD_TOP ? L + LOGO_W + 10 : L;
    const cw = bx - 12 - cx;
    doc.fontSize(FS.org).fillColor(C.text);
    this._t(doc, this.org.name, cx, HEAD_TOP + 2, { width: cw, align: 'center' }, true);
    doc.y += 2;
    doc.fontSize(FS.orgLine).fillColor(C.text);
    this._t(doc, `Reg. No: ${this.org.regNumber} | ${this.org.address}`, cx, doc.y, { width: cw, align: 'center' });
    this._t(doc, `Phone: ${this.org.phone} | Email: ${this.org.email}`, cx, doc.y, { width: cw, align: 'center' });

    // Title sits in what is left of the photo-box band, shrinking a step at a
    // time so a long scheme name stays inside it instead of pushing it taller.
    const bandTop = Math.max(doc.y, logoBottom) + 8;
    const bandH = HEAD_TOP + PHOTO_H - bandTop;
    const note = isBlank ? 'Please fill in BLOCK LETTERS. Fields marked * are mandatory.' : '';
    const noteH = note ? this._measure(doc, note, FS.small, cw) + 5 : 0;
    const sizes = [FS.title, FS.title - 1.5, FS.title - 3, FS.title - 4.5];
    const size = sizes.find(v => this._measure(doc, title, v, cw, true) + noteH <= bandH) || sizes[sizes.length - 1];
    const titleH = this._measure(doc, title, size, cw, true);

    const ty = bandTop + Math.max(0, (bandH - titleH - noteH) / 2);
    doc.fontSize(size).fillColor(C.text);
    this._t(doc, title, cx, ty, { width: cw, align: 'center' }, true);
    if (note) {
      doc.fontSize(FS.small).fillColor(C.muted);
      this._t(doc, note, cx, ty + titleH + 5, { width: cw, align: 'center' });
    }

    doc.lineWidth(1).strokeColor(C.text).fillColor(C.text);
    doc.y = Math.max(HEAD_TOP + PHOTO_H, ty + titleH + noteH) + HEAD_GAP;
  }

  /** "<SCHEME> APPLICATION" — no double suffix when the scheme is already named that way */
  _formTitle(name) {
    const upper = String(name || 'Application').trim().toUpperCase();
    return /\b(APPLICATION|FORM)\b/.test(upper) ? upper : `${upper} APPLICATION`;
  }

  /** The uploaded photo prints inside the box; otherwise it carries the instruction */
  _drawPhotoBox(doc, x, y, photo) {
    doc.rect(x, y, PHOTO_W, PHOTO_H).lineWidth(1).fillAndStroke('#ffffff', C.text);

    let drawn = false;
    if (photo) {
      try {
        doc.save();
        doc.rect(x + 1, y + 1, PHOTO_W - 2, PHOTO_H - 2).clip();
        doc.image(photo, x + 1, y + 1, { cover: [PHOTO_W - 2, PHOTO_H - 2], align: 'center', valign: 'center' });
        doc.restore();
        drawn = true;
      } catch (e) {
        doc.restore();
      }
    }
    if (!drawn) {
      doc.fontSize(FS.small).fillColor(C.text);
      ['AFFIX PASSPORT', 'SIZE PHOTOGRAPH'].forEach((line, i) => this._t(doc, line, x + 4,
        y + PHOTO_H / 2 - 10 + i * 11, { width: PHOTO_W - 8, align: 'center', lineBreak: false }));
    }
    doc.lineWidth(1).strokeColor(C.text).fillColor(C.text);
  }

  // ─── Application summary (unnumbered table under the title) ─────────────────

  _filledSummaryRows(application) {
    const b = application.beneficiary || {};
    const amount = application.requestedAmount
      ? `Rs. ${Number(application.requestedAmount).toLocaleString('en-IN')}` : '—';
    const rows = [
      this._pairRow('Application No.', application.applicationNumber || '—', 'Applied Date', this._formatDate(application.createdAt)),
      this._pairRow('Scheme', application.scheme?.name || '—', 'Project', application.project?.name || '—'),
      this._pairRow('Status', this._formatStatus(application.status), 'Requested Amount', amount)
    ];
    if (b.name || b.phone) rows.push(this._pairRow('Applicant', b.name || '—', 'Phone', b.phone || '—'));
    const location = [application.unit?.name, application.area?.name, application.district?.name]
      .filter(Boolean).join(', ');
    if (location) rows.push(this._spanRow('Location', location));
    return rows;
  }

  // ─── Table primitives ───────────────────────────────────────────────────────
  // A row is { cells: [{ text, span, bg, bold, size, color, link, align }], minH }.
  // Every cell in a row shares the row height so the borders line up.

  _labelCell(text) {
    return { text, bg: C.labelBg, size: FS.label };
  }

  _valueCell(text, extra = {}) {
    return { text, size: FS.value, ...extra };
  }

  _headCell(text) {
    return { text, bg: C.headBg, size: FS.label };
  }

  _pairRow(l1, v1, l2, v2, minH = 0) {
    return { cells: [this._labelCell(l1), this._valueCell(v1), this._labelCell(l2), this._valueCell(v2)], minH };
  }

  _spanRow(label, value, minH = 0, extra = {}) {
    return { cells: [this._labelCell(label), { ...this._valueCell(value, extra), span: 3 }], minH };
  }

  _spanWidth(widths, col, span) {
    return widths.slice(col, col + span).reduce((a, b) => a + b, 0);
  }

  _rowHeight(doc, widths, row) {
    let h = Math.max(MIN_ROW_H, row.minH || 0);
    let col = 0;
    for (const cell of row.cells) {
      const span = cell.span || 1;
      const w = this._spanWidth(widths, col, span);
      col += span;
      const th = this._measure(doc, cell.text, cell.size || FS.value, w - PAD_X * 2, !!cell.bold);
      h = Math.max(h, th + PAD_Y * 2);
    }
    // A value taller than a page is truncated with an ellipsis rather than split
    return Math.min(h, this._usableHeight(doc));
  }

  _drawRow(doc, widths, row, y, h) {
    let x = TAB_L;
    let col = 0;
    for (const cell of row.cells) {
      const span = cell.span || 1;
      const w = this._spanWidth(widths, col, span);
      col += span;
      if (cell.bg) doc.rect(x, y, w, h).fill(cell.bg);
      doc.rect(x, y, w, h).lineWidth(0.5).stroke(C.border);

      const text = cell.text === null || cell.text === undefined ? '' : String(cell.text);
      if (text) {
        const size = cell.size || FS.value;
        const innerW = w - PAD_X * 2;
        const th = this._measure(doc, text, size, innerW, !!cell.bold);
        const ty = th + PAD_Y * 2 <= h ? y + (h - th) / 2 : y + PAD_Y;
        const opts = { width: innerW, height: h - PAD_Y * 2 + 2, ellipsis: true, lineGap: 0 };
        if (cell.align) opts.align = cell.align;
        if (cell.link) { opts.link = cell.link; opts.underline = true; }
        doc.fontSize(size).fillColor(cell.color || C.text);
        this._t(doc, text, x + PAD_X, ty, opts, !!cell.bold);
      }
      x += w;
    }
    doc.lineWidth(1).strokeColor(C.text).fillColor(C.text);
  }

  /** Draw rows top-down, breaking between rows; `repeatHeader` re-draws row 0 on new pages */
  _renderTable(doc, widths, rows, opts = {}) {
    const header = opts.repeatHeader ? rows[0] : null;
    let y = doc.y;
    rows.forEach((row, i) => {
      const h = this._rowHeight(doc, widths, row);
      if (y + h > this._contentBottom(doc)) {
        doc.addPage();
        y = doc.y;
        if (header && i > 0) {
          const hh = this._rowHeight(doc, widths, header);
          this._drawRow(doc, widths, header, y, hh);
          y += hh;
        }
      }
      this._drawRow(doc, widths, row, y, h);
      y += h;
    });
    doc.y = y + (opts.gap === undefined ? 14 : opts.gap);
  }

  _sectionHeading(doc, title) {
    this._ensureSpace(doc, 70); // heading + first table rows stay together
    doc._sectionNo = (doc._sectionNo || 0) + 1;
    doc.fontSize(FS.section).fillColor(C.text);
    this._t(doc, `${doc._sectionNo}. ${String(title).toUpperCase()}`, L, doc.y, { width: CW }, true);
    doc.y += 5;
  }

  // ─── Profile photo ──────────────────────────────────────────────────────────

  /** First enabled profile-photo field in the form, if the admin added one */
  _profilePhotoField(formConfig) {
    const pages = (formConfig && Array.isArray(formConfig.pages)) ? formConfig.pages : [];
    for (const page of pages) {
      const hit = this._allFields(page).find(f => f && f.enabled !== false && f.type === 'profile_photo');
      if (hit) return hit;
    }
    return null;
  }

  /** Resolve the stored photo value (CDN URL or inline data URL) to a PNG/JPEG buffer */
  async _loadPhoto(value) {
    if (value && typeof value === 'object' && typeof value.dataUrl === 'string') {
      return this._dataUrlToImageBuffer(value.dataUrl, value.mimeType);
    }
    if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return null;
    try {
      const res = await fetch(value, { signal: AbortSignal.timeout(PHOTO_FETCH_MS) });
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > MAX_EMBED_BYTES) return null;
      const isPng = buf[0] === 0x89 && buf[1] === 0x50;
      const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
      return (isPng || isJpeg) ? buf : null;
    } catch (e) {
      return null; // unreachable CDN — the box still prints, just with the instruction
    }
  }

  // ─── Form data (one numbered section per configured page) ───────────────────

  /**
   * Renders every configured page as a numbered section: label/value table
   * for regular fields, bordered matrix tables for row/column fields. File
   * fields are collected and returned for the Documents table.
   */
  _addFormData(doc, formConfig, formData, isBlank) {
    const configPages = (formConfig && Array.isArray(formConfig.pages)) ? formConfig.pages : [];
    const data = formData || {};
    const consumed = new Set();
    const files = [];

    // The profile photo is drawn in the title block, never as a table row
    for (const page of configPages) {
      for (const f of this._allFields(page)) {
        if (f && f.type === 'profile_photo') consumed.add(`field_${f.id}`);
      }
    }

    const renderSection = (title, entries) => {
      const grid = [];
      const tables = [];
      for (const entry of entries) {
        if (entry.field?.type === 'file' || (!entry.field && this._fileInfo(entry.value))) files.push(entry);
        else if (this._isTableEntry(entry.field, entry.value, isBlank)) tables.push(entry);
        else grid.push(entry);
      }
      if (!grid.length && !tables.length) return;

      this._sectionHeading(doc, title);
      if (grid.length) this._renderFieldTable(doc, grid, isBlank);
      for (const entry of tables) {
        // A page holding only this one table needs no repeated sub-heading
        const label = entry.field?.label || this._humanizeKey(entry.key);
        const hideLabel = !grid.length && tables.length === 1
          && label.trim().toLowerCase() === String(title).trim().toLowerCase();
        this._renderMatrix(doc, entry, data, isBlank, hideLabel ? '' : label);
      }
    };

    configPages.forEach((page, pageIdx) => {
      const fields = this._pageFields(page);
      if (fields.length === 0) return;
      const entries = this._orderedEntries(fields, data, isBlank, consumed);
      if (entries.length) renderSection(page.title || `Page ${pageIdx + 1}`, entries);
    });

    // Any submitted value that no configured field claims — same as the
    // "Other Details" catch-all in the on-screen view.
    if (!isBlank) {
      const leftovers = Object.keys(data)
        .filter(k => !consumed.has(k) && !k.endsWith('__rowMeta') && !['_id', '__v', 'id'].includes(k))
        .map(k => ({ key: k, field: null, value: data[k] }));
      if (leftovers.length) renderSection('Other Details', leftovers);
    }

    return files;
  }

  /** Every field on a page, including section-nested ones */
  _allFields(page) {
    const all = [...(page.fields || [])];
    if (Array.isArray(page.sections)) {
      for (const section of page.sections) {
        if (Array.isArray(section.fields)) all.push(...section.fields);
      }
    }
    return all;
  }

  /** Renderable fields of a page (defensively includes section-nested fields) */
  _pageFields(page) {
    return this._allFields(page).filter(f => f && f.enabled !== false
      && !['title', 'html', 'group', 'page', 'profile_photo'].includes(f.type));
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

  // ─── Label / value table ────────────────────────────────────────────────────
  // Two short fields share a row (label | value | label | value); a long value,
  // a textarea, or an unpaired field spans the full row (label | value).

  _renderFieldTable(doc, entries, isBlank) {
    const widths = GRID.map(f => TW * f);
    const rows = [];
    for (let i = 0; i < entries.length;) {
      const a = entries[i];
      const b = entries[i + 1];
      if (b && this._isNarrow(doc, a, isBlank, widths[1]) && this._isNarrow(doc, b, isBlank, widths[1])) {
        rows.push({
          cells: [...this._fieldCells(a, isBlank), ...this._fieldCells(b, isBlank)],
          minH: this._blankRowH(a, isBlank)
        });
        i += 2;
      } else {
        const [label, value] = this._fieldCells(a, isBlank);
        rows.push({ cells: [label, { ...value, span: 3 }], minH: this._blankRowH(a, isBlank) });
        i += 1;
      }
    }
    this._renderTable(doc, widths, rows);
  }

  _fieldCells(entry, isBlank) {
    const raw = entry.field?.label || this._humanizeKey(entry.key);
    const label = `${raw}${isBlank && entry.field?.required ? ' *' : ''}`;
    return [this._labelCell(label), this._valueCell(isBlank ? '' : this._entryText(entry))];
  }

  _entryText(entry) {
    if (entry._text === undefined) entry._text = this._getDisplayValue(entry.field, entry.value);
    return entry._text;
  }

  _blankRowH(entry, isBlank) {
    if (!isBlank) return 0;
    return entry.field?.type === 'textarea' ? BLANK_TEXTAREA_H : BLANK_ROW_H;
  }

  /** Fits on one line in a half-width value cell, so it can share a row */
  _isNarrow(doc, entry, isBlank, valueW) {
    if (entry.field?.type === 'textarea') return false;
    if (isBlank) return true;
    const innerW = valueW - PAD_X * 2;
    const oneLine = this._measure(doc, 'Xg', FS.value, innerW);
    return this._measure(doc, this._entryText(entry), FS.value, innerW) <= oneLine + 0.5;
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

  _renderMatrix(doc, entry, formData, isBlank, label) {
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

    const getRowLabel = (i) => {
      if (rowMeta && rowMeta[i]) {
        const base = rowTitles[rowMeta[i].sourceRow] || `Row ${rowMeta[i].sourceRow + 1}`;
        return rowMeta[i].duplicateIndex > 0 ? `${base} (${rowMeta[i].duplicateIndex})` : base;
      }
      return rowTitles[i] || `Row ${i + 1}`;
    };

    // Column count: for matrix fields `columns` is the table width; otherwise it
    // is a layout span, so derive the width from the data itself.
    const configuredCols = isMatrix ? Math.max(Number(field.columns) || 0, columnTitles.length) : columnTitles.length;
    const dataCols = data.length ? Math.max(...data.map(r => r.length)) : 0;
    const colCount = Math.max(configuredCols, dataCols, 1);
    // Every configured row prints (empty ones as dashes), as on screen
    const rowCount = rowMeta ? rowMeta.length : Math.max(data.length, Number(field.rows) || 0) || 2;

    // Row-label column hugs its longest label ("Sl. No." stays narrow, "Qualification" gets room)
    let labelColW = 0;
    if (hasRowLabels) {
      const labels = [firstColumnHeader, ...Array.from({ length: rowCount }, (_, i) => getRowLabel(i))];
      const widest = Math.max(...labels.map(t => {
        const str = String(t || '');
        doc.font(this._hasMalayalam(str) ? 'Regular' : 'Helvetica').fontSize(FS.label);
        return doc.widthOfString(str);
      }));
      labelColW = Math.min(120, Math.max(48, widest + PAD_X * 2 + 6));
    }
    const colW = (TW - labelColW) / colCount;
    const widths = hasRowLabels ? [labelColW, ...Array(colCount).fill(colW)] : Array(colCount).fill(colW);

    const headers = [];
    if (hasRowLabels) headers.push(firstColumnHeader);
    for (let i = 0; i < colCount; i++) headers.push(columnTitles[i] || `Column ${i + 1}`);

    const rows = [{ cells: headers.map(h => this._headCell(h)) }];
    for (let r = 0; r < rowCount; r++) {
      const cells = [];
      if (hasRowLabels) cells.push(this._valueCell(getRowLabel(r)));
      for (let c = 0; c < colCount; c++) {
        const v = isBlank ? '' : (data[r]?.[c] || '');
        cells.push(this._valueCell(v || (isBlank ? '' : '—')));
      }
      rows.push({ cells, minH: isBlank ? BLANK_ROW_H : 0 });
    }

    if (label) {
      const labelH = this._measure(doc, label, FS.subLabel, CW, true);
      this._ensureSpace(doc, labelH + 60);
      doc.fontSize(FS.subLabel).fillColor(C.text);
      this._t(doc, label, L, doc.y, { width: CW }, true);
      doc.y += 4;
    }
    this._renderTable(doc, widths, rows, { repeatHeader: true });
  }

  // ─── Documents ──────────────────────────────────────────────────────────────

  /** Uploaded-file fields plus the application's document attachments, one row each */
  _addDocumentsTable(doc, fileEntries, documents, isBlank) {
    const rows = [{ cells: [this._headCell('Document'), this._headCell('Status / File')] }];

    for (const entry of fileEntries) {
      const raw = entry.field?.label || this._humanizeKey(entry.key);
      if (isBlank) {
        rows.push({ cells: [this._valueCell(`${raw}${entry.field?.required ? ' *' : ''}`), this._valueCell('')], minH: BLANK_ROW_H });
        continue;
      }
      const file = this._fileInfo(entry.value);
      const status = file
        ? this._valueCell(`Submitted (${file.name})`, file.url ? { link: file.url, color: C.link } : {})
        : this._valueCell('Not Uploaded');
      rows.push({ cells: [this._valueCell(raw), status] });
    }

    for (const item of documents || []) {
      const name = item.name || item.fieldLabel || item.originalName || 'Document';
      rows.push({ cells: [this._valueCell(name), this._valueCell('Submitted', item.url ? { link: item.url, color: C.link } : {})] });
    }

    if (rows.length === 1) return;
    this._sectionHeading(doc, 'Documents Submitted');
    this._renderTable(doc, [TW * 0.5, TW * 0.5], rows, { repeatHeader: true });
  }

  // ─── Office use / signatures ────────────────────────────────────────────────

  _addOfficeUse(doc) {
    this._ensureSpace(doc, 170);
    this._sectionHeading(doc, 'Office Use');
    const y = doc.y + 96;
    const colW = CW / 3;
    doc.fontSize(FS.label).fillColor(C.text);
    ['Applicant Signature', 'Interview Officer', 'Authorized Signatory'].forEach((label, i) => {
      const x = L + colW * i;
      this._t(doc, label, x, y, { width: colW, align: 'center', lineBreak: false });
      doc.moveTo(x + colW / 2 - 55, y + 30).lineTo(x + colW / 2 + 55, y + 30)
        .lineWidth(0.6).strokeColor(C.text).stroke();
    });
    doc.lineWidth(1).fillColor(C.text);
    doc.y = y + 44;
  }

  // ─── Value helpers ──────────────────────────────────────────────────────────

  /** Mongoose sub-documents/Maps → plain object, so key order and access work */
  _plainFormData(formData) {
    if (!formData) return {};
    if (typeof formData.toObject === 'function') return formData.toObject();
    if (formData instanceof Map) return Object.fromEntries(formData);
    return formData;
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
      return { name, url: null };
    }
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
      // Uploads are stored as "<timestamp>-<original name>"; print only the original name
      const name = decodeURIComponent(value.split('/').pop().split('?')[0] || 'file').replace(/^\d{10,}-/, '');
      return { name, url: value };
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
      return buf.length > MAX_EMBED_BYTES ? null : buf;
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

    if (field?.type === 'date' || field?.type === 'datetime') {
      const formatted = field.type === 'date' ? this._formatDate(rawValue) : this._formatDateTime(rawValue);
      if (formatted) return formatted;
    }

    return String(rawValue);
  }

  /** "28 August 2026"; ISO date-only strings are read as calendar dates, not UTC instants */
  _formatDate(dateVal) {
    if (!dateVal) return '—';
    const iso = typeof dateVal === 'string' && dateVal.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const d = iso ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) : new Date(dateVal);
    if (isNaN(d.getTime())) return typeof dateVal === 'string' ? dateVal : '—';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  _formatDateTime(dateVal) {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return typeof dateVal === 'string' ? dateVal : '—';
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  _formatStatus(status) {
    if (!status) return '—';
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}

module.exports = new ApplicationPdfService();
