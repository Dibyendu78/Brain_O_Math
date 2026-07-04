// certificateGenerator.js
// PDF Certificate Generator with Blackletter Font Support

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class CertificateGenerator {
  constructor() {
    
    this.centerLogo = path.resolve(__dirname, './logo.png');
    // Fonts directory (two fonts added by user)
    this.fontsDir = path.resolve(__dirname, './fonts');
    this.blackletterFont = path.resolve(this.fontsDir, 'OldeEnglish.ttf');
    this.scriptFont = path.resolve(this.fontsDir, 'GreatVibes-Regular.ttf');

    //  ONLY ADDED: signature images
    this.principalSignature = path.resolve(this.fontsDir, 'sig1.png');
    this.coordinatorSignature = path.resolve(this.fontsDir, 'sig2.png');
    this.appriciationSeal = path.resolve(this.fontsDir, 'seal.png');
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
       .text("BRAIN O MATH OLYMPIAD", margin, outerPad +30, {
         width: pageWidth - margin*2 ,
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
       .fontSize(18)
       .fillColor('#666')
       .text('This certificate is proudly presented to', margin, decorY + 62, {
         width: pageWidth - margin * 2,
         align: 'center'
       });

    const nameFont = fs.existsSync(this.scriptFont) ? 'Script' : 'Helvetica-Bold';
    doc.font(nameFont)
       .fontSize(60)
       .fillColor('#000')
       .text(student.name || 'Name Surname', margin, decorY + 84, {
         width: pageWidth - margin * 2,
         align: 'center'
       });

    const body =
      "for participating in the Brain O Math Olympiad Examination, held on 22nd November, 2025, and displaying enthusiasm, effort, and a keen spirit of academic exploration in the fields of Mathematics and Science.";

    doc.font('Times-Roman')
       .fontSize(15)
       .fillColor('#444')
       .text(body, margin + 40, decorY + 170, {
         width: pageWidth - (margin + 40) * 2,
         align: 'center',
         lineGap: 3
       });

    const bottomY = pageHeight - 120;

    const issued = new Date('2025-12-16');

    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const issuedFormatted = `${issued.getDate()} ${months[issued.getMonth()]}, ${issued.getFullYear()}`;

    //  ONLY ADDED: Principal signature image
    const leftX = margin + 40;
    if (fs.existsSync(this.principalSignature)) {
      doc.image(this.principalSignature, leftX + 10, bottomY - 32, { width: 132 });
    }

    doc.font('Helvetica').fontSize(14).fillColor('#000').text('Dr. Mrinmoy Kanti Das ', leftX+2, bottomY + 30);
    doc.font('Helvetica').fontSize(14).fillColor('#000').text('Principal, Doon Heritage School ', leftX-20, bottomY + 45,{link: 'https://doonheritageschool.com/'});
    doc.moveTo(leftX, bottomY+24).lineTo(leftX + 140, bottomY+24).strokeColor('#000').lineWidth(0.8).stroke();
    doc.font('Helvetica').fontSize(12).fillColor('#000').text(`Date : ${issuedFormatted}`, leftX+228, bottomY + 58);
    //appreciation seal
    
    if (fs.existsSync(this.appriciationSeal)) {
      doc.image(this.appriciationSeal, (pageWidth/2)-73, bottomY - 68, { width: 120 });

    }



    //  ONLY ADDED: Host Coordinator signature image
    const rightX = pageWidth - margin - 240;
    if (fs.existsSync(this.coordinatorSignature)) {
      doc.image(this.coordinatorSignature, rightX + 25, bottomY - 40, { width: 135 });
    }

    doc.font('Helvetica').fontSize(14).fillColor('#000').text('Mr. Krishnendu Patra', rightX + 25, bottomY + 28);
    doc.font('Helvetica').fontSize(14).fillColor('#000').text('Exam Convener, Brain O Math Olympiad', rightX -25, bottomY + 43);
    //doc.font('Helvetica').fontSize(14).fillColor('#000').text('Brain O Math Olympiad', rightX + 20, bottomY + 58);
    doc.moveTo(rightX + 14, bottomY + 24).lineTo(rightX + 174, bottomY + 24).strokeColor('#000').lineWidth(0.8).stroke();

    doc.font('Helvetica')
       .fontSize(9)
       .fillColor('#666')
       .text("BRAIN O MATH OLYMPIAD 2025", -14, pageHeight - 13, {
         width: pageWidth,
         align: 'center'
       });
  }
}

module.exports = new CertificateGenerator();
