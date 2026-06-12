import type { Board, Direction, LaserResult, LaserSegment, Piece, Player } from '../types';
import { getPieceAt, isInBounds } from './board';
import { DIRECTION_VECTORS } from '../constants';

// Pyramid (single mirror) reflection table.
// Derived from visual diagonal + bright-side:
//   0°:  ╲ line, bright SW → S→E, W→N
//   90°: ╱ line, bright SE → S→W, E→N
//   180°:╲ line, bright NE → N→W, E→S
//   270°:╱ line, bright NW → N→E, W→S
const PYRAMID_REFLECT: Record<number, Partial<Record<Direction, Direction>>> = {
  0:   { S: 'E', W: 'N' },
  90:  { S: 'W', E: 'N' },
  180: { N: 'W', E: 'S' },
  270: { N: 'E', W: 'S' },
};

// Scarab (double mirror) — always reflects, never destroyed.
// Reflects all 4 directions based on visual diagonal:
//   0°/180° (╲): N↔W, E↔S
//   90°/270° (╱): N↔E, S↔W
const SCARAB_REFLECT: Record<number, Record<Direction, Direction>> = {
  0:   { N: 'W', W: 'N', E: 'S', S: 'E' },
  90:  { N: 'E', E: 'N', S: 'W', W: 'S' },
  180: { N: 'W', W: 'N', E: 'S', S: 'E' },
  270: { N: 'E', E: 'N', S: 'W', W: 'S' },
};

// Anubis: shield blocks from one direction. deg 0=shield N, 90=E, 180=S, 270=W.
// "Block" = laser absorbed, anubis survives. Other directions = anubis destroyed.
const ANUBIS_SHIELD: Record<number, Direction> = {
  0: 'N', 90: 'E', 180: 'S', 270: 'W',
};

// Sphinx facing: deg 0=N, 90=E, 180=S, 270=W
const SPHINX_FACING: Record<number, Direction> = {
  0: 'N', 90: 'E', 180: 'S', 270: 'W',
};

export function calculateLaser(board: Board, player: Player): LaserResult {
  const sphinx = board.pieces.find(p => p.type === 'sphinx' && p.owner === player);
  if (!sphinx) return { segments: [], destroyedPieceIds: [] };

  const segments: LaserSegment[] = [];
  const destroyedPieceIds: string[] = [];

  let col = sphinx.position.col;
  let row = sphinx.position.row;
  let dir: Direction = SPHINX_FACING[sphinx.deg] ?? 'N';
  const visited = new Set<string>();

  for (let step = 0; step < 200; step++) {
    const v = DIRECTION_VECTORS[dir];
    const nextCol = col + v.dc;
    const nextRow = row + v.dr;

    if (!isInBounds(nextCol, nextRow)) {
      segments.push({ from: { col, row }, to: { col: nextCol, row: nextRow } });
      break;
    }

    const stateKey = `${nextCol},${nextRow},${dir}`;
    if (visited.has(stateKey)) break;
    visited.add(stateKey);

    segments.push({ from: { col, row }, to: { col: nextCol, row: nextRow } });

    const piece = getPieceAt(board, nextCol, nextRow);
    if (!piece) {
      col = nextCol;
      row = nextRow;
      continue;
    }

    if (piece.type === 'sphinx') {
      break;
    }

    if (piece.type === 'king') {
      destroyedPieceIds.push(piece.id);
      break;
    }

    if (piece.type === 'pyramid') {
      const table = PYRAMID_REFLECT[piece.deg];
      const newDir = table?.[dir];
      if (newDir) {
        col = nextCol;
        row = nextRow;
        dir = newDir;
        continue;
      }
      destroyedPieceIds.push(piece.id);
      break;
    }

    if (piece.type === 'scarab') {
      const table = SCARAB_REFLECT[piece.deg];
      const newDir = table?.[dir];
      if (newDir) {
        col = nextCol;
        row = nextRow;
        dir = newDir;
        continue;
      }
      break;
    }

    if (piece.type === 'anubis') {
      const shieldDir = ANUBIS_SHIELD[piece.deg];
      // Block if laser comes FROM the shield direction.
      // Laser traveling S hits the N face → shield N blocks it.
      const opposites: Record<Direction, Direction> = { N: 'S', S: 'N', E: 'W', W: 'E' };
      if (shieldDir === opposites[dir]) {
        break;
      }
      destroyedPieceIds.push(piece.id);
      break;
    }

    break;
  }

  return { segments, destroyedPieceIds };
}
