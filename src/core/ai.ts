import type { GameState, MoveAction, Player, Piece } from '../types';
import { executeMove, type MoveResult } from './game';
import { getValidMoves } from './pieces';
import { calculateLaser } from './laser';

const PIECE_VALUE: Record<string, number> = {
  pyramid: 100, anubis: 150, scarab: 200, king: 10000, sphinx: 0,
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

  // Laser threat analysis
  const oppLaser = calculateLaser(state.board, opponent);
  const aiLaser = calculateLaser(state.board, aiPlayer);

  // Critical: own king in opponent's laser path = very bad
  if (aiKing && oppLaser.destroyedPieceIds.includes(aiKing.id)) {
    score -= 50000;
  }
  // Opponent's king in our laser path = very good
  if (oppKing && aiLaser.destroyedPieceIds.includes(oppKing.id)) {
    score += 50000;
  }

  // Penalize own pieces in opponent's laser path
  for (const id of oppLaser.destroyedPieceIds) {
    const p = state.board.pieces.find(x => x.id === id);
    if (p && p.owner === aiPlayer && p.type !== 'king') {
      score -= PIECE_VALUE[p.type] * 2;
    }
  }

  // Reward threatening opponent pieces with our laser
  for (const id of aiLaser.destroyedPieceIds) {
    const p = state.board.pieces.find(x => x.id === id);
    if (p && p.owner === opponent && p.type !== 'king') {
      score += PIECE_VALUE[p.type];
    }
  }

  // King safety: pieces adjacent to king as shield
  if (aiKing) {
    let guards = 0;
    for (const p of state.board.pieces) {
      if (p.owner !== aiPlayer || p.type === 'king') continue;
      const dc = Math.abs(p.position.col - aiKing.position.col);
      const dr = Math.abs(p.position.row - aiKing.position.row);
      if (dc <= 1 && dr <= 1) guards++;
    }
    score += guards * 30;
  }

  // Penalize king exposure (king near board edge without protection)
  if (aiKing) {
    const { col, row } = aiKing.position;
    if (col <= 1 || col >= 8 || row <= 1 || row >= 6) {
      score -= 20;
    }
  }

  return score;
}

function scoreMove(state: GameState, move: MoveAction, aiPlayer: Player): number {
  const result = executeMove(state, move);
  if (!result) return -Infinity;

  const winStatus = aiPlayer === 'red' ? 'red_wins' : 'blue_wins';
  if (result.state.status === winStatus) return 100000;
  if (result.state.status !== 'playing') return -100000;

  let score = 0;

  // Destroying opponent pieces is good
  for (const dp of result.destroyedPieces) {
    if (dp.owner !== aiPlayer) {
      score += PIECE_VALUE[dp.type] * 3;
    } else {
      score -= PIECE_VALUE[dp.type] * 4;
    }
  }

  return score;
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

  const moves = getAllLegalMoves(state);
  if (moves.length === 0) return evaluate(state, aiPlayer);

  // Order moves at each level for better pruning
  const scored = moves.map(m => ({
    m,
    s: scoreMove(state, m, isMaximizing ? aiPlayer : (aiPlayer === 'red' ? 'blue' : 'red')),
  }));
  scored.sort((a, b) => isMaximizing ? b.s - a.s : a.s - b.s);

  const orderedMoves = scored.slice(0, 40).map(x => x.m);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of orderedMoves) {
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
    for (const move of orderedMoves) {
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
  const deadline = performance.now() + (depth >= 3 ? 4000 : depth >= 2 ? 2500 : 800);

  // Score and sort all moves
  const scored = moves.map(m => ({ m, s: scoreMove(state, m, aiPlayer) }));
  scored.sort((a, b) => b.s - a.s);

  // Immediate win
  if (scored[0].s >= 100000) return scored[0].m;

  // Filter out self-destructive moves (kills own king)
  const safe = scored.filter(x => x.s > -100000);
  const candidates = (safe.length > 0 ? safe : scored).slice(0, 50);

  let bestMove: MoveAction = candidates[0].m;
  let bestScore = -Infinity;

  for (const { m: move } of candidates) {
    if (performance.now() > deadline) break;

    const result = executeMove(state, move);
    if (!result) continue;

    const score = minimax(result.state, depth - 1, bestScore, Infinity, false, aiPlayer, deadline);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  // Easy mode: pick from top 3 (but never self-destructive)
  if (depth === 1) {
    const top3 = candidates.slice(0, 3);
    return top3[Math.floor(Math.random() * top3.length)].m;
  }

  return bestMove;
}
