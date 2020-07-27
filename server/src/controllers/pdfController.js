const fs = require("fs");
const path = require("path");
const util = require("util");
const PDFDocument = require("pdfkit");

module.exports.createReport = ({
  firstName, lastName, sex, age, medicalIssue, hadToWait, cost
}, drugs, medicalProcedures, outcome) => {
  const doc = new PDFDocument();

  const date = Date().toString();
  // Pipe its output somewhere, like to a file or HTTP response
  doc.pipe(fs.createWriteStream(path.join(__dirname, "..", "reports", `${date}.pdf`)));

  const header = util.format("%s%s%s%s%s%s%s",
    "First Name".padEnd(12),
    "Last Name".padEnd(12),
    "Sex".padEnd(6),
    "Age".padEnd(6),
    "Medical Issue".padEnd(28),
    "Awaited".padEnd(10),
    "Total Cost".padEnd(6));

  const entry = util.format("%s%s%s%s%s%s%s",
    String(firstName).padEnd(12),
    String(lastName).padEnd(12),
    String(sex).padEnd(6),
    String(age).padEnd(6),
    String(medicalIssue).padEnd(28),
    String(hadToWait).padEnd(10),
    String(cost).padEnd(6));

  doc.fill("maroon", "even-odd").font("Courier", 10);
  doc.text(header, 20, 100);
  doc.text(entry, 20, 120);

  doc.text("Utilized Procedures: ", 20, 160);
  doc.text(medicalProcedures.join(", "), 20, 180);

  doc.text("Provided Drugs: ", 20, 220);
  doc.text(drugs.join(", "), 20, 240);

  doc.text(`Date: ${date}`, 20, 280);
  doc.text(`Status: ${outcome}`, 20, 300);

  doc.end();
};
