import type { LaserResult } from '../types';
import { CELL_SIZE, BOARD_PADDING, BOARD_HEIGHT, BOARD_WIDTH, COLORS } from '../constants';

function toScreenXY(col: number, row: number): { sx: number; sy: number } {
  return {
    sx: BOARD_PADDING + col * CELL_SIZE + CELL_SIZE / 2,
    sy: BOARD_PADDING + (BOARD_HEIGHT - 1 - row) * CELL_SIZE + CELL_SIZE / 2,
  };
}

function clampToEdge(col: number, row: number): { col: number; row: number } {
  return {
    col: Math.max(-0.6, Math.min(col, BOARD_WIDTH - 1 + 0.6)),
    row: Math.max(-0.6, Math.min(row, BOARD_HEIGHT - 1 + 0.6)),
  };
}

export interface LaserAnimState {
  laser: LaserResult;
  startTime: number;
  phase: 'beam' | 'hold' | 'fade';
}

const BEAM_SPEED = 18;
const HOLD_DURATION = 800;
const FADE_DURATION = 400;

export function getLaserAnimDuration(laser: LaserResult): number {
  const beamTime = laser.segments.length / BEAM_SPEED * 1000;
  return beamTime + HOLD_DURATION + FADE_DURATION;
}

export function drawLaserAnimated(ctx: CanvasRenderingContext2D, anim: LaserAnimState): boolean {
  const elapsed = performance.now() - anim.startTime;
  const segCount = anim.laser.segments.length;
  if (segCount === 0) return false;

  const beamTimeMs = segCount / BEAM_SPEED * 1000;
  let segsToDraw: number;
  let globalAlpha = 1;
  let isActive = true;

  if (elapsed < beamTimeMs) {
    segsToDraw = Math.floor((elapsed / beamTimeMs) * segCount) + 1;
    segsToDraw = Math.min(segsToDraw, segCount);
  } else if (elapsed < beamTimeMs + HOLD_DURATION) {
    segsToDraw = segCount;
  } else if (elapsed < beamTimeMs + HOLD_DURATION + FADE_DURATION) {
    segsToDraw = segCount;
    const fadeProgress = (elapsed - beamTimeMs - HOLD_DURATION) / FADE_DURATION;
    globalAlpha = 1 - fadeProgress;
  } else {
    return false;
  }

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  for (let i = 0; i < segsToDraw && i < segCount; i++) {
    const seg = anim.laser.segments[i];
    const from = toScreenXY(seg.from.col, seg.from.row);
    const toClamped = clampToEdge(seg.to.col, seg.to.row);
    const to = toScreenXY(toClamped.col, toClamped.row);

    // Outer glow
    ctx.strokeStyle = 'rgba(255, 230, 109, 0.25)';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.sx, from.sy);
    ctx.lineTo(to.sx, to.sy);
    ctx.stroke();

    // Mid glow
    ctx.strokeStyle = 'rgba(255, 230, 109, 0.5)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(from.sx, from.sy);
    ctx.lineTo(to.sx, to.sy);
    ctx.stroke();

    // Core beam
    ctx.strokeStyle = COLORS.laser;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(from.sx, from.sy);
    ctx.lineTo(to.sx, to.sy);
    ctx.stroke();

    // White hot center
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(from.sx, from.sy);
    ctx.lineTo(to.sx, to.sy);
    ctx.stroke();
  }

  // Reflection sparkles at beam turns
  for (let i = 1; i < segsToDraw && i < segCount; i++) {
    const seg = anim.laser.segments[i];
    const prev = anim.laser.segments[i - 1];
    if (seg.from.col === prev.to.col && seg.from.row === prev.to.row) {
      const pt = toScreenXY(seg.from.col, seg.from.row);
      const sparkleSize = 6 + Math.sin(elapsed * 0.01 + i) * 2;

      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.shadowColor = '#ffe66d';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(pt.sx, pt.sy, sparkleSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Cross sparkle
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      const s = sparkleSize * 1.5;
      ctx.beginPath();
      ctx.moveTo(pt.sx - s, pt.sy); ctx.lineTo(pt.sx + s, pt.sy);
      ctx.moveTo(pt.sx, pt.sy - s); ctx.lineTo(pt.sx, pt.sy + s);
      ctx.stroke();
    }
  }

  // Beam head sparkle (during beam phase)
  if (elapsed < beamTimeMs && segsToDraw > 0) {
    const headSeg = anim.laser.segments[segsToDraw - 1];
    const headClamped = clampToEdge(headSeg.to.col, headSeg.to.row);
    const head = toScreenXY(headClamped.col, headClamped.row);

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(head.sx, head.sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Destruction impact
  if (anim.laser.destroyedPieceIds.length > 0 && segsToDraw >= segCount) {
    const lastSeg = anim.laser.segments[segCount - 1];
    const hitClamped = clampToEdge(
      Math.max(0, Math.min(lastSeg.to.col, BOARD_WIDTH - 1)),
      Math.max(0, Math.min(lastSeg.to.row, BOARD_HEIGHT - 1)),
    );
    const hit = toScreenXY(hitClamped.col, hitClamped.row);

    ctx.fillStyle = `rgba(255, 68, 68, ${0.3 * globalAlpha})`;
    ctx.beginPath();
    ctx.arc(hit.sx, hit.sy, CELL_SIZE * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  return isActive;
}
