import type { Board, Cell, Piece, Player, Position } from '../types';
import { BOARD_WIDTH, BOARD_HEIGHT } from '../constants';

export function createEmptyBoard(): Board {
  const cells: Cell[][] = [];
  for (let col = 0; col < BOARD_WIDTH; col++) {
    cells[col] = [];
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      cells[col][row] = {
        col,
        row,
        restriction: getCellRestriction(col, row),
      };
    }
  }
  return { cells, pieces: [] };
}

function getCellRestriction(col: number, row: number): Player | null {
  if (col === 0 && (row === 0 || row === 1)) return 'red';
  if (col === 0 && (row === 6 || row === 7)) return 'blue';
  if (col === 9 && (row === 0 || row === 1)) return 'red';
  if (col === 9 && (row === 6 || row === 7)) return 'blue';
  return null;
}

export function isInBounds(col: number, row: number): boolean {
  return col >= 0 && col < BOARD_WIDTH && row >= 0 && row < BOARD_HEIGHT;
}

export function getPieceAt(board: Board, col: number, row: number): Piece | undefined {
  return board.pieces.find(p => p.position.col === col && p.position.row === row);
}

export function canOccupy(board: Board, col: number, row: number, player: Player): boolean {
  if (!isInBounds(col, row)) return false;
  if (getPieceAt(board, col, row)) return false;
  const restriction = board.cells[col][row].restriction;
  if (restriction && restriction !== player) return false;
  return true;
}

export function cloneBoard(board: Board): Board {
  return {
    cells: board.cells,
    pieces: board.pieces.map(p => ({ ...p, position: { ...p.position } })),
  };
}

export function removePiece(board: Board, pieceId: string): Piece | undefined {
  const idx = board.pieces.findIndex(p => p.id === pieceId);
  if (idx === -1) return undefined;
  return board.pieces.splice(idx, 1)[0];
}

export function movePiece(board: Board, pieceId: string, to: Position): boolean {
  const piece = board.pieces.find(p => p.id === pieceId);
  if (!piece) return false;
  piece.position = { ...to };
  return true;
}
