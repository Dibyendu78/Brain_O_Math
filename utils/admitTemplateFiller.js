// generateFromTemplate.js
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

async function generateFromTemplate(student = {}, school = {}) {
  // Try to locate template
  const candidates = [
    path.resolve(process.cwd(), 'public/Admit.pdf'),
    path.resolve(__dirname, '../../public/Admit.pdf'),
    path.resolve(__dirname, '../public/Admit.pdf')
  ];

  let tplPath = null;
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) { tplPath = p; break; }
    } catch (e) {}
  }

  if (!tplPath) throw new Error('Template not found');

  const existingPdfBytes = fs.readFileSync(tplPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  // embed fonts
  const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pages = pdfDoc.getPages();
  const page = pages[0];
  const { width, height } = page.getSize();

  // helper to draw plain text value (no duplicate labels) with optional bold
  const drawValue = (text, x, y, opts = {}) => {
    const size = opts.size || 11;
    const font = opts.bold ? helvBold : helv;
    const color = opts.color || rgb(0, 0, 0);
    page.drawText(String(text ?? ''), { x, y, size, font, color });
  };

  // draw wrapped text left-to-right (returns bottom y after drawing)
  const drawWrappedValue = (text, x, y, maxWidth, opts = {}) => {
    const size = opts.size || 11;
    const font = opts.bold ? helvBold : helv;
    const color = opts.color || rgb(0, 0, 0);

    // split into words and assemble lines by measuring widths
    const words = String(text ?? '').split(/\s+/);
    let line = '';
    let cursorY = y;

    for (let i = 0; i < words.length; i++) {
      const testLine = line ? (line + ' ' + words[i]) : words[i];
      const w = font.widthOfTextAtSize(testLine, size);
      if (w > maxWidth && line) {
        page.drawText(line, { x, y: cursorY, size, font, color });
        line = words[i];
        cursorY -= (size + 4);
      } else {
        line = testLine;
      }
    }
    if (line) {
      page.drawText(line, { x, y: cursorY, size, font, color });
    }
    // return y below last drawn line (so next block can start lower)
    return cursorY - (size + 6);
  };

  // --- IMPORTANT: we DO NOT draw template labels here (the PDF already has them).
  // We only draw the variable values at coordinates chosen to align with the template.

  // Recommended coordinates (measured relative to uploaded PDF):
  // - All y coordinates are from bottom-left (pdf-lib coordinate system).
  // - These coordinates were tuned to match the uploaded "BRAIN O MATH ADMIT CARD" PDF.
  //
  // If a value is too long, wrapped functions will move downwards to avoid overlap.

  // Left column — place values only (labels already on template PDF)
  // Use clear spacing to avoid overlaps. Adjust these coordinates if template has different label positions.
  const leftX = 140;  // x for value text (right of where labels appear on template)
  let curY = height - 220;  // start below header area

  // Roll number (right side, upper area)
  const rollX = width - 180;
  drawValue(student.rollNumber || (student._id || 'N/A'), rollX, curY, { size: 13, bold: true, color: rgb(0, 0, 0) });

  // Name of Student (label above, value below on template)
  curY -= 40;
  curY = drawWrappedValue(student.name || 'N/A', leftX, curY, 330, { size: 11, bold: false });

  // Institution name (label above, value below)
  curY -= 20;
  curY = drawWrappedValue(school.schoolName || student.school?.schoolName || 'N/A', leftX, curY, 330, { size: 10, bold: false });

  // Class
  curY -= 24;
  drawValue(String(student.class || 'N/A'), leftX, curY, { size: 10, bold: false });

  // Category
  curY -= 16;
  drawValue(String(student.category || 'N/A'), leftX, curY, { size: 10, bold: false });

  // Registration Number
  curY -= 16;
  drawValue(String(student.registrationId || 'N/A'), leftX, curY, { size: 10, bold: false });

  // Enrolled Subjects (may wrap)
  curY -= 16;
  drawWrappedValue(String(Array.isArray(student.subjects) ? student.subjects.join(', ') : (student.subjects || 'N/A')), leftX, curY, 330, { size: 10 });

  // Venue block at a fixed lower position (non-overlapping)
  const venueX = leftX;
  const venueStartY = height - 530;  // well below other fields
  drawValue(student.venue || school.venue || 'Doon Heritage School, Siliguri', venueX, venueStartY, { size: 10, bold: false });
  drawValue('Kolabari Rd, Champasari, Siliguri,', venueX, venueStartY - 14, { size: 10, bold: false });
  drawValue('Darjeeling, West Bengal - 734003', venueX, venueStartY - 28, { size: 10, bold: false });

  // Footer generated on (bottom-left)
  drawValue('Generated on: ' + new Date().toLocaleDateString('en-IN'), 80, 60, { size: 8, color: rgb(0.4,0.4,0.4) });

  // Save and return buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = {
  generateFromTemplate
};
