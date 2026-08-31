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

    doc.moveDown(1.2);
    const contentStartY = Math.round(doc.y);

    // Section divider line
    doc.strokeColor('#3b82f6').lineWidth(2).moveTo(leftX, contentStartY - 4).lineTo(this.pageWidth - this.margin, contentStartY - 4).stroke();

    const panelsHeight = 225;

    // LEFT COLUMN: Student Info Panel
    doc.save()
      .roundedRect(leftX - 5, contentStartY, leftColW + 10, panelsHeight, 6)
      .fillColor('#f0f9ff')
      .fill()
      .strokeColor('#bfdbfe')
      .lineWidth(1)
      .stroke()
      .restore();

    let infoY = contentStartY + 8;
    const infoLeft = leftX + 4;
    const infoColW = leftColW - 4;

    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#1e40af').text('Name of Student', infoLeft, infoY);
    infoY += 13;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text((student.name || 'N/A').toUpperCase(), infoLeft, infoY, { width: infoColW });
    infoY += 16;

    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#1e40af').text('Institution Name', infoLeft, infoY);
    infoY += 13;
    doc.fontSize(9).font('Helvetica').fillColor('#0f172a').text(coordinator.schoolName || (student.school?.schoolName) || 'N/A', infoLeft, infoY, { width: infoColW, lineBreak: false });
    infoY += 17;

    const rollNumber = String(student.rollNumber || student._id || 'N/A').replace(/^BOM/, '');
    
    const drawRow = (label, val) => {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e40af').text(label, infoLeft, infoY, { continued: true });
      doc.fontSize(9).font('Helvetica').fillColor('#0f172a').text(' ' + val);
      infoY += 15;
    };

    drawRow('Roll Number:', rollNumber);
    drawRow('Class:', String(student.class || 'N/A'));
    drawRow('Category:', this.getCategoryName(student.category));
    drawRow('Registration No:', String(student.registrationId || 'N/A'));
    
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e40af').text('Enrolled Subject(s):', infoLeft, infoY);
    infoY += 13;
    doc.fontSize(8.5).font('Helvetica').fillColor('#0f172a').text(this.formatSubjects(student.subjects), infoLeft, infoY, { width: infoColW });
    infoY += 16;

    drawRow('Downloaded On:', `${istTimeStr} IST`);

    // RIGHT COLUMN: Top = Exam Schedule, Bottom = Verification QR Code
    const rightPanelX = rightX - 5;
    const rightPanelW = leftColW + 10;
    const examBoxH = 68;

    // Exam Schedule Box
    doc.save()
      .roundedRect(rightPanelX, contentStartY, rightPanelW, examBoxH, 6)
      .fillColor('#fef3c7')
      .fill()
      .strokeColor('#f59e0b')
      .lineWidth(1.5)
      .stroke()
      .restore();

    let schY = contentStartY + 8;
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#92400e').text('EXAM SCHEDULE (2026)', rightPanelX + 8, schY);
    schY += 16;
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#b45309').text('29th August, 2026 (Saturday)', rightPanelX + 8, schY);
    schY += 15;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e40af').text('Report: ', rightPanelX + 8, schY, { continued: true });
    doc.fontSize(9).font('Helvetica').fillColor('#0f172a').text('9:00 AM onwards');

    // QR Code Container Box
    const qrBoxY = contentStartY + examBoxH + 6;
    const qrBoxH = panelsHeight - examBoxH - 6;

    doc.save()
      .roundedRect(rightPanelX, qrBoxY, rightPanelW, qrBoxH, 6)
      .fillColor('#ffffff')
      .fill()
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .stroke()
      .restore();

    // Generate and draw QR Code
    try {
      const baseVerify = student.verifyBaseUrl || process.env.VERIFY_BASE_URL || this.verifyBaseUrl || 'https://brainomath.online';
      const snapshot = {
        studentId: student.studentId || null,
        rollNumber: student.rollNumber || null,
        name: student.name || null,
        class: student.class || null,
        category: student.category || null,
        subjects: student.subjects || null,
        schoolName: coordinator.schoolName || (student.school?.schoolName) || null,
        coordinatorName: coordinator.coordinatorName || (student.school?.coordinatorName) || null,
        registrationId: student.registrationId || null,
        downloadedAt: `${istTimeStr} IST`
      };

      const json = JSON.stringify(snapshot);
      const b64 = Buffer.from(json).toString('base64');
      const b64url = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const verifyUrl = `${baseVerify.replace(/\/$/, '')}/verify.html?data=${b64url}`;

      const dataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, color: { dark: '#000000', light: '#FFFFFF' } });
      const base64 = dataUrl.split(',')[1];
      const imgBuf = Buffer.from(base64, 'base64');

      const qrSize = 100;
      const qrX = rightPanelX + (rightPanelW - qrSize) / 2;
      const qrY = qrBoxY + 8;

      doc.image(imgBuf, qrX, qrY, { width: qrSize, height: qrSize });
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#1e40af').text('Scan to Verify & Check Result', rightPanelX, qrY + qrSize + 4, { width: rightPanelW, align: 'center' });
    } catch (e) {
      console.log('QR generation error:', e.message);
    }

    // VENUE PANEL
    const venueY = contentStartY + panelsHeight + 8;
    const venueH = 58;

    doc.save()
      .roundedRect(leftX - 5, venueY, contentW + 10, venueH, 6)
      .fillColor('#f0fdf4')
      .fill()
      .strokeColor('#86efac')
      .lineWidth(1)
      .stroke()
      .restore();

    const venue = this.getVenueDetails(student.venue || (coordinator && coordinator.venue));
    let vy = venueY + 6;
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#15803d').text('VENUE', leftX + 4, vy);
    vy += 14;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a').text(venue.name, leftX + 4, vy);
    vy += 13;
    if (venue.address && venue.address.length > 0) {
      doc.fontSize(8.5).font('Helvetica').fillColor('#334155').text(venue.address.join(' '), leftX + 4, vy);
    }

    // GENERAL INSTRUCTIONS
    const instHeaderY = venueY + venueH + 8;
    doc.save()
      .roundedRect(leftX - 5, instHeaderY, contentW + 10, 18, 4)
      .fillColor('#dbeafe')
      .fill()
      .restore();

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#0c4a6e').text('GENERAL INSTRUCTIONS', leftX + 4, instHeaderY + 4);

    let instY = instHeaderY + 23;
    const instructions = [
      '1. Students must carry a printed copy of the Admit Card along with their School Identity Card to the examination hall.',
      '2. Students are advised to reach the examination venue at least 15 minutes before the reporting time.',
      '3. Students must appear only for the subject(s) mentioned on their Admit Card.',
      '4. Each student must carry a blue or black ballpoint pen and a pencil for the examination.',
      '5. The examination will be conducted using an OMR answer sheet. Mark your answers carefully. Do not fold or damage the OMR sheet.',
      '6. Electronic devices such as calculators, smartwatches, and mobile phones are strictly prohibited.',
      '7. Students must strictly follow invigilator instructions and maintain silence and discipline.',
      '8. Any form of unfair means or misconduct may result in immediate disqualification.',
      '9. Parents/guardians are requested not to enter the examination hall.',
      '10. Please preserve and keep this Admit Card safely until results and certificates are declared.'
    ];

    doc.fontSize(7.5).font('Helvetica').fillColor('#1e293b');
    instructions.forEach((inst) => {
      doc.text(inst, leftX, instY, { width: contentW, align: 'left' });
      instY += 13.5;
    });

    // SIGNATURE LINES
    const sigY = this.pageHeight - this.margin - 48;
    const sigLineLen = 130;

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e40af').text("Student's Signature:", leftX, sigY);
    doc.moveTo(leftX + 110, sigY + 8).lineWidth(1.2).lineTo(leftX + 110 + sigLineLen, sigY + 8).strokeColor('#3b82f6').stroke();

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e40af').text("Invigilator's Signature:", rightX - 5, sigY);
    doc.moveTo(rightX + 115, sigY + 8).lineWidth(1.2).lineTo(rightX + 115 + sigLineLen, sigY + 8).strokeColor('#3b82f6').stroke();

    // FOOTER
    doc.rect(0, this.pageHeight - this.margin - 24, this.pageWidth, 24).fillColor('#1e3a8a').fill();
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#fbbf24').text('BRAIN O MATH OLYMPIAD 2026', leftX, this.pageHeight - this.margin - 20, { width: contentW, align: 'center' });
    doc.fontSize(7).font('Helvetica').fillColor('#e0e7ff').text('brainomath.online', leftX, this.pageHeight - this.margin - 10, { width: contentW, align: 'center' });
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
