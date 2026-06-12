import type { Player } from '../types';
import { COLORS } from '../constants';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface Explosion {
  particles: Particle[];
  startTime: number;
  isKing: boolean;
  flashAlpha: number;
}

const PARTICLE_COLORS_RED = ['#e94560', '#ff7b93', '#ffe66d', '#ffffff', '#ff4466'];
const PARTICLE_COLORS_BLUE = ['#00d4ff', '#66e5ff', '#ffe66d', '#ffffff', '#44aaff'];

let activeExplosions: Explosion[] = [];

export function triggerExplosion(screenX: number, screenY: number, owner: Player, isKing: boolean) {
  const colors = owner === 'red' ? PARTICLE_COLORS_RED : PARTICLE_COLORS_BLUE;
  const count = isKing ? 45 : 20;
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (isKing ? 120 : 80) * (0.3 + Math.random() * 0.7);
    const life = isKing ? 0.8 + Math.random() * 0.4 : 0.4 + Math.random() * 0.3;
    particles.push({
      x: screenX + (Math.random() - 0.5) * 10,
      y: screenY + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: isKing ? 2 + Math.random() * 4 : 1.5 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }

  activeExplosions.push({
    particles,
    startTime: performance.now(),
    isKing,
    flashAlpha: isKing ? 0.6 : 0,
  });
}

export function updateAndDrawExplosions(ctx: CanvasRenderingContext2D, dt: number): boolean {
  if (activeExplosions.length === 0) return false;

  let anyActive = false;

  for (const explosion of activeExplosions) {
    if (explosion.flashAlpha > 0) {
      ctx.fillStyle = `rgba(255,255,255,${explosion.flashAlpha})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      explosion.flashAlpha = Math.max(0, explosion.flashAlpha - dt * 2);
    }

    let hasLive = false;
    for (const p of explosion.particles) {
      if (p.life <= 0) continue;
      hasLive = true;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 150 * dt;
      p.vx *= 0.98;
      p.life -= dt;

      const alpha = Math.max(0, p.life / p.maxLife);
      const size = p.size * (0.5 + alpha * 0.5);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = size * 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    if (hasLive || explosion.flashAlpha > 0) anyActive = true;
  }

  activeExplosions = activeExplosions.filter(e =>
    e.particles.some(p => p.life > 0) || e.flashAlpha > 0
  );

  return anyActive;
}

export function clearExplosions() {
  activeExplosions = [];
}

export function hasActiveExplosions(): boolean {
  return activeExplosions.length > 0;
}
