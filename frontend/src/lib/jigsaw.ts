export type Tabs = { top: number; right: number; bottom: number; left: number };

// Points of a single jigsaw edge in local space: u runs 0..1 along the edge,
// v is perpendicular with positive v pointing OUT of the piece.
function edgePoints(t: number): Array<[number, number]> {
  return [
    [0.2, 0.02 * t],
    [0.35, -0.02 * t],
    [0.4, 0],
    [0.45, 0.13 * t],
    [0.3, 0.26 * t],
    [0.5, 0.26 * t],
    [0.7, 0.26 * t],
    [0.55, 0.13 * t],
    [0.6, 0],
    [0.65, -0.02 * t],
    [0.8, 0.02 * t],
    [1, 0],
  ];
}

type Mapper = (u: number, v: number) => [number, number];

function edgeSegment(sign: number, map: Mapper) {
  const pts = edgePoints(sign).map(([u, v]) => map(u, v));
  let d = "";
  for (let i = 0; i + 2 < pts.length; i += 3) {
    const a = pts[i] as [number, number];
    const b = pts[i + 1] as [number, number];
    const c = pts[i + 2] as [number, number];
    d += ` C ${a[0].toFixed(2)},${a[1].toFixed(2)} ${b[0].toFixed(2)},${b[1].toFixed(2)} ${c[0].toFixed(2)},${c[1].toFixed(2)}`;
  }
  return d;
}

export function piecePath(col: number, row: number, size: number, tabs: Tabs) {
  const x = col * size;
  const y = row * size;
  const s = size;
  let d = `M ${x},${y}`;
  d += edgeSegment(tabs.top, (u, v) => [x + u * s, y - v * s]);
  d += edgeSegment(tabs.right, (u, v) => [x + s + v * s, y + u * s]);
  d += edgeSegment(tabs.bottom, (u, v) => [x + s - u * s, y + s + v * s]);
  d += edgeSegment(tabs.left, (u, v) => [x - v * s, y + s - u * s]);
  return `${d} Z`;
}

export type Piece = { id: number; col: number; row: number; d: string };

export function buildPieces(cols: number, rows: number, size: number): Piece[] {
  const hTab = (r: number, c: number) =>
    r === 0 || r === rows ? 0 : (r * 7 + c * 3) % 2 === 0 ? 1 : -1;
  const vTab = (r: number, c: number) =>
    c === 0 || c === cols ? 0 : (r * 5 + c * 11) % 2 === 0 ? 1 : -1;

  const pieces: Piece[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      pieces.push({
        id: r * cols + c,
        col: c,
        row: r,
        d: piecePath(c, r, size, {
          top: hTab(r, c),
          bottom: -hTab(r + 1, c),
          right: vTab(r, c + 1),
          left: -vTab(r, c),
        }),
      });
    }
  }
  return pieces;
}
