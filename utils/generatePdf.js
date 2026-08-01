const fs = require('fs');

async function main() {
  const [kind, inputPath, outputPath] = process.argv.slice(2);
  if (!kind || !inputPath || !outputPath) {
    throw new Error('Usage: node utils/generatePdf.js <report-card|certificate|admit-card> <input.json> <output.pdf>');
  }

  const student = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  let pdf;
  if (kind === 'certificate') {
    const generator = require('./certificateGenerator');
    pdf = await generator.generateCertificate(student);
  } else if (kind === 'admit-card') {
    const AdmitCardGenerator = require('./admitCardGenerator');
    const generator = new AdmitCardGenerator({ verifyBaseUrl: student.verifyBaseUrl });
    pdf = await generator.generateAdmitCard(student, student.coordinator || {});
  } else {
    const generator = require('./reportCardGenerator');
    pdf = await generator.generateReportCard(student);
  }

  fs.writeFileSync(outputPath, pdf);
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
