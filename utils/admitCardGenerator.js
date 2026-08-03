// AdmitCardGenerator.js
// Clean PDF layout for BRAIN O MATH ADMIT CARD
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

class AdmitCardGenerator {
  constructor(options = {}) {
    this.pageWidth = options.pageWidth || 595;    // A4 points
    this.pageHeight = options.pageHeight || 842;
    this.margin = options.margin || 40;

    // Logo path - stored in backend folder (supports png or jpg)
    const logoPng = path.resolve(__dirname, '../logo.png');
    const logoJpg = path.resolve(__dirname, '../logo.jpg');
    this.logoPath = fs.existsSync(logoPng) ? logoPng : (fs.existsSync(logoJpg) ? logoJpg : logoPng);
    // Also check static folder
    const staticLogo = path.resolve(__dirname, '../BOM/static/public/logo.jpg');
    if (!fs.existsSync(this.logoPath) && fs.existsSync(staticLogo)) {
      this.logoPath = staticLogo;
    }

    this.titleSize = options.titleSize || 22;
    this.subtitleSize = options.subtitleSize || 12;
    this.mainTitleSize = options.mainTitleSize || 22;
    this.labelSize = options.labelSize || 11;
    this.valueSize = options.valueSize || 11;
    this.instructionSize = options.instructionSize || 8.2;
    this.footerSize = options.footerSize || 8;
  }

