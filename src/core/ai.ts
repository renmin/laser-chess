import type { GameState, MoveAction, Player, Piece } from '../types';
import { executeMove } from './game';
import { getValidMoves } from './pieces';
import { calculateLaser } from './laser';

const PIECE_VALUE: Record<string, number> = {
  pyramid: 10, anubis: 15, scarab: 20, king: 0, sphinx: 0,
};

const MAX_MOVES_PER_LEVEL = 60;

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

  const aiLaser = calculateLaser(state.board, aiPlayer);
  const oppLaser = calculateLaser(state.board, opponent);

  if (aiKing && oppLaser.destroyedPieceIds.includes(aiKing.id)) {
    score -= 5000;
  }
  if (oppKing && aiLaser.destroyedPieceIds.includes(oppKing.id)) {
    score += 5000;
  }

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

function quickScore(state: GameState, move: MoveAction): number {
  const result = executeMove(state, move);
  if (!result) return -Infinity;
  const aiPlayer = state.currentPlayer;
  const winStatus = aiPlayer === 'red' ? 'red_wins' : 'blue_wins';
  if (result.state.status === winStatus) return 10000;
  if (result.state.status !== 'playing') return -10000;
  if (result.destroyedPieces.length > 0) return 100;
  return 0;
}

function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: Player,
  deadline: number,
): number {
  if (depth === 0 || state.status !== 'playing' || performance.now() > deadline) {
    return evaluate(state, aiPlayer);
  }

  let moves = getAllLegalMoves(state);
  if (moves.length === 0) return evaluate(state, aiPlayer);

  if (moves.length > MAX_MOVES_PER_LEVEL) {
    moves = moves.slice(0, MAX_MOVES_PER_LEVEL);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const result = executeMove(state, move);
      if (!result) continue;
      const val = minimax(result.state, depth - 1, alpha, beta, false, aiPlayer, deadline);
      maxEval = Math.max(maxEval, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const result = executeMove(state, move);
      if (!result) continue;
      const val = minimax(result.state, depth - 1, alpha, beta, true, aiPlayer, deadline);
      minEval = Math.min(minEval, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function findBestMove(state: GameState, depth: number): MoveAction | null {
  const moves = getAllLegalMoves(state);
  if (moves.length === 0) return null;

  const aiPlayer = state.currentPlayer;
  const deadline = performance.now() + (depth >= 3 ? 3000 : depth >= 2 ? 2000 : 500);

  // Quick-score to order moves (captures/wins first)
  const scored = moves.map(m => ({ m, qs: quickScore(state, m) }));
  scored.sort((a, b) => b.qs - a.qs);

  // Immediate win check
  if (scored[0].qs >= 10000) return scored[0].m;

  const ordered = scored.map(s => s.m).slice(0, MAX_MOVES_PER_LEVEL);

  let bestMove: MoveAction = ordered[0];
  let bestScore = -Infinity;

  for (const move of ordered) {
    if (performance.now() > deadline) break;

    const result = executeMove(state, move);
    if (!result) continue;

    const score = minimax(result.state, depth - 1, -Infinity, Infinity, false, aiPlayer, deadline);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  // Easy mode: randomize among top moves
  if (depth === 1) {
    const topMoves = scored.slice(0, 5).filter(s => s.qs > -Infinity);
    if (topMoves.length > 0) {
      return topMoves[Math.floor(Math.random() * topMoves.length)].m;
    }
  }

  return bestMove;
}
