import type { Board, Piece } from '../types';
import { CELL_SIZE, COLORS } from '../constants';
import { cellToScreen } from './board-renderer';

const PAD = 6;
const INNER = CELL_SIZE - PAD * 2;
const HALF = INNER / 2;

export interface PieceAnimOverride {
  screenX?: number;
  screenY?: number;
  rotationRad?: number;
}

function ownerColors(piece: Piece) {
  if (piece.owner === 'red') {
    return { main: '#e94560', dark: '#c81d4e', light: '#ff7b93', glow: 'rgba(233,69,96,0.4)', mirror: '#ffb3c1' };
  }
  return { main: '#00d4ff', dark: '#0984e3', light: '#66e5ff', glow: 'rgba(0,212,255,0.4)', mirror: '#a3f0ff' };
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

  switch (piece.type) {
    case 'sphinx':  drawSphinx(ctx, left, top, cx, cy, piece); break;
    case 'king':    drawKing(ctx, left, top, cx, cy, piece); break;
    case 'pyramid': drawPyramid(ctx, left, top, cx, cy, piece); break;
    case 'scarab':  drawScarab(ctx, left, top, cx, cy, piece); break;
    case 'anubis':  drawAnubis(ctx, left, top, cx, cy, piece); break;
  }

  ctx.restore();
}

function pieceGradient(ctx: CanvasRenderingContext2D, cx: number, cy: number, colors: ReturnType<typeof ownerColors>) {
  const g = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, HALF * 1.2);
  g.addColorStop(0, colors.light);
  g.addColorStop(0.5, colors.main);
  g.addColorStop(1, colors.dark);
  return g;
}

