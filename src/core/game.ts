import type { Board, GameState, LaserResult, MoveAction, Piece, Player, Layout } from '../types';
import { cloneBoard, movePiece, removePiece } from './board';
import { getValidMoves, rotatePiece } from './pieces';
import { calculateLaser } from './laser';
import { createBoardFromLayout } from './layouts';

export function createGame(layout: Layout): GameState {
  return {
    board: createBoardFromLayout(layout),
    currentPlayer: 'red',
    turnNumber: 1,
    capturedPieces: [],
    status: 'playing',
    lastLaser: null,
  };
}

export interface MoveResult {
  state: GameState;
  boardAfterMove: Board;
  laser: LaserResult;
  destroyedPieces: Piece[];
}

export function executeMove(state: GameState, action: MoveAction): MoveResult | null {
  if (state.status !== 'playing') return null;

  const piece = state.board.pieces.find(p => p.id === action.pieceId);
  if (!piece || piece.owner !== state.currentPlayer) return null;

  const validMoves = getValidMoves(state.board, piece);
  const isValid = validMoves.some(m => {
    if (m.type !== action.type) return false;
    if (m.type === 'move' && action.type === 'move') {
      return m.to.col === action.to.col && m.to.row === action.to.row;
    }
    if (m.type === 'rotate' && action.type === 'rotate') {
      return m.direction === action.direction;
    }
    if (m.type === 'swap' && action.type === 'swap') {
      return m.targetId === action.targetId;
    }
    return false;
  });
  if (!isValid) return null;

  const newBoard = cloneBoard(state.board);
  const movedPiece = newBoard.pieces.find(p => p.id === action.pieceId)!;

  if (action.type === 'move') {
    movePiece(newBoard, action.pieceId, action.to);
  } else if (action.type === 'rotate') {
    rotatePiece(movedPiece, action.direction);
  } else if (action.type === 'swap') {
    const target = newBoard.pieces.find(p => p.id === action.targetId)!;
    const tmpPos = { ...movedPiece.position };
    movedPiece.position = { ...target.position };
    target.position = tmpPos;
  }

  const laser = calculateLaser(newBoard, state.currentPlayer);

  const boardAfterMove = cloneBoard(newBoard);

  const destroyedPieces: Piece[] = [];
  for (const id of laser.destroyedPieceIds) {
    const removed = removePiece(newBoard, id);
    if (removed) destroyedPieces.push(removed);
  }

  let status = state.status;
  const opponentKingDestroyed = destroyedPieces.some(
    p => p.type === 'king' && p.owner !== state.currentPlayer
  );
  const ownKingDestroyed = destroyedPieces.some(
    p => p.type === 'king' && p.owner === state.currentPlayer
  );

  if (opponentKingDestroyed) {
    status = state.currentPlayer === 'red' ? 'red_wins' : 'blue_wins';
  } else if (ownKingDestroyed) {
    status = state.currentPlayer === 'red' ? 'blue_wins' : 'red_wins';
  }

  const nextPlayer: Player = state.currentPlayer === 'red' ? 'blue' : 'red';

  const newState: GameState = {
    board: newBoard,
    currentPlayer: status === 'playing' ? nextPlayer : state.currentPlayer,
    turnNumber: state.turnNumber + 1,
    capturedPieces: [...state.capturedPieces, ...destroyedPieces],
    status,
    lastLaser: laser,
  };

  return { state: newState, boardAfterMove, laser, destroyedPieces };
}
