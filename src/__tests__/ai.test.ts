import { describe, it, expect } from 'vitest';
import { findBestMove } from '../core/ai';
import { createGame, executeMove } from '../core/game';
import { CLASSIC_LAYOUT } from '../core/layouts';
import type { GameState } from '../types';

describe('AI', () => {
  it('returns a legal move', () => {
    const game = createGame(CLASSIC_LAYOUT);
    const move = findBestMove(game, 1);
    expect(move).not.toBeNull();
    const result = executeMove(game, move!);
    expect(result).not.toBeNull();
  });

  it('captures exposed king in 1 move', () => {
    const game = createGame({
      name: 'test',
      pieces: [
        { type: 'sphinx', owner: 'red', col: 5, row: 0, deg: 0 },
        { type: 'king', owner: 'red', col: 0, row: 0, deg: 0 },
        { type: 'king', owner: 'blue', col: 5, row: 4, deg: 0 },
        { type: 'pyramid', owner: 'red', col: 5, row: 3, deg: 0 },
      ],
    });
    // Red sphinx fires N, pyramid at (5,3) blocks. If pyramid moves aside, king at (5,4) dies.
    const move = findBestMove(game, 1);
    expect(move).not.toBeNull();
    const result = executeMove(game, move!)!;
    expect(result.state.status).toBe('red_wins');
  });

  it('does not make a self-destructive move when avoidable', () => {
    const game = createGame(CLASSIC_LAYOUT);
    const move = findBestMove(game, 2);
    expect(move).not.toBeNull();
    const result = executeMove(game, move!)!;
    // Should not destroy own king
    const ownKingAlive = result.state.board.pieces.some(
      p => p.type === 'king' && p.owner === 'red'
    );
    expect(ownKingAlive).toBe(true);
  });

  it('depth 1 runs within 500ms', () => {
    const game = createGame(CLASSIC_LAYOUT);
    const start = performance.now();
    findBestMove(game, 1);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });

  it('depth 2 runs within 5s', () => {
    const game = createGame(CLASSIC_LAYOUT);
    const start = performance.now();
    findBestMove(game, 2);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });
});
