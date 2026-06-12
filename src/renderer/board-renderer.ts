import type { Board } from '../types';
import { BOARD_WIDTH, BOARD_HEIGHT, CELL_SIZE, BOARD_PADDING, COLORS } from '../constants';

export function drawBoard(ctx: CanvasRenderingContext2D, board: Board) {
  const w = BOARD_WIDTH * CELL_SIZE;
  const h = BOARD_HEIGHT * CELL_SIZE;
  const ox = BOARD_PADDING;
  const oy = BOARD_PADDING;

  // Board background with subtle gradient
  const boardGrad = ctx.createLinearGradient(ox, oy, ox + w, oy + h);
  boardGrad.addColorStop(0, '#0d2d52');
  boardGrad.addColorStop(0.5, COLORS.boardBg);
  boardGrad.addColorStop(1, '#0d2d52');
  ctx.fillStyle = boardGrad;
  ctx.fillRect(ox, oy, w, h);

  // Restriction zones with gradient
  for (let col = 0; col < BOARD_WIDTH; col++) {
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      const restriction = board.cells[col][row].restriction;
      if (restriction) {
        const x = ox + col * CELL_SIZE;
        const y = oy + (BOARD_HEIGHT - 1 - row) * CELL_SIZE;
        ctx.fillStyle = restriction === 'red' ? COLORS.redZone : COLORS.blueZone;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  // Grid lines
  ctx.strokeStyle = COLORS.gridLine;
  ctx.lineWidth = 1;
  for (let col = 0; col <= BOARD_WIDTH; col++) {
    ctx.beginPath();
    ctx.moveTo(ox + col * CELL_SIZE, oy);
    ctx.lineTo(ox + col * CELL_SIZE, oy + h);
    ctx.stroke();
  }
  for (let row = 0; row <= BOARD_HEIGHT; row++) {
    ctx.beginPath();
    ctx.moveTo(ox, oy + row * CELL_SIZE);
    ctx.lineTo(ox + w, oy + row * CELL_SIZE);
    ctx.stroke();
  }

  // Vignette overlay
  const vigGrad = ctx.createRadialGradient(
    ox + w / 2, oy + h / 2, Math.min(w, h) * 0.3,
    ox + w / 2, oy + h / 2, Math.max(w, h) * 0.75,
  );
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vigGrad.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(ox, oy, w, h);

  // Edge glow lines
  ctx.strokeStyle = 'rgba(26, 74, 122, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(ox, oy, w, h);

  // Labels
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  for (let col = 0; col < BOARD_WIDTH; col++) {
    ctx.fillText(String(col), ox + col * CELL_SIZE + CELL_SIZE / 2, oy + h + 18);
  }
  ctx.textAlign = 'right';
  for (let row = 0; row < BOARD_HEIGHT; row++) {
    const screenRow = BOARD_HEIGHT - 1 - row;
    ctx.fillText(String(row), ox - 8, oy + screenRow * CELL_SIZE + CELL_SIZE / 2 + 4);
  }
}

export function cellToScreen(col: number, row: number): { x: number; y: number } {
  return {
    x: BOARD_PADDING + col * CELL_SIZE,
    y: BOARD_PADDING + (BOARD_HEIGHT - 1 - row) * CELL_SIZE,
  };
}

export function screenToCell(screenX: number, screenY: number): { col: number; row: number } | null {
  const col = Math.floor((screenX - BOARD_PADDING) / CELL_SIZE);
  const screenRow = Math.floor((screenY - BOARD_PADDING) / CELL_SIZE);
  const row = BOARD_HEIGHT - 1 - screenRow;
  if (col < 0 || col >= BOARD_WIDTH || row < 0 || row >= BOARD_HEIGHT) return null;
  return { col, row };
}

export function drawValidMoves(ctx: CanvasRenderingContext2D, positions: { col: number; row: number }[]) {
  for (const pos of positions) {
    const { x, y } = cellToScreen(pos.col, pos.row);
    ctx.fillStyle = COLORS.validMove;
    ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    // Dot in center
    ctx.fillStyle = 'rgba(0, 184, 148, 0.6)';
    ctx.beginPath();
    ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawSelection(ctx: CanvasRenderingContext2D, col: number, row: number, pulse = 0) {
  const { x, y } = cellToScreen(col, row);
  const alpha = 0.7 + Math.sin(pulse * 4) * 0.3;
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = 'rgba(255,255,255,0.5)';
  ctx.shadowBlur = 8;
  ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
  ctx.shadowBlur = 0;
}

export function getCanvasSize(): { width: number; height: number } {
  return {
    width: BOARD_WIDTH * CELL_SIZE + BOARD_PADDING * 2,
    height: BOARD_HEIGHT * CELL_SIZE + BOARD_PADDING * 2,
  };
}

export function drawSwapTargets(ctx: CanvasRenderingContext2D, positions: { col: number; row: number }[]) {
  for (const pos of positions) {
    const { x, y } = cellToScreen(pos.col, pos.row);
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(218,165,32,0.4)';
    ctx.shadowBlur = 6;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
  }
}
