import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const assets = join(process.cwd(), "src", "assets");
const files = [
  "testimonial-corporate-learning.webp",
  "testimonial-math-classroom.webp",
  "testimonial-physics-classroom.webp",
];

for (const file of files) {
  const input = join(assets, file);
  const metadata = await sharp(input).metadata();
  if (metadata.format === "webp" && (metadata.width ?? 0) <= 960) continue;
  const optimized = await sharp(input)
    .resize({ width: 960, withoutEnlargement: true })
    .webp({ quality: 80, effort: 5, smartSubsample: true })
    .toBuffer();
  await writeFile(input, optimized);
}

const northNodeInput = join(assets, "northnode.webp");
await sharp(northNodeInput)
  .resize({ width: 360, withoutEnlargement: true })
  .webp({ quality: 82, effort: 5, smartSubsample: true })
  .toFile(join(assets, "northnode-optimized.webp"));

const logoInput = join(assets, "gamibar logo.png");
await sharp(logoInput)
  .resize({ width: 128, withoutEnlargement: true })
  .webp({ quality: 88, effort: 5, alphaQuality: 90 })
  .toFile(join(assets, "gamibar-logo-ui.webp"));

for (const file of ["hero.webp", "herodark.webp"]) {
  await sharp(join(assets, file))
    .resize({ width: 480, withoutEnlargement: true })
    .webp({ quality: 78, effort: 5, smartSubsample: true })
    .toFile(join(assets, file.replace(".webp", "-mobile.webp")));
  await sharp(join(assets, file))
    .resize({ width: 960, withoutEnlargement: true })
    .webp({ quality: 80, effort: 5, smartSubsample: true })
    .toFile(join(assets, file.replace(".webp", "-tablet.webp")));
}

const previewFiles = [
  ["game-quiz-preview.webp", "game-quiz-preview-card.webp"],
  ["game-jigsaw-preview.webp", "game-jigsaw-preview-card.webp"],
  ["game-connect-dots-preview.png", "game-connect-dots-preview-card.webp"],
];

for (const [inputName, outputName] of previewFiles) {
  await sharp(join(assets, inputName))
    .resize({ width: 480, withoutEnlargement: true })
    .webp({ quality: 78, effort: 5, alphaQuality: 88, smartSubsample: true })
    .toFile(join(assets, outputName));
}

console.log("Optimized testimonial and brand image assets.");
