/**
 * Ultra-lightweight, zero-dependency physics canvas confetti.
 * Triggers a celebratory particle explosion (e.g. when a deal is won).
 */
export function triggerConfetti() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "999999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const colors = [
    "#10b981", // emerald
    "#3b82f6", // blue
    "#f59e0b", // amber
    "#ec4899", // pink
    "#8b5cf6", // violet
    "#06b6d4", // cyan
    "#f97316", // orange
  ];

  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    w: number;
    h: number;
    rotation: number;
    rotationSpeed: number;
    color: string;
    opacity: number;
    decay: number;
  }

  const particles: Particle[] = [];
  const count = 120;
  // Spawn from center-bottom or middle screen
  const startX = width / 2;
  const startY = height * 0.45;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 12 + 6;
    particles.push({
      x: startX + (Math.random() - 0.5) * 80,
      y: startY + (Math.random() - 0.5) * 60,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 6, // upward burst
      w: Math.random() * 8 + 6,
      h: Math.random() * 5 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      color: colors[Math.floor(Math.random() * colors.length)] ?? "#10b981",
      opacity: 1,
      decay: Math.random() * 0.012 + 0.008,
    });
  }

  const gravity = 0.35;
  const drag = 0.96;
  let animId: number;

  function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    let alive = false;
    for (const p of particles) {
      if (p.opacity <= 0) continue;
      alive = true;

      p.x += p.vx;
      p.y += p.vy;
      p.vy += gravity;
      p.vx *= drag;
      p.vy *= drag;
      p.rotation += p.rotationSpeed;
      p.opacity -= p.decay;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (alive) {
      animId = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animId);
      canvas.remove();
    }
  }

  animId = requestAnimationFrame(render);

  // Safety fallback cleanup
  setTimeout(() => {
    cancelAnimationFrame(animId);
    if (canvas.parentNode) canvas.remove();
  }, 4000);
}
