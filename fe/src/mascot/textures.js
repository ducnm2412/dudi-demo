import { CanvasTexture, SRGBColorSpace } from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c) {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Mạch điện neon trên mũ. Vẽ theo toạ độ UV của SphereGeometry:
// u = 0.25 là mặt trước, v = 0 là đỉnh đầu. Chừa trống vùng mặt và đèn trên đỉnh.
export function circuitTexture() {
  const W = 2048;
  const H = 1024;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  const rand = mulberry32(11);
  // Vùng không vẽ: khung mặt, hai đèn trên đỉnh, sát đỉnh/đáy, và dải giữa lưng (vẽ tay bên dưới)
  const blocked = (u, v) => {
    const uu = ((u % 1) + 1) % 1;
    return (
      (uu > 0.1 && uu < 0.4 && v > 0.36) ||
      (uu > 0.16 && uu < 0.34 && v < 0.25) ||
      (uu > 0.63 && uu < 0.87 && v < 0.22) ||
      (uu > 0.66 && uu < 0.84) ||
      v > 0.9 ||
      v < 0.05
    );
  };

  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = '#fff';
  ctx.shadowBlur = 14;

  const line = (pts, width = 8) => {
    ctx.lineWidth = width;
    ctx.beginPath();
    pts.forEach(([pu, pv], i) => (i ? ctx.lineTo(pu * W, pv * H) : ctx.moveTo(pu * W, pv * H)));
    ctx.stroke();
  };
  const dot = (pu, pv, r = 10) => {
    ctx.beginPath();
    ctx.arc(pu * W, pv * H, r, 0, Math.PI * 2);
    ctx.fill();
  };

  for (const side of [-1, 1]) {
    // Mặt trước: các đường viền chạy vòng quanh khung mặt (đối xứng qua u = 0.25)
    const u = (d) => 0.25 + side * d;
    line([[u(0.07), 0.2], [u(0.12), 0.2], [u(0.16), 0.3], [u(0.16), 0.72], [u(0.13), 0.84]]);
    line([[u(0.08), 0.25], [u(0.11), 0.25], [u(0.14), 0.33], [u(0.14), 0.62]]);
    dot(u(0.14), 0.62);
    line([[u(0.07), 0.14], [u(0.2), 0.14], [u(0.24), 0.22], [u(0.24), 0.5]]);
    dot(u(0.24), 0.5);
    line([[u(0.19), 0.36], [u(0.21), 0.4], [u(0.21), 0.78]], 7);
    dot(u(0.21), 0.78, 8);

    // Sau gáy: hai đường dọc từ đèn phía sau chạy xuống cổ, có nhánh rẽ ngắn
    const b = (d) => 0.75 + side * d;
    line([[b(0.035), 0.2], [b(0.035), 0.34], [b(0.055), 0.4], [b(0.055), 0.86]]);
    line([[b(0.055), 0.52], [b(0.075), 0.56], [b(0.075), 0.62]], 6);
    dot(b(0.075), 0.62, 8);
    line([[b(0.055), 0.7], [b(0.03), 0.74], [b(0.03), 0.8]], 6);
    dot(b(0.03), 0.8, 8);
    line([[b(0.12), 0.1], [b(0.12), 0.3], [b(0.1), 0.36], [b(0.1), 0.66], [b(0.12), 0.72], [b(0.12), 0.88]]);
    line([[b(0.1), 0.46], [b(0.078), 0.49]], 6);
    dot(b(0.078), 0.49, 8);
  }

  // Đường mạch ngẫu nhiên ở hai bên mũ, chủ yếu chạy dọc
  const dirs = [
    [0, 1],
    [0, 1],
    [1, 1],
    [-1, 1],
    [1, 0],
    [-1, 0],
  ];

  let drawn = 0;
  for (let attempt = 0; attempt < 400 && drawn < 26; attempt++) {
    let u = rand();
    let v = 0.06 + rand() * 0.6;
    if (blocked(u, v)) continue;

    const pts = [[u, v]];
    let [du, dv] = dirs[Math.floor(rand() * dirs.length)];
    const steps = 3 + Math.floor(rand() * 4);
    let ok = true;
    for (let s = 0; s < steps; s++) {
      const len = 0.03 + rand() * 0.09;
      const nu = u + (du * len * H) / W;
      const nv = v + dv * len;
      if (blocked(nu, nv)) {
        if (s === 0) ok = false;
        break;
      }
      u = nu;
      v = nv;
      pts.push([u, v]);
      // Rẽ 45° hoặc 90° như đường mạch in
      const turn = dirs[Math.floor(rand() * dirs.length)];
      if (turn[0] !== -du || turn[1] !== -dv) [du, dv] = turn;
    }
    if (!ok || pts.length < 2) continue;

    line(pts, 6);
    const [eu, ev] = pts[pts.length - 1];
    dot(eu, ev, 8);
    drawn++;
  }

  // Cụm vạch như chip ở hai bên mũ
  for (const u0 of [0.015, 0.465, 0.585, 0.89]) {
    for (let i = 0; i < 7; i++) {
      const w = 18 + (i % 3) * 14;
      ctx.fillRect(u0 * W, (0.42 + i * 0.035) * H, w, 9);
    }
  }

  return toTexture(c);
}

// Mặt nạ hình chữ nhật bo góc (trắng = giữ lại), dùng làm alphaMap
export function roundedRectMask(w, h, r) {
  const scale = 512 / w;
  const [c, ctx] = canvas(512, Math.round(h * scale));
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(2, 2, c.width - 4, c.height - 4, r * scale);
  ctx.fill();
  const t = new CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}

// Đèn trên đỉnh mũ: các khung chữ nhật lồng nhau
export function ventTexture() {
  const [c, ctx] = canvas(256, 160);
  ctx.fillStyle = '#1e7bff';
  ctx.fillRect(0, 0, 256, 160);
  ctx.strokeStyle = '#bff3ff';
  ctx.lineWidth = 6;
  for (let i = 0; i < 4; i++) {
    const p = 14 + i * 16;
    ctx.strokeRect(p, p * 0.62, 256 - p * 2, 160 - p * 1.24);
  }
  return toTexture(c);
}

// Miếng dán "DUDI software" trên ngực trái
export function dudiPatchTexture() {
  const [c, ctx] = canvas(512, 320);
  ctx.fillStyle = '#d0121b';
  ctx.fillRect(0, 0, 512, 320);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 8;
  ctx.strokeRect(14, 14, 484, 292);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 150px Arial, sans-serif';
  ctx.fillText('DUDI', 256, 172);
  ctx.font = 'bold 78px Arial, sans-serif';
  ctx.fillText('software', 256, 262);
  return toTexture(c);
}

// Miếng dán tròn "DU" trên ngực phải
export function duPatchTexture() {
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#7a0a10';
  ctx.beginPath();
  ctx.arc(128, 128, 126, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(128, 128, 112, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d0121b';
  ctx.beginPath();
  ctx.arc(128, 128, 100, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 110px Arial, sans-serif';
  ctx.fillText('DU', 128, 136);
  return toTexture(c);
}

// Miếng dán vuông "DU" trên tay áo: nền đỏ, viền xanh navy
export function duSquarePatchTexture() {
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#1b2a55';
  ctx.beginPath();
  ctx.roundRect(0, 0, 256, 256, 28);
  ctx.fill();
  ctx.fillStyle = '#d0121b';
  ctx.beginPath();
  ctx.roundRect(18, 18, 220, 220, 18);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 6;
  ctx.strokeRect(34, 34, 188, 188);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 120px Arial, sans-serif';
  ctx.fillText('DU', 128, 136);
  return toTexture(c);
}

// Nhãn chữ nhỏ trên giày: lưỡi gà "DUDI" (nền trắng chữ đỏ) và gót "DU" (nền đỏ chữ trắng)
export function labelTexture(text, bg, fg) {
  const [c, ctx] = canvas(256, 160);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 160);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 236, 140);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${text.length > 2 ? 88 : 110}px Arial, sans-serif`;
  ctx.fillText(text, 128, 86);
  return toTexture(c);
}
