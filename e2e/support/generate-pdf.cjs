const { chromium } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

function resolvePath(argValue, envValue, fallbackRelative) {
  if (argValue) return path.resolve(argValue);
  if (envValue) return path.resolve(envValue);
  return path.resolve(__dirname, fallbackRelative);
}

async function run() {
  const sourcePath = resolvePath(
    process.argv[2],
    process.env.PDF_SOURCE,
    "../../design-system/design-system-spec.html",
  );
  const outputPath = resolvePath(
    process.argv[3],
    process.env.PDF_OUTPUT,
    "../../design-system/design-system-spec.pdf",
  );

  if (!fs.existsSync(sourcePath)) {
    throw new Error(
      `Source HTML not found: ${sourcePath}\n` +
        "Pass a source file as the first argument or set PDF_SOURCE.",
    );
  }

  console.log("Starting PDF generation sequence...");
  console.log("Launching headless Chromium browser via Playwright...");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log(`Loading source document: file://${sourcePath}`);
  await page.goto(`file://${sourcePath}`);
  await page.waitForLoadState("networkidle");

  console.log(`Compiling and writing PDF output: ${outputPath}`);
  await page.pdf({
    path: outputPath,
    format: "A4",
    margin: {
      top: "0mm",
      bottom: "0mm",
      left: "0mm",
      right: "0mm",
    },
    printBackground: true,
  });

  await browser.close();
  console.log("PDF generated successfully!");
}

run().catch((err) => {
  console.error("PDF generation execution failed:", err);
  process.exit(1);
});
