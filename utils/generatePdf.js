const fs = require('fs');

async function main() {
  const [kind, inputPath, outputPath] = process.argv.slice(2);
  if (!kind || !inputPath || !outputPath) {
    throw new Error('Usage: node utils/generatePdf.js <report-card|certificate> <input.json> <output.pdf>');
  }

  const student = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const generator = kind === 'certificate'
    ? require('./certificateGenerator')
    : require('./reportCardGenerator');

  const pdf = kind === 'certificate'
    ? await generator.generateCertificate(student)
    : await generator.generateReportCard(student);

  fs.writeFileSync(outputPath, pdf);
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
