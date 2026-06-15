import type { Board, MoveAction, OrientationDeg, Piece, Position } from '../types';
import { DIRECTION_VECTORS } from '../constants';
import { canOccupy, getPieceAt, isInBounds } from './board';

const ALL_DIRECTIONS = ['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW'] as const;

export function getValidMoves(board: Board, piece: Piece): MoveAction[] {
  const moves: MoveAction[] = [];

  if (piece.type === 'sphinx') {
    moves.push({ type: 'rotate', pieceId: piece.id, direction: 'cw' });
    moves.push({ type: 'rotate', pieceId: piece.id, direction: 'ccw' });
    return moves;
  }

  for (const dir of ALL_DIRECTIONS) {
    const v = DIRECTION_VECTORS[dir];
    const nc = piece.position.col + v.dc;
    const nr = piece.position.row + v.dr;
    if (canOccupy(board, nc, nr, piece.owner)) {
      moves.push({ type: 'move', pieceId: piece.id, to: { col: nc, row: nr } });
    }
  }

  if (piece.type !== 'king') {
    moves.push({ type: 'rotate', pieceId: piece.id, direction: 'cw' });
    moves.push({ type: 'rotate', pieceId: piece.id, direction: 'ccw' });
  }

  if (piece.type === 'scarab') {
    for (const dir of ALL_DIRECTIONS) {
      const v = DIRECTION_VECTORS[dir];
      const nc = piece.position.col + v.dc;
      const nr = piece.position.row + v.dr;
      if (!isInBounds(nc, nr)) continue;
      const target = getPieceAt(board, nc, nr);
      if (target && (target.type === 'pyramid' || target.type === 'anubis')) {
        moves.push({ type: 'swap', pieceId: piece.id, targetId: target.id });
      }
    }
  }

  return moves;
}

export function getValidMovePositions(board: Board, piece: Piece): Position[] {
  return getValidMoves(board, piece)
    .filter((m): m is Extract<MoveAction, { type: 'move' }> => m.type === 'move')
    .map(m => m.to);
}

export function getSwapTargets(board: Board, piece: Piece): Piece[] {
  return getValidMoves(board, piece)
    .filter((m): m is Extract<MoveAction, { type: 'swap' }> => m.type === 'swap')
    .map(m => board.pieces.find(p => p.id === m.targetId)!)
    .filter(Boolean);
}

export function rotatePiece(piece: Piece, direction: 'cw' | 'ccw'): void {
  if (piece.type === 'king') return;
  const step = direction === 'cw' ? 90 : -90;
  piece.deg = (((piece.deg + step) % 360 + 360) % 360) as OrientationDeg;
}
