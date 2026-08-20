import sharp from "sharp";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../public");
const srcLogo = join(publicDir, "GamiBar_Logo_White.png");

async function generate() {
  console.log("Generating favicons and app icons from GamiBar_Logo_White.png...");

  // 32x32 favicon
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
    .webp({ quality: 95 })
    .toFile(join(publicDir, "favicon.webp"));

  // 180x180 apple touch icon
  await sharp(srcLogo)
    .resize(180, 180, { fit: "contain", background: { r: 7, g: 7, b: 7, alpha: 1 } })
    .png()
    .toFile(join(publicDir, "apple-touch-icon.png"));

  await sharp(srcLogo)
    .resize(180, 180, { fit: "contain", background: { r: 7, g: 7, b: 7, alpha: 1 } })
    .webp({ quality: 95 })
    .toFile(join(publicDir, "apple-touch-icon.webp"));

  // 192x192 pwa icon
  await sharp(srcLogo)
    .resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(publicDir, "icon-192.png"));

  await sharp(srcLogo)
    .resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 95 })
    .toFile(join(publicDir, "icon-192.webp"));

  // 512x512 pwa icon
  await sharp(srcLogo)
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(publicDir, "icon-512.png"));

  await sharp(srcLogo)
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 95 })
    .toFile(join(publicDir, "icon-512.webp"));

  // 1200x630 OG Banner
  const logoResized = await sharp(srcLogo)
    .resize(400, 400, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 10, g: 10, b: 10, alpha: 1 }
    }
  })
    .composite([{ input: logoResized, gravity: "center" }])
    .jpeg({ quality: 90 })
    .toFile(join(publicDir, "og-gamibar.jpg"));

  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 10, g: 10, b: 10, alpha: 1 }
    }
  })
    .composite([{ input: logoResized, gravity: "center" }])
    .webp({ quality: 90 })
    .toFile(join(publicDir, "og-gamibar.webp"));

  console.log("All favicons and icons successfully generated!");
}

generate().catch(console.error);
