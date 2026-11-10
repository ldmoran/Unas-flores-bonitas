(() => {
  const VIDEO_ID = 'NdYWuo9OFAw'; // oficial (el original bloquea el embebido)
  const $ = id => document.getElementById(id);
  const cv = $('garden'), ctx = cv.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, lastW = 0;

  function resize() {
    // Ignora cambios solo de alto (barra del navegador en el celular)
    if (innerWidth === lastW && cv.width) return;
    lastW = innerWidth;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', resize);
  resize();

  // ---------- Sprites pre-renderizados (rápido en celular) ----------
  const PALETTES = [
    ['#ff6f91', '#ffc2d1'], ['#ffffff', '#ffd6e8'], ['#ffd166', '#fff3b0'],
    ['#c77dff', '#e9c8ff'], ['#ff9770', '#ffd3b8'], ['#8ecae6', '#e3f4fb'], ['#ff4d6d', '#ffb3c1']
  ];
  const sprites = [];
  function makeSprite(kind, pal) {
    const s = 128, c = document.createElement('canvas');
    c.width = c.height = s;
    const x = c.getContext('2d');
    x.translate(s / 2, s / 2);
    const n = kind === 0 ? 8 : kind === 1 ? 5 : 14;
    for (let i = 0; i < n; i++) {
      x.save(); x.rotate(i * 2 * Math.PI / n);
      const g = x.createLinearGradient(0, 0, 0, -58);
      g.addColorStop(0, pal[1]); g.addColorStop(1, pal[0]);
      x.fillStyle = g; x.beginPath();
      if (kind === 0) x.ellipse(0, -34, 11, 26, 0, 0, 7);
      else if (kind === 1) { x.moveTo(0, 0); x.bezierCurveTo(-32, -18, -26, -60, 0, -54); x.bezierCurveTo(26, -60, 32, -18, 0, 0); }
      else x.ellipse(0, -30, 5.5, 24, 0, 0, 7);
      x.fill(); x.restore();
    }
    x.fillStyle = kind === 2 ? '#ff8fab' : '#ffcf56';
    x.beginPath(); x.arc(0, 0, kind === 1 ? 7 : 11, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,255,255,.45)';
    x.beginPath(); x.arc(-3, -3, 3.5, 0, 7); x.fill();
    return c;
  }
  PALETTES.forEach(p => { for (let k = 0; k < 3; k++) sprites.push({ kind: k, img: makeSprite(k, p) }); });
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeBack = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  // ---------- Flores ----------
  const flowers = [];
  const CAP = () => (W < 600 ? 30 : 55);
  function plant(x, y, delay = 0) {
    const alive = flowers.filter(f => !f.dieAt);
    if (alive.length >= CAP()) alive[0].dieAt = performance.now();
    flowers.push({
      x, y, sx: clamp(x + rnd(-40, 40), 0, W), lean: rnd(-50, 50),
      size: rnd(46, 92), rot: rnd(0, 6.28), phase: rnd(0, 6.28),
      born: performance.now() + delay, dur: rnd(1400, 2200),
      sp: pick(sprites), leaf: Math.random() < .7 ? (Math.random() < .5 ? 1 : -1) : 0
    });
  }
  function initialGarden() {
    // Empieza con pocas y el jardín se va llenando solo
    for (let i = 0; i < 4; i++) plant(rnd(W * .1, W * .9), rnd(H * .55, H * .9), i * 500);
  }
  let nextAuto = 0;
  function autoPlant(now) {
    if (now < nextAuto) return;
    nextAuto = now + rnd(700, 1300);
    const x = rnd(W * .05, W * .95);
    const edge = x < W * .25 || x > W * .75;
    plant(x, edge ? rnd(H * .3, H * .88) : rnd(H * .5, H * .9));
  }

  function drawFlower(f, now) {
    const g = clamp((now - f.born) / f.dur);
    if (g <= 0) return;
    let alpha = 1;
    if (f.dieAt) { alpha = 1 - (now - f.dieAt) / 1800; if (alpha <= 0) { f.gone = true; return; } }
    ctx.globalAlpha = alpha;
    const te = easeOut(clamp(g / .7));
    const sway = reduced ? 0 : Math.sin(now / 900 + f.phase) * 5 * te;
    const x0 = f.sx, y0 = H + 10, x1 = f.x + sway, y1 = f.y;
    const cx = (x0 + x1) / 2 + f.lean, cy = (y0 + y1) / 2;
    // curva cuadrática parcial hasta t = te
    const ax = x0 + (cx - x0) * te, ay = y0 + (cy - y0) * te;
    const u = 1 - te;
    const ex = u * u * x0 + 2 * u * te * cx + te * te * x1;
    const ey = u * u * y0 + 2 * u * te * cy + te * te * y1;
    ctx.strokeStyle = '#4caf6e'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(ax, ay, ex, ey); ctx.stroke();
    if (f.leaf && te > .5) {
      const m = te * .5, um = 1 - m;
      const lx = um * um * x0 + 2 * um * m * cx + m * m * x1;
      const ly = um * um * y0 + 2 * um * m * cy + m * m * y1;
      ctx.fillStyle = '#5fcf80'; ctx.beginPath();
      ctx.ellipse(lx + f.leaf * 11, ly, 13, 5, f.leaf * -.6, 0, 7); ctx.fill();
    }
    const hs = easeBack(clamp((g - .55) / .45));
    if (hs <= 0) { ctx.globalAlpha = 1; return; }
    const s = f.size * hs, a = f.rot + (reduced ? 0 : Math.sin(now / 1200 + f.phase) * .12);
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
    ctx.drawImage(f.sp.img, -s / 2, -s / 2, s, s);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // ---------- Pétalos cayendo ----------
  const petals = [];
  if (!reduced) {
    const n = W < 600 ? 16 : 28;
    for (let i = 0; i < n; i++) petals.push({
      x: rnd(0, W), y: rnd(-H, 0), v: rnd(18, 42), d: rnd(10, 30), s: rnd(14, 26),
      r: rnd(0, 6), vr: rnd(-1, 1), ph: rnd(0, 6), sp: pick(sprites.filter(s => s.kind === 1))
    });
  }
  function drawPetals(dt, now) {
    for (const p of petals) {
      p.y += p.v * dt; p.r += p.vr * dt;
      if (p.y > H + 30) { p.y = -30; p.x = rnd(0, W); }
      const x = p.x + Math.sin(now / 1500 + p.ph) * p.d;
      ctx.save(); ctx.translate(x, p.y); ctx.rotate(p.r); ctx.globalAlpha = .8;
      ctx.drawImage(p.sp.img, -p.s / 2, -p.s / 2, p.s, p.s);
      ctx.restore();
    }
  }

  // ---------- Loop ----------
  let running = false, last = 0;
  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, .05); last = now;
    ctx.clearRect(0, 0, W, H);
    autoPlant(now);
    for (const f of flowers) drawFlower(f, now);
    for (let i = flowers.length - 1; i >= 0; i--) if (flowers[i].gone) flowers.splice(i, 1);
    drawPetals(dt, now);
    requestAnimationFrame(frame);
  }
  function start() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
  let uniOpen = false;
  addEventListener('universe:open', () => { uniOpen = true; running = false; });
  addEventListener('universe:close', () => { uniOpen = false; if (started) start(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) running = false; else if (started && !uniOpen) start(); });

  cv.addEventListener('pointerdown', e => { if (started) { plant(e.clientX, e.clientY); if (navigator.vibrate) navigator.vibrate(8); } });

  // ---------- Música (YouTube) ----------
  let player = null, started = false;
  const musicBtn = $('music');
  function loadYT() {
    if (window.YT && YT.Player) return onYT();
    window.onYouTubeIframeAPIReady = onYT;
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => $('ytfallback').hidden = false;
    document.head.appendChild(s);
  }
  function onYT() {
    player = new YT.Player('yt', {
      width: '200', height: '200', videoId: VIDEO_ID,
      playerVars: { origin: location.origin, enablejsapi: 1, autoplay: 1, loop: 1, playlist: VIDEO_ID, playsinline: 1, controls: 0, rel: 0, modestbranding: 1 },
      events: {
        onReady: e => { e.target.setVolume(70); e.target.playVideo(); },
        onStateChange: e => { musicBtn.textContent = e.data === 1 ? '🔊' : '🔇'; },
        onError: e => { window.ytError = e.data; $('ytfallback').hidden = false; }
      }
    });
  }
  musicBtn.addEventListener('click', () => {
    if (!player || !player.getPlayerState) return;
    player.getPlayerState() === 1 ? player.pauseVideo() : player.playVideo();
  });

  // ---------- Flujo ----------
  $('enter').addEventListener('click', () => {
    started = true;
    $('intro').classList.add('out');
    setTimeout(() => $('intro').remove(), 900);
    $('ui').hidden = false; musicBtn.hidden = false;
    loadYT();       // dentro del gesto del usuario → el celular permite el audio
    initialGarden();
    start();
  });
  $('openLetter').addEventListener('click', () => $('letter').hidden = false);
  $('closeLetter').addEventListener('click', () => $('letter').hidden = true);
  $('letter').addEventListener('click', e => { if (e.target.id === 'letter') $('letter').hidden = true; });
})();
