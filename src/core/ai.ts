import type { GameState, MoveAction, Player, Piece } from '../types';
import { executeMove } from './game';
import { getValidMoves } from './pieces';
import { calculateLaser } from './laser';

const PIECE_VALUE: Record<string, number> = {
  pyramid: 10, anubis: 15, scarab: 20, king: 0, sphinx: 0,
};

function getAllLegalMoves(state: GameState): MoveAction[] {
  const moves: MoveAction[] = [];
  for (const piece of state.board.pieces) {
    if (piece.owner !== state.currentPlayer) continue;
    moves.push(...getValidMoves(state.board, piece));
  }
  return moves;
}

function evaluate(state: GameState, aiPlayer: Player): number {
  const opponent: Player = aiPlayer === 'red' ? 'blue' : 'red';

  if (state.status === (aiPlayer === 'red' ? 'red_wins' : 'blue_wins')) return 100000;
  if (state.status === (opponent === 'red' ? 'red_wins' : 'blue_wins')) return -100000;

  let score = 0;

  let aiKing: Piece | undefined;
  let oppKing: Piece | undefined;

  for (const p of state.board.pieces) {
    const value = PIECE_VALUE[p.type];
    if (p.owner === aiPlayer) {
      score += value;
      if (p.type === 'king') aiKing = p;
    } else {
      score -= value;
      if (p.type === 'king') oppKing = p;
    }
  }

  // Laser threat: check if either king is in a laser path
  const aiLaser = calculateLaser(state.board, aiPlayer);
  const oppLaser = calculateLaser(state.board, opponent);

  if (aiKing && oppLaser.destroyedPieceIds.includes(aiKing.id)) {
    score -= 5000;
  }
  if (oppKing && aiLaser.destroyedPieceIds.includes(oppKing.id)) {
    score += 5000;
  }

  // King protection: count friendly pieces adjacent to own king
  if (aiKing) {
    let guards = 0;
    for (const p of state.board.pieces) {
      if (p.owner !== aiPlayer || p.type === 'king') continue;
      const dc = Math.abs(p.position.col - aiKing.position.col);
      const dr = Math.abs(p.position.row - aiKing.position.row);
      if (dc <= 1 && dr <= 1) guards++;
    }
    score += guards * 5;
  }

  return score;
}

function orderMoves(state: GameState, moves: MoveAction[]): MoveAction[] {
  const scored = moves.map(m => {
    const result = executeMove(state, m);
    let priority = 0;
    if (result) {
      if (result.state.status !== 'playing') priority = 1000;
      else if (result.destroyedPieces.length > 0) priority = 100;
    }
    return { m, priority };
  });
  scored.sort((a, b) => b.priority - a.priority);
  return scored.map(s => s.m);
}

function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: Player,
): number {
  if (depth === 0 || state.status !== 'playing') {
    return evaluate(state, aiPlayer);
  }

  const moves = getAllLegalMoves(state);
  if (moves.length === 0) return evaluate(state, aiPlayer);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const result = executeMove(state, move);
      if (!result) continue;
      const eval_ = minimax(result.state, depth - 1, alpha, beta, false, aiPlayer);
      maxEval = Math.max(maxEval, eval_);
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const result = executeMove(state, move);
      if (!result) continue;
      const eval_ = minimax(result.state, depth - 1, alpha, beta, true, aiPlayer);
      minEval = Math.min(minEval, eval_);
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function findBestMove(state: GameState, depth: number): MoveAction | null {
  const moves = getAllLegalMoves(state);
  if (moves.length === 0) return null;

  const aiPlayer = state.currentPlayer;
  const ordered = depth >= 2 ? orderMoves(state, moves) : moves;

  let bestMove: MoveAction = ordered[0];
  let bestScore = -Infinity;

  for (const move of ordered) {
    const result = executeMove(state, move);
    if (!result) continue;

    // Immediate win
    if (result.state.status !== 'playing') {
      const winStatus = aiPlayer === 'red' ? 'red_wins' : 'blue_wins';
      if (result.state.status === winStatus) return move;
    }

    const score = minimax(result.state, depth - 1, -Infinity, Infinity, false, aiPlayer);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  // Easy mode: add some randomness — pick randomly from top 3
  if (depth === 1) {
    const scored = ordered.slice(0, 20).map(m => {
      const result = executeMove(state, m);
      if (!result) return { m, score: -Infinity };
      return { m, score: evaluate(result.state, aiPlayer) };
    });
    scored.sort((a, b) => b.score - a.score);
    const topN = scored.slice(0, 3).filter(s => s.score > -Infinity);
    if (topN.length > 0) {
      return topN[Math.floor(Math.random() * topN.length)].m;
    }
  }

  return bestMove;
}
