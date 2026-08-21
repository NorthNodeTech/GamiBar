const SIZE = 768;

function esc(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function linear(id, x1, y1, x2, y2, stops) {
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops
    .map(([offset, color]) => `<stop offset="${offset}" stop-color="${color}"/>`)
    .join("")}</linearGradient>`;
}

function radial(id, cx, cy, r, stops) {
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops
    .map(([offset, color]) => `<stop offset="${offset}" stop-color="${color}"/>`)
    .join("")}</radialGradient>`;
}

function paint(fill, extra = "") {
  return /(?:^|\s)fill=/.test(extra) ? extra : `fill="${fill}" ${extra}`;
}

function rect(x, y, w, h, fill, extra = "") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${paint(fill, extra)}/>`;
}

function circle(cx, cy, r, fill, extra = "") {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" ${paint(fill, extra)}/>`;
}

function ellipse(cx, cy, rx, ry, fill, extra = "") {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${paint(fill, extra)}/>`;
}

function path(d, fill, extra = "") {
  return `<path d="${d}" ${paint(fill, extra)}/>`;
}

function poly(points, fill, extra = "") {
  return `<polygon points="${points}" ${paint(fill, extra)}/>`;
}

function hash(seed) {
  let h = 2166136261;
  const text = String(seed);
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let state = hash(seed) || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function stars(count, seed, color = "#fff6c8") {
  const rand = rng(seed);
  let out = "";
  for (let i = 0; i < count; i += 1) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const r = 0.6 + rand() * 1.8;
    out += circle(x, y, r, color, `opacity="${0.35 + rand() * 0.65}"`);
  }
  return out;
}

function clouds(seed, fill = "#ffffff", y0 = 90) {
  const rand = rng(`${seed}-clouds`);
  let out = "";
  for (let i = 0; i < 5; i += 1) {
    const x = 40 + rand() * 680;
    const y = y0 + rand() * 80;
    const s = 0.7 + rand() * 0.6;
    out += `<g opacity="${0.55 + rand() * 0.35}">
      ${ellipse(x, y, 58 * s, 24 * s, fill)}
      ${ellipse(x - 28 * s, y + 6 * s, 32 * s, 18 * s, fill)}
      ${ellipse(x + 30 * s, y + 4 * s, 36 * s, 20 * s, fill)}
    </g>`;
  }
  return out;
}

function mountains(pointsFill) {
  return pointsFill.map(([points, fill]) => poly(points, fill)).join("");
}

function tree(x, y, scale = 1, leaf = "#2f9e44", trunk = "#8b5a2b") {
  return `<g>
    ${rect(x - 6 * scale, y, 12 * scale, 46 * scale, trunk)}
    ${ellipse(x, y - 8 * scale, 28 * scale, 26 * scale, leaf)}
    ${ellipse(x - 18 * scale, y + 8 * scale, 20 * scale, 16 * scale, leaf)}
    ${ellipse(x + 18 * scale, y + 6 * scale, 18 * scale, 15 * scale, leaf)}
  </g>`;
}

function pine(x, y, scale = 1, leaf = "#1f7a3a", trunk = "#6b4423") {
  return `<g>
    ${rect(x - 5 * scale, y + 20 * scale, 10 * scale, 36 * scale, trunk)}
    ${poly(`${x},${y - 40 * scale} ${x - 28 * scale},${y + 8 * scale} ${x + 28 * scale},${y + 8 * scale}`, leaf)}
    ${poly(`${x},${y - 18 * scale} ${x - 34 * scale},${y + 28 * scale} ${x + 34 * scale},${y + 28 * scale}`, leaf)}
    ${poly(`${x},${y + 4 * scale} ${x - 38 * scale},${y + 48 * scale} ${x + 38 * scale},${y + 48 * scale}`, leaf)}
  </g>`;
}

function planet(cx, cy, r, fill, highlight = "#ffffff") {
  return `${circle(cx, cy, r, fill)}${ellipse(cx - r * 0.28, cy - r * 0.28, r * 0.28, r * 0.16, highlight, 'opacity="0.28"')}`;
}

function person(x, y, scale, skin, shirt, pants) {
  return `<g>
    ${circle(x, y - 52 * scale, 16 * scale, skin)}
    ${rect(x - 16 * scale, y - 36 * scale, 32 * scale, 34 * scale, shirt, 'rx="8"')}
    ${rect(x - 14 * scale, y - 4 * scale, 12 * scale, 28 * scale, pants)}
    ${rect(x + 2 * scale, y - 4 * scale, 12 * scale, 28 * scale, pants)}
    ${rect(x - 26 * scale, y - 32 * scale, 10 * scale, 24 * scale, shirt, 'rx="5"')}
    ${rect(x + 16 * scale, y - 32 * scale, 10 * scale, 24 * scale, shirt, 'rx="5"')}
  </g>`;
}

function textureDots(seed) {
  const rand = rng(`${seed}-texture`);
  let out = "";
  for (let i = 0; i < 220; i += 1) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const r = 0.7 + rand() * 3.2;
    out += circle(x, y, r, "#ffffff", `opacity="${0.07 + rand() * 0.16}"`);
  }
  return `<g pointer-events="none">${out}</g>`;
}

function categoryDressing(subject) {
  const rand = rng(`${subject.slug}-dress`);
  const extras = [];
  if (subject.category === "geography" || subject.category === "nature") {
    extras.push(clouds(`${subject.slug}-more`, "#ffffff", 60 + rand() * 40));
    extras.push(tree(70 + rand() * 40, 520, 0.7 + rand() * 0.3));
    extras.push(tree(680 + rand() * 20, 530, 0.6 + rand() * 0.3, "#1b4332"));
  }
  if (subject.category === "space") {
    extras.push(stars(40, `${subject.slug}-more`, "#fff6c8"));
    extras.push(
      circle(80 + rand() * 80, 90 + rand() * 60, 6 + rand() * 8, "#ffd166", 'opacity="0.7"'),
    );
  }
  if (subject.category === "science" || subject.category === "technology") {
    for (let i = 0; i < 8; i += 1) {
      extras.push(
        circle(
          40 + rand() * 680,
          40 + rand() * 160,
          4 + rand() * 8,
          ["#4cc9f0", "#c77dff", "#ffd166"][i % 3],
          'opacity="0.35"',
        ),
      );
    }
  }
  if (subject.category === "animals") {
    extras.push(ellipse(120 + rand() * 80, 620, 40, 12, "#2d6a4f", 'opacity="0.25"'));
    extras.push(ellipse(560 + rand() * 80, 640, 50, 14, "#1b4332", 'opacity="0.2"'));
  }
  if (subject.category === "sports") {
    extras.push(circle(80, 80, 18, "#f8f9fa", 'opacity="0.35"'));
    extras.push(circle(688, 90, 14, "#ffd166", 'opacity="0.4"'));
  }
  if (subject.category === "history" || subject.category === "art-culture") {
    extras.push(rect(0, 0, SIZE, 28, "#ffd166", 'opacity="0.18"'));
    extras.push(rect(0, 740, SIZE, 28, "#9b5de5", 'opacity="0.16"'));
  }
  if (subject.category === "human-body") {
    extras.push(circle(90, 90, 24, "#ff8fa3", 'opacity="0.25"'));
    extras.push(circle(680, 100, 18, "#c77dff", 'opacity="0.22"'));
  }
  return `<g pointer-events="none">${extras.join("")}</g>`;
}

function svgDoc(defs, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>${defs}</defs>
  ${body}
</svg>`;
}

function skyLandSea({ sky, land, extra = "", hills = "" }) {
  return `${rect(0, 0, SIZE, SIZE, sky)}${hills}${rect(0, 500, SIZE, 268, land)}${extra}`;
}