function drawPieceShadow(ctx: CanvasRenderingContext2D, left: number, top: number) {
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = 'rgba(0,0,0,0.01)';
  roundRect(ctx, left, top, INNER, INNER, 6);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function drawPieceBase(ctx: CanvasRenderingContext2D, left: number, top: number, cx: number, cy: number, piece: Piece) {
  const colors = ownerColors(piece);
  drawPieceShadow(ctx, left, top);
  ctx.fillStyle = pieceGradient(ctx, cx, cy, colors);
  roundRect(ctx, left, top, INNER, INNER, 6);
  ctx.fill();
  ctx.strokeStyle = colors.dark;
  ctx.lineWidth = 1.5;
  roundRect(ctx, left, top, INNER, INNER, 6);
  ctx.stroke();
  // Inner highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  roundRect(ctx, left + 1, top + 1, INNER - 2, INNER - 2, 5);
  ctx.stroke();
}

// === SPHINX ===
function drawSphinx(ctx: CanvasRenderingContext2D, left: number, top: number, cx: number, cy: number, piece: Piece) {
  drawPieceBase(ctx, left, top, cx, cy, piece);

  // Laser emitter glow
  ctx.shadowColor = COLORS.laser;
  ctx.shadowBlur = 10;
  ctx.fillStyle = COLORS.crown;
  const a = INNER * 0.3;
  ctx.beginPath();
  if (piece.deg === 90) {
    ctx.moveTo(cx + a, cy); ctx.lineTo(cx - a * 0.4, cy - a * 0.65); ctx.lineTo(cx - a * 0.4, cy + a * 0.65);
  } else if (piece.deg === 270) {
    ctx.moveTo(cx - a, cy); ctx.lineTo(cx + a * 0.4, cy - a * 0.65); ctx.lineTo(cx + a * 0.4, cy + a * 0.65);
  } else if (piece.deg === 0) {
    ctx.moveTo(cx, cy - a); ctx.lineTo(cx - a * 0.65, cy + a * 0.4); ctx.lineTo(cx + a * 0.65, cy + a * 0.4);
  } else {
    ctx.moveTo(cx, cy + a); ctx.lineTo(cx - a * 0.65, cy - a * 0.4); ctx.lineTo(cx + a * 0.65, cy - a * 0.4);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Small laser dot
  const dotDist = a * 0.7;
  let dx = 0, dy = 0;
  if (piece.deg === 0) dy = -dotDist;
  else if (piece.deg === 90) dx = dotDist;
  else if (piece.deg === 180) dy = dotDist;
  else dx = -dotDist;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx + dx, cy + dy, 2, 0, Math.PI * 2);
  ctx.fill();
}

// === KING ===
function drawKing(ctx: CanvasRenderingContext2D, left: number, top: number, cx: number, cy: number, piece: Piece) {
  // King glow aura
  const colors = ownerColors(piece);
  ctx.shadowColor = colors.glow;
  ctx.shadowBlur = 14;
  drawPieceBase(ctx, left, top, cx, cy, piece);
  ctx.shadowBlur = 0;

  // Crown
  ctx.fillStyle = COLORS.crown;
  ctx.shadowColor = 'rgba(255,230,109,0.6)';
  ctx.shadowBlur = 6;
  const s = INNER * 0.18;
  ctx.beginPath();
  ctx.moveTo(cx - s * 1.7, cy + s * 0.6);
  ctx.lineTo(cx - s * 1.2, cy - s * 0.6);
  ctx.lineTo(cx - s * 0.4, cy + s * 0.2);
  ctx.lineTo(cx, cy - s * 1.5);
  ctx.lineTo(cx + s * 0.4, cy + s * 0.2);
  ctx.lineTo(cx + s * 1.2, cy - s * 0.6);
  ctx.lineTo(cx + s * 1.7, cy + s * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(cx - s * 1.7, cy + s * 0.6, s * 3.4, s * 0.5);
  ctx.shadowBlur = 0;

  // Gem on crown
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx, cy - s * 1.2, 2, 0, Math.PI * 2);
  ctx.fill();
}

// === PYRAMID ===
function drawPyramid(ctx: CanvasRenderingContext2D, left: number, top: number, _cx: number, _cy: number, piece: Piece) {
  const l = left, t = top, r = left + INNER, b = top + INNER;
  const colors = ownerColors(piece);
  const isSlash = piece.deg === 90 || piece.deg === 270;

  const triNW: [number, number][] = [[l, t], [r, t], [l, b]];
  const triSE: [number, number][] = [[r, t], [r, b], [l, b]];
  const triNE: [number, number][] = [[l, t], [r, t], [r, b]];
  const triSW: [number, number][] = [[l, t], [l, b], [r, b]];

  let solidTri: [number, number][], emptyTri: [number, number][];
  switch (piece.deg) {
    case 0:   solidTri = triSW; emptyTri = triNE; break;
    case 90:  solidTri = triSE; emptyTri = triNW; break;
    case 180: solidTri = triNE; emptyTri = triSW; break;
    case 270: solidTri = triNW; emptyTri = triSE; break;
    default:  solidTri = triSW; emptyTri = triNE;
  }

  drawPieceShadow(ctx, left, top);

  // Dark (vulnerable) side
  ctx.fillStyle = '#0d1525';
  ctx.globalAlpha = 0.75;
  fillTriangle(ctx, emptyTri);
  ctx.globalAlpha = 1;

  // Bright (reflective) side with gradient
  const mirrorGrad = ctx.createLinearGradient(l, t, r, b);
  mirrorGrad.addColorStop(0, colors.mirror);
  mirrorGrad.addColorStop(0.5, colors.light);
  mirrorGrad.addColorStop(1, colors.main);
  ctx.fillStyle = mirrorGrad;
  ctx.globalAlpha = 0.6;
  fillTriangle(ctx, solidTri);
  ctx.globalAlpha = 1;

  // Border
  ctx.strokeStyle = colors.dark;
  ctx.lineWidth = 1.5;
  roundRect(ctx, left, top, INNER, INNER, 6);
  ctx.stroke();

  // Mirror line with strong glow
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#c0e0ff';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  if (isSlash) {
    ctx.moveTo(r, t); ctx.lineTo(l, b);
  } else {
    ctx.moveTo(l, t); ctx.lineTo(r, b);
  }
  ctx.stroke();
  // Second pass for extra brightness
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// === SCARAB ===
function drawScarab(ctx: CanvasRenderingContext2D, left: number, top: number, cx: number, cy: number, piece: Piece) {
  const colors = ownerColors(piece);
  const l = left, t = top, r = left + INNER, b = top + INNER;
  const scarabSlash = piece.deg === 90 || piece.deg === 270;

  drawPieceShadow(ctx, left, top);

  ctx.fillStyle = pieceGradient(ctx, cx, cy, colors);
  roundRect(ctx, left, top, INNER, INNER, 6);
  ctx.fill();

  // Gold border (indestructible indicator)
  ctx.strokeStyle = '#daa520';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = 'rgba(218,165,32,0.5)';
  ctx.shadowBlur = 6;
  roundRect(ctx, left, top, INNER, INNER, 6);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Inner highlight
  ctx.strokeStyle = 'rgba(255,215,0,0.2)';
  ctx.lineWidth = 1;
  roundRect(ctx, left + 2, top + 2, INNER - 4, INNER - 4, 4);
  ctx.stroke();

  // Double mirror line with glow
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#c0e0ff';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  if (scarabSlash) {
    ctx.moveTo(r, t); ctx.lineTo(l, b);
  } else {
    ctx.moveTo(l, t); ctx.lineTo(r, b);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Star symbol
  ctx.fillStyle = COLORS.crown;
  ctx.shadowColor = 'rgba(255,230,109,0.5)';
  ctx.shadowBlur = 4;
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', cx, cy);
  ctx.shadowBlur = 0;
}

// === ANUBIS ===
function drawAnubis(ctx: CanvasRenderingContext2D, left: number, top: number, cx: number, cy: number, piece: Piece) {
  drawPieceBase(ctx, left, top, cx, cy, piece);

  // Shield with metallic gradient
  const shieldT = 7;
  let sx: number, sy: number, sw: number, sh: number;
  let isHorizontal: boolean;
  if (piece.deg === 0) {
    sx = left + 3; sy = top; sw = INNER - 6; sh = shieldT; isHorizontal = true;
  } else if (piece.deg === 180) {
    sx = left + 3; sy = top + INNER - shieldT; sw = INNER - 6; sh = shieldT; isHorizontal = true;
  } else if (piece.deg === 90) {
    sx = left + INNER - shieldT; sy = top + 3; sw = shieldT; sh = INNER - 6; isHorizontal = false;
  } else {
    sx = left; sy = top + 3; sw = shieldT; sh = INNER - 6; isHorizontal = false;
  }

  const shieldGrad = isHorizontal
    ? ctx.createLinearGradient(sx, sy, sx, sy + sh)
    : ctx.createLinearGradient(sx, sy, sx + sw, sy);
  shieldGrad.addColorStop(0, '#eee');
  shieldGrad.addColorStop(0.3, '#fff');
  shieldGrad.addColorStop(0.5, '#ccc');
  shieldGrad.addColorStop(0.7, '#fff');
  shieldGrad.addColorStop(1, '#aaa');
  ctx.fillStyle = shieldGrad;
  ctx.shadowColor = 'rgba(255,255,255,0.3)';
  ctx.shadowBlur = 4;
  ctx.fillRect(sx, sy, sw, sh);
  ctx.shadowBlur = 0;

  // Letter with subtle shadow
  ctx.fillStyle = '#0a1020';
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 2;
  ctx.font = 'bold 15px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A', cx, cy);
  ctx.shadowBlur = 0;
}

// === UTILS ===
function fillTriangle(ctx: CanvasRenderingContext2D, points: [number, number][]) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
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
