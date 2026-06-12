import type { Board, Piece } from '../types';
import { CELL_SIZE, COLORS } from '../constants';
import { cellToScreen } from './board-renderer';

const PAD = 6;
const INNER = CELL_SIZE - PAD * 2;

export interface PieceAnimOverride {
  screenX?: number;
  screenY?: number;
  rotationRad?: number;
}

function ownerColor(piece: Piece): string {
  return piece.owner === 'red' ? COLORS.red : COLORS.blue;
}

function ownerColorDark(piece: Piece): string {
  return piece.owner === 'red' ? COLORS.redDark : COLORS.blueDark;
}

export function drawPieces(
  ctx: CanvasRenderingContext2D,
  board: Board,
  overrides?: Map<string, PieceAnimOverride>,
) {
  for (const piece of board.pieces) {
    const override = overrides?.get(piece.id);
    drawPiece(ctx, piece, override);
  }
}

function drawPiece(ctx: CanvasRenderingContext2D, piece: Piece, override?: PieceAnimOverride) {
  const basePos = cellToScreen(piece.position.col, piece.position.row);
  const x = override?.screenX ?? basePos.x;
  const y = override?.screenY ?? basePos.y;
  const cx = x + CELL_SIZE / 2;
  const cy = y + CELL_SIZE / 2;
  const left = x + PAD;
  const top = y + PAD;

  ctx.save();

  if (override?.rotationRad) {
    ctx.translate(cx, cy);
    ctx.rotate(override.rotationRad);
    ctx.translate(-cx, -cy);
  }

  ctx.fillStyle = ownerColor(piece);
  ctx.strokeStyle = ownerColorDark(piece);
  ctx.lineWidth = 1.5;

  switch (piece.type) {
    case 'sphinx':
      drawSphinx(ctx, left, top, cx, cy, piece);
      break;
    case 'king':
      drawKing(ctx, left, top, cx, cy, piece);
      break;
    case 'pyramid':
      drawPyramid(ctx, left, top, cx, cy, piece);
      break;
    case 'scarab':
      drawScarab(ctx, left, top, cx, cy, piece);
      break;
    case 'anubis':
      drawAnubis(ctx, left, top, cx, cy, piece);
      break;
  }

  ctx.restore();
}