const RENDERERS = {
  "earth-globe": () =>
    svgDoc(
      linear("sky", "0", "0", "0", "1", [
        ["0%", "#7ec8ff"],
        ["100%", "#d8f0ff"],
      ]) +
        radial("globe", "50%", "46%", "50%", [
          ["0%", "#4ec3ff"],
          ["70%", "#1f7ad4"],
          ["100%", "#0b3d7a"],
        ]),
      `${rect(0, 0, SIZE, SIZE, "url(#sky)")}${clouds("globe", "#fff", 80)}
       ${circle(384, 390, 210, "url(#globe)")}
       ${path("M250 300 C310 250 360 270 390 320 C430 280 500 300 530 360 C490 400 430 390 400 430 C350 410 300 390 250 360 Z", "#3cb371", 'opacity="0.92"')}
       ${path("M300 470 C360 450 430 460 490 500 C430 530 360 540 300 510 Z", "#2f9e44")}
       ${ellipse(384, 390, 210, 70, "#ffffff", 'opacity="0.12"')}
       ${ellipse(384, 620, 180, 22, "#0b3d7a", 'opacity="0.18"')}`,
    ),

  "earth-from-space": () =>
    svgDoc(
      radial("space", "50%", "50%", "70%", [
        ["0%", "#16325c"],
        ["100%", "#050816"],
      ]) +
        radial("earth", "46%", "48%", "50%", [
          ["0%", "#5ad0ff"],
          ["55%", "#1f6fd1"],
          ["100%", "#0a2f6b"],
        ]),
      `${rect(0, 0, SIZE, SIZE, "url(#space)")}${stars(90, "earth-space")}
       ${circle(390, 400, 230, "url(#earth)")}
       ${path("M250 330 C320 280 400 300 430 360 C500 330 560 380 540 450 C470 470 400 440 350 470 C300 430 250 400 250 330 Z", "#37b36a")}
       ${ellipse(330, 320, 90, 28, "#ffffff", 'opacity="0.35"')}
       ${ellipse(470, 480, 70, 20, "#ffffff", 'opacity="0.25"')}
       ${circle(120, 150, 28, "#f4f1de")}${circle(640, 180, 10, "#ffd166")}`,
    ),

  "india-landscape": () =>
    svgDoc(
      linear("isky", "0", "0", "0", "1", [
        ["0%", "#ffb347"],
        ["45%", "#ffd6a5"],
        ["100%", "#89c2d9"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#isky)")}
       ${ellipse(600, 140, 46, 46, "#ff9f1c")}
       ${mountains([
         ["0,430 160,250 320,430", "#c97b4a"],
         ["220,430 400,210 580,430", "#e09f3e"],
         ["480,430 640,260 768,430", "#c97b4a"],
       ])}
       ${rect(0, 430, SIZE, 338, "#f4d35e")}
       ${path("M0 520 C180 500 300 560 480 530 C620 510 768 560 768 560 L768 768 L0 768 Z", "#2a9d8f")}
       ${rect(120, 360, 90, 90, "#e76f51")}
       ${path("M120 360 L165 300 L210 360 Z", "#9b2226")}
       ${rect(480, 390, 70, 60, "#bc6c25")}
       ${tree(300, 470, 1.1)}${tree(360, 490, 0.85, "#40916c")}`,
    ),

  "japan-landscape": () =>
    svgDoc(
      linear("jsky", "0", "0", "0", "1", [
        ["0%", "#89c2d9"],
        ["100%", "#f8edeb"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#jsky)")}
       ${poly("180,470 384,150 588,470", "#adb5bd")}
       ${poly("300,300 384,150 468,300", "#f8f9fa")}
       ${rect(0, 470, SIZE, 298, "#95d5b2")}
       ${path("M0 560 C200 540 400 600 768 550 L768 768 L0 768 Z", "#52b788")}
       ${ellipse(140, 500, 18, 10, "#ffafcc")}${ellipse(180, 510, 16, 9, "#ffc8dd")}
       ${ellipse(220, 498, 14, 8, "#ffafcc")}${tree(620, 500, 1, "#2d6a4f")}
       ${rect(80, 500, 18, 70, "#6b4423")}${ellipse(89, 490, 28, 16, "#ffb3c6")}`,
    ),

  "taj-mahal": () =>
    svgDoc(
      linear("tsky", "0", "0", "0", "1", [
        ["0%", "#90e0ef"],
        ["100%", "#caf0f8"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#tsky)")}${ellipse(620, 130, 40, 40, "#ffe66d")}
       ${rect(0, 520, SIZE, 248, "#74c69d")}
       ${rect(180, 560, 408, 70, "#48cae4", 'opacity="0.55"')}
       ${rect(250, 360, 268, 200, "#f8f9fa")}
       ${path("M250 360 C300 250 468 250 518 360 Z", "#f8f9fa")}
       ${circle(384, 250, 22, "#f8f9fa")}
       ${rect(160, 400, 70, 160, "#f1faee")}${rect(538, 400, 70, 160, "#f1faee")}
       ${path("M160 400 C180 340 210 340 230 400 Z", "#f1faee")}
       ${path("M538 400 C558 340 588 340 608 400 Z", "#f1faee")}
       ${rect(360, 470, 48, 90, "#22223b")}
       ${ellipse(384, 630, 90, 10, "#ffffff", 'opacity="0.35"')}`,
    ),

  "eiffel-tower": () =>
    svgDoc(
      linear("esky", "0", "0", "0", "1", [
        ["0%", "#48cae4"],
        ["100%", "#caf0f8"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#esky)")}${clouds("paris")}
       ${rect(0, 560, SIZE, 208, "#95d5b2")}
       ${path("M0 600 C200 580 400 640 768 590 L768 768 L0 768 Z", "#56cfe1")}
       ${poly("300,560 384,120 468,560", "#6c757d")}
       ${poly("330,400 384,180 438,400", "#adb5bd")}
       ${rect(300, 390, 168, 16, "#495057")}
       ${rect(320, 280, 128, 12, "#495057")}
       ${rect(360, 120, 48, 18, "#343a40")}
       ${tree(140, 530, 1.1)}${tree(620, 540, 0.95)}`,
    ),

  "world-map": () =>
    svgDoc(
      linear("ocean", "0", "0", "1", "1", [
        ["0%", "#023e8a"],
        ["100%", "#48cae4"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#ocean)")}
       ${path("M90 250 C160 180 230 210 250 280 C210 340 140 330 90 300 Z", "#52b788")}
       ${path("M280 220 C360 160 430 190 470 260 C430 330 340 340 280 290 Z", "#40916c")}
       ${path("M500 240 C580 190 650 230 670 300 C620 350 540 340 500 300 Z", "#2d6a4f")}
       ${path("M180 430 C260 400 330 430 340 500 C280 540 200 530 180 480 Z", "#74c69d")}
       ${path("M430 450 C520 420 600 460 610 530 C540 560 450 540 430 500 Z", "#52b788")}
       ${circle(140, 140, 8, "#caf0f8")}${circle(620, 160, 6, "#caf0f8")}`,
    ),

  "india-map": () =>
    svgDoc(
      linear("imap", "0", "0", "0", "1", [
        ["0%", "#48cae4"],
        ["100%", "#023e8a"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#imap)")}
       ${path("M300 120 L470 150 L500 260 L470 360 L430 500 L384 640 L330 520 L280 400 L250 280 Z", "#f4a261")}
       ${path("M300 180 L430 200 L450 280 L400 320 L310 260 Z", "#e76f51", 'opacity="0.45"')}
       ${ellipse(200, 420, 70, 28, "#90e0ef", 'opacity="0.5"')}
       ${circle(560, 200, 16, "#ffd166")}`,
    ),

  "coral-ocean": () =>
    svgDoc(
      linear("reef", "0", "0", "0", "1", [
        ["0%", "#90e0ef"],
        ["100%", "#0077b6"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#reef)")}
       ${ellipse(180, 620, 70, 90, "#e76f51")}${ellipse(260, 640, 50, 80, "#f4a261")}
       ${ellipse(360, 650, 80, 70, "#ff6b6b")}${ellipse(480, 630, 60, 90, "#f72585")}
       ${ellipse(580, 650, 70, 70, "#ff9f1c")}
       ${path("M200 430 C230 360 250 360 260 430", "none", 'stroke="#2d6a4f" stroke-width="8" fill="none"')}
       ${circle(220, 350, 16, "#80ed99")}${circle(250, 370, 12, "#57cc99")}
       ${ellipse(420, 300, 40, 18, "#ffd166")}${ellipse(520, 260, 36, 16, "#4cc9f0")}
       ${ellipse(300, 240, 28, 14, "#f72585")}${circle(140, 200, 10, "#caf0f8")}`,
    ),

  "deep-ocean": () =>
    svgDoc(
      linear("deep", "0", "0", "0", "1", [
        ["0%", "#023e8a"],
        ["100%", "#001219"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#deep)")}${stars(40, "deep", "#7bdff2")}
       ${ellipse(300, 360, 160, 50, "#4cc9f0")}
       ${ellipse(250, 350, 40, 24, "#48cae4")}${ellipse(430, 350, 70, 28, "#48cae4")}
       ${path("M430 350 Q520 300 600 360 Q520 380 430 360 Z", "#0077b6")}
       ${ellipse(500, 520, 90, 18, "#7209b7", 'opacity="0.7"')}
       ${circle(160, 560, 8, "#80ffdb")}${circle(200, 600, 5, "#80ffdb")}
       ${circle(620, 200, 6, "#c77dff")}`,
    ),

  "human-cell": () =>
    svgDoc(
      radial("cyto", "50%", "50%", "60%", [
        ["0%", "#ffe5ec"],
        ["70%", "#ffb3c6"],
        ["100%", "#ff8fa3"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "#ffccd5")}
       ${ellipse(384, 384, 300, 270, "url(#cyto)")}
       ${ellipse(384, 384, 300, 270, "none", 'stroke="#c9184a" stroke-width="18"')}
       ${circle(360, 360, 90, "#c77dff")}
       ${circle(360, 360, 36, "#7b2cbf")}
       ${ellipse(230, 300, 40, 18, "#e85d04")}
       ${ellipse(500, 280, 36, 16, "#e85d04")}
       ${ellipse(520, 470, 42, 18, "#dc2f02")}
       ${path("M200 420 C260 400 280 460 340 450 C300 500 220 480 200 420", "#80ed99")}
       ${path("M430 500 C500 480 540 540 600 520", "none", 'stroke="#40916c" stroke-width="8" fill="none"')}
       ${circle(250, 500, 10, "#48cae4")}${circle(480, 200, 12, "#48cae4")}
       ${circle(560, 360, 8, "#ffd166")}${circle(300, 220, 7, "#ffd166")}`,
    ),

  "dna-structure": () =>
    svgDoc(
      linear("dnaBg", "0", "0", "1", "1", [
        ["0%", "#240046"],
        ["100%", "#3c096c"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#dnaBg)")}
       ${[0, 1, 2, 3, 4, 5, 6, 7, 8]
         .map((i) => {
           const y = 80 + i * 70;
           const swing = Math.sin(i * 0.8) * 90;
           const x1 = 300 + swing;
           const x2 = 468 - swing;
           const colors = ["#ff6b6b", "#4cc9f0", "#80ed99", "#ffd166"];
           return `${circle(x1, y, 18, "#c77dff")}${circle(x2, y, 18, "#7b2cbf")}
           ${rect(Math.min(x1, x2), y - 6, Math.abs(x2 - x1), 12, colors[i % 4])}`;
         })
         .join("")}`,
    ),

  "lab-glassware": () =>
    svgDoc(
      linear("lab", "0", "0", "0", "1", [
        ["0%", "#edf2fb"],
        ["100%", "#abc4ff"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#lab)")}
       ${rect(0, 520, SIZE, 248, "#495057")}
       ${rect(80, 300, 70, 220, "#90e0ef", 'opacity="0.7"')}${rect(90, 250, 50, 50, "#caf0f8")}
       ${path("M220 250 L200 470 L320 470 L300 250 Z", "#80ed99", 'opacity="0.75"')}
       ${ellipse(390, 430, 50, 90, "#ffd166", 'opacity="0.8"')}${rect(370, 220, 40, 160, "#fff3b0")}
       ${path("M500 280 C480 360 480 470 560 470 C640 470 640 360 620 280 Z", "#ff8fa3", 'opacity="0.8"')}
       ${circle(180, 180, 16, "#c77dff")}${circle(560, 160, 12, "#4cc9f0")}`,
    ),

  "molecular-structure": () =>
    svgDoc(
      radial("mol", "50%", "50%", "70%", [
        ["0%", "#4361ee"],
        ["100%", "#1b1b3a"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#mol)")}
       ${rect(180, 250, 220, 14, "#90e0ef")}${rect(360, 250, 14, 180, "#90e0ef")}
       ${rect(360, 420, 160, 14, "#90e0ef")}${rect(250, 180, 14, 160, "#90e0ef")}
       ${circle(180, 257, 36, "#ff6b6b")}${circle(400, 257, 40, "#4cc9f0")}
       ${circle(367, 430, 34, "#80ed99")}${circle(530, 427, 30, "#ffd166")}
       ${circle(257, 180, 28, "#c77dff")}${circle(257, 340, 24, "#f72585")}`,
    ),

  "newtons-cradle": () =>
    svgDoc(
      linear("nbg", "0", "0", "0", "1", [
        ["0%", "#f8edeb"],
        ["100%", "#d8e2dc"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#nbg)")}
       ${rect(140, 160, 488, 28, "#3d405b")}
       ${rect(140, 160, 28, 360, "#3d405b")}${rect(600, 160, 28, 360, "#3d405b")}
       ${rect(120, 520, 528, 36, "#3d405b")}
       ${[0, 1, 2, 3, 4]
         .map((i) => {
           const x = 230 + i * 70;
           const lift = i === 0 ? -50 : 0;
           return `<line x1="${x}" y1="188" x2="${x + (i === 0 ? -40 : 0)}" y2="${380 + lift}" stroke="#222" stroke-width="3"/>
           ${circle(x + (i === 0 ? -40 : 0), 400 + lift, 26, "#adb5bd")}`;
         })
         .join("")}`,
    ),

  magnetism: () =>
    svgDoc(
      linear("mbg", "0", "0", "0", "1", [
        ["0%", "#edf2fb"],
        ["100%", "#caf0f8"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#mbg)")}
       ${path("M250 250 L250 480 C250 560 518 560 518 480 L518 250 L450 250 L450 470 C450 500 318 500 318 470 L318 250 Z", "#e63946")}
       ${rect(250, 230, 68, 40, "#1d3557")}${rect(450, 230, 68, 40, "#e63946")}
       ${[0, 1, 2, 3, 4].map((i) => ellipse(384, 300 + i * 40, 160 - i * 8, 18, "none", 'stroke="#457b9d" stroke-width="3" fill="none" opacity="0.7"')).join("")}
       ${circle(200, 560, 6, "#6c757d")}${circle(240, 580, 5, "#6c757d")}${circle(520, 570, 6, "#6c757d")}`,
    ),

  "volcano-experiment": () =>
    svgDoc(
      linear("vbg", "0", "0", "0", "1", [
        ["0%", "#fff3b0"],
        ["100%", "#f4a261"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#vbg)")}
       ${rect(0, 560, SIZE, 208, "#6c584c")}
       ${poly("180,560 384,250 588,560", "#8d6b4a")}
       ${poly("300,360 384,250 468,360", "#6b4226")}
       ${path("M360 250 C340 180 300 140 384 90 C468 140 428 180 408 250 Z", "#e76f51")}
       ${path("M350 140 C330 80 384 40 430 90", "#ffb703")}
       ${rect(80, 500, 90, 60, "#90e0ef")}${rect(600, 500, 70, 60, "#80ed99")}`,
    ),

  "light-prism": () =>
    svgDoc(
      linear("pbg", "0", "0", "0", "1", [
        ["0%", "#22223b"],
        ["100%", "#4a4e69"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#pbg)")}
       ${rect(40, 360, 220, 16, "#f8f9fa")}
       ${poly("300,250 500,384 300,520", "#caf0f8", 'opacity="0.85"')}
       ${["#e63946", "#f4a261", "#ffd166", "#80ed99", "#4cc9f0", "#7b2cbf"]
         .map((color, i) =>
           path(
             `M500 360 L720 ${250 + i * 28} L720 ${268 + i * 28} L500 390 Z`,
             color,
             'opacity="0.9"',
           ),
         )
         .join("")}`,
    ),

  "scientist-lab": () =>
    svgDoc(
      linear("sbg", "0", "0", "0", "1", [
        ["0%", "#edf2fb"],
        ["100%", "#bde0fe"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#sbg)")}
       ${rect(0, 500, SIZE, 268, "#8d99ae")}
       ${rect(80, 220, 180, 160, "#90e0ef", 'opacity="0.5"')}
       ${path("M500 280 L480 470 L600 470 L580 280 Z", "#80ed99", 'opacity="0.7"')}
       ${person(360, 500, 1.15, "#f4a261", "#48cae4", "#1d3557")}
       ${rect(330, 430, 26, 36, "#caf0f8")}${circle(430, 200, 18, "#c77dff")}`,
    ),

  astronomer: () =>
    svgDoc(
      linear("night", "0", "0", "0", "1", [
        ["0%", "#10002b"],
        ["100%", "#240046"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#night)")}${stars(80, "astro")}
       ${rect(0, 560, SIZE, 208, "#1b4332")}
       ${ellipse(600, 160, 36, 36, "#f8f9fa")}
       ${rect(300, 420, 28, 140, "#6c757d")}
       ${ellipse(420, 360, 90, 28, "#adb5bd")}
       ${circle(500, 360, 34, "#212529")}
       ${person(250, 560, 1, "#f4a261", "#4361ee", "#212529")}`,
    ),

  "african-lion": () =>
    svgDoc(
      linear("sav", "0", "0", "0", "1", [
        ["0%", "#ffd166"],
        ["100%", "#f4a261"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#sav)")}
       ${ellipse(600, 130, 44, 44, "#ee9b00")}
       ${rect(0, 480, SIZE, 288, "#e9c46a")}
       ${rect(120, 360, 18, 140, "#6b4423")}${ellipse(129, 340, 40, 18, "#2d6a4f")}
       ${ellipse(430, 500, 120, 50, "#d4a373")}
       ${circle(500, 390, 58, "#bc6c25")}
       ${circle(500, 400, 38, "#e9c46a")}
       ${ellipse(470, 400, 6, 8, "#3d405b")}${ellipse(530, 400, 6, 8, "#3d405b")}
       ${ellipse(500, 430, 16, 8, "#6b4226")}
       ${rect(400, 500, 18, 70, "#bc6c25")}${rect(470, 500, 18, 70, "#bc6c25")}`,
    ),

  "african-elephant": () =>
    svgDoc(
      linear("el", "0", "0", "0", "1", [
        ["0%", "#90e0ef"],
        ["100%", "#e9c46a"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#el)")}
       ${rect(0, 500, SIZE, 268, "#e9c46a")}
       ${ellipse(380, 430, 150, 90, "#adb5bd")}
       ${circle(520, 360, 70, "#adb5bd")}
       ${path("M540 400 C560 500 520 560 500 600", "#8d99ae")}
       ${ellipse(500, 350, 16, 20, "#3d405b")}${circle(560, 340, 8, "#3d405b")}
       ${rect(300, 500, 22, 80, "#8d99ae")}${rect(420, 500, 22, 80, "#8d99ae")}
       ${rect(140, 360, 16, 150, "#6b4423")}${ellipse(148, 340, 46, 16, "#2d6a4f")}`,
    ),

  peacock: () =>
    svgDoc(
      linear("pg", "0", "0", "0", "1", [
        ["0%", "#bde0fe"],
        ["100%", "#80ed99"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#pg)")}
       ${[0, 1, 2, 3, 4, 5, 6, 7, 8]
         .map((i) => {
           const a = -70 + i * 17;
           const rad = (a * Math.PI) / 180;
           const x = 384 + Math.sin(rad) * 230;
           const y = 430 - Math.cos(rad) * 230;
           return `${path(`M384 460 Q${x} ${y + 40} ${x} ${y}`, "none", 'stroke="#2d6a4f" stroke-width="8" fill="none"')}
           ${ellipse(x, y, 22, 30, "#4cc9f0")}${circle(x, y, 8, "#ffd166")}`;
         })
         .join("")}
       ${ellipse(384, 500, 40, 70, "#1b4332")}
       ${circle(384, 430, 28, "#1b4332")}${rect(370, 560, 10, 50, "#3d405b")}${rect(390, 560, 10, 50, "#3d405b")}`,
    ),

  eagle: () =>
    svgDoc(
      linear("eg", "0", "0", "0", "1", [
        ["0%", "#90e0ef"],
        ["100%", "#caf0f8"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#eg)")}
       ${mountains([
         ["0,520 200,280 400,520", "#8d99ae"],
         ["300,520 520,240 768,520", "#6c757d"],
       ])}
       ${rect(0, 520, SIZE, 248, "#95d5b2")}
       ${path("M180 360 Q384 220 600 340 Q384 300 180 360 Z", "#3d405b")}
       ${circle(400, 300, 28, "#3d405b")}${path("M420 300 L460 290 L430 320 Z", "#f4a261")}`,
    ),

  dolphin: () =>
    svgDoc(
      linear("sea", "0", "0", "0", "1", [
        ["0%", "#48cae4"],
        ["70%", "#0077b6"],
        ["100%", "#023e8a"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#sea)")}
       ${path("M0 300 C160 260 300 320 768 280 L768 0 L0 0 Z", "#90e0ef")}
       ${path("M180 360 C280 280 460 280 560 360 C480 400 360 430 260 400 C200 460 160 420 180 360 Z", "#4cc9f0")}
       ${path("M500 330 L580 260 L540 350 Z", "#0077b6")}
       ${circle(500, 340, 6, "#023047")}
       ${ellipse(220, 240, 40, 12, "#caf0f8")}${ellipse(300, 220, 50, 12, "#caf0f8")}`,
    ),

  "coral-reef-life": () =>
    svgDoc(
      linear("cr", "0", "0", "0", "1", [
        ["0%", "#48cae4"],
        ["100%", "#0077b6"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#cr)")}
       ${ellipse(160, 640, 80, 100, "#e76f51")}${ellipse(280, 650, 60, 90, "#f72585")}
       ${ellipse(420, 640, 90, 80, "#ff9f1c")}${ellipse(580, 650, 70, 95, "#80ed99")}
       ${ellipse(300, 280, 36, 16, "#ffd166")}${ellipse(470, 240, 40, 18, "#c77dff")}
       ${ellipse(520, 360, 30, 14, "#4cc9f0")}${circle(200, 300, 14, "#f8f9fa")}`,
    ),

  butterfly: () =>
    svgDoc(
      linear("gd", "0", "0", "0", "1", [
        ["0%", "#bde0fe"],
        ["100%", "#95d5b2"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#gd)")}
       ${ellipse(220, 560, 40, 16, "#e76f51")}${ellipse(300, 580, 36, 14, "#ffd166")}
       ${ellipse(400, 570, 38, 15, "#f72585")}${ellipse(500, 560, 34, 13, "#c77dff")}
       ${ellipse(280, 320, 90, 120, "#4cc9f0")}${ellipse(488, 320, 90, 120, "#4361ee")}
       ${ellipse(300, 420, 70, 80, "#80ed99")}${ellipse(468, 420, 70, 80, "#2d6a4f")}
       ${rect(376, 280, 16, 200, "#3d405b")}${circle(384, 260, 10, "#3d405b")}`,
    ),

  "honey-bee": () =>
    svgDoc(
      linear("bee", "0", "0", "0", "1", [
        ["0%", "#fff3b0"],
        ["100%", "#95d5b2"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#bee)")}
       ${ellipse(200, 560, 50, 20, "#e76f51")}${ellipse(280, 580, 40, 16, "#ffd166")}
       ${ellipse(500, 300, 80, 50, "#ffd166")}
       ${rect(450, 280, 100, 16, "#3d405b")}${rect(450, 310, 100, 16, "#3d405b")}
       ${ellipse(430, 270, 40, 28, "#caf0f8", 'opacity="0.8"')}${ellipse(560, 270, 40, 28, "#caf0f8", 'opacity="0.8"')}
       ${circle(590, 300, 16, "#3d405b")}
       ${rect(560, 430, 70, 80, "#ffd166")}${rect(560, 450, 70, 12, "#3d405b")}${rect(560, 474, 70, 12, "#3d405b")}`,
    ),

  cow: () =>
    svgDoc(
      linear("farm", "0", "0", "0", "1", [
        ["0%", "#90e0ef"],
        ["100%", "#80ed99"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#farm)")}
       ${rect(0, 500, SIZE, 268, "#52b788")}
       ${rect(80, 360, 140, 140, "#e63946")}${path("M80 360 L150 300 L220 360 Z", "#9b2226")}
       ${ellipse(430, 470, 130, 70, "#f8f9fa")}
       ${circle(540, 410, 46, "#f8f9fa")}${circle(500, 450, 22, "#3d405b")}${circle(400, 450, 20, "#3d405b")}
       ${rect(370, 520, 16, 50, "#3d405b")}${rect(470, 520, 16, 50, "#3d405b")}`,
    ),

  horse: () =>
    svgDoc(
      linear("field", "0", "0", "0", "1", [
        ["0%", "#90e0ef"],
        ["100%", "#95d5b2"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#field)")}
       ${rect(0, 500, SIZE, 268, "#52b788")}
       ${ellipse(360, 450, 140, 60, "#9c6644")}
       ${path("M470 420 C540 360 560 340 580 380 C560 430 500 450 470 440 Z", "#9c6644")}
       ${path("M200 430 C240 360 280 400 260 450", "#6b4226")}
       ${rect(300, 500, 16, 60, "#6b4226")}${rect(400, 500, 16, 60, "#6b4226")}`,
    ),

  "tropical-rainforest": () =>
    svgDoc(
      linear("tr", "0", "0", "0", "1", [
        ["0%", "#74c69d"],
        ["100%", "#1b4332"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#tr)")}
       ${path("M0 500 C180 460 300 540 480 500 C620 470 768 530 768 530 L768 768 L0 768 Z", "#2d6a4f")}
       ${tree(120, 430, 1.4, "#40916c")}${tree(260, 400, 1.6, "#1b4332")}${tree(420, 420, 1.3, "#2d6a4f")}
       ${tree(580, 390, 1.7, "#40916c")}${tree(700, 430, 1.2, "#1b4332")}
       ${ellipse(200, 200, 80, 30, "#95d5b2")}${ellipse(500, 160, 100, 36, "#52b788")}`,
    ),

  "pine-forest": () =>
    svgDoc(
      linear("pf", "0", "0", "0", "1", [
        ["0%", "#ade8f4"],
        ["100%", "#95d5b2"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#pf)")}
       ${rect(0, 560, SIZE, 208, "#d8e2dc")}
       ${pine(140, 430, 1.2)}${pine(260, 400, 1.5)}${pine(400, 420, 1.3)}
       ${pine(530, 390, 1.6)}${pine(660, 430, 1.1)}
       ${ellipse(600, 140, 36, 36, "#ffe66d")}`,
    ),

  "himalayan-mountains": () =>
    svgDoc(
      linear("hm", "0", "0", "0", "1", [
        ["0%", "#48cae4"],
        ["100%", "#caf0f8"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#hm)")}
       ${poly("0,560 220,220 420,560", "#8d99ae")}
       ${poly("200,560 420,140 650,560", "#6c757d")}
       ${poly("480,560 680,240 768,560", "#adb5bd")}
       ${poly("360,260 420,140 480,260", "#f8f9fa")}
       ${poly("180,300 220,220 270,300", "#f8f9fa")}
       ${rect(0, 560, SIZE, 208, "#74c69d")}`,
    ),

  "snow-mountain": () =>
    svgDoc(
      linear("sm", "0", "0", "0", "1", [
        ["0%", "#89c2d9"],
        ["100%", "#caf0f8"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#sm)")}
       ${poly("80,500 384,120 688,500", "#8d99ae")}
       ${poly("300,260 384,120 468,260", "#f8f9fa")}
       ${rect(0, 500, SIZE, 268, "#468faf")}
       ${ellipse(384, 560, 220, 40, "#90e0ef", 'opacity="0.45"')}`,
    ),

  sunflowers: () =>
    svgDoc(
      linear("sf", "0", "0", "0", "1", [
        ["0%", "#90e0ef"],
        ["100%", "#80ed99"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#sf)")}
       ${ellipse(600, 120, 46, 46, "#ffd166")}
       ${rect(0, 500, SIZE, 268, "#40916c")}
       ${[160, 280, 400, 520, 640]
         .map((x, i) => {
           const y = 430 - (i % 2) * 30;
           return `${rect(x - 6, y, 12, 120, "#2d6a4f")}
           ${circle(x, y, 40, "#ffd166")}${circle(x, y, 16, "#6b4226")}`;
         })
         .join("")}`,
    ),

  "lotus-flowers": () =>
    svgDoc(
      linear("lt", "0", "0", "0", "1", [
        ["0%", "#90e0ef"],
        ["100%", "#0077b6"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#lt)")}
       ${ellipse(220, 520, 90, 20, "#2d6a4f")}${ellipse(500, 560, 110, 22, "#1b4332")}
       ${ellipse(360, 430, 50, 90, "#ffb3c6")}${ellipse(300, 450, 40, 80, "#ff8fa3")}
       ${ellipse(420, 450, 40, 80, "#ff8fa3")}${circle(360, 470, 24, "#ffd166")}
       ${ellipse(540, 480, 40, 70, "#c77dff")}${circle(540, 510, 18, "#ffd166")}`,
    ),

  thunderstorm: () =>
    svgDoc(
      linear("st", "0", "0", "0", "1", [
        ["0%", "#212529"],
        ["100%", "#495057"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#st)")}
       ${ellipse(200, 160, 120, 40, "#6c757d")}${ellipse(360, 130, 160, 50, "#adb5bd")}
       ${ellipse(560, 170, 130, 40, "#6c757d")}
       ${path("M360 200 L300 360 L360 360 L320 520 L460 300 L380 300 L430 200 Z", "#ffd166")}
       ${rect(0, 560, SIZE, 208, "#1b4332")}`,
    ),

  "rainbow-after-rain": () =>
    svgDoc(
      linear("rb", "0", "0", "0", "1", [
        ["0%", "#90e0ef"],
        ["100%", "#bde0fe"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#rb)")}
       ${["#e63946", "#f4a261", "#ffd166", "#80ed99", "#4cc9f0", "#7b2cbf"]
         .map((color, i) =>
           path(
             "M40 520 A360 360 0 0 1 728 520",
             "none",
             `stroke="${color}" stroke-width="16" fill="none" transform="translate(0 ${i * 16})"`,
           ),
         )
         .join("")}
       ${rect(0, 540, SIZE, 228, "#52b788")}${tree(140, 500, 1)}${tree(620, 510, 0.9)}
       ${ellipse(600, 140, 36, 36, "#ffe66d")}`,
    ),

  "pond-ecosystem": () =>
    svgDoc(
      linear("pd", "0", "0", "0", "1", [
        ["0%", "#90e0ef"],
        ["100%", "#52b788"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#pd)")}
       ${ellipse(384, 460, 260, 120, "#0077b6")}
       ${ellipse(300, 430, 40, 16, "#80ed99")}${ellipse(460, 480, 50, 18, "#2d6a4f")}
       ${ellipse(420, 400, 22, 12, "#80ed99")}${circle(340, 500, 10, "#f4a261")}
       ${ellipse(240, 470, 20, 10, "#e76f51")}${tree(120, 360, 1.1)}${tree(640, 370, 1)}`,
    ),

  "forest-ecosystem": () =>
    svgDoc(
      linear("fe", "0", "0", "0", "1", [
        ["0%", "#95d5b2"],
        ["100%", "#1b4332"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#fe)")}
       ${tree(140, 360, 1.5)}${tree(300, 340, 1.7, "#1b4332")}${tree(500, 350, 1.4)}${tree(660, 370, 1.3)}
       ${path("M0 560 C200 540 400 600 768 550 L768 768 L0 768 Z", "#40916c")}
       ${ellipse(260, 600, 30, 16, "#d4a373")}${circle(500, 580, 12, "#3d405b")}`,
    ),

  "planet-earth": () =>
    svgDoc(
      radial("sp", "50%", "50%", "70%", [
        ["0%", "#1d3557"],
        ["100%", "#0b132b"],
      ]) +
        radial("e2", "48%", "48%", "50%", [
          ["0%", "#4cc9f0"],
          ["100%", "#023e8a"],
        ]),
      `${rect(0, 0, SIZE, SIZE, "url(#sp)")}${stars(70, "earth2")}
       ${circle(384, 400, 220, "url(#e2)")}
       ${path("M260 340 C330 300 400 330 420 390 C370 420 300 400 260 360 Z", "#2d6a4f")}
       ${path("M430 450 C500 430 560 470 540 530 C470 540 430 500 430 450 Z", "#40916c")}`,
    ),

  saturn: () =>
    svgDoc(
      radial("ss", "50%", "50%", "70%", [
        ["0%", "#240046"],
        ["100%", "#10002b"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#ss)")}${stars(100, "saturn")}
       ${ellipse(384, 400, 300, 70, "none", 'stroke="#e9c46a" stroke-width="22" fill="none"')}
       ${ellipse(384, 400, 250, 54, "none", 'stroke="#f4a261" stroke-width="10" fill="none"')}
       ${circle(384, 390, 130, "#e9c46a")}
       ${ellipse(384, 360, 110, 20, "#f4a261", 'opacity="0.45"')}
       ${circle(140, 180, 16, "#caf0f8")}${circle(620, 220, 10, "#ffd166")}`,
    ),

  "solar-system": () =>
    svgDoc(
      radial("sol", "20%", "50%", "80%", [
        ["0%", "#1b1b3a"],
        ["100%", "#0b132b"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#sol)")}${stars(60, "solar")}
       ${circle(130, 384, 70, "#ffd166")}
       ${circle(250, 384, 14, "#e76f51")}${circle(310, 384, 18, "#f4a261")}
       ${circle(390, 384, 20, "#4cc9f0")}${circle(470, 384, 16, "#e63946")}
       ${circle(550, 384, 34, "#d4a373")}${circle(640, 384, 28, "#e9c46a")}
       ${ellipse(640, 384, 40, 10, "none", 'stroke="#f4a261" stroke-width="3" fill="none"')}`,
    ),

  "planet-orbits": () =>
    svgDoc(
      "",
      `${rect(0, 0, SIZE, SIZE, "#0b132b")}${stars(50, "orbits")}
       ${circle(384, 384, 36, "#ffd166")}
       ${[70, 110, 150, 200, 250]
         .map(
           (r, i) =>
             `${ellipse(384, 384, r, r * 0.62, "none", 'stroke="#90e0ef" stroke-width="2" fill="none" opacity="0.45"')}
          ${circle(384 + r, 384, 8 + i, ["#e76f51", "#f4a261", "#4cc9f0", "#e63946", "#d4a373"][i])}`,
         )
         .join("")}`,
    ),

  "spiral-galaxy": () =>
    svgDoc(
      radial("gal", "50%", "50%", "60%", [
        ["0%", "#ffd166"],
        ["30%", "#c77dff"],
        ["100%", "#10002b"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "#050816")}${stars(80, "galaxy")}
       ${ellipse(384, 384, 260, 90, "url(#gal)", 'opacity="0.9"')}
       ${path("M140 360 C260 200 500 200 640 360 C500 300 260 300 140 360", "#c77dff", 'opacity="0.55"')}
       ${path("M160 420 C300 560 500 560 640 420 C500 480 280 480 160 420", "#4cc9f0", 'opacity="0.4"')}
       ${circle(384, 384, 28, "#fff6c8")}`,
    ),

  "milky-way": () =>
    svgDoc(
      linear("mw", "0", "1", "1", "0", [
        ["0%", "#10002b"],
        ["50%", "#3c096c"],
        ["100%", "#10002b"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#mw)")}${stars(120, "milky")}
       ${ellipse(384, 400, 340, 80, "#c77dff", 'opacity="0.25"')}
       ${ellipse(384, 400, 260, 40, "#fff6c8", 'opacity="0.2"')}`,
    ),

  "astronaut-space": () =>
    svgDoc(
      radial("as", "70%", "70%", "70%", [
        ["0%", "#1d3557"],
        ["100%", "#0b132b"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#as)")}${stars(70, "astro2")}
       ${circle(560, 560, 160, "#1f6fd1")}${path("M500 500 C540 470 600 500 620 560 C560 580 500 540 500 500 Z", "#2d6a4f")}
       ${circle(300, 320, 54, "#f8f9fa")}${rect(260, 360, 80, 90, "#f8f9fa", 'rx="16"')}
       ${circle(300, 320, 36, "#48cae4")}${rect(230, 380, 24, 50, "#f8f9fa")}${rect(346, 380, 24, 50, "#f8f9fa")}`,
    ),

  "astronaut-moon": () =>
    svgDoc(
      "",
      `${rect(0, 0, SIZE, SIZE, "#0b132b")}${stars(60, "moon")}
       ${circle(600, 140, 40, "#4cc9f0")}
       ${rect(0, 480, SIZE, 288, "#adb5bd")}
       ${circle(160, 520, 30, "#8d99ae")}${circle(500, 540, 22, "#8d99ae")}
       ${rect(340, 360, 70, 90, "#f8f9fa", 'rx="16"')}${circle(375, 330, 36, "#f8f9fa")}
       ${circle(375, 330, 24, "#48cae4")}`,
    ),

  "rocket-launch": () =>
    svgDoc(
      linear("rk", "0", "0", "0", "1", [
        ["0%", "#023e8a"],
        ["70%", "#90e0ef"],
        ["100%", "#f4a261"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#rk)")}
       ${rect(0, 600, SIZE, 168, "#6c757d")}
       ${poly("340,180 384,80 428,180", "#f8f9fa")}
       ${rect(348, 180, 72, 260, "#f8f9fa")}
       ${rect(360, 220, 48, 70, "#48cae4")}
       ${poly("348,430 300,520 348,480", "#e63946")}${poly("420,430 468,520 420,480", "#e63946")}
       ${path("M360 440 C350 520 384 600 418 520 C400 500 380 500 360 440 Z", "#ff9f1c")}`,
    ),

  "space-satellite": () =>
    svgDoc(
      "",
      `${rect(0, 0, SIZE, SIZE, "#0b132b")}${stars(70, "sat")}
       ${circle(180, 560, 120, "#1f6fd1")}
       ${rect(340, 340, 90, 70, "#adb5bd", 'rx="8"')}
       ${rect(200, 350, 130, 50, "#4361ee")}${rect(440, 350, 130, 50, "#4361ee")}
       ${rect(250, 358, 20, 34, "#90e0ef")}${rect(290, 358, 20, 34, "#90e0ef")}
       ${rect(480, 358, 20, 34, "#90e0ef")}${rect(520, 358, 20, 34, "#90e0ef")}
       ${circle(385, 330, 10, "#ffd166")}`,
    ),

  "ancient-egypt": () =>
    svgDoc(
      linear("egp", "0", "0", "0", "1", [
        ["0%", "#ffd166"],
        ["100%", "#e9c46a"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#egp)")}
       ${ellipse(600, 130, 40, 40, "#ee9b00")}
       ${poly("80,520 220,280 360,520", "#d4a373")}
       ${poly("300,520 430,240 560,520", "#bc6c25")}
       ${poly("500,520 620,320 740,520", "#d4a373")}
       ${rect(0, 520, SIZE, 248, "#e9c46a")}
       ${path("M0 580 C200 560 400 620 768 570 L768 768 L0 768 Z", "#48cae4")}
       ${rect(40, 470, 12, 60, "#2d6a4f")}${ellipse(46, 460, 18, 20, "#2d6a4f")}`,
    ),

  "indus-valley": () =>
    svgDoc(
      linear("iv", "0", "0", "0", "1", [
        ["0%", "#90e0ef"],
        ["100%", "#e9c46a"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#iv)")}
       ${rect(0, 500, SIZE, 268, "#d4a373")}
       ${rect(80, 360, 90, 140, "#bc6c25")}${rect(190, 400, 80, 100, "#9c6644")}
       ${rect(300, 340, 110, 160, "#bc6c25")}${rect(430, 390, 90, 110, "#9c6644")}
       ${rect(540, 360, 100, 140, "#bc6c25")}
       ${path("M0 600 C220 580 400 640 768 600 L768 768 L0 768 Z", "#48cae4")}`,
    ),

  "ancient-temple": () =>
    svgDoc(
      linear("tm", "0", "0", "0", "1", [
        ["0%", "#90e0ef"],
        ["100%", "#e9c46a"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#tm)")}
       ${rect(0, 560, SIZE, 208, "#d4a373")}
       ${rect(180, 500, 408, 28, "#bc6c25")}
       ${[220, 300, 380, 460, 540].map((x) => rect(x, 300, 28, 200, "#e9c46a")).join("")}
       ${rect(200, 260, 368, 40, "#9c6644")}
       ${poly("200,260 384,160 568,260", "#bc6c25")}`,
    ),

  "historic-fortress": () =>
    svgDoc(
      linear("ft", "0", "0", "0", "1", [
        ["0%", "#89c2d9"],
        ["100%", "#caf0f8"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#ft)")}
       ${poly("0,560 384,280 768,560", "#8d99ae")}
       ${rect(220, 300, 328, 200, "#6c757d")}
       ${rect(200, 260, 70, 240, "#495057")}${rect(498, 260, 70, 240, "#495057")}
       ${rect(360, 400, 48, 100, "#212529")}
       ${rect(210, 240, 50, 20, "#e63946")}${rect(508, 240, 50, 20, "#e63946")}`,
    ),

  "ancient-trade-route": () =>
    svgDoc(
      linear("trd", "0", "0", "0", "1", [
        ["0%", "#ffd166"],
        ["100%", "#e9c46a"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#trd)")}
       ${ellipse(600, 140, 40, 40, "#ee9b00")}
       ${poly("0,420 200,260 400,420", "#d4a373")}
       ${rect(0, 500, SIZE, 268, "#f4a261")}
       ${ellipse(220, 500, 40, 24, "#bc6c25")}${ellipse(300, 490, 36, 22, "#9c6644")}
       ${ellipse(380, 505, 40, 24, "#bc6c25")}${rect(210, 470, 8, 30, "#6b4226")}`,
    ),

  "early-exploration": () =>
    svgDoc(
      linear("ex", "0", "0", "0", "1", [
        ["0%", "#90e0ef"],
        ["70%", "#48cae4"],
        ["100%", "#0077b6"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#ex)")}
       ${poly("0,360 160,280 300,360", "#52b788")}
       ${rect(360, 360, 18, 80, "#6b4226")}${poly("300,360 370,300 440,360", "#f8f9fa")}
       ${rect(500, 400, 16, 70, "#6b4226")}${poly("450,400 508,340 566,400", "#e63946")}
       ${path("M200 500 C360 470 500 530 768 500 L768 768 L0 768 Z", "#0077b6")}`,
    ),

  "ancient-king": () =>
    svgDoc(
      linear("kg", "0", "0", "0", "1", [
        ["0%", "#7209b7"],
        ["100%", "#3c096c"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#kg)")}
       ${rect(80, 160, 608, 40, "#ffd166")}
       ${rect(120, 200, 80, 360, "#c77dff")}${rect(568, 200, 80, 360, "#c77dff")}
       ${person(384, 520, 1.3, "#f4a261", "#e63946", "#3d405b")}
       ${poly("350,250 384,210 418,250", "#ffd166")}
       ${rect(0, 560, SIZE, 208, "#240046")}`,
    ),

  "historical-queen": () =>
    svgDoc(
      linear("qn", "0", "0", "0", "1", [
        ["0%", "#caf0f8"],
        ["100%", "#ffb3c6"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#qn)")}
       ${rect(140, 180, 160, 220, "#90e0ef")}${rect(468, 180, 160, 220, "#90e0ef")}
       ${person(384, 500, 1.25, "#f4a261", "#c77dff", "#3d405b")}
       ${ellipse(384, 250, 28, 16, "#ffd166")}
       ${rect(0, 540, SIZE, 228, "#9b5de5")}`,
    ),

  "printing-press": () =>
    svgDoc(
      linear("pp", "0", "0", "0", "1", [
        ["0%", "#f8edeb"],
        ["100%", "#d8e2dc"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#pp)")}
       ${rect(0, 520, SIZE, 248, "#6b4226")}
       ${rect(180, 300, 408, 220, "#9c6644")}
       ${rect(210, 240, 348, 70, "#3d405b")}
       ${rect(240, 330, 288, 20, "#f8f9fa")}
       ${rect(240, 370, 40, 28, "#212529")}${rect(300, 370, 40, 28, "#212529")}
       ${rect(360, 370, 40, 28, "#212529")}`,
    ),

  "steam-engine": () =>
    svgDoc(
      linear("stmg", "0", "0", "0", "1", [
        ["0%", "#90e0ef"],
        ["100%", "#adb5bd"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#stmg)")}
       ${rect(0, 520, SIZE, 248, "#6c757d")}
       ${rect(160, 360, 360, 140, "#495057", 'rx="20"')}
       ${circle(230, 520, 50, "#212529")}${circle(230, 520, 22, "#adb5bd")}
       ${circle(450, 520, 50, "#212529")}${circle(450, 520, 22, "#adb5bd")}
       ${rect(500, 300, 70, 160, "#6c757d")}
       ${ellipse(535, 250, 40, 50, "#ced4da", 'opacity="0.7"')}`,
    ),

  "computer-components": () =>
    svgDoc(
      "",
      `${rect(0, 0, SIZE, SIZE, "#212529")}
       ${rect(90, 140, 588, 488, "#2d6a4f", 'rx="16"')}
       ${rect(130, 180, 220, 160, "#40916c")}${rect(380, 180, 250, 80, "#1b4332")}
       ${circle(240, 260, 40, "#6c757d")}${rect(400, 290, 200, 120, "#4361ee")}
       ${rect(140, 380, 160, 180, "#ffd166")}${rect(330, 430, 300, 20, "#e63946")}`,
    ),

  "computer-lab": () =>
    svgDoc(
      linear("cl", "0", "0", "0", "1", [
        ["0%", "#edf2fb"],
        ["100%", "#bde0fe"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#cl)")}
       ${rect(0, 500, SIZE, 268, "#8d99ae")}
       ${[140, 320, 500].map((x) => `${rect(x, 300, 130, 80, "#48cae4")}${rect(x + 20, 380, 90, 70, "#3d405b")}`).join("")}
       ${person(220, 500, 0.9, "#f4a261", "#4361ee", "#212529")}`,
    ),

  "robotic-arm": () =>
    svgDoc(
      linear("fa", "0", "0", "0", "1", [
        ["0%", "#edf2fb"],
        ["100%", "#adb5bd"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#fa)")}
       ${rect(0, 560, SIZE, 208, "#6c757d")}
       ${rect(180, 500, 140, 60, "#495057")}
       ${rect(230, 360, 40, 150, "#e63946")}
       ${rect(230, 250, 160, 40, "#e63946")}
       ${rect(360, 230, 40, 120, "#f4a261")}
       ${rect(340, 330, 80, 24, "#212529")}
       ${circle(200, 480, 16, "#ffd166")}${circle(500, 500, 20, "#4cc9f0")}`,
    ),

  "humanoid-robot": () =>
    svgDoc(
      linear("hr", "0", "0", "0", "1", [
        ["0%", "#caf0f8"],
        ["100%", "#bde0fe"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#hr)")}
       ${rect(0, 560, SIZE, 208, "#8d99ae")}
       ${circle(384, 250, 50, "#adb5bd")}${rect(354, 300, 60, 90, "#48cae4", 'rx="12"')}
       ${rect(330, 310, 20, 70, "#adb5bd")}${rect(418, 310, 20, 70, "#adb5bd")}
       ${rect(360, 390, 20, 80, "#6c757d")}${rect(388, 390, 20, 80, "#6c757d")}
       ${circle(370, 240, 6, "#4cc9f0")}${circle(398, 240, 6, "#4cc9f0")}
       ${rect(300, 430, 40, 28, "#90e0ef")}`,
    ),

  "neural-network": () =>
    svgDoc(
      radial("nn", "50%", "50%", "70%", [
        ["0%", "#3c096c"],
        ["100%", "#10002b"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#nn)")}
       ${[
         [180, 200],
         [180, 384],
         [180, 560],
         [384, 160],
         [384, 300],
         [384, 468],
         [384, 600],
         [580, 240],
         [580, 400],
         [580, 540],
       ]
         .map(
           ([x, y], i, arr) =>
             arr
               .filter((_, j) => Math.abs(j - i) < 4)
               .map(
                 ([x2, y2]) =>
                   `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="#90e0ef" stroke-width="3" opacity="0.35"/>`,
               )
               .join("") + circle(x, y, 16, ["#4cc9f0", "#c77dff", "#ffd166", "#80ed99"][i % 4]),
         )
         .join("")}`,
    ),

  "human-ai": () =>
    svgDoc(
      linear("ha", "0", "0", "0", "1", [
        ["0%", "#edf2fb"],
        ["100%", "#c77dff"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#ha)")}
       ${rect(0, 540, SIZE, 228, "#3d405b")}
       ${rect(240, 420, 288, 80, "#212529", 'rx="12"')}
       ${person(280, 500, 1.05, "#f4a261", "#4361ee", "#212529")}
       ${rect(470, 360, 50, 80, "#adb5bd", 'rx="10"')}${circle(495, 330, 28, "#adb5bd")}
       ${circle(485, 324, 5, "#4cc9f0")}${circle(505, 324, 5, "#4cc9f0")}`,
    ),

  "circuit-board": () =>
    svgDoc(
      "",
      `${rect(0, 0, SIZE, SIZE, "#1b4332")}
       ${[120, 220, 320, 420, 520].map((y) => rect(80, y, 608, 6, "#52b788")).join("")}
       ${[160, 300, 440, 580].map((x) => rect(x, 80, 6, 600, "#52b788")).join("")}
       ${rect(200, 180, 120, 80, "#212529", 'rx="8"')}${rect(420, 300, 140, 100, "#212529", 'rx="8"')}
       ${circle(240, 400, 16, "#e63946")}${circle(520, 200, 14, "#ffd166")}${circle(360, 520, 12, "#4cc9f0")}`,
    ),

  microcontroller: () =>
    svgDoc(
      linear("mc", "0", "0", "0", "1", [
        ["0%", "#edf2fb"],
        ["100%", "#bde0fe"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#mc)")}
       ${rect(180, 200, 408, 280, "#2d6a4f", 'rx="12"')}
       ${rect(240, 250, 160, 120, "#212529")}
       ${[0, 1, 2, 3, 4, 5].map((i) => rect(200 + i * 28, 200, 10, 24, "#adb5bd")).join("")}
       ${circle(500, 260, 18, "#e63946")}${circle(540, 320, 16, "#4cc9f0")}${circle(500, 400, 16, "#ffd166")}`,
    ),

  "global-internet": () =>
    svgDoc(
      radial("gi", "50%", "50%", "70%", [
        ["0%", "#1d3557"],
        ["100%", "#0b132b"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#gi)")}${stars(40, "net")}
       ${circle(384, 400, 160, "#1f6fd1")}
       ${path("M280 360 C340 320 430 330 480 380 C430 430 330 420 280 360 Z", "#2d6a4f")}
       ${path("M200 300 Q384 180 568 300", "none", 'stroke="#4cc9f0" stroke-width="6" fill="none"')}
       ${path("M220 500 Q384 600 548 500", "none", 'stroke="#c77dff" stroke-width="6" fill="none"')}
       ${circle(200, 300, 10, "#ffd166")}${circle(568, 300, 10, "#80ed99")}${circle(384, 180, 10, "#f72585")}`,
    ),

  "connected-devices": () =>
    svgDoc(
      linear("cd", "0", "0", "0", "1", [
        ["0%", "#edf2fb"],
        ["100%", "#caf0f8"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#cd)")}
       ${rect(120, 260, 160, 110, "#48cae4", 'rx="12"')}${rect(460, 240, 90, 150, "#212529", 'rx="16"')}
       ${rect(300, 420, 180, 110, "#3d405b", 'rx="10"')}
       ${circle(384, 200, 16, "#4cc9f0")}
       ${path("M200 260 C240 200 384 180 500 240", "none", 'stroke="#4361ee" stroke-width="4" fill="none"')}`,
    ),

  "human-heart": () =>
    svgDoc(
      radial("hb", "50%", "50%", "70%", [
        ["0%", "#fff0f3"],
        ["100%", "#ffccd5"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#hb)")}
       ${path("M384 620 C180 420 240 220 384 320 C528 220 588 420 384 620 Z", "#e63946")}
       ${path("M384 320 C360 240 300 240 300 300", "#9b2226")}
       ${path("M384 320 C408 240 468 240 468 300", "#9b2226")}
       ${ellipse(340, 380, 24, 36, "#ff8fa3")}${ellipse(428, 380, 24, 36, "#ff8fa3")}
       ${path("M384 280 C384 200 430 180 450 230", "#9b2226")}`,
    ),

  "human-lungs": () =>
    svgDoc(
      radial("lg", "50%", "50%", "70%", [
        ["0%", "#fff0f3"],
        ["100%", "#ffccd5"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#lg)")}
       ${ellipse(270, 400, 110, 180, "#e76f51")}${ellipse(498, 400, 110, 180, "#e76f51")}
       ${rect(370, 180, 28, 160, "#c9184a", 'rx="10"')}
       ${path("M384 300 C320 320 280 360 260 420", "none", 'stroke="#9b2226" stroke-width="8" fill="none"')}
       ${path("M384 300 C448 320 488 360 508 420", "none", 'stroke="#9b2226" stroke-width="8" fill="none"')}`,
    ),

  "human-skeleton": () =>
    svgDoc(
      linear("sk", "0", "0", "0", "1", [
        ["0%", "#edf2fb"],
        ["100%", "#d8e2dc"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#sk)")}
       ${circle(384, 160, 46, "#f8f9fa")}
       ${rect(368, 200, 32, 40, "#f8f9fa")}
       ${rect(350, 240, 68, 140, "#f8f9fa", 'rx="10"')}
       ${rect(320, 250, 24, 110, "#f8f9fa")}${rect(424, 250, 24, 110, "#f8f9fa")}
       ${rect(354, 380, 22, 150, "#f8f9fa")}${rect(392, 380, 22, 150, "#f8f9fa")}
       ${[0, 1, 2, 3, 4].map((i) => rect(356, 250 + i * 22, 56, 8, "#dee2e6")).join("")}`,
    ),

  "hand-bones": () =>
    svgDoc(
      linear("hd", "0", "0", "0", "1", [
        ["0%", "#fff0f3"],
        ["100%", "#edf2fb"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#hd)")}
       ${rect(300, 420, 180, 120, "#f8f9fa", 'rx="20"')}
       ${[310, 350, 390, 430, 470].map((x, i) => rect(x, 160 + (i === 0 ? 40 : 0), 24, 260, "#f8f9fa", 'rx="10"')).join("")}
       ${circle(322, 430, 16, "#dee2e6")}${circle(402, 430, 16, "#dee2e6")}`,
    ),

  "human-brain": () =>
    svgDoc(
      radial("br", "50%", "50%", "70%", [
        ["0%", "#fff0f3"],
        ["100%", "#ffccd5"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#br)")}
       ${ellipse(384, 384, 200, 160, "#ffb3c6")}
       ${path("M250 360 C300 280 360 300 384 340 C420 280 500 300 520 370 C480 420 400 400 384 430 C340 400 280 420 250 360 Z", "#e5989b")}
       ${ellipse(330, 360, 40, 28, "#c77dff", 'opacity="0.5"')}${ellipse(450, 370, 36, 24, "#9b5de5", 'opacity="0.45"')}`,
    ),

  "brain-neurons": () =>
    svgDoc(
      radial("bn", "50%", "50%", "70%", [
        ["0%", "#3c096c"],
        ["100%", "#240046"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#bn)")}
       ${ellipse(384, 384, 210, 170, "#ffb3c6", 'opacity="0.25"')}
       ${[
         [300, 300],
         [420, 280],
         [500, 380],
         [400, 480],
         [280, 430],
         [360, 360],
       ]
         .map(
           ([x, y], i, arr) =>
             arr
               .map(
                 ([x2, y2]) =>
                   `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="#c77dff" stroke-width="3" opacity="0.45"/>`,
               )
               .join("") + circle(x, y, 12, "#ffd166"),
         )
         .join("")}`,
    ),

  "cell-structure": () =>
    svgDoc(
      radial("cs", "50%", "50%", "60%", [
        ["0%", "#fff0f3"],
        ["100%", "#ff8fa3"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "#ffccd5")}
       ${ellipse(384, 384, 280, 250, "url(#cs)")}
       ${ellipse(384, 384, 280, 250, "none", 'stroke="#c9184a" stroke-width="16"')}
       ${circle(400, 360, 80, "#c77dff")}${circle(400, 360, 30, "#5a189a")}
       ${ellipse(250, 300, 36, 16, "#e85d04")}${ellipse(520, 450, 40, 18, "#dc2f02")}
       ${circle(280, 480, 14, "#48cae4")}${circle(500, 280, 12, "#ffd166")}`,
    ),

  "blood-cells": () =>
    svgDoc(
      linear("bl", "0", "0", "1", "1", [
        ["0%", "#9b2226"],
        ["100%", "#e63946"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#bl)")}
       ${[160, 280, 400, 520, 240, 460, 340].map((x, i) => circle(x, 180 + (i % 4) * 130, 48, "#ff6b6b")).join("")}
       ${circle(300, 360, 36, "#f8f9fa")}${circle(500, 500, 32, "#f8f9fa")}
       ${circle(300, 360, 10, "#4361ee")}${circle(500, 500, 10, "#4361ee")}`,
    ),

  "digestive-system": () =>
    svgDoc(
      linear("dg", "0", "0", "0", "1", [
        ["0%", "#fff0f3"],
        ["100%", "#edf2fb"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#dg)")}
       ${ellipse(384, 180, 40, 28, "#f4a261")}
       ${rect(370, 200, 28, 70, "#e76f51")}
       ${ellipse(384, 320, 70, 40, "#e63946")}
       ${path("M340 350 C280 420 300 520 360 560 C420 600 480 520 450 450 C500 500 460 360 400 380 Z", "#f4a261")}
       ${ellipse(430, 600, 36, 24, "#bc6c25")}`,
    ),

  "circulatory-system": () =>
    svgDoc(
      linear("cir", "0", "0", "0", "1", [
        ["0%", "#fff0f3"],
        ["100%", "#edf2fb"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#cir)")}
       ${ellipse(384, 200, 36, 44, "#f4a261")}
       ${rect(360, 240, 48, 220, "#f4a261", 'rx="20"')}
       ${path("M384 280 C260 300 220 420 260 520", "none", 'stroke="#e63946" stroke-width="10" fill="none"')}
       ${path("M384 280 C508 300 548 420 508 520", "none", 'stroke="#4cc9f0" stroke-width="10" fill="none"')}
       ${path("M384 470 C300 520 280 620 330 680", "none", 'stroke="#e63946" stroke-width="10" fill="none"')}
       ${path("M384 470 C468 520 488 620 438 680", "none", 'stroke="#4cc9f0" stroke-width="10" fill="none"')}
       ${path("M384 340 C340 360 360 400 384 410 C408 400 428 360 384 340 Z", "#e63946")}`,
    ),

  "watercolor-landscape": () =>
    svgDoc(
      linear("wc", "0", "0", "0", "1", [
        ["0%", "#90e0ef"],
        ["40%", "#bde0fe"],
        ["100%", "#80ed99"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#wc)")}
       ${ellipse(200, 260, 140, 50, "#74c69d", 'opacity="0.7"')}
       ${ellipse(500, 300, 180, 60, "#40916c", 'opacity="0.6"')}
       ${path("M0 480 C200 420 400 520 768 450 L768 768 L0 768 Z", "#48cae4", 'opacity="0.65"')}
       ${ellipse(600, 140, 40, 40, "#ffd166", 'opacity="0.8"')}`,
    ),

  "abstract-color": () =>
    svgDoc(
      "",
      `${rect(0, 0, SIZE, SIZE, "#fff3b0")}
       ${circle(220, 240, 140, "#e63946")}${circle(520, 280, 160, "#4361ee")}
       ${rect(180, 420, 260, 180, "#80ed99")}${poly("400,360 620,200 700,480", "#c77dff")}
       ${ellipse(360, 560, 180, 60, "#f4a261")}`,
    ),

  "musical-instruments": () =>
    svgDoc(
      linear("mu", "0", "0", "0", "1", [
        ["0%", "#f8edeb"],
        ["100%", "#d8e2dc"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#mu)")}
       ${ellipse(260, 420, 70, 160, "#9c6644")}${circle(260, 260, 28, "#9c6644")}
       ${rect(248, 180, 24, 90, "#6b4226")}
       ${rect(420, 480, 220, 80, "#212529")}${[0, 1, 2, 3, 4, 5, 6].map((i) => rect(430 + i * 28, 430, 16, 50, "#f8f9fa")).join("")}
       ${circle(560, 300, 50, "#e63946")}${circle(560, 300, 28, "#f8f9fa")}`,
    ),

  "classical-music": () =>
    svgDoc(
      linear("cm", "0", "0", "0", "1", [
        ["0%", "#3d405b"],
        ["100%", "#22223b"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#cm)")}
       ${rect(80, 200, 608, 280, "#c77dff", 'opacity="0.25"')}
       ${person(260, 500, 1, "#f4a261", "#e63946", "#212529")}
       ${person(400, 500, 1, "#f4a261", "#4361ee", "#212529")}
       ${person(540, 500, 1, "#f4a261", "#ffd166", "#212529")}
       ${rect(0, 560, SIZE, 208, "#1b1b3a")}`,
    ),

  "indian-festival": () =>
    svgDoc(
      linear("if", "0", "0", "0", "1", [
        ["0%", "#3c096c"],
        ["100%", "#7b2cbf"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#if)")}
       ${[160, 260, 360, 460, 560].map((x, i) => `${rect(x, 420 - i * 8, 16, 70, "#ffd166")}${ellipse(x + 8, 410 - i * 8, 18, 10, "#e63946")}`).join("")}
       ${circle(384, 560, 80, "#e63946")}${circle(384, 560, 50, "#ffd166")}${circle(384, 560, 22, "#4361ee")}
       ${person(220, 620, 0.8, "#f4a261", "#e63946", "#3d405b")}${person(540, 620, 0.8, "#f4a261", "#48cae4", "#3d405b")}`,
    ),

  "lantern-festival": () =>
    svgDoc(
      linear("lf", "0", "0", "0", "1", [
        ["0%", "#10002b"],
        ["100%", "#240046"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#lf)")}${stars(40, "lantern")}
       ${path("M0 520 C200 500 400 560 768 520 L768 768 L0 768 Z", "#023e8a")}
       ${[180, 300, 420, 540, 250, 480].map((x, i) => `${rect(x, 180 + (i % 3) * 50, 36, 50, ["#e63946", "#ffd166", "#f4a261"][i % 3], 'rx="8"')}${rect(x + 16, 160 + (i % 3) * 50, 4, 20, "#f8f9fa")}`).join("")}`,
    ),

  "indian-architecture": () =>
    svgDoc(
      linear("ia", "0", "0", "0", "1", [
        ["0%", "#90e0ef"],
        ["100%", "#e9c46a"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#ia)")}
       ${rect(0, 540, SIZE, 228, "#d4a373")}
       ${rect(180, 360, 408, 180, "#f8f9fa")}
       ${path("M180 360 C260 220 508 220 588 360 Z", "#f8f9fa")}
       ${circle(384, 230, 24, "#f8f9fa")}
       ${rect(220, 420, 50, 120, "#22223b")}${rect(360, 400, 48, 140, "#22223b")}${rect(500, 420, 50, 120, "#22223b")}`,
    ),

  "european-architecture": () =>
    svgDoc(
      linear("ea", "0", "0", "0", "1", [
        ["0%", "#90e0ef"],
        ["100%", "#caf0f8"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#ea)")}
       ${rect(0, 560, SIZE, 208, "#95d5b2")}
       ${[200, 280, 360, 440, 520].map((x) => rect(x, 300, 32, 260, "#f8f9fa")).join("")}
       ${rect(180, 260, 408, 40, "#f8f9fa")}
       ${poly("180,260 384,160 588,260", "#f8f9fa")}
       ${circle(384, 620, 40, "#48cae4")}${circle(384, 620, 16, "#0077b6")}`,
    ),

  "traditional-crafts": () =>
    svgDoc(
      linear("tc", "0", "0", "0", "1", [
        ["0%", "#f8edeb"],
        ["100%", "#e9c46a"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#tc)")}
       ${rect(0, 500, SIZE, 268, "#9c6644")}
       ${ellipse(240, 430, 70, 90, "#e76f51")}${ellipse(240, 360, 40, 20, "#e76f51")}
       ${rect(400, 360, 160, 140, "#d4a373")}${[0, 1, 2, 3, 4].map((i) => rect(410, 370 + i * 24, 140, 10, "#6b4226")).join("")}
       ${circle(620, 420, 40, "#bc6c25")}`,
    ),

  "cultural-dance": () =>
    svgDoc(
      linear("cdance", "0", "0", "0", "1", [
        ["0%", "#ffd166"],
        ["100%", "#e76f51"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#cdance)")}
       ${rect(0, 560, SIZE, 208, "#9b5de5")}
       ${person(260, 520, 1.1, "#f4a261", "#e63946", "#3d405b")}
       ${person(420, 520, 1.1, "#f4a261", "#4361ee", "#3d405b")}
       ${person(560, 520, 1.05, "#f4a261", "#80ed99", "#3d405b")}
       ${ellipse(384, 200, 120, 20, "#ffd166", 'opacity="0.5"')}`,
    ),

  "football-match": () =>
    svgDoc(
      linear("fm", "0", "0", "0", "1", [
        ["0%", "#90e0ef"],
        ["100%", "#52b788"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#fm)")}
       ${rect(0, 420, SIZE, 348, "#2d6a4f")}
       ${rect(80, 460, 608, 220, "#40916c")}
       ${rect(80, 568, 608, 4, "#f8f9fa")}${rect(380, 460, 4, 220, "#f8f9fa")}
       ${circle(384, 570, 40, "none", 'stroke="#f8f9fa" stroke-width="4" fill="none"')}
       ${person(280, 540, 0.9, "#f4a261", "#e63946", "#212529")}
       ${person(480, 540, 0.9, "#f4a261", "#4361ee", "#212529")}
       ${circle(390, 560, 14, "#f8f9fa")}`,
    ),

  "football-stadium": () =>
    svgDoc(
      linear("fs", "0", "0", "0", "1", [
        ["0%", "#22223b"],
        ["100%", "#4a4e69"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#fs)")}
       ${ellipse(384, 420, 300, 180, "#6c757d")}
       ${ellipse(384, 420, 220, 120, "#2d6a4f")}
       ${ellipse(384, 420, 40, 22, "#f8f9fa", 'opacity="0.4"')}
       ${[0, 1, 2, 3, 4, 5].map((i) => circle(160 + i * 90, 220, 8, "#ffd166")).join("")}`,
    ),

  "cricket-batter": () =>
    svgDoc(
      linear("cb", "0", "0", "0", "1", [
        ["0%", "#90e0ef"],
        ["100%", "#80ed99"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#cb)")}
       ${rect(0, 500, SIZE, 268, "#52b788")}
       ${rect(360, 430, 10, 90, "#f8f9fa")}${rect(390, 430, 10, 90, "#f8f9fa")}${rect(420, 430, 10, 90, "#f8f9fa")}
       ${person(260, 500, 1.1, "#f4a261", "#4361ee", "#212529")}
       ${rect(300, 360, 16, 110, "#bc6c25", 'rx="6"')}
       ${circle(500, 400, 12, "#e63946")}`,
    ),

  "cricket-stadium": () =>
    svgDoc(
      linear("csd", "0", "0", "0", "1", [
        ["0%", "#90e0ef"],
        ["100%", "#48cae4"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#csd)")}
       ${ellipse(384, 460, 320, 180, "#6c757d")}
       ${ellipse(384, 460, 250, 130, "#52b788")}
       ${rect(360, 400, 48, 140, "#e9c46a")}
       ${rect(378, 420, 12, 70, "#f8f9fa")}`,
    ),

  "basketball-player": () =>
    svgDoc(
      linear("bp", "0", "0", "0", "1", [
        ["0%", "#edf2fb"],
        ["100%", "#f4a261"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#bp)")}
       ${rect(0, 560, SIZE, 208, "#e76f51")}
       ${rect(500, 180, 12, 220, "#3d405b")}${rect(470, 180, 90, 12, "#e63946")}
       ${ellipse(515, 200, 36, 10, "#f8f9fa", 'opacity="0.5"')}
       ${person(340, 420, 1.2, "#f4a261", "#4361ee", "#212529")}
       ${circle(430, 250, 22, "#e76f51")}`,
    ),

  "basketball-court": () =>
    svgDoc(
      "",
      `${rect(0, 0, SIZE, SIZE, "#e76f51")}
       ${rect(80, 80, 608, 608, "#d00000")}
       ${rect(80, 384, 608, 6, "#f8f9fa")}
       ${circle(384, 384, 70, "none", 'stroke="#f8f9fa" stroke-width="6" fill="none"')}
       ${rect(80, 80, 608, 80, "none", 'stroke="#f8f9fa" stroke-width="6"')}
       ${rect(80, 608, 608, 80, "none", 'stroke="#f8f9fa" stroke-width="6"')}
       ${circle(500, 300, 22, "#f4a261")}`,
    ),

  "multi-sport": () =>
    svgDoc(
      linear("ms", "0", "0", "0", "1", [
        ["0%", "#90e0ef"],
        ["100%", "#52b788"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#ms)")}
       ${rect(0, 500, SIZE, 268, "#40916c")}
       ${person(200, 500, 0.95, "#f4a261", "#e63946", "#212529")}
       ${person(340, 500, 0.95, "#f4a261", "#4361ee", "#212529")}
       ${person(480, 500, 0.95, "#f4a261", "#ffd166", "#212529")}
       ${circle(240, 420, 14, "#f8f9fa")}${circle(520, 400, 16, "#e76f51")}
       ${rect(600, 360, 10, 80, "#3d405b")}`,
    ),

  "multi-sport-stadium": () =>
    svgDoc(
      linear("mss", "0", "0", "0", "1", [
        ["0%", "#22223b"],
        ["100%", "#4a4e69"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#mss)")}
       ${ellipse(384, 420, 300, 190, "#6c757d")}
       ${ellipse(384, 420, 230, 140, "#e63946")}
       ${ellipse(384, 420, 160, 90, "#2d6a4f")}
       ${[0, 1, 2, 3, 4].map((i) => circle(180 + i * 100, 200, 7, "#ffd166")).join("")}`,
    ),

  "sprint-race": () =>
    svgDoc(
      "",
      `${rect(0, 0, SIZE, SIZE, "#e63946")}
       ${[0, 1, 2, 3, 4].map((i) => rect(0, 80 + i * 120, SIZE, 100, i % 2 ? "#d00000" : "#e63946")).join("")}
       ${[0, 1, 2, 3, 4].map((i) => rect(0, 176 + i * 120, SIZE, 6, "#f8f9fa")).join("")}
       ${person(200, 200, 0.8, "#f4a261", "#4361ee", "#212529")}
       ${person(320, 320, 0.8, "#f4a261", "#ffd166", "#212529")}
       ${person(260, 440, 0.8, "#f4a261", "#48cae4", "#212529")}`,
    ),

  "long-jump": () =>
    svgDoc(
      linear("lj", "0", "0", "0", "1", [
        ["0%", "#90e0ef"],
        ["100%", "#e9c46a"],
      ]),
      `${rect(0, 0, SIZE, SIZE, "url(#lj)")}
       ${rect(0, 500, SIZE, 268, "#52b788")}
       ${rect(80, 520, 280, 70, "#e63946")}
       ${rect(360, 500, 320, 110, "#e9c46a")}
       ${person(280, 420, 1.05, "#f4a261", "#4361ee", "#212529")}`,
    ),
};

export function createIllustration(subject) {
  const renderer = RENDERERS[subject.illustrationType];
  if (!renderer) {
    throw new Error(`Missing illustration renderer: ${subject.illustrationType}`);
  }
  return renderer(subject).replace(
    "</svg>",
    `${categoryDressing(subject)}${textureDots(subject.slug)}</svg>`,
  );
}

export function listIllustrationTypes() {
  return Object.keys(RENDERERS);
}
