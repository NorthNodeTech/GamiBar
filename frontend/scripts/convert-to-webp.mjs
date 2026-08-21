import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const roots = ["src/assets", "public"];
const extensions = new Set([".png", ".jpg", ".jpeg"]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (extensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

for (const root of roots) {
  let files = [];
  try {
    files = await walk(root);
  } catch {
    continue;
  }

  for (const file of files) {
    const out = file.replace(/\.(png|jpe?g)$/i, ".webp");
    const input = sharp(file);
    const meta = await input.metadata();

    await input.webp({ quality: 88, effort: 4, alphaQuality: 90 }).toFile(out);

    const before = (await stat(file)).size;
    const after = (await stat(out)).size;
    console.log(
      `${file} -> ${out} (${meta.width}x${meta.height}, ${Math.round(before / 1024)}KB -> ${Math.round(after / 1024)}KB)`,
    );
  }
}
