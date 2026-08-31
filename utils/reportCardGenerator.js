// reportCardGenerator.js
// Certificate-Styled PDF Report Card Generator for Brain O Math Olympiad

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

class ReportCardGenerator {
  constructor() {
    this.logoPath = path.resolve(__dirname, './logo.png'); // faded background logo
  }

  async generateReportCard(student = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A5',
          layout: 'landscape',
          margins: 0
        });

        const bufs = [];
        doc.on('data', d => bufs.push(d));
        doc.on('end', () => resolve(Buffer.concat(bufs)));
        doc.on('error', reject);

        await this._drawReportCard(doc, student);
        doc.end();

      } catch (err) {
        reject(err);
      }
    });
  }

  async _drawReportCard(doc, student) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Layout
    const margin = 20;
    const innerMargin = 12;
    const contentWidth = pageWidth - margin * 2;

    /* ----------------------------------------------------
     * BACKGROUND + BORDERS
     * -------------------------------------------------- */
    // Soft white-cream background
    doc.rect(0, 0, pageWidth, pageHeight).fill('#fffdf7');


    // Outer Border
    doc.save()
      .lineWidth(4)
      .strokeColor('#a67c52')
      .roundedRect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2, 18)
      .stroke()
      .restore();

    // Inner Border
    doc.save()
      .lineWidth(1.8)
      .strokeColor('#d8c08a')
      .roundedRect(
        margin + innerMargin,
        margin + innerMargin,
        pageWidth - (margin + innerMargin) * 2,
        pageHeight - (margin + innerMargin) * 2,
        12
      )
      .stroke()
      .restore();

    /* ----------------------------------------------------
     * BIG FADED LOGO (CENTER)
     * -------------------------------------------------- */
    try {
      doc.save();
      doc.opacity(0.10);

      const logoWidth = pageWidth * 0.7;
      const logoX = (pageWidth - logoWidth) / 2;
      const logoY = (pageHeight - logoWidth) / 2 +15;

      doc.image(this.logoPath, logoX, logoY, { width: logoWidth });
      doc.restore();
    } catch { }

    /* ----------------------------------------------------
     * TITLE
     * -------------------------------------------------- */
    const titleY = margin + 15;

    doc
      .font('Times-Bold')
      .fontSize(28)
      .fillColor('#222')
      .text("Brain O Math Olympiad 2026", 0, titleY + 5, {
        width: pageWidth,
        align: 'center'
      });

    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .text('SCORE CARD', 0, titleY + 34, {
        width: pageWidth,
        align: 'center'
      });

    /* ----------------------------------------------------
     * STUDENT INFORMATION & VERIFICATION QR CODE
     * -------------------------------------------------- */
    const leftX = margin + 18;
    const infoY = titleY + 70;

    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#0b4f6c')
      .text('STUDENT INFORMATION', leftX, infoY - 20);

    let y = infoY;
    const labelWidth = Math.min(110, Math.floor(contentWidth * 0.32));

    const writeField = (label, value) => {
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#222');
      doc.text(label, leftX, y);

      doc.font('Helvetica').fontSize(10).fillColor('#000');
      doc.text(value, leftX + labelWidth, y, { width: contentWidth - 220 });

      y += 18;
    };

    writeField('Student Name:', student.name || 'N/A');
    writeField('Roll Number:', student.rollNumber || 'N/A');
    writeField('Class:', student.class ? `Class ${student.class}` : 'N/A');
    writeField('Category:', student.category || 'N/A');
    writeField('School:', student.schoolName || 'N/A');

    const subjectMap = {
      'english': 'English',
      'math': 'Mathematics',
      'science': 'Science',
      'cs': 'Computer Science'
    };
    const subjects = String(student.subjects || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
      .map(s => subjectMap[s] || s)
      .join(', ') || 'N/A';

    writeField('Subject Choice:', subjects);

    // DRAW VERIFICATION QR CODE ON THE RIGHT SIDE OF STUDENT INFO
    try {
      const baseVerify = student.verifyBaseUrl || process.env.VERIFY_BASE_URL || 'https://brainomath.online';
      const snapshot = {
        studentId: student.studentId || null,
        rollNumber: student.rollNumber || null,
        name: student.name || null,
        class: student.class || null,
        category: student.category || null,
        schoolName: student.schoolName || null
      };

      const json = JSON.stringify(snapshot);
      const b64 = Buffer.from(json).toString('base64');
      const b64url = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const verifyUrl = `${baseVerify.replace(/\/$/, '')}/verify.html?data=${b64url}`;

      const dataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, color: { dark: '#000000', light: '#FFFFFF' } });
      const base64 = dataUrl.split(',')[1];
      const imgBuf = Buffer.from(base64, 'base64');

      const qrSize = 72;
      const qrX = pageWidth - margin - innerMargin - qrSize - 15;
      const qrY = infoY - 14;

      doc.save()
        .roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 22, 6)
        .fillColor('#ffffff')
        .fill()
        .strokeColor('#d8c08a')
        .lineWidth(1)
        .stroke()
        .restore();

      doc.image(imgBuf, qrX, qrY, { width: qrSize, height: qrSize });
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#0b4f6c').text('Scan to Verify', qrX - 4, qrY + qrSize + 2, { width: qrSize + 8, align: 'center' });
    } catch (e) {
      console.log('Report card QR error:', e.message);
    }

    /* ----------------------------------------------------
     * SUBJECT PERFORMANCE SECTION
     * -------------------------------------------------- */
    const scoreTitleY = y + 10;

    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#0b4f6c')
      .text('SUBJECT PERFORMANCE', leftX, scoreTitleY - 10);

    y = scoreTitleY + 18;

    const availableWidth = contentWidth - 36; // gap between boxes
    const twoBoxWidth = Math.floor(availableWidth / 2);
    const singleBoxWidth = availableWidth;

    /* BOX DRAWER */
    const drawScoreBox = (x, width, subject, marks, rank) => {
      doc.save()
        .lineWidth(1.2)
        .strokeColor('#d8c08a')
        .roundedRect(x, y, width, 120, 8)
        .stroke()
        .restore();

      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0b4f6c');
      doc.text(subject.toUpperCase(), x + 12, y + 10);

      // Marks
      doc.font('Helvetica').fontSize(10).fillColor('#000');
      doc.text('Marks Scored:', x + 12, y + 36);
      doc.text(
        marks !== null ? `${marks} / 60` : 'N.A.',
        x + Math.min(110, width - 50),
        y + 36
      );

      // Percentage
      doc.text('Percentage:', x + 12, y + 56);
      const perc = marks !== null ? `${((marks / 60) * 100).toFixed(2)}%` : 'N.A.';
      doc.text(
        perc,
        x + Math.min(110, width - 50),
        y + 56
      );

      // Rank
      
    };

    const mathMarks = student.marks?.math ?? null;
    const scienceMarks = student.marks?.science ?? null;
    const englishMarks = student.marks?.english ?? null;
    const csMarks = student.marks?.cs ?? null;

    /* SUBJECT CHOICE RESOLUTION — individual subjects only (no 'both') */
    const activeSubjects = String(student.subjects || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(s => ['english', 'math', 'science', 'cs'].includes(s));

    // Fallback: if no subjects resolved, infer from marks
    if (activeSubjects.length === 0) {
      if (mathMarks !== null) activeSubjects.push('math');
      if (scienceMarks !== null) activeSubjects.push('science');
      if (englishMarks !== null) activeSubjects.push('english');
      if (csMarks !== null) activeSubjects.push('cs');
    }


    /* ----------------------------------------------------
     * DRAW BOXES BASED ON ACTIVE SUBJECTS
     * -------------------------------------------------- */
    const count = activeSubjects.length;
    if (count > 0) {
      const boxGap = 10;
      const boxWidth = Math.floor((availableWidth - (count - 1) * boxGap) / count);
      const subjectNames = {
        'english': 'English',
        'math': 'Mathematics',
        'science': 'Science',
        'cs': 'Computer Science'
      };

      activeSubjects.forEach((sub, index) => {
        const x = leftX + index * (boxWidth + boxGap);
        const marks = student.marks?.[sub] ?? null;
        drawScoreBox(x, boxWidth, subjectNames[sub] || sub, marks, null);
      });
    } else {
      doc.font('Helvetica').fontSize(10).fillColor('#333');
      doc.text('No subject performance available.', leftX, y + 40);
    }


    /* ----------------------------------------------------
     * FOOTER
     * -------------------------------------------------- */
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#555')
      .text("This score card is generated by Brain O Math Olympiad 2026.", 0, pageHeight - 55, {
        width: pageWidth,
        align: 'center'
      });

    doc.text('For any queries, contact: brainomathorg@gmail.com', 0, pageHeight - 45, {
      width: pageWidth,
      align: 'center'
    });
  }
}

module.exports = new ReportCardGenerator();
