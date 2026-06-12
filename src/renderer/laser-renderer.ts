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

export function drawLaser(ctx: CanvasRenderingContext2D, laser: LaserResult) {
  if (laser.segments.length === 0) return;

  for (const seg of laser.segments) {
    const from = toScreenXY(seg.from.col, seg.from.row);
    const toPos = seg.to;
    const clamped = clampToEdge(toPos.col, toPos.row);
    const to = toScreenXY(clamped.col, clamped.row);

    ctx.strokeStyle = COLORS.laserGlow;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.sx, from.sy);
    ctx.lineTo(to.sx, to.sy);
    ctx.stroke();

    ctx.strokeStyle = COLORS.laser;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(from.sx, from.sy);
    ctx.lineTo(to.sx, to.sy);
    ctx.stroke();
  }

  if (laser.destroyedPieceIds.length > 0) {
    const lastSeg = laser.segments[laser.segments.length - 1];
    const hit = toScreenXY(
      Math.max(0, Math.min(lastSeg.to.col, BOARD_WIDTH - 1)),
      Math.max(0, Math.min(lastSeg.to.row, BOARD_HEIGHT - 1)),
    );

    ctx.fillStyle = 'rgba(255, 68, 68, 0.3)';
    ctx.beginPath();
    ctx.arc(hit.sx, hit.sy, CELL_SIZE * 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 68, 68, 0.15)';
    ctx.beginPath();
    ctx.arc(hit.sx, hit.sy, CELL_SIZE, 0, Math.PI * 2);
    ctx.fill();
  }
}
