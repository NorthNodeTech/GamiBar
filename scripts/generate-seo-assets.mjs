import sharp from "sharp";
import { join } from "node:path";

const root = process.cwd();
const logo = join(root, "src", "assets", "gamibar logo.png");
const hero = join(root, "src", "assets", "hero.webp");
const output = join(root, "public");

await Promise.all([
  sharp(logo)
    .resize(180, 180, { fit: "contain" })
    .png()
    .toFile(join(output, "apple-touch-icon.png")),
  sharp(logo).resize(192, 192, { fit: "contain" }).png().toFile(join(output, "icon-192.png")),
  sharp(logo).resize(512, 512, { fit: "contain" }).png().toFile(join(output, "icon-512.png")),
  sharp(hero)
    .resize(1200, 630, { fit: "cover", position: "centre" })
    .jpeg({ quality: 88, progressive: true })
    .toFile(join(output, "og-gamibar.jpg")),
]);

console.log("Generated GamiBar SEO and app icons in public/.");
