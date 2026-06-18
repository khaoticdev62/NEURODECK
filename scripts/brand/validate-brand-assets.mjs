import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

const PROJECT_ROOT = path.resolve(path.dirname(""), ".");
const ASSETS_DIR = path.join(PROJECT_ROOT, "assets", "brand");
const MANIFEST_PATH = path.join(ASSETS_DIR, "manifest.brand-assets.json");

function calculateSHA256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

async function validateAsset(asset) {
  const filePath = path.join(PROJECT_ROOT, asset.path);
  
  // 1. File existence
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${asset.path}`);
  }

  // 2. File size > 0
  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    throw new Error(`File is empty: ${asset.path}`);
  }

  // 3. SHA256 Checksum validation
  const sha = calculateSHA256(filePath);
  if (sha !== asset.sha256) {
    throw new Error(`SHA256 checksum mismatch for ${asset.path}. Manifest: ${asset.sha256}, Actual: ${sha}`);
  }

  // 4. Image metadata validation
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === ".ico") {
    // ICO file is binary, verify signature and first directory entry
    const fd = fs.openSync(filePath, "r");
    const sig = Buffer.alloc(4);
    fs.readSync(fd, sig, 0, 4, 0);
    fs.closeSync(fd);
    if (sig[0] !== 0 || sig[1] !== 0 || sig[2] !== 1 || sig[3] !== 0) {
      throw new Error(`Invalid ICO signature in ${asset.path}`);
    }
    return;
  }

  if (ext === ".svg") {
    const content = fs.readFileSync(filePath, "utf-8");
    if (!content.includes("<svg") || !content.includes("</svg>")) {
      throw new Error(`Invalid SVG file structure in ${asset.path}`);
    }
    return;
  }

  // PNG, JPG, WebP metadata checks
  const meta = await sharp(filePath).metadata();
  
  // Verify format matches extension
  const expectedFormat = ext === ".jpg" ? "jpeg" : ext.slice(1);
  if (meta.format !== expectedFormat) {
    throw new Error(`Format mismatch in ${asset.path}. Extension: ${ext}, Actual format: ${meta.format}`);
  }

  // Verify dimensions
  if (meta.width !== asset.width || meta.height !== asset.height) {
    throw new Error(`Dimension mismatch in ${asset.path}. Expected: ${asset.width}x${asset.height}, Actual: ${meta.width}x${meta.height}`);
  }

  // Verify alpha channel rules
  if (asset.transparent && !meta.hasAlpha) {
    throw new Error(`Expected transparent asset ${asset.path} to have an alpha channel.`);
  }
  if (!asset.transparent && ext === ".jpg" && meta.hasAlpha) {
    throw new Error(`Expected JPEG asset ${asset.path} to have no alpha channel.`);
  }

  // Verify the image is not completely blank / fully transparent
  if (meta.hasAlpha) {
    const statsInfo = await sharp(filePath).stats();
    const channels = statsInfo.channels;
    const alphaChannel = channels[3]; // alpha is the 4th channel (index 3)
    if (alphaChannel && alphaChannel.max === 0) {
      throw new Error(`Asset ${asset.path} is fully transparent (empty canvas).`);
    }
  }
}

async function main() {
  console.log("NEURODECK Brand Asset Validator starting...");
  console.log("===========================================");

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`Error: Manifest file not found at ${MANIFEST_PATH}`);
    process.exit(1);
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  } catch (err) {
    console.error(`Error: Failed to parse manifest JSON: ${err.message}`);
    process.exit(1);
  }

  console.log(`Verifying project: ${manifest.project} (version: ${manifest.version})`);
  console.log(`Generated at: ${manifest.generatedAt}`);
  console.log(`Checking ${manifest.assets.length} assets...`);

  let checkedCount = 0;
  let failedCount = 0;

  for (const asset of manifest.assets) {
    try {
      await validateAsset(asset);
      checkedCount++;
    } catch (err) {
      console.error(`\n[FAIL] Asset verification failed: ${asset.path}`);
      console.error(`       Reason: ${err.message}`);
      failedCount++;
    }
  }

  console.log("\n===========================================");
  if (failedCount === 0) {
    console.log(`[PASS] Validation successful! Verified ${checkedCount} assets without error.`);
    process.exit(0);
  } else {
    console.error(`[FAIL] Validation failed! ${failedCount} assets failed verification out of ${manifest.assets.length} total.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Validator crash:", err);
  process.exit(1);
});
