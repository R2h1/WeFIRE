const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = 'd:/conan/FIER时光账/images';
const SIZE = 48;
const COLORS = { normal: '#999999', selected: '#2E7D32' };

function createPNG(width, height, rgbaData) {
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const di = y * (1 + width * 4) + 1 + x * 4;
      raw[di] = rgbaData[si];
      raw[di + 1] = rgbaData[si + 1];
      raw[di + 2] = rgbaData[si + 2];
      raw[di + 3] = rgbaData[si + 3];
    }
  }
  const deflated = zlib.deflateSync(raw);

  function crc32(buf) {
    let c = 0xffffffff;
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let cn = n;
      for (let k = 0; k < 8; k++)
        cn = cn & 1 ? 0xedb88320 ^ (cn >>> 1) : cn >>> 1;
      table[n] = cn;
    }
    for (let i = 0; i < buf.length; i++)
      c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const t = Buffer.from(type, 'ascii');
    const crcData = Buffer.concat([t, data]);
    const crcVal = Buffer.alloc(4);
    crcVal.writeUInt32BE(crc32(crcData));
    return Buffer.concat([len, t, data, crcVal]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflated),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Signed distance functions ---

function sdLineSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1,
    dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((px - x1 - t * dx) ** 2 + (py - y1 - t * dy) ** 2);
}

function sdCircle(px, py, cx, cy, r) {
  return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) - r;
}

function sdRoundRect(px, py, cx, cy, w, h, r) {
  const ux = Math.abs(px - cx);
  const uy = Math.abs(py - cy);
  if (ux > w / 2 - r && uy > h / 2 - r) {
    return Math.sqrt((ux - w / 2 + r) ** 2 + (uy - h / 2 + r) ** 2) - r;
  }
  return Math.max(ux - w / 2, uy - h / 2);
}

// --- Rendering ---

function renderIcon(size, color, lineWidth, strokes, fills) {
  const rgba = new Uint8Array(size * size * 4);
  const halfW = lineWidth / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5,
        py = y + 0.5;
      let alpha = 0;

      for (const fn of strokes) {
        const d = fn(px, py);
        const a = 1 - Math.min(1, Math.max(0, Math.abs(d) - halfW + 0.5));
        if (a > alpha) alpha = a;
      }

      for (const fn of fills) {
        const d = fn(px, py);
        const a = Math.min(1, Math.max(0, 0.5 - d));
        if (a > alpha) alpha = a;
      }

      if (alpha > 0.01) {
        const i = (y * size + x) * 4;
        rgba[i] = color[0];
        rgba[i + 1] = color[1];
        rgba[i + 2] = color[2];
        rgba[i + 3] = Math.round(Math.min(255, alpha * 255));
      }
    }
  }
  return rgba;
}

// --- Icon definitions ---

function homeIcon(color) {
  const LW = 3;
  const cx = 24;
  return renderIcon(
    SIZE,
    color,
    LW,
    [
      (px, py) => sdLineSegment(px, py, 5, 21, cx, 6),
      (px, py) => sdLineSegment(px, py, cx, 6, 43, 21),
      (px, py) => sdRoundRect(px, py, cx, 31, 30, 21, 3),
    ],
    [(px, py) => sdRoundRect(px, py, cx, 38, 12, 10, 3)],
  );
}

function addIcon(color) {
  const LW = 3;
  const cx = 24,
    cy = 24;
  return renderIcon(
    SIZE,
    color,
    LW,
    [
      (px, py) => sdCircle(px, py, cx, cy, 16),
      (px, py) => sdLineSegment(px, py, 10, cy, 38, cy),
      (px, py) => sdLineSegment(px, py, cx, 10, cx, 38),
    ],
    [],
  );
}

function userIcon(color) {
  const LW = 3;
  return renderIcon(
    SIZE,
    color,
    LW,
    [
      (px, py) => sdCircle(px, py, 24, 15, 7),
      (px, py) => sdLineSegment(px, py, 14, 26, 34, 26),
      (px, py) => sdLineSegment(px, py, 14, 26, 18, 40),
      (px, py) => sdLineSegment(px, py, 34, 26, 30, 40),
      (px, py) => sdLineSegment(px, py, 18, 40, 30, 40),
    ],
    [],
  );
}

// --- Generate ---

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

const icons = [
  { name: 'home', draw: homeIcon },
  { name: 'add', draw: addIcon },
  { name: 'my', draw: userIcon },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

icons.forEach((icon) => {
  ['normal', 'selected'].forEach((state) => {
    const color = hexToRgb(COLORS[state]);
    const rgba = icon.draw(color);
    const png = createPNG(SIZE, SIZE, rgba);
    const suffix = state === 'normal' ? '' : '_selected';
    const filePath = path.join(OUT_DIR, icon.name + suffix + '.png');
    fs.writeFileSync(filePath, png);
    console.log('Created:', filePath);
  });
});

console.log('Done!');
