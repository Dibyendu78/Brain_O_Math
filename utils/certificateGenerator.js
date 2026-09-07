// certificateGenerator.js
// PDF Certificate Generator with Blackletter Font Support

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function toTitleCase(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

class CertificateGenerator {
  constructor() {
    this.centerLogo = path.resolve(__dirname, './logo.png');
    // Fonts directory
    this.fontsDir = path.resolve(__dirname, './fonts');
    this.blackletterFont = path.resolve(this.fontsDir, 'OldeEnglish.ttf');
    this.scriptFont = path.resolve(this.fontsDir, 'GreatVibes-Regular.ttf');

    // Signatures and seal
    this.sanjanaSignature = this.findSignature('head-removebg-preview.png');
    this.krishnenduSignature = this.findSignature('kp-removebg-preview.png');
    this.appriciationSeal = this.findSignature('seal.png');
  }

  findSignature(filename) {
    const candidatePaths = [
      path.resolve(this.fontsDir, filename),
      path.resolve(__dirname, filename),
      path.resolve(__dirname, '..', filename),
      path.resolve(process.cwd(), filename)
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        // Copy to fontsDir if not already present for persistence
        const target = path.resolve(this.fontsDir, filename);
        if (p !== target && !fs.existsSync(target)) {
          try {
            fs.copyFileSync(p, target);
          } catch {}
        }
        return p;
      }
    }
    return null;
  }

  findBlackletterFont() {
    const fontPaths = [
      path.resolve(this.fontsDir, 'OldeEnglish.ttf'),
      path.resolve(this.fontsDir, 'blackletter.otf'),
      path.resolve(this.fontsDir, 'blackletter.ttf'),
    ];
    
    for (let fontPath of fontPaths) {
      if (fs.existsSync(fontPath)) {
        return fontPath;
      }
    }
    return null;
  }

  async generateCertificate(student = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: 0
        });

        const bufs = [];
        doc.on('data', (d) => bufs.push(d));
        doc.on('end', () => resolve(Buffer.concat(bufs)));
        doc.on('error', (e) => reject(e));

        await this._drawCertificate(doc, student || {});
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  async _drawCertificate(doc, student) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Refresh signature paths if needed
    if (!this.sanjanaSignature) this.sanjanaSignature = this.findSignature('head-removebg-preview.png');
    if (!this.krishnenduSignature) this.krishnenduSignature = this.findSignature('kp-removebg-preview.png');
    if (!this.appriciationSeal) this.appriciationSeal = this.findSignature('seal.png');

    doc.rect(0, 0, pageWidth, pageHeight).fill('#f5f1e8');

    const outerPad = 28;
    const gold = '#b88634';
    const w = pageWidth - outerPad * 2;
    const h = pageHeight - outerPad * 2;

    doc.save()
      .lineWidth(3)
      .strokeColor(gold)
      .roundedRect(outerPad, outerPad, w, h, 8)
      .stroke()
      .restore();

    const inset = 12;
    doc.save()
      .lineWidth(2)
      .strokeColor(gold)
      .roundedRect(outerPad + inset, outerPad + inset, w - inset * 2, h - inset * 2, 6)
      .stroke()
      .restore();

    try {
      if (fs.existsSync(this.blackletterFont)) doc.registerFont('Blackletter', this.blackletterFont);
      if (fs.existsSync(this.scriptFont)) doc.registerFont('Script', this.scriptFont);
    } catch {}

    try {
      doc.save();
      doc.opacity(0.15);
      const logoSize = Math.min(pageHeight * 0.62, pageWidth * 0.48);
      const lx = (pageWidth - logoSize) / 2;
      const ly = (pageHeight - logoSize) / 2 - 8;
      doc.image(this.centerLogo, lx, ly, { width: logoSize });
      doc.restore();
    } catch {}

    const margin = 70;

    doc.font('Times-Bold')
       .fontSize(20)
       .fillColor('#000000')
       .text("BRAIN-O-MATH OLYMPIAD 2026", margin, outerPad + 30, {
         width: pageWidth - margin * 2,
         align: 'center'
       });

    const titleFont = fs.existsSync(this.blackletterFont) ? 'Blackletter' : 'Times-Bold';
    doc.font(titleFont)
       .fontSize(140)
       .fillColor('#000')
       .text('Certificate', margin, 92, {
         width: pageWidth - margin * 2,
         align: 'center'
       });

    doc.font('Times-Bold')
       .fontSize(30)
       .fillColor('#000')
       .text('OF APPRECIATION', margin, 200, {
         width: pageWidth - margin * 2,
         align: 'center',
         characterSpacing: 2
       });

    const decorY = 176;

    doc.font('Helvetica-Bold')
       .fontSize(17)
       .fillColor('#666')
       .text('This Certificate is proudly presented to', margin, decorY + 62, {
         width: pageWidth - margin * 2,
         align: 'center'
       });

    const studentName = toTitleCase(student.name || '');
    const nameFont = fs.existsSync(this.scriptFont) ? 'Script' : 'Helvetica-Bold';
    doc.font(nameFont)
       .fontSize(58)
       .fillColor('#000')
       .text(studentName, margin, decorY + 84, {
         width: pageWidth - margin * 2,
         align: 'center'
       });

    const body =
      "for participating in the Brain-O-Math Olympiad Examination 2026 and in appreciation of curiosity, a quest for knowledge, and a spirit of learning.";

    doc.font('Times-Roman')
       .fontSize(15)
       .fillColor('#333')
       .text(body, margin + 40, decorY + 160, {
         width: pageWidth - (margin + 40) * 2,
         align: 'center',
         lineGap: 4
       });

    // Date
    const certDate = student.certificateDate || student.publishDate || '10 September 2026';
    doc.font('Times-Bold')
       .fontSize(13.5)
       .fillColor('#333')
       .text(`Date: ${certDate}`, margin, decorY + 218, {
         width: pageWidth - margin * 2,
         align: 'center'
       });

    const bottomY = pageHeight - 116;
    const colWidth = 220;

    const sanjanaWidth = 195;
    const sanjanaY = bottomY - 88;

    const kpWidth = 118;
    const kpY = bottomY - 40;

    // Left Signature: Sanjana Ghosh (Founder & Director)
    const leftX = margin + 30;
    if (this.sanjanaSignature && fs.existsSync(this.sanjanaSignature)) {
      doc.image(this.sanjanaSignature, leftX + (colWidth - sanjanaWidth) / 2, sanjanaY, { width: sanjanaWidth });
    }

    doc.moveTo(leftX + 15, bottomY + 16)
       .lineTo(leftX + colWidth - 15, bottomY + 16)
       .strokeColor('#333')
       .lineWidth(0.9)
       .stroke();

    doc.font('Helvetica-Bold')
       .fontSize(14)
       .fillColor('#000')
       .text('Sanjana Ghosh', leftX, bottomY + 22, { width: colWidth, align: 'center' });

    doc.font('Helvetica')
       .fontSize(12)
       .fillColor('#333')
       .text('Founder & Director', leftX, bottomY + 38, { width: colWidth, align: 'center' });

    doc.font('Helvetica')
       .fontSize(11)
       .fillColor('#555')
       .text('Brain-O-Math Olympiad', leftX, bottomY + 53, { width: colWidth, align: 'center' });

    // Center Appreciation Seal
    if (this.appriciationSeal && fs.existsSync(this.appriciationSeal)) {
      const sealW = 110;
      doc.image(this.appriciationSeal, (pageWidth - sealW) / 2, bottomY - 48, { width: sealW });
    }

    // Right Signature: Krishnendu Patra (Exam Convener)
    const rightX = pageWidth - margin - 30 - colWidth;
    if (this.krishnenduSignature && fs.existsSync(this.krishnenduSignature)) {
      doc.image(this.krishnenduSignature, rightX + (colWidth - kpWidth) / 2, kpY, { width: kpWidth });
    }

    doc.moveTo(rightX + 15, bottomY + 16)
       .lineTo(rightX + colWidth - 15, bottomY + 16)
       .strokeColor('#333')
       .lineWidth(0.9)
       .stroke();

    doc.font('Helvetica-Bold')
       .fontSize(14)
       .fillColor('#000')
       .text('Krishnendu Patra', rightX, bottomY + 22, { width: colWidth, align: 'center' });

    doc.font('Helvetica')
       .fontSize(12)
       .fillColor('#333')
       .text('Exam Convener', rightX, bottomY + 38, { width: colWidth, align: 'center' });

    doc.font('Helvetica')
       .fontSize(11)
       .fillColor('#555')
       .text('Brain-O-Math Olympiad', rightX, bottomY + 53, { width: colWidth, align: 'center' });

    // Bottom tiny copyright / tag
    doc.font('Helvetica')
       .fontSize(9)
       .fillColor('#666')
       .text("BRAIN-O-MATH OLYMPIAD 2026", 0, pageHeight - 18, {
         width: pageWidth,
         align: 'center'
       });
  }
}

module.exports = new CertificateGenerator();
