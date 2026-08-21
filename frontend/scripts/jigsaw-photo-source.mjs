const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "GamiBAR-JigsawLibrary/1.0 (educational classroom app; https://gamibar.com)";

const REJECT_NAME =
  /cartoon|clipart|illustration|drawing|icon|svg|comic|vector|animation|logo|emblem|flag icon|pictogram|wikimedia-screenshot/i;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_LICENSE = /public domain|cc0|cc by|cc-by|creative commons/i;

function metaValue(info, key) {
  return info?.extmetadata?.[key]?.value?.replace(/<[^>]+>/g, "").trim() ?? "";
}

function isAllowedLicense(info) {
  const license = `${metaValue(info, "LicenseShortName")} ${metaValue(info, "UsageTerms")} ${metaValue(info, "License")}`;
  if (!license.trim()) return true;
  if (
    /fair use|all rights reserved|noncommercial|no derivatives|cc by-nc|cc-by-nc/i.test(license)
  ) {
    return false;
  }
  return ALLOWED_LICENSE.test(license);
}

async function commonsRequest(params) {
  const search = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    prop: "imageinfo",
    iiprop: "url|mime|size|extmetadata",
    iiurlwidth: "1280",
    ...params,
  });
  const response = await fetch(`${COMMONS_API}?${search}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Wikimedia request failed (${response.status})`);
  }
  const payload = await response.json();
  return Object.values(payload?.query?.pages ?? {});
}

async function commonsSearch(query) {
  return commonsRequest({
    generator: "search",
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: "6",
    gsrlimit: "16",
  });
}

async function commonsFiles(titles) {
  if (!titles.length) return [];
  return commonsRequest({ titles: titles.join("|") });
}

function scorePage(page, subject) {
  const title = (page.title ?? "").toLowerCase();
  const terms = [subject.title, ...(subject.keywords ?? [])]
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2 && !["and", "the", "for", "from"].includes(term));
  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) score += 3;
  }
  if (/photo|photograph|nasa|hubble|cassini|apollo|wildlife|stadium/.test(title)) score += 1;
  return score;
}

function toPhoto(page, info) {
  return {
    url: info.thumburl || info.url,
    sourceUrl: info.descriptionurl ?? info.url,
    artist: metaValue(info, "Artist") || "Wikimedia Commons",
    license: metaValue(info, "LicenseShortName") || "Wikimedia Commons",
    title: page.title ?? "",
  };
}

function isUsable(page, info, usedUrls) {
  const title = page.title ?? "";
  if (!info) return false;
  if (REJECT_NAME.test(title) || REJECT_NAME.test(info.url ?? "")) return false;
  if (!ALLOWED_MIME.has(info.mime)) return false;
  if ((info.width ?? 0) < 600 || (info.height ?? 0) < 600) return false;
  if (!isAllowedLicense(info)) return false;
  const url = info.thumburl || info.url;
  if (!url || usedUrls.has(url) || usedUrls.has(info.url)) return false;
  return true;
}

function matchesRequired(page, subject) {
  const required = subject.photoRequire ?? [];
  if (!required.length) return true;
  const title = (page.title ?? "").toLowerCase();
  return required.some((term) => title.includes(String(term).toLowerCase()));
}

export async function findRealisticPhoto(subject, usedUrls) {
  const exactFiles = subject.photoFiles ?? [];
  if (exactFiles.length) {
    const exactPages = await commonsFiles(exactFiles);
    const exactHit = exactPages.find((page) => isUsable(page, page.imageinfo?.[0], usedUrls));
    if (exactHit) return toPhoto(exactHit, exactHit.imageinfo[0]);
  }

  const queries = subject.photoQueries?.length
    ? subject.photoQueries
    : [`${subject.title} photograph`];
  const searched = [];
  for (const query of queries) {
    searched.push(...(await commonsSearch(query)));
  }

  const candidates = searched
    .map((page) => ({ page, info: page.imageinfo?.[0], score: scorePage(page, subject) }))
    .filter(({ page, info }) => isUsable(page, info, usedUrls) && matchesRequired(page, subject))
    .sort((a, b) => b.score - a.score);

  const preferred = candidates.find((item) => item.score >= 3) ?? candidates[0];
  if (!preferred) {
    throw new Error(`No realistic photo found for ${subject.title}`);
  }
  return toPhoto(preferred.page, preferred.info);
}

export async function downloadPhoto(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "image/*" },
  });
  if (!response.ok) {
    throw new Error(`Photo download failed (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}
