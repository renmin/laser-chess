import type { GameState, MoveAction, Player, Piece } from '../types';
import { executeMove } from './game';
import { getValidMoves } from './pieces';
import { calculateLaser } from './laser';

// Piece values: the core scoring metric
const PIECE_VALUE: Record<string, number> = {
  king: 10000,
  scarab: 200,
  anubis: 150,
  pyramid: 100,
  sphinx: 0,
};

function getAllLegalMoves(state: GameState): MoveAction[] {
  const moves: MoveAction[] = [];
  for (const piece of state.board.pieces) {
    if (piece.owner !== state.currentPlayer) continue;
    moves.push(...getValidMoves(state.board, piece));
  }
  return moves;
}

// Evaluation = material score + positional bonus
// Positive = AI advantage, Negative = opponent advantage
function evaluate(state: GameState, aiPlayer: Player): number {
  if (state.status !== 'playing') {
    const aiWins = state.status === (aiPlayer === 'red' ? 'red_wins' : 'blue_wins');
    return aiWins ? 100000 : -100000;
  }

  const opponent: Player = aiPlayer === 'red' ? 'blue' : 'red';
  let score = 0;

  // Material count
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

  // Positional: reward pyramids closer to center (more tactical flexibility)
  for (const p of state.board.pieces) {
    if (p.type !== 'pyramid') continue;
    const centerDist = Math.abs(p.position.col - 4.5) + Math.abs(p.position.row - 3.5);
    const bonus = Math.max(0, 7 - centerDist);
    score += p.owner === aiPlayer ? bonus : -bonus;
  }

  return score;
}

// Quick move score for ordering: simulate one step, measure material change
function moveScore(state: GameState, move: MoveAction): number {
  const result = executeMove(state, move);
  if (!result) return -Infinity;
  if (result.state.status !== 'playing') {
    const aiWins = result.state.status === (state.currentPlayer === 'red' ? 'red_wins' : 'blue_wins');
    return aiWins ? 100000 : -100000;
  }
  // Score = pieces destroyed value (positive for enemy, negative for own)
  let delta = 0;
  for (const dp of result.destroyedPieces) {
    delta += dp.owner === state.currentPlayer ? -PIECE_VALUE[dp.type] : PIECE_VALUE[dp.type];
  }
  return delta;
}

function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  aiPlayer: Player,
  deadline: number,
): number {
  if (depth === 0 || state.status !== 'playing' || performance.now() > deadline) {
    return evaluate(state, aiPlayer);
  }

  const isMaximizing = state.currentPlayer === aiPlayer;
  const moves = getAllLegalMoves(state);
  if (moves.length === 0) return evaluate(state, aiPlayer);

  // Move ordering: sort by immediate material gain for better pruning
  const scored = moves.map(m => ({ m, s: moveScore(state, m) }));
  scored.sort((a, b) => isMaximizing ? b.s - a.s : a.s - b.s);

  // Prune to top candidates based on depth
  const limit = depth >= 3 ? 30 : depth >= 2 ? 40 : 50;
  const candidates = scored.slice(0, limit).map(x => x.m);

  if (isMaximizing) {
    let best = -Infinity;
    for (const move of candidates) {
      if (performance.now() > deadline) break;
      const result = executeMove(state, move);
      if (!result) continue;
      const val = minimax(result.state, depth - 1, alpha, beta, aiPlayer, deadline);
      best = Math.max(best, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of candidates) {
      if (performance.now() > deadline) break;
      const result = executeMove(state, move);
      if (!result) continue;
      const val = minimax(result.state, depth - 1, alpha, beta, aiPlayer, deadline);
      best = Math.min(best, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return best;
  }
}

export function findBestMove(state: GameState, depth: number): MoveAction | null {
  const moves = getAllLegalMoves(state);
  if (moves.length === 0) return null;

  const aiPlayer = state.currentPlayer;
  const deadline = performance.now() + (depth >= 3 ? 5000 : depth >= 2 ? 3000 : 1000);

  // Score and sort
  const scored = moves.map(m => ({ m, s: moveScore(state, m) }));
  scored.sort((a, b) => b.s - a.s);

  // Immediate win
  if (scored[0].s >= 100000) return scored[0].m;

  // Filter obvious self-kills
  const safe = scored.filter(x => x.s > -10000);
  const candidates = (safe.length > 0 ? safe : scored).slice(0, 50);

  let bestMove: MoveAction = candidates[0].m;
  let bestScore = -Infinity;

  for (const { m: move } of candidates) {
    if (performance.now() > deadline) break;
    const result = executeMove(state, move);
    if (!result) continue;

    const score = minimax(result.state, depth - 1, bestScore, Infinity, aiPlayer, deadline);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}
