export type Direction = 'N' | 'S' | 'E' | 'W';
export type Player = 'red' | 'blue';
export type PieceType = 'sphinx' | 'king' | 'pyramid' | 'scarab' | 'anubis';
export type OrientationDeg = 0 | 90 | 180 | 270;

export interface Position {
  col: number;
  row: number;
}

export interface Piece {
  id: string;
  type: PieceType;
  owner: Player;
  position: Position;
  deg: OrientationDeg;
}

export interface Cell {
  col: number;
  row: number;
  restriction: Player | null;
}

export interface Board {
  cells: Cell[][];
  pieces: Piece[];
}

export type MoveAction =
  | { type: 'move'; pieceId: string; to: Position }
  | { type: 'rotate'; pieceId: string; direction: 'cw' | 'ccw' }
  | { type: 'swap'; pieceId: string; targetId: string };

export interface LaserSegment {
  from: Position;
  to: Position;
}

export interface LaserResult {
  segments: LaserSegment[];
  destroyedPieceIds: string[];
}

export type GameStatus = 'playing' | 'red_wins' | 'blue_wins';

export interface GameState {
  board: Board;
  currentPlayer: Player;
  turnNumber: number;
  capturedPieces: Piece[];
  status: GameStatus;
  lastLaser: LaserResult | null;
}

export interface LayoutPieceDef {
  type: PieceType;
  owner: Player;
  col: number;
  row: number;
  deg: OrientationDeg;
}

export interface Layout {
  name: string;
  pieces: LayoutPieceDef[];
}
