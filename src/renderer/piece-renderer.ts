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

  ctx.save();
  ctx.translate(cx, cy);

  // Apply piece rotation: static deg + animation override
  const degRad = piece.deg * Math.PI / 180;
  const animRad = override?.rotationRad ?? 0;
  ctx.rotate(degRad + animRad);

  // All draw functions now draw at deg=0 centered at origin (0,0)

  switch (piece.type) {
    case 'sphinx':  drawSphinx(ctx, piece); break;
    case 'king':    drawKing(ctx, piece); break;
    case 'pyramid': drawPyramid(ctx, piece); break;
    case 'scarab':  drawScarab(ctx, piece); break;
    case 'anubis':  drawAnubis(ctx, piece); break;
  }

  ctx.restore();
}

function drawPieceShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = 'rgba(0,0,0,0.01)';
  roundRect(ctx, -HALF, -HALF, INNER, INNER, 6);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function drawPieceBase(ctx: CanvasRenderingContext2D, piece: Piece) {
  const colors = ownerColors(piece);
  drawPieceShadow(ctx);

  const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, HALF * 1.2);
  g.addColorStop(0, colors.light);
  g.addColorStop(0.5, colors.main);
  g.addColorStop(1, colors.dark);
  ctx.fillStyle = g;
  roundRect(ctx, -HALF, -HALF, INNER, INNER, 6);
  ctx.fill();

  ctx.strokeStyle = colors.dark;
  ctx.lineWidth = 1.5;
  roundRect(ctx, -HALF, -HALF, INNER, INNER, 6);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  roundRect(ctx, -HALF + 1, -HALF + 1, INNER - 2, INNER - 2, 5);
  ctx.stroke();
}

// === SPHINX (deg=0: fires UP/North) ===
function drawSphinx(ctx: CanvasRenderingContext2D, piece: Piece) {
  drawPieceBase(ctx, piece);

  ctx.shadowColor = COLORS.laser;
  ctx.shadowBlur = 10;
  ctx.fillStyle = COLORS.crown;
  const a = INNER * 0.3;
  // Arrow pointing up (North) at deg=0
  ctx.beginPath();
  ctx.moveTo(0, -a);
  ctx.lineTo(-a * 0.65, a * 0.4);
  ctx.lineTo(a * 0.65, a * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Laser dot at tip
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, -a * 0.7, 2, 0, Math.PI * 2);
  ctx.fill();
}

// === KING ===
function drawKing(ctx: CanvasRenderingContext2D, piece: Piece) {
  const colors = ownerColors(piece);
  ctx.shadowColor = colors.glow;
  ctx.shadowBlur = 14;
  drawPieceBase(ctx, piece);
  ctx.shadowBlur = 0;

  ctx.fillStyle = COLORS.crown;
  ctx.shadowColor = 'rgba(255,230,109,0.6)';
  ctx.shadowBlur = 6;
  const s = INNER * 0.18;
  ctx.beginPath();
  ctx.moveTo(-s * 1.7, s * 0.6);
  ctx.lineTo(-s * 1.2, -s * 0.6);
  ctx.lineTo(-s * 0.4, s * 0.2);
  ctx.lineTo(0, -s * 1.5);
  ctx.lineTo(s * 0.4, s * 0.2);
  ctx.lineTo(s * 1.2, -s * 0.6);
  ctx.lineTo(s * 1.7, s * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-s * 1.7, s * 0.6, s * 3.4, s * 0.5);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, -s * 1.2, 2, 0, Math.PI * 2);
  ctx.fill();
}

// === PYRAMID (deg=0: ╲ line, SW bright) ===
function drawPyramid(ctx: CanvasRenderingContext2D, piece: Piece) {
  const colors = ownerColors(piece);
  const h = HALF;

  // At deg=0: diagonal from top-left(-h,-h) to bottom-right(h,h) = ╲
  // SW triangle (bright): (-h,-h), (-h,h), (h,h)
  // NE triangle (dark):   (-h,-h), (h,-h), (h,h)
  const solidTri: [number, number][] = [[-h, -h], [-h, h], [h, h]];
  const emptyTri: [number, number][] = [[-h, -h], [h, -h], [h, h]];

  drawPieceShadow(ctx);

  // Dark side
  ctx.fillStyle = '#040810';
  fillTriangle(ctx, emptyTri);

  // Bright side
  ctx.fillStyle = colors.light;
  ctx.globalAlpha = 0.85;
  fillTriangle(ctx, solidTri);
  ctx.globalAlpha = 1;

  // Border
  ctx.strokeStyle = colors.dark;
  ctx.lineWidth = 1.5;
  roundRect(ctx, -h, -h, INNER, INNER, 6);
  ctx.stroke();

  // Mirror line ╲
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#c0e0ff';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(-h, -h);
  ctx.lineTo(h, h);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// === SCARAB (deg=0: ╲ double mirror) ===
function drawScarab(ctx: CanvasRenderingContext2D, piece: Piece) {
  const colors = ownerColors(piece);
  const h = HALF;

  drawPieceShadow(ctx);

  const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, h * 1.2);
  g.addColorStop(0, colors.light);
  g.addColorStop(0.5, colors.main);
  g.addColorStop(1, colors.dark);
  ctx.fillStyle = g;
  roundRect(ctx, -h, -h, INNER, INNER, 6);
  ctx.fill();

  ctx.strokeStyle = '#daa520';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = 'rgba(218,165,32,0.5)';
  ctx.shadowBlur = 6;
  roundRect(ctx, -h, -h, INNER, INNER, 6);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255,215,0,0.2)';
  ctx.lineWidth = 1;
  roundRect(ctx, -h + 2, -h + 2, INNER - 4, INNER - 4, 4);
  ctx.stroke();

  // Mirror line ╲ at deg=0
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#c0e0ff';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(-h, -h);
  ctx.lineTo(h, h);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = COLORS.crown;
  ctx.shadowColor = 'rgba(255,230,109,0.5)';
  ctx.shadowBlur = 4;
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', 0, 0);
  ctx.shadowBlur = 0;
}

// === ANUBIS (deg=0: shield on top/North) ===
function drawAnubis(ctx: CanvasRenderingContext2D, piece: Piece) {
  drawPieceBase(ctx, piece);
  const h = HALF;

  // Shield bar on top edge at deg=0
  const shieldT = 7;
  const shieldGrad = ctx.createLinearGradient(0, -h, 0, -h + shieldT);
  shieldGrad.addColorStop(0, '#eee');
  shieldGrad.addColorStop(0.3, '#fff');
  shieldGrad.addColorStop(0.5, '#ccc');
  shieldGrad.addColorStop(0.7, '#fff');
  shieldGrad.addColorStop(1, '#aaa');
  ctx.fillStyle = shieldGrad;
  ctx.shadowColor = 'rgba(255,255,255,0.3)';
  ctx.shadowBlur = 4;
  ctx.fillRect(-h + 3, -h, INNER - 6, shieldT);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#0a1020';
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 2;
  ctx.font = 'bold 15px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A', 0, 0);
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
