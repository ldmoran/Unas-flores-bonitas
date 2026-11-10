(() => {
  // Un universo que se va formando solo: nebulosa, estrellas, galaxia y constelación.
  const $ = id => document.getElementById(id);
  const sec = $('universe'), cv = $('ucv'), ctx = cv.getContext('2d');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  // Estrellas brillantes (posiciones relativas a la pantalla) unidas en una constelación
  const BRIGHT = [[.2, .27], [.46, .33], [.75, .23], [.85, .45], [.67, .62], [.3, .6], [.12, .5], [.18, .73], [.79, .73]]
    .map(([nx, ny], i) => ({ nx, ny, birth: 3 + i * 1.1, ph: rnd(0, 6) }));

  let W, H, bg = [], galaxy = [], shoots = [], taps = [];
  let running = false, t0 = 0, nextShoot = 0;

  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const R = Math.hypot(W, H) / 2, small = W < 600;
    bg = Array.from({ length: small ? 120 : 220 }, () => ({
      x: rnd(-R, R), y: rnd(-R, R), r: rnd(.4, 1.5), tw: rnd(0, 6), sp: rnd(.6, 2.2), birth: 1 + rnd(0, 10)
    }));
    // Galaxia espiral de 2 brazos
    const Rmax = Math.min(W * .46, 190), n = small ? 260 : 420;
    galaxy = Array.from({ length: n }, (_, i) => {
      const r = 6 + Math.pow(Math.random(), .8) * Rmax;
      const arm = i % 2 ? Math.PI : 0;
      return {
        r, a: arm + r * .028 + rnd(-.35, .35), s: rnd(.7, 2),
        birth: 2 + (r / Rmax) * 8 + rnd(0, 1),
        c: r < Rmax * .3 ? '#ffe2b0' : r < Rmax * .65 ? '#ffb3d1' : '#a9c4ff'
      };
    });
  }

  function glow(c1, c2) {
    const s = 64, c = document.createElement('canvas'); c.width = c.height = s;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, '#fff'); g.addColorStop(.14, c1); g.addColorStop(.4, c2); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s); return c;
  }
  const gBlue = glow('rgba(205,228,255,1)', 'rgba(110,150,255,.35)');
  const gPink = glow('rgba(255,214,232,1)', 'rgba(255,110,165,.4)');
  const pos = s => ({ x: s.nx * W, y: s.ny * H });

  function frame(now) {
    if (!running) return;
    const t = (now - t0) / 1000;
    const we = Math.pow(Math.max(0, 1 - t / 1.7), 2);   // salto warp de entrada
    ctx.clearRect(0, 0, W, H);

    // Estrellas de fondo, aparecen poco a poco
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(t * .006);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff';
    for (const s of bg) {
      const b = clamp((t - s.birth) / 1.2);
      if (b <= 0 && we < .02) continue;
      ctx.globalAlpha = (we > .02 ? .8 : b) * (.45 + .5 * Math.sin(t * s.sp + s.tw) ** 2);
      if (we > .02) {
        ctx.lineWidth = s.r; ctx.beginPath(); ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x * (1 - .55 * we), s.y * (1 - .55 * we)); ctx.stroke();
      } else ctx.fillRect(s.x, s.y, s.r * 1.6 * (.5 + b / 2), s.r * 1.6 * (.5 + b / 2));
    }
    ctx.restore();

    // Galaxia que se va formando desde el centro
    const cx = W / 2, cy = H * .52;
    const coreA = clamp((t - 1.6) / 4);
    if (coreA > 0) {
      ctx.globalAlpha = coreA * .9; const cs = 150 + Math.sin(t) * 6;
      ctx.drawImage(gPink, cx - cs / 2, cy - cs / 2, cs, cs);
    }
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.35);
    const spin = t * .035;
    for (const p of galaxy) {
      const b = clamp((t - p.birth) / 1.2);
      if (b <= 0) continue;
      const a = p.a + spin;
      ctx.globalAlpha = b * .85; ctx.fillStyle = p.c;
      ctx.fillRect(Math.cos(a) * p.r, Math.sin(a) * p.r * .42, p.s, p.s);
    }
    ctx.restore();

    // Constelación: las estrellas aparecen y se van uniendo
    ctx.lineWidth = 1;
    for (let i = 0; i < BRIGHT.length; i++) {
      const s = BRIGHT[i], b = clamp((t - s.birth) / 1.5);
      if (b <= 0) continue;
      const p = pos(s);
      if (i > 0) {
        const q = pos(BRIGHT[i - 1]), k = easeOut(clamp((t - s.birth) / 1.4));
        ctx.globalAlpha = .45; ctx.strokeStyle = 'rgba(255,200,225,1)';
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + (p.x - q.x) * k, q.y + (p.y - q.y) * k); ctx.stroke();
      }
      const sz = 56 * easeOut(b) * (1 + .16 * Math.sin(t * 2 + s.ph));
      ctx.globalAlpha = 1;
      ctx.drawImage(i % 3 === 1 ? gPink : gBlue, p.x - sz / 2, p.y - sz / 2, sz, sz);
    }

    // Estrellas fugaces
    if (t > 6 && now > nextShoot) {
      nextShoot = now + rnd(2500, 5500);
      shoots.push({ x: rnd(W * .2, W), y: rnd(0, H * .4), born: now, vx: -rnd(380, 560), vy: rnd(160, 260) });
    }
    for (let i = shoots.length - 1; i >= 0; i--) {
      const s = shoots[i], k = (now - s.born) / 900;
      if (k >= 1) { shoots.splice(i, 1); continue; }
      const x = s.x + s.vx * k, y = s.y + s.vy * k;
      const g = ctx.createLinearGradient(x, y, x - s.vx * .12, y - s.vy * .12);
      g.addColorStop(0, 'rgba(255,255,255,' + (1 - k) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - s.vx * .12, y - s.vy * .12); ctx.stroke();
    }

    // Estrellas que nacen donde ella toca
    for (let i = taps.length - 1; i >= 0; i--) {
      const s = taps[i], k = (now - s.born) / 1000;
      if (k > 6) { taps.splice(i, 1); continue; }
      const a = k < 1 ? easeOut(k) : 1 - (k - 1) / 5, sz = 50 * easeOut(clamp(k)) * (1 + .1 * Math.sin(k * 8));
      ctx.globalAlpha = Math.max(0, a); ctx.drawImage(gPink, s.x - sz / 2, s.y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  cv.addEventListener('pointerdown', e => {
    if (!running) return;
    if (taps.length > 20) taps.shift();
    taps.push({ x: e.clientX, y: e.clientY, born: performance.now() });
    if (navigator.vibrate) navigator.vibrate(8);
  });

  function open() {
    size(); shoots = []; taps = [];
    sec.hidden = false; sec.classList.remove('play'); void sec.offsetWidth; sec.classList.add('play');
    dispatchEvent(new Event('universe:open'));
    running = true; t0 = performance.now(); nextShoot = t0 + 6000; requestAnimationFrame(frame);
  }
  function close() {
    running = false; sec.hidden = true;
    dispatchEvent(new Event('universe:close'));
  }
  $('openUniverse').addEventListener('click', open);
  $('uBack').addEventListener('click', close);
  addEventListener('resize', () => { if (running) size(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) running = false;
    else if (!sec.hidden && !running) { running = true; requestAnimationFrame(frame); }
  });
})();