// Sphinx: deg 0=N, 90=E, 180=S, 270=W — arrow points in firing direction
function drawSphinx(ctx: CanvasRenderingContext2D, left: number, top: number, cx: number, cy: number, piece: Piece) {
  roundRect(ctx, left, top, INNER, INNER, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = COLORS.crown;
  const a = INNER * 0.35;
  ctx.beginPath();
  if (piece.deg === 90) {       // E
    ctx.moveTo(cx + a, cy); ctx.lineTo(cx - a * 0.5, cy - a * 0.7); ctx.lineTo(cx - a * 0.5, cy + a * 0.7);
  } else if (piece.deg === 270) { // W
    ctx.moveTo(cx - a, cy); ctx.lineTo(cx + a * 0.5, cy - a * 0.7); ctx.lineTo(cx + a * 0.5, cy + a * 0.7);
  } else if (piece.deg === 0) {   // N
    ctx.moveTo(cx, cy - a); ctx.lineTo(cx - a * 0.7, cy + a * 0.5); ctx.lineTo(cx + a * 0.7, cy + a * 0.5);
  } else {                         // S (180)
    ctx.moveTo(cx, cy + a); ctx.lineTo(cx - a * 0.7, cy - a * 0.5); ctx.lineTo(cx + a * 0.7, cy - a * 0.5);
  }
  ctx.closePath();
  ctx.fill();
}

function drawKing(ctx: CanvasRenderingContext2D, left: number, top: number, cx: number, cy: number, _piece: Piece) {
  roundRect(ctx, left, top, INNER, INNER, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = COLORS.crown;
  const s = INNER * 0.2;
  ctx.beginPath();
  ctx.moveTo(cx - s * 1.5, cy + s * 0.5);
  ctx.lineTo(cx - s, cy - s * 0.8);
  ctx.lineTo(cx - s * 0.3, cy + s * 0.1);
  ctx.lineTo(cx, cy - s * 1.5);
  ctx.lineTo(cx + s * 0.3, cy + s * 0.1);
  ctx.lineTo(cx + s, cy - s * 0.8);
  ctx.lineTo(cx + s * 1.5, cy + s * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(cx - s * 1.5, cy + s * 0.5, s * 3, s * 0.5);
}

// Pyramid drawing based on deg:
//   0°  (◣) normal ↗ NE, solid SW, draw line perpendicular to normal = ╱
//   90° (◢) normal ↖ NW, solid SE, draw line = ╲
//   180°(◤) normal ↘ SE, solid NW, draw line = ╲
//   270°(◥) normal ↙ SW, solid NE, draw line = ╱
function drawPyramid(ctx: CanvasRenderingContext2D, left: number, top: number, cx: number, cy: number, piece: Piece) {
  const l = left;
  const t = top;
  const r = left + INNER;
  const b = top + INNER;

  // deg 0 (◣) → ╲,  deg 90 (◢) → ╱,  deg 180 → ╲,  deg 270 → ╱
  const isSlash = piece.deg === 90 || piece.deg === 270;  // ╱

  const triNW: [number, number][] = [[l, t], [r, t], [l, b]];
  const triSE: [number, number][] = [[r, t], [r, b], [l, b]];
  const triNE: [number, number][] = [[l, t], [r, t], [r, b]];
  const triSW: [number, number][] = [[l, t], [l, b], [r, b]];

  // CW rotation order: 0(SW) → 90(SE) → 180(NE) → 270(NW)
  let solidTri: [number, number][];
  let emptyTri: [number, number][];

  switch (piece.deg) {
    case 0:   solidTri = triSW; emptyTri = triNE; break;  // ╲ line, solid SW
    case 90:  solidTri = triSE; emptyTri = triNW; break;  // ╱ line, solid SE
    case 180: solidTri = triNE; emptyTri = triSW; break;  // ╲ line, solid NE
    case 270: solidTri = triNW; emptyTri = triSE; break;  // ╱ line, solid NW
    default:  solidTri = triSW; emptyTri = triNE;
  }

  // Empty side (dark)
  ctx.fillStyle = '#1a1a2e';
  ctx.globalAlpha = 0.6;
  fillTriangle(ctx, emptyTri);
  ctx.globalAlpha = 1;

  // Solid side (bright, reflective)
  ctx.fillStyle = piece.owner === 'red' ? '#ff8fa3' : '#7df3ff';
  ctx.globalAlpha = 0.5;
  fillTriangle(ctx, solidTri);
  ctx.globalAlpha = 1;

  // Border
  ctx.strokeStyle = ownerColorDark(piece);
  ctx.lineWidth = 1.5;
  roundRect(ctx, left, top, INNER, INNER, 4);
  ctx.stroke();

  // Diagonal mirror line (thick, glowing)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.5;
  ctx.shadowColor = COLORS.mirror;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  if (isSlash) {
    ctx.moveTo(r, t); ctx.lineTo(l, b);  // ╱
  } else {
    ctx.moveTo(l, t); ctx.lineTo(r, b);  // ╲
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// Scarab: double mirror, deg 0/180 = ╱, deg 90/270 = ╲
function drawScarab(ctx: CanvasRenderingContext2D, left: number, top: number, cx: number, cy: number, piece: Piece) {
  ctx.fillStyle = ownerColor(piece);
  roundRect(ctx, left, top, INNER, INNER, 4);
  ctx.fill();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  ctx.stroke();

  const l = left;
  const t = top;
  const r = left + INNER;
  const b = top + INNER;
  // Scarab: 0/180 = ╲, 90/270 = ╱ (same diagonal convention as pyramid)
  const scarabSlash = piece.deg === 90 || piece.deg === 270;

  ctx.strokeStyle = COLORS.mirror;
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (scarabSlash) {
    ctx.moveTo(r, t); ctx.lineTo(l, b);  // ╱
  } else {
    ctx.moveTo(l, t); ctx.lineTo(r, b);  // ╲
  }
  ctx.stroke();

  ctx.fillStyle = COLORS.crown;
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', cx, cy);
}

// Anubis: deg 0=shield N, 90=E, 180=S, 270=W
function drawAnubis(ctx: CanvasRenderingContext2D, left: number, top: number, cx: number, cy: number, piece: Piece) {
  roundRect(ctx, left, top, INNER, INNER, 4);
  ctx.fill();
  ctx.stroke();

  const shieldThickness = 6;
  ctx.fillStyle = COLORS.shield;
  if (piece.deg === 0) {        // N — top edge (screen top since row 0 = screen bottom)
    ctx.fillRect(left + 2, top, INNER - 4, shieldThickness);
  } else if (piece.deg === 180) { // S
    ctx.fillRect(left + 2, top + INNER - shieldThickness, INNER - 4, shieldThickness);
  } else if (piece.deg === 90) {  // E
    ctx.fillRect(left + INNER - shieldThickness, top + 2, shieldThickness, INNER - 4);
  } else {                         // W (270)
    ctx.fillRect(left, top + 2, shieldThickness, INNER - 4);
  }

  ctx.fillStyle = '#1a1a2e';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A', cx, cy);
}

function fillTriangle(ctx: CanvasRenderingContext2D, points: [number, number][]) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
  ctx.fill();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
