// ===== SKH Solutions — tiny QR code maker (no internet / no library needed) =====
// Byte mode, error-correction level M, versions 1–6 (up to ~100 characters).
// qrSVG("SKH:SKH-2026-0101", 6) → "<svg …>"  (6 = pixels per module)
const QR = (() => {
  // [total codewords, EC codewords per block, number of blocks] for level M
  const TABLE = { 1: [26, 10, 1], 2: [44, 16, 1], 3: [70, 26, 1], 4: [100, 18, 2], 5: [134, 24, 2], 6: [172, 16, 4] };
  const ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34] };

  const gfMul = (x, y) => {
    let z = 0;
    for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; }
    return z & 0xff;
  };
  const rsDivisor = (deg) => {
    const r = new Array(deg).fill(0); r[deg - 1] = 1;
    let root = 1;
    for (let i = 0; i < deg; i++) {
      for (let j = 0; j < deg; j++) { r[j] = gfMul(r[j], root); if (j + 1 < deg) r[j] ^= r[j + 1]; }
      root = gfMul(root, 2);
    }
    return r;
  };
  const rsRemainder = (data, div) => {
    const r = new Array(div.length).fill(0);
    for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => (r[i] ^= gfMul(c, f))); }
    return r;
  };

  function encode(text) {
    const bytes = [...new TextEncoder().encode(text)];
    let ver = 1;
    while (ver <= 6) { const [tot, ec, nb] = TABLE[ver]; if ((tot - ec * nb) * 8 >= 4 + 8 + bytes.length * 8) break; ver++; }
    if (ver > 6) throw new Error("Text too long for QR");
    const [total, ecLen, nBlocks] = TABLE[ver];
    const dataLen = total - ecLen * nBlocks;
    // bit stream
    const bits = [];
    const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
    put(4, 4); put(bytes.length, 8); bytes.forEach((b) => put(b, 8));
    put(0, Math.min(4, dataLen * 8 - bits.length));
    while (bits.length % 8) bits.push(0);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
    for (let p = 0xec; data.length < dataLen; p ^= 0xec ^ 0x11) data.push(p);
    // error correction + interleave
    const per = dataLen / nBlocks, div = rsDivisor(ecLen), blocks = [], ecs = [];
    for (let b = 0; b < nBlocks; b++) { const d = data.slice(b * per, (b + 1) * per); blocks.push(d); ecs.push(rsRemainder(d, div)); }
    const cw = [];
    for (let i = 0; i < per; i++) blocks.forEach((d) => cw.push(d[i]));
    for (let i = 0; i < ecLen; i++) ecs.forEach((e) => cw.push(e[i]));

    // matrix
    const size = ver * 4 + 17;
    const M = Array.from({ length: size }, () => new Array(size).fill(false));
    const F = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (x, y, dark) => { M[y][x] = dark; F[y][x] = true; };
    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const finder = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
      }
    };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    const al = ALIGN[ver];
    al.forEach((ax, i) => al.forEach((ay, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }));
    const drawFormat = (mask) => {
      const d = (0 << 3) | mask; // level M = 0
      let r = d;
      for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = ((d << 10) | r) ^ 0x5412;
      const bit = (i) => ((b >>> i) & 1) === 1;
      for (let i = 0; i <= 5; i++) set(8, i, bit(i));
      set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
      for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
      set(8, size - 8, true);
    };
    drawFormat(0); // reserve the format areas
    // place data
    let k = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - v : v;
        if (!F[y][x] && k < cw.length * 8) { M[y][x] = ((cw[k >>> 3] >>> (7 - (k & 7))) & 1) === 1; k++; }
      }
    }
    const MASKS = [
      (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
      (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
    ];
    const applyMask = (m) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!F[y][x] && MASKS[m](x, y)) M[y][x] = !M[y][x]; };
    const penalty = () => {
      let p = 0, dark = 0;
      for (let y = 0; y < size; y++) {
        for (const line of [M[y], M.map((r) => r[y])]) {
          let run = 1;
          for (let x = 1; x <= size; x++) {
            if (x < size && line[x] === line[x - 1]) run++;
            else { if (run >= 5) p += run - 2; run = 1; }
          }
          const s = line.map((c) => (c ? 1 : 0)).join("");
          p += 40 * ((s.match(/(?=10111010000|00001011101)/g) || []).length);
        }
        for (let x = 0; x < size; x++) {
          if (M[y][x]) dark++;
          if (x < size - 1 && y < size - 1 && M[y][x] === M[y][x + 1] && M[y][x] === M[y + 1][x] && M[y][x] === M[y + 1][x + 1]) p += 3;
        }
      }
      p += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
      return p;
    };
    let best = 0, bestP = Infinity;
    for (let m = 0; m < 8; m++) {
      applyMask(m); drawFormat(m);
      const p = penalty();
      if (p < bestP) { bestP = p; best = m; }
      applyMask(m);
    }
    applyMask(best); drawFormat(best);
    return M;
  }

  function svg(text, scale = 6, dark = "#041033") {
    const M = encode(text), n = M.length, q = 4, w = (n + q * 2) * scale;
    let path = "";
    M.forEach((row, y) => row.forEach((c, x) => { if (c) path += `M${(x + q) * scale},${(y + q) * scale}h${scale}v${scale}h-${scale}z`; }));
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w}" viewBox="0 0 ${w} ${w}" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="100%" height="100%" fill="#fff"/><path d="${path}" fill="${dark}"/></svg>`;
  }
  return { encode, svg };
})();
if (typeof module !== "undefined") module.exports = QR;
