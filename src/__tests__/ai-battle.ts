import { createGame, executeMove } from '../core/game';
import { findBestMove } from '../core/ai';
import { CLASSIC_LAYOUT } from '../core/layouts';
import type { GameState, MoveAction } from '../types';

interface MoveRecord {
  turn: number;
  player: 'red' | 'blue';
  move: MoveAction;
  destroyed: string[];
  timeMs: number;
}

interface GameRecord {
  result: 'red_wins' | 'blue_wins' | 'draw';
  turns: number;
  moves: MoveRecord[];
  redDepth: number;
  blueDepth: number;
  totalTimeMs: number;
}

function simulateGame(redDepth: number, blueDepth: number, maxTurns = 100): GameRecord {
  let state = createGame(CLASSIC_LAYOUT);
  const moves: MoveRecord[] = [];
  const gameStart = performance.now();

  for (let turn = 1; turn <= maxTurns; turn++) {
    if (state.status !== 'playing') break;

    const depth = state.currentPlayer === 'red' ? redDepth : blueDepth;
    const start = performance.now();
    const move = findBestMove(state, depth);
    const timeMs = performance.now() - start;

    if (!move) break;

    const result = executeMove(state, move);
    if (!result) break;

    moves.push({
      turn,
      player: state.currentPlayer,
      move,
      destroyed: result.destroyedPieces.map(p => `${p.owner} ${p.type}`),
      timeMs: Math.round(timeMs),
    });

    state = result.state;
  }

  return {
    result: state.status === 'playing' ? 'draw' : state.status as 'red_wins' | 'blue_wins',
    turns: moves.length,
    moves,
    redDepth,
    blueDepth,
    totalTimeMs: Math.round(performance.now() - gameStart),
  };
}

function analyzeGame(record: GameRecord) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Red (depth=${record.redDepth}) vs Blue (depth=${record.blueDepth})`);
  console.log(`Result: ${record.result} in ${record.turns} moves (${record.totalTimeMs}ms)`);
  console.log(`${'='.repeat(60)}`);

  const redMoves = record.moves.filter(m => m.player === 'red');
  const blueMoves = record.moves.filter(m => m.player === 'blue');

  const redAvgTime = redMoves.reduce((s, m) => s + m.timeMs, 0) / (redMoves.length || 1);
  const blueAvgTime = blueMoves.reduce((s, m) => s + m.timeMs, 0) / (blueMoves.length || 1);

  console.log(`Red avg move time: ${Math.round(redAvgTime)}ms`);
  console.log(`Blue avg move time: ${Math.round(blueAvgTime)}ms`);

  const redDestroys = record.moves.filter(m => m.player === 'red' && m.destroyed.length > 0);
  const blueDestroys = record.moves.filter(m => m.player === 'blue' && m.destroyed.length > 0);

  console.log(`Red captures: ${redDestroys.length} (${redDestroys.map(m => m.destroyed.join(', ')).join('; ')})`);
  console.log(`Blue captures: ${blueDestroys.length} (${blueDestroys.map(m => m.destroyed.join(', ')).join('; ')})`);

  // Detect bad decisions: self-captures
  const redSelfCaptures = record.moves.filter(m => m.player === 'red' && m.destroyed.some(d => d.startsWith('red')));
  const blueSelfCaptures = record.moves.filter(m => m.player === 'blue' && m.destroyed.some(d => d.startsWith('blue')));

  if (redSelfCaptures.length > 0) {
    console.log(`⚠️  Red self-captures: ${redSelfCaptures.length} (${redSelfCaptures.map(m => `turn ${m.turn}: ${m.destroyed.join(', ')}`).join('; ')})`);
  }
  if (blueSelfCaptures.length > 0) {
    console.log(`⚠️  Blue self-captures: ${blueSelfCaptures.length} (${blueSelfCaptures.map(m => `turn ${m.turn}: ${m.destroyed.join(', ')}`).join('; ')})`);
  }

  // Detect repetitive moves (same piece moving back and forth)
  let repetitions = 0;
  for (let i = 2; i < record.moves.length; i++) {
    const curr = record.moves[i];
    const prev = record.moves[i - 2]; // same player's last move
    if (curr.move.type === 'move' && prev.move.type === 'move' &&
        curr.move.pieceId === prev.move.pieceId) {
      repetitions++;
    }
  }
  if (repetitions > 3) {
    console.log(`⚠️  Repetitive moves detected: ${repetitions}`);
  }

  // Print first 10 and last 5 moves
  console.log('\nFirst 10 moves:');
  for (const m of record.moves.slice(0, 10)) {
    const moveDesc = m.move.type === 'move'
      ? `move ${m.move.pieceId.split('-').slice(0,2).join('-')} to (${m.move.to.col},${m.move.to.row})`
      : m.move.type === 'rotate'
        ? `rotate ${m.move.pieceId.split('-').slice(0,2).join('-')} ${m.move.direction}`
        : `swap`;
    const destroyDesc = m.destroyed.length > 0 ? ` → destroyed: ${m.destroyed.join(', ')}` : '';
    console.log(`  T${m.turn} ${m.player}: ${moveDesc}${destroyDesc} (${m.timeMs}ms)`);
  }

  if (record.moves.length > 15) {
    console.log(`  ... (${record.moves.length - 15} more moves) ...`);
    console.log('\nLast 5 moves:');
    for (const m of record.moves.slice(-5)) {
      const moveDesc = m.move.type === 'move'
        ? `move to (${m.move.to.col},${m.move.to.row})`
        : m.move.type === 'rotate'
          ? `rotate ${m.move.direction}`
          : `swap`;
      const destroyDesc = m.destroyed.length > 0 ? ` → destroyed: ${m.destroyed.join(', ')}` : '';
      console.log(`  T${m.turn} ${m.player}: ${moveDesc}${destroyDesc} (${m.timeMs}ms)`);
    }
  }
}

// Run simulations
console.log('AI Battle Simulation');
console.log('====================\n');

const matchups: [number, number][] = [
  [1, 1],  // Easy vs Easy
  [1, 2],  // Easy vs Medium
  [2, 2],  // Medium vs Medium
  [2, 3],  // Medium vs Hard
];

for (const [redDepth, blueDepth] of matchups) {
  const record = simulateGame(redDepth, blueDepth);
  analyzeGame(record);
}
