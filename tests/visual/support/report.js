const fs = require("fs");
const path = require("path");

// Report-mode layers (census, fonts, contrast, landmarks) write JSON here; the HTML report goes to `html/`.
const REPORT_DIR = path.resolve(
  process.env.VISUAL_REPORT_DIR || path.join(__dirname, "..", ".report")
);

function writeReport(name, data) {
  const file = path.join(REPORT_DIR, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  return file;
}

module.exports = { REPORT_DIR, writeReport };
