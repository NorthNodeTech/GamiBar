import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import { JIGSAW_LIBRARY_SIZE, getLibrarySubjects } from "./jigsaw-library-data.mjs";
import { downloadPhoto, findRealisticPhoto } from "./jigsaw-photo-source.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUCKET = "jigsaw-library";
const QUALITY_STEPS = [78, 72, 65, 60];

function loadDotEnv() {
  for (const file of [".env.local", ".env"]) {
    const full = path.join(ROOT, file);
    if (!existsSync(full)) continue;
    for (const line of readFileSync(full, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const options = { limit: null, category: null, force: false };
  for (const arg of argv) {
    if (arg.startsWith("--limit=")) {
      options.limit = Number.parseInt(arg.slice(8), 10);
    } else if (arg.startsWith("--category=")) {
      options.category = arg.slice(11).trim().toLowerCase();
    } else if (arg === "--force") {
      options.force = true;
    }
  }
  return options;
}

function formatKb(bytes) {
  return `${Math.round(bytes / 1024)} KB`;
}

async function compressWebp(inputBuffer) {
  let size = JIGSAW_LIBRARY_SIZE;
  let last = null;
  for (const quality of QUALITY_STEPS) {
    const buffer = await sharp(inputBuffer)
      .rotate()
      .resize(size, size, { fit: "cover", position: "attention" })
      .webp({ quality, effort: 6 })
      .toBuffer();
    last = { buffer, quality, width: size, height: size, bytes: buffer.length };
    if (buffer.length <= 180 * 1024) return last;
    if (quality === 65 && buffer.length > 180 * 1024) {
      size = 640;
    }
  }
  return last;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  loadDotEnv();
  const options = parseArgs(process.argv.slice(2));
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env",
    );
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const subjects = getLibrarySubjects(options);
  const { data: existingRows, error: existingError } = await supabase
    .from("jigsaw_library_images")
    .select("id, slug, usage_count");
  if (existingError) throw new Error(existingError.message);

  const existingBySlug = new Map((existingRows ?? []).map((row) => [row.slug, row]));
  const { data: categories, error: categoryError } = await supabase
    .from("jigsaw_categories")
    .select("id, slug");
  if (categoryError) throw new Error(categoryError.message);
  const { data: subtopics, error: subtopicError } = await supabase
    .from("jigsaw_subtopics")
    .select("id, slug, category_id");
  if (subtopicError) throw new Error(subtopicError.message);

  const categoryBySlug = new Map((categories ?? []).map((row) => [row.slug, row]));
  const subtopicByKey = new Map(
    (subtopics ?? []).map((row) => [`${row.category_id}:${row.slug}`, row]),
  );

  const workDir = path.join(tmpdir(), `gamibar-jigsaw-${Date.now()}`);
  mkdirSync(workDir, { recursive: true });

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];
  const sizes = [];

  console.log(`Configured subjects: ${subjects.length}`);
  console.log("Source: real-world Wikimedia Commons photographs");
  const usedPhotoUrls = new Set();

  for (let index = 0; index < subjects.length; index += 1) {
    const subject = subjects[index];
    const label = `[${index + 1}/${subjects.length}] ${subject.category} → ${subject.subtopic} → ${subject.title}`;
    console.log(`\n${label}`);

    const existingRow = existingBySlug.get(subject.slug);
    if (existingRow && !options.force) {
      console.log("SKIP existing slug.");
      skipped += 1;
      continue;
    }
    if (existingRow && options.force) {
      console.log("FORCE regenerating existing slug.");
    }

    const category = categoryBySlug.get(subject.category);
    const subtopic = category ? subtopicByKey.get(`${category.id}:${subject.subtopic}`) : null;
    if (!category || !subtopic) {
      failed += 1;
      failures.push(`${subject.slug}: missing category/subtopic rows`);
      console.log("FAILED: category or subtopic not found in database.");
      continue;
    }

    try {
      console.log("Finding a real-world photograph...");
      const photo = await findRealisticPhoto(subject, usedPhotoUrls);
      usedPhotoUrls.add(photo.url);
      usedPhotoUrls.add(photo.sourceUrl);
      console.log(`Found: ${photo.title}`);

      const raw = await downloadPhoto(photo.url);
      console.log(`Rendering:\n${JIGSAW_LIBRARY_SIZE} × ${JIGSAW_LIBRARY_SIZE}`);
      const compressed = await compressWebp(raw);
      const tempPath = path.join(workDir, `${subject.slug}.webp`);
      writeFileSync(tempPath, compressed.buffer);
      console.log(`Compressing:\nWebP quality ${compressed.quality}`);
      console.log(`Final size:\n${formatKb(compressed.bytes)}`);

      console.log(`Uploading:\n${subject.storagePath}`);
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(subject.storagePath, compressed.buffer, {
          contentType: "image/webp",
          upsert: true,
        });
      if (uploadError) throw uploadError;

      console.log("Saving database record...");
      const record = {
        category_id: category.id,
        subtopic_id: subtopic.id,
        title: subject.title,
        slug: subject.slug,
        description: `${subject.description} Photo: ${photo.artist} (${photo.license}).`,
        storage_path: subject.storagePath,
        thumbnail_path: null,
        keywords: subject.keywords,
        illustration_type: subject.illustrationType,
        source: "wikimedia_commons_photo",
        status: "active",
        usage_count: existingRow?.usage_count ?? 0,
        width: compressed.width,
        height: compressed.height,
        format: "webp",
        file_size_bytes: compressed.bytes,
      };
      const { error: insertError } = existingRow
        ? await supabase.from("jigsaw_library_images").update(record).eq("id", existingRow.id)
        : await supabase.from("jigsaw_library_images").insert(record);
      if (insertError) throw insertError;

      existingBySlug.set(subject.slug, {
        id: existingRow?.id ?? subject.slug,
        slug: subject.slug,
        usage_count: record.usage_count,
      });
      generated += 1;
      sizes.push({ slug: subject.slug, bytes: compressed.bytes });
      console.log("Complete.");
      await sleep(250);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${subject.slug}: ${message}`);
      console.log(`FAILED: ${message}`);
    }
  }

  rmSync(workDir, { recursive: true, force: true });

  const { data: allRows } = await supabase.from("jigsaw_library_images").select("file_size_bytes");
  const allSizes = (allRows ?? [])
    .map((row) => row.file_size_bytes)
    .filter((value) => Number.isFinite(value));
  const totalBytes = allSizes.reduce((sum, value) => sum + value, 0);
  const average = allSizes.length ? totalBytes / allSizes.length : 0;
  const largest = allSizes.length ? Math.max(...allSizes) : 0;
  const smallest = allSizes.length ? Math.min(...allSizes) : 0;

  console.log(`
GamiBAR Jigsaw Library Generation Complete

Generated: ${generated}
Skipped: ${skipped}
Failed: ${failed}

Total images: ${allSizes.length}

Total Supabase storage: ${(totalBytes / (1024 * 1024)).toFixed(1)} MB
Average image size: ${formatKb(average)}
Largest image: ${formatKb(largest)}
Smallest image: ${formatKb(smallest)}
`);

  if (failures.length) {
    console.log("Failures:");
    for (const item of failures) console.log(`- ${item}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
