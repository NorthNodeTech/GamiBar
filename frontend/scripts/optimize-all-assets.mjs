import sharp from "sharp";
import { readdir, unlink, stat, readFile } from "fs/promises";
import { join, extname, basename } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, "../src/assets");
const publicDir = join(__dirname, "../public");
const srcLogo = join(publicDir, "GamiBar_Logo_White.png");

async function optimizeAssets() {
  console.log("--- Starting Comprehensive Asset Optimization ---");

  // 1. Convert & optimize Logo to lossless WebP
  console.log("Optimizing GamiBar_Logo_White to gamibar-logo-white.webp...");
  await sharp(srcLogo)
    .webp({ lossless: true, effort: 6 })
    .toFile(join(assetsDir, "gamibar-logo-white.webp"));

  // 2. Generate all public favicons and icons from latest GamiBar_Logo_White.png
  console.log("Generating favicons and app icons...");
  await sharp(srcLogo)
    .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(publicDir, "favicon.png"));

  await sharp(srcLogo)
    .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFormat("png")
    .toFile(join(publicDir, "favicon.ico"));

  await sharp(srcLogo)
    .resize(48, 48, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 95, effort: 6 })
    .toFile(join(publicDir, "favicon.webp"));

  await sharp(srcLogo)
    .resize(180, 180, { fit: "contain", background: { r: 7, g: 7, b: 7, alpha: 1 } })
    .png()
    .toFile(join(publicDir, "apple-touch-icon.png"));

  await sharp(srcLogo)
    .resize(180, 180, { fit: "contain", background: { r: 7, g: 7, b: 7, alpha: 1 } })
    .webp({ quality: 95, effort: 6 })
    .toFile(join(publicDir, "apple-touch-icon.webp"));

  await sharp(srcLogo)
    .resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(publicDir, "icon-192.png"));

  await sharp(srcLogo)
    .resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 95, effort: 6 })
    .toFile(join(publicDir, "icon-192.webp"));

  await sharp(srcLogo)
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(publicDir, "icon-512.png"));

  await sharp(srcLogo)
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 95, effort: 6 })
    .toFile(join(publicDir, "icon-512.webp"));

  const logoResized = await sharp(srcLogo)
    .resize(400, 400, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 10, g: 10, b: 10, alpha: 1 },
    },
  })
    .composite([{ input: logoResized, gravity: "center" }])
    .jpeg({ quality: 90 })
    .toFile(join(publicDir, "og-gamibar.jpg"));

  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 10, g: 10, b: 10, alpha: 1 },
    },
  })
    .composite([{ input: logoResized, gravity: "center" }])
    .webp({ quality: 90, effort: 6 })
    .toFile(join(publicDir, "og-gamibar.webp"));

  // 3. Optimize all WebP files in src/assets
  const files = await readdir(assetsDir);
  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of files) {
    if (file === "gamibar-logo-white.webp") continue; // already lossless
    if (file.endsWith(".png")) {
      // remove old png if webp exists
      const fullPath = join(assetsDir, file);
      await unlink(fullPath);
      console.log(`Removed obsolete PNG: ${file}`);
      continue;
    }

    if (!file.endsWith(".webp")) continue;

    const fullPath = join(assetsDir, file);
    const beforeStat = await stat(fullPath);
    totalBefore += beforeStat.size;

    const inputBuffer = await readFile(fullPath);
    const metadata = await sharp(inputBuffer).metadata();

    // Determine max dimension (e.g. 1920 for full bg, 1440 for photos, 1024 for cards)
    let maxDim = 1600;
    if (file.includes("hero")) maxDim = 1920;
    if (file.includes("flow") || file.includes("tool")) maxDim = 1280;
    if (file.includes("northnode")) maxDim = 600;

    let pipeline = sharp(inputBuffer);
    if (metadata.width && metadata.width > maxDim) {
      pipeline = pipeline.resize(maxDim, null, { withoutEnlargement: true });
    }

    const compressed = await pipeline
      .webp({
        quality: 86,
        effort: 6,
        smartSubsample: true,
      })
      .toBuffer();

    // Only overwrite if it saved space or was rebuilt
    if (compressed.length < beforeStat.size || true) {
      await sharp(compressed).toFile(fullPath);
      const afterStat = await stat(fullPath);
      totalAfter += afterStat.size;
      const pct = (((beforeStat.size - afterStat.size) / beforeStat.size) * 100).toFixed(1);
      console.log(
        `Optimized ${file}: ${(beforeStat.size / 1024).toFixed(0)}KB -> ${(afterStat.size / 1024).toFixed(0)}KB (-${pct}%)`,
      );
    } else {
      totalAfter += beforeStat.size;
    }
  }

  console.log(
    `--- Total Assets Size: ${(totalBefore / 1024 / 1024).toFixed(2)}MB -> ${(totalAfter / 1024 / 1024).toFixed(2)}MB ---`,
  );
}

optimizeAssets().catch(console.error);
