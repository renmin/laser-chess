import { describe, it, expect } from 'vitest';
import { createGame, executeMove } from '../core/game';
import { CLASSIC_LAYOUT } from '../core/layouts';
import type { MoveAction } from '../types';

describe('Game flow', () => {
  it('classic layout starts with 26 pieces', () => {
    const game = createGame(CLASSIC_LAYOUT);
    expect(game.board.pieces).toHaveLength(26);
    expect(game.currentPlayer).toBe('red');
    expect(game.status).toBe('playing');
  });

  it('opening laser does not destroy any piece', () => {
    const game = createGame(CLASSIC_LAYOUT);
    // Find a movable red piece (any red pyramid not on the edge)
    const piece = game.board.pieces.find(p => p.owner === 'red' && p.type === 'pyramid');
    expect(piece).toBeDefined();
    // Find a valid adjacent empty cell
    const { col, row } = piece!.position;
    const targets = [
      { col: col + 1, row }, { col: col - 1, row },
      { col, row: row + 1 }, { col, row: row - 1 },
    ].filter(t => t.col >= 0 && t.col < 10 && t.row >= 0 && t.row < 8 &&
      !game.board.pieces.some(p => p.position.col === t.col && p.position.row === t.row));
    expect(targets.length).toBeGreaterThan(0);
    const result = executeMove(game, { type: 'move', pieceId: piece!.id, to: targets[0] });
    expect(result).not.toBeNull();
    expect(result!.destroyedPieces).toHaveLength(0);
    expect(result!.state.board.pieces).toHaveLength(26);
  });

  it('turn switches after move', () => {
    const game = createGame(CLASSIC_LAYOUT);
    const piece = game.board.pieces.find(p => p.owner === 'red' && p.type === 'pyramid')!;
    const { col, row } = piece.position;
    const target = [
      { col: col + 1, row }, { col: col - 1, row },
      { col, row: row + 1 }, { col, row: row - 1 },
    ].find(t => t.col >= 0 && t.col < 10 && t.row >= 0 && t.row < 8 &&
      !game.board.pieces.some(p => p.position.col === t.col && p.position.row === t.row))!;
    const result = executeMove(game, { type: 'move', pieceId: piece.id, to: target })!;
    expect(result.state.currentPlayer).toBe('blue');
  });

  it('cannot move opponent piece', () => {
    const game = createGame(CLASSIC_LAYOUT);
    const bluePiece = game.board.pieces.find(p => p.owner === 'blue')!;
    const result = executeMove(game, { type: 'move', pieceId: bluePiece.id, to: { col: 0, row: 0 } });
    expect(result).toBeNull();
  });

  it('sphinx cannot move, only rotate', () => {
    const game = createGame(CLASSIC_LAYOUT);
    const sphinx = game.board.pieces.find(p => p.owner === 'red' && p.type === 'sphinx')!;
    const moveResult = executeMove(game, { type: 'move', pieceId: sphinx.id, to: { col: 8, row: 0 } });
    expect(moveResult).toBeNull();
    const rotResult = executeMove(game, { type: 'rotate', pieceId: sphinx.id, direction: 'cw' });
    expect(rotResult).not.toBeNull();
  });

  it('king destroyed → game over', () => {
    const game = createGame({
      name: 'test',
      pieces: [
        { type: 'sphinx', owner: 'red', col: 5, row: 0, deg: 0 },
        { type: 'king', owner: 'red', col: 0, row: 0, deg: 0 },
        { type: 'king', owner: 'blue', col: 5, row: 3, deg: 0 },
        { type: 'pyramid', owner: 'red', col: 3, row: 3, deg: 0 },
      ],
    });
    // Move the pyramid out of the way — sphinx fires N, hits blue king
    const pyramid = game.board.pieces.find(p => p.type === 'pyramid')!;
    const result = executeMove(game, { type: 'move', pieceId: pyramid.id, to: { col: 2, row: 3 } })!;
    expect(result.destroyedPieces.some(p => p.type === 'king')).toBe(true);
    expect(result.state.status).toBe('red_wins');
  });

  it('friendly fire — own king destroyed → opponent wins', () => {
    const game = createGame({
      name: 'test',
      pieces: [
        { type: 'sphinx', owner: 'red', col: 5, row: 0, deg: 0 },
        { type: 'king', owner: 'red', col: 5, row: 3, deg: 0 },
        { type: 'king', owner: 'blue', col: 0, row: 7, deg: 0 },
        { type: 'pyramid', owner: 'red', col: 3, row: 3, deg: 0 },
      ],
    });
    const pyramid = game.board.pieces.find(p => p.type === 'pyramid')!;
    const result = executeMove(game, { type: 'move', pieceId: pyramid.id, to: { col: 2, row: 3 } })!;
    expect(result.state.status).toBe('blue_wins');
  });

  it('scarab can swap with adjacent pyramid', () => {
    const game = createGame(CLASSIC_LAYOUT);
    const scarab = game.board.pieces.find(p => p.owner === 'red' && p.type === 'scarab')!;
    const adjacentPyramid = game.board.pieces.find(
      p => p.type === 'pyramid' &&
        Math.abs(p.position.col - scarab.position.col) <= 1 &&
        Math.abs(p.position.row - scarab.position.row) <= 1 &&
        (p.position.col !== scarab.position.col || p.position.row !== scarab.position.row)
    );
    if (adjacentPyramid) {
      const result = executeMove(game, { type: 'swap', pieceId: scarab.id, targetId: adjacentPyramid.id });
      expect(result).not.toBeNull();
      const newScarab = result!.state.board.pieces.find(p => p.id === scarab.id)!;
      expect(newScarab.position).toEqual(adjacentPyramid.position);
    }
  });

  it('180-degree rotational symmetry of classic layout', () => {
    const game = createGame(CLASSIC_LAYOUT);
    const pieces = game.board.pieces;
    const redPieces = pieces.filter(p => p.owner === 'red');
    const bluePieces = pieces.filter(p => p.owner === 'blue');
    expect(redPieces.length).toBe(13);
    expect(bluePieces.length).toBe(13);

    // Every red piece should have a blue counterpart at (9-col, 7-row)
    for (const rp of redPieces) {
      const symCol = 9 - rp.position.col;
      const symRow = 7 - rp.position.row;
      const match = bluePieces.find(bp => bp.type === rp.type && bp.position.col === symCol && bp.position.row === symRow);
      expect(match, `No blue ${rp.type} at (${symCol},${symRow}) symmetric to red at (${rp.position.col},${rp.position.row})`).toBeDefined();
    }
  });
});
