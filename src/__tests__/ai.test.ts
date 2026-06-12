import { describe, it, expect } from 'vitest';
import { findBestMove } from '../core/ai';
import { createGame, executeMove } from '../core/game';
import { calculateLaser } from '../core/laser';
import { CLASSIC_LAYOUT } from '../core/layouts';

describe('AI', () => {
  it('returns a legal move', () => {
    const game = createGame(CLASSIC_LAYOUT);
    const move = findBestMove(game, 1);
    expect(move).not.toBeNull();
    const result = executeMove(game, move!);
    expect(result).not.toBeNull();
  });

  it('captures exposed king in 1 move', () => {
    // Blue king sits directly in red sphinx laser path, no blockers
    const game = createGame({
      name: 'test',
      pieces: [
        { type: 'sphinx', owner: 'red', col: 5, row: 0, deg: 0 },
        { type: 'king', owner: 'red', col: 0, row: 0, deg: 0 },
        { type: 'king', owner: 'blue', col: 5, row: 7, deg: 0 },
        { type: 'pyramid', owner: 'red', col: 4, row: 4, deg: 0 },
      ],
    });

    // Verify laser directly hits blue king before any move
    const laser = calculateLaser(game.board, 'red');
    expect(laser.destroyedPieceIds).toContain(
      game.board.pieces.find(p => p.type === 'king' && p.owner === 'blue')!.id
    );

    // Any move that doesn't redirect sphinx should still win
    const move = findBestMove(game, 2);
    expect(move).not.toBeNull();
    // AI should NOT rotate sphinx away from the winning line
    if (move!.type === 'rotate' && move!.pieceId === game.board.pieces.find(p => p.type === 'sphinx')!.id) {
      throw new Error('AI should not rotate sphinx away from winning position');
    }
    const result = executeMove(game, move!)!;
    expect(result.state.status).toBe('red_wins');
  });

  it('does not make a self-destructive move when avoidable', () => {
    const game = createGame(CLASSIC_LAYOUT);
    const move = findBestMove(game, 2);
    expect(move).not.toBeNull();
    const result = executeMove(game, move!)!;
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