  async generateAdmitCard(student = {}, coordinator = {}) {
    // make sure _drawCard can do async work (QR generation)
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: this.margin, left: this.margin, bottom: this.margin, right: this.margin }
        });

        const bufs = [];
        doc.on('data', (d) => bufs.push(d));
        doc.on('end', () => resolve(Buffer.concat(bufs)));
        doc.on('error', (e) => reject(e));

        await this._drawCard(doc, student || {}, coordinator || {});
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  async generateBulkAdmitCards(students = [], coordinator = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: this.margin, left: this.margin, bottom: this.margin, right: this.margin }
        });

        const bufs = [];
        doc.on('data', (d) => bufs.push(d));
        doc.on('end', () => resolve(Buffer.concat(bufs)));
        doc.on('error', (e) => reject(e));

        for (let idx = 0; idx < students.length; idx++) {
          const st = students[idx] || {};
          if (idx > 0) doc.addPage();
          // await because QR generation is async
          await this._drawCard(doc, st, coordinator || {});
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }


  _findLogo() {
    if (fs.existsSync(this.logoPath)) {
      return this.logoPath;
    }
    return null;
  }

  _mapSubject(s) {
    if (!s) return 'N/A';
    const m = String(s).toLowerCase();
    if (m === 'english') return 'English';
    if (m === 'math' || m === 'mathematics') return 'Mathematics';
    if (m === 'science') return 'Science';
    if (m === 'cs' || m === 'computer science' || m === 'computer_science') return 'Computer Science';
    if (m === 'both') return 'Mathematics & Science';
    return s;
  }

  formatSubjects(sub) {
    if (!sub) return 'N/A';
    if (Array.isArray(sub)) return sub.map(s => this._mapSubject(s)).join(', ');
    if (typeof sub === 'string') {
      if (sub.includes(',')) return sub.split(',').map(s => this._mapSubject(s.trim())).join(', ');
      return this._mapSubject(sub.trim());
    }
    return String(sub);
  }

  getVenueDetails(venue) {
    const name = String(venue || 'Doon Heritage School, Siliguri').trim();
    const details = {
      'Doon Heritage School, Siliguri': [
        'Kolabari Rd, Champasari, Siliguri,',
        'Darjeeling, West Bengal - 734003'
      ],
      'Don Bosco School, Mayanaguri': [
        'Mayanaguri, Jalpaiguri, West Bengal'
      ]
    };
    return { name, address: details[name] || [] };
  }

  getCategoryName(cat) {
    const map = { 'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D', 'E': 'E' };
    return map[cat] || (cat || 'N/A');
  }

  async _drawCard(doc, student = {}, coordinator = {}) {
    const contentW = this.pageWidth - 2 * this.margin;
    const leftX = this.margin;
    const leftColW = contentW * 0.45;
    const rightX = this.margin + leftColW + 30;

    // Colorful Header Background - taller to fit logo
    doc.rect(0, 0, this.pageWidth, 100).fillColor('#1e3a8a').fill();

    // Format IST timestamp for download tracking
    const istTimeStr = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(new Date());

    // Header: Circular Logo on the LEFT + Title text on right side
    const logoPath = this._findLogo();
    const logoRadius = 40;
    const logoX = this.margin + logoRadius + 5;
    const logoY = 50; // Center of logo in header

    if (logoPath) {
      try {
        // Draw circular white background for logo
        this._drawCircle(doc, logoX, logoY, logoRadius, '#ffffff');

        // Save graphics state for circular clipping
        doc.save();
        doc.circle(logoX, logoY, logoRadius - 2).clip();

        // Draw the Brain-O-Math logo
        doc.image(logoPath, logoX - logoRadius + 2, logoY - logoRadius + 2, {
          width: (logoRadius * 2) - 4,
          height: (logoRadius * 2) - 4
        });
        doc.restore();

        // Circular gold border around logo
        doc.circle(logoX, logoY, logoRadius).strokeColor('#fbbf24').lineWidth(2.5).stroke();
      } catch (e) {
        console.log('Logo drawing error:', e.message);
      }
    }

    // Title text - positioned to the right of the logo
    const titleX = logoX + logoRadius + 15;
    const titleWidth = contentW - (titleX - this.margin);

    doc.font('Helvetica-Bold').fontSize(this.titleSize).fillColor('#ffffff');
    doc.text('BRAIN O MATH OLYMPIAD 2026', titleX, 18, { width: titleWidth, align: 'left' });

    doc.font('Helvetica-Bold').fontSize(this.mainTitleSize).fillColor('#fbbf24');
    // Center the admit-card label across the complete page content area,
    // rather than limiting it to the space beside the logo.
    doc.text('ADMIT CARD', leftX, doc.y + 6, { width: contentW, align: 'center' });

    doc.moveDown(1.5);
    const contentStartY = doc.y;

    // Colorful section divider line
    doc.strokeColor('#3b82f6').lineWidth(2).moveTo(leftX, doc.y).lineTo(this.pageWidth - this.margin, doc.y).stroke();
    doc.moveDown(0.3);

    // LEFT COLUMN: Student Info (with subtle background)
    // Keep the complete student-information section inside its blue panel,
    // including the downloaded timestamp.
    doc.rect(leftX - 5, doc.y - 5, leftColW + 10, 260).fillColor('#f0f9ff').fill();

    doc.fontSize(this.labelSize).font('Helvetica-Bold').fillColor('#1e40af').text('Name of Student', leftX);
    doc.fontSize(this.valueSize).font('Helvetica').fillColor('#000000').text((student.name || 'N/A').toUpperCase(), leftX, doc.y + 2, { width: leftColW });
    doc.moveDown(0.7);

    doc.fontSize(this.labelSize).font('Helvetica-Bold').fillColor('#1e40af').text('Institution Name');
    doc.fontSize(this.valueSize).font('Helvetica').fillColor('#000000').text(coordinator.schoolName || (student.school?.schoolName) || 'N/A', leftX, doc.y + 2, { width: leftColW });
    doc.moveDown(1.0);

    // Inline fields (left column) with colored labels
    this._drawInlineField(doc, 'Roll Number:', String(student.rollNumber || student._id || 'N/A'), leftX, '#1e40af');
    this._drawInlineField(doc, 'Class:', String(student.class || 'N/A'), leftX, '#1e40af');
    this._drawInlineField(doc, 'Category:', this.getCategoryName(student.category), leftX, '#1e40af');
    this._drawInlineField(doc, 'Registration Number:', String(student.registrationId || 'N/A'), leftX, '#1e40af');

    doc.fontSize(this.labelSize).font('Helvetica-Bold').fillColor('#1e40af').text('Enrolled Subject(s):', leftX);
    doc.fontSize(this.valueSize).font('Helvetica').fillColor('#000000').text(this.formatSubjects(student.subjects), leftX, doc.y + 2, { width: leftColW });
    doc.moveDown(0.5);

    this._drawInlineField(doc, 'Downloaded On:', `${istTimeStr} IST`, leftX, '#1e40af');

    const leftColumnEndY = doc.y + 35;

    // Parse student enrolled subjects
    const rawSubs = Array.isArray(student.subjects) ? student.subjects.join(',').toLowerCase() : String(student.subjects || '').toLowerCase();
    let hasEnglish = rawSubs.includes('english');
    let hasCS = rawSubs.includes('cs') || rawSubs.includes('computer science');
    let hasMath = rawSubs.includes('math') || rawSubs.includes('both');
    let hasScience = rawSubs.includes('science') || rawSubs.includes('both');

    // Fallback: if no subject matched, show all by default
    if (!hasEnglish && !hasCS && !hasMath && !hasScience) {
      hasEnglish = true;
      hasCS = true;
      hasMath = true;
      hasScience = true;
    }

    const hasFri = hasEnglish || hasCS;
    const hasSat = hasMath || hasScience;

    // RIGHT COLUMN: Exam Times Box
    const examTimesStartY = contentStartY + 30;
    const examBoxHeight = 150;
    doc.rect(rightX - 10, examTimesStartY, leftColW + 15, examBoxHeight).fillColor('#fef3c7').fill();
    doc.rect(rightX - 10, examTimesStartY, leftColW + 15, examBoxHeight).strokeColor('#f59e0b').lineWidth(2).stroke();

    let currY = examTimesStartY + 8;
    doc.fontSize(this.labelSize).font('Helvetica-Bold').fillColor('#92400e').text('EXAM SCHEDULE (2026)', rightX, currY);
    currY += 16;

    // 7th August 2026 (Friday)
    if (hasFri) {
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#b45309').text('7th August 2026 (Friday)', rightX, currY);
      currY += 12;
      if (hasEnglish) {
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e40af').text('English:', rightX, currY);
        doc.fontSize(8).font('Helvetica').fillColor('#000000').text('Report: 8:45-9:15 AM | Exam: 9:30-10:30 AM', rightX + 42, currY);
        currY += 12;
      }
      if (hasCS) {
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e40af').text('Comp. Sci:', rightX, currY);
        doc.fontSize(8).font('Helvetica').fillColor('#000000').text('Report: 10:45-10:55 AM | Exam: 11:00-12:00 PM', rightX + 52, currY);
        currY += 12;
      }
      currY += 4;
    }

    // 8th August 2026 (Saturday)
    if (hasSat) {
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#b45309').text('8th August 2026 (Saturday)', rightX, currY);
      currY += 12;
      if (hasMath) {
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e40af').text('Mathematics:', rightX, currY);
        doc.fontSize(8).font('Helvetica').fillColor('#000000').text('Report: 8:45-9:15 AM | Exam: 9:30-10:30 AM', rightX + 62, currY);
        currY += 12;
      }
      if (hasScience) {
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e40af').text('Science:', rightX, currY);
        doc.fontSize(8).font('Helvetica').fillColor('#000000').text('Report: 10:45-10:55 AM | Exam: 11:00-12:00 PM', rightX + 45, currY);
        currY += 12;
      }
    }

    // Set doc.y to below left column to ensure proper layout
    doc.y = leftColumnEndY;

    // Generate QR for verification and place it below exam times
    try {
      // Base verify URL - allow override via student payload, env, or options
      const baseVerify = student.verifyBaseUrl || process.env.VERIFY_BASE_URL || this.verifyBaseUrl || 'https://brainomath.online';

      // Build a compact snapshot of the student data to embed in the QR
      const snapshot = {
        studentId: student.studentId || null,
        rollNumber: student.rollNumber || null,
        name: student.name || null,
        class: student.class || null,
        category: student.category || null,
        subjects: student.subjects || null,
        parentName: student.parentName || null,
        parentContact: student.parentContact || null,
        schoolName: coordinator.schoolName || (student.school?.schoolName) || null,
        coordinatorName: coordinator.coordinatorName || (student.school?.coordinatorName) || null,
        coordinatorEmail: coordinator.coordinatorEmail || (student.school?.coordinatorEmail) || null,
        coordinatorPhone: coordinator.coordinatorPhone || (student.school?.coordinatorPhone) || null,
        registrationId: student.registrationId || null,
        downloadedAt: `${istTimeStr} IST`
      };

      // JSON -> base64url encode (URL safe)
      const json = JSON.stringify(snapshot);
      const b64 = Buffer.from(json).toString('base64');
      const b64url = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      // QR contains a direct link to verify.html with embedded data
      const verifyUrl = `${baseVerify.replace(/\/$/, '')}/verify.html?data=${b64url}`;

      // Create data URL (PNG) from the verify URL
      const dataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, color: { dark: '#000000', light: '#FFFFFF' } });
      // Strip data:image/png;base64,
      const base64 = dataUrl.split(',')[1];
      const imgBuf = Buffer.from(base64, 'base64');

      // Place QR below exam times box (right column, under exam schedule)
      const qrSize = 95;
      const qrX = rightX + (leftColW - qrSize) / 2; // Center QR horizontally in right column
      const qrY = examTimesStartY + 155; // Below the exam times box
      try {
        doc.image(imgBuf, qrX, qrY, { width: qrSize, height: qrSize });
      } catch (e) {
        console.log('QR draw error:', e.message);
      }
    } catch (e) {
      console.log('QR generation error:', e.message);
    }

    // VENUE - with colorful background
    doc.moveDown(0.6);
    doc.rect(leftX - 5, doc.y - 5, contentW + 10, 75).fillColor('#dcfce7').fill();

    const venue = this.getVenueDetails(student.venue || (coordinator && coordinator.venue));
    doc.fontSize(this.labelSize).font('Helvetica-Bold').fillColor('#15803d').text('Venue', leftX);
    doc.fontSize(this.valueSize).font('Helvetica').fillColor('#000000').text(venue.name, leftX, doc.y + 2, { width: contentW - 20 });
    venue.address.forEach((line) => {
      doc.moveDown(0.4);
      doc.fontSize(this.valueSize).font('Helvetica').fillColor('#000000').text(line, leftX);
    });

    // INSTRUCTIONS
    doc.moveDown(1.2);
    // Give the section title enough vertical padding so the background fully
    // covers the text instead of appearing as a thin strip behind its top.
    doc.rect(leftX - 5, doc.y - 6, contentW + 10, 19).fillColor('#dbeafe').fill();
    doc.fontSize(this.labelSize).font('Helvetica-Bold').fillColor('#0c4a6e').text('GENERAL INSTRUCTIONS', leftX, doc.y);
    doc.moveDown(0.6);

    const instructions = [
      '1. Students must carry a printed copy of the Admit Card along with their School Identity Card or any other valid identity card to the examination hall. No entry will be allowed without these documents.',
      '2. Students are advised to reach the examination venue at least 15 minutes before the reporting time for each examination.',
      '3. Students must appear only for the subject(s) mentioned on their Admit Card.',
      '4. Each student must carry a blue or black ballpoint pen and a pencil for the examination.',
      '5. The examination will be conducted using an OMR answer sheet. Students must fill in their details and mark their answers carefully as instructed by the invigilator. Do not fold, tear, or damage the OMR sheet.',
      '6. Electronic devices such as calculators, smartwatches, and mobile phones are strictly prohibited inside the examination venue.',
      '7. Students must strictly follow the instructions of the invigilators and maintain silence and discipline inside the examination hall.',
      '8. Any form of unfair means, misconduct, or violation of the examination rules may result in disqualification.',
      '9. Parents/guardians are requested not to enter the examination hall.',
      '10. IMPORTANT: If you have an examination on the second day, please preserve and carry this Admit Card for the next day\'s examination. Keep the Admit Card safely until the results are declared.'
    ];

    doc.fontSize(this.instructionSize).font('Helvetica').fillColor('#000000');
    instructions.forEach((inst) => {
      doc.text(inst, leftX, doc.y, { width: contentW - 20, align: 'left', lineGap: 1 });
      doc.moveDown(0.22);
    });

    // SIGNATURE LINES (positioned closer to footer)
    const sigY = this.pageHeight - this.margin - 65;
    const sigLineLen = 120;

    doc.fontSize(this.labelSize).font('Helvetica').fillColor('#1e40af').text("Student's Signature:", leftX, sigY);
    doc.moveTo(leftX + 105, sigY + 9).lineWidth(1.5).lineTo(leftX + 125 + sigLineLen, sigY + 9).strokeColor('#3b82f6').stroke();

    doc.fontSize(this.labelSize).font('Helvetica').fillColor('#1e40af').text("Invigilator's Signature:", rightX, sigY);
    doc.moveTo(rightX + 120, sigY + 9).lineWidth(1.5).lineTo(rightX + 135 + sigLineLen, sigY + 9).strokeColor('#3b82f6').stroke();

    // FOOTER with colorful background
    doc.rect(0, this.pageHeight - this.margin - 35, this.pageWidth, 35).fillColor('#1e3a8a').fill();
    doc.fontSize(this.footerSize).font('Helvetica-Bold').fillColor('#fbbf24').text('BRAIN O MATH OLYMPIAD 2026', leftX, this.pageHeight - this.margin - 30, { width: contentW, align: 'center' });
    doc.fontSize(this.footerSize).font('Helvetica').fillColor('#e0e7ff').text('BRAIN-O-MATH OLYMPIAD', leftX, this.pageHeight - this.margin - 18, { width: contentW, align: 'center' });
  }

  _drawRoundedRectangle(doc, x, y, width, height, radius, fillColor = null) {
    if (fillColor) doc.fillColor(fillColor).fillOpacity(1);
    doc.moveTo(x + radius, y)
      .lineTo(x + width - radius, y)
      .quadraticCurveTo(x + width, y, x + width, y + radius)
      .lineTo(x + width, y + height - radius)
      .quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
      .lineTo(x + radius, y + height)
      .quadraticCurveTo(x, y + height, x, y + height - radius)
      .lineTo(x, y + radius)
      .quadraticCurveTo(x, y, x + radius, y)
      .fill();
  }

  _drawCircle(doc, x, y, radius, fillColor = null) {
    if (fillColor) doc.fillColor(fillColor).fillOpacity(1);
    doc.circle(x, y, radius).fill();
    doc.strokeColor('#3b82f6').lineWidth(3).circle(x, y, radius).stroke();
  }

  _drawInlineField(doc, label, value, x, labelColor = '#1e40af') {
    doc.fontSize(this.labelSize).font('Helvetica-Bold').fillColor(labelColor).text(label + ' ');
    doc.fontSize(this.valueSize).font('Helvetica').fillColor('#000000').text(String(value));
    doc.moveDown(0.5);
  }
}

module.exports = AdmitCardGenerator;
