import { describe, it, expect } from 'vitest';
import { calculateLaser } from '../core/laser';
import { createEmptyBoard } from '../core/board';
import type { Board, Piece, OrientationDeg, Direction } from '../types';

function makeBoard(...pieces: Piece[]): Board {
  const board = createEmptyBoard();
  board.pieces = pieces;
  return board;
}

function makePiece(id: string, type: Piece['type'], owner: Piece['owner'], col: number, row: number, deg: OrientationDeg): Piece {
  return { id, type, owner, position: { col, row }, deg };
}

function laserTestSetup(targetType: Piece['type'], targetDeg: OrientationDeg, laserDir: Direction, targetOwner: Piece['owner'] = 'blue') {
  const dirOffset: Record<Direction, { dc: number; dr: number }> = {
    N: { dc: 0, dr: -3 }, S: { dc: 0, dr: 3 }, E: { dc: -3, dr: 0 }, W: { dc: 3, dr: 0 },
  };
  const degMap: Record<Direction, OrientationDeg> = { N: 0, E: 90, S: 180, W: 270 };
  const off = dirOffset[laserDir];
  const sphinxCol = 5 + off.dc;
  const sphinxRow = 4 + off.dr;

  const sphinx = makePiece('sphinx', 'sphinx', 'red', sphinxCol, sphinxRow, degMap[laserDir]);
  const target = makePiece('target', targetType, targetOwner, 5, 4, targetDeg);
  return makeBoard(sphinx, target);
}

describe('Pyramid reflection', () => {
  // deg 0: reflects S→E, W→N. Destroys N, E.
  describe('deg 0', () => {
    it('N → destroy', () => {
      const result = calculateLaser(laserTestSetup('pyramid', 0, 'N'), 'red');
      expect(result.destroyedPieceIds).toContain('target');
    });
    it('S → reflect E', () => {
      const result = calculateLaser(laserTestSetup('pyramid', 0, 'S'), 'red');
      expect(result.destroyedPieceIds).toHaveLength(0);
      expect(result.segments.at(-1)!.to.col).toBeGreaterThan(5);
    });
    it('E → destroy', () => {
      const result = calculateLaser(laserTestSetup('pyramid', 0, 'E'), 'red');
      expect(result.destroyedPieceIds).toContain('target');
    });
    it('W → reflect N', () => {
      const result = calculateLaser(laserTestSetup('pyramid', 0, 'W'), 'red');
      expect(result.destroyedPieceIds).toHaveLength(0);
      expect(result.segments.at(-1)!.to.row).toBeGreaterThan(4);
    });
  });

  // deg 90: reflects S→W, E→N. Destroys N, W.
  describe('deg 90', () => {
    it('N → destroy', () => {
      const result = calculateLaser(laserTestSetup('pyramid', 90, 'N'), 'red');
      expect(result.destroyedPieceIds).toContain('target');
    });
    it('S → reflect W', () => {
      const result = calculateLaser(laserTestSetup('pyramid', 90, 'S'), 'red');
      expect(result.destroyedPieceIds).toHaveLength(0);
      expect(result.segments.at(-1)!.to.col).toBeLessThan(5);
    });
    it('E → reflect N', () => {
      const result = calculateLaser(laserTestSetup('pyramid', 90, 'E'), 'red');
      expect(result.destroyedPieceIds).toHaveLength(0);
      expect(result.segments.at(-1)!.to.row).toBeGreaterThan(4);
    });
    it('W → destroy', () => {
      const result = calculateLaser(laserTestSetup('pyramid', 90, 'W'), 'red');
      expect(result.destroyedPieceIds).toContain('target');
    });
  });

  // deg 180: reflects N→W, E→S. Destroys S, W.
  describe('deg 180', () => {
    it('N → reflect W', () => {
      const result = calculateLaser(laserTestSetup('pyramid', 180, 'N'), 'red');
      expect(result.destroyedPieceIds).toHaveLength(0);
      expect(result.segments.at(-1)!.to.col).toBeLessThan(5);
    });
    it('S → destroy', () => {
      const result = calculateLaser(laserTestSetup('pyramid', 180, 'S'), 'red');
      expect(result.destroyedPieceIds).toContain('target');
    });
    it('E → reflect S', () => {
      const result = calculateLaser(laserTestSetup('pyramid', 180, 'E'), 'red');
      expect(result.destroyedPieceIds).toHaveLength(0);
      expect(result.segments.at(-1)!.to.row).toBeLessThan(4);
    });
    it('W → destroy', () => {
      const result = calculateLaser(laserTestSetup('pyramid', 180, 'W'), 'red');
      expect(result.destroyedPieceIds).toContain('target');
    });
  });

  // deg 270: reflects N→E, W→S. Destroys S, E.
  describe('deg 270', () => {
    it('N → reflect E', () => {
      const result = calculateLaser(laserTestSetup('pyramid', 270, 'N'), 'red');
      expect(result.destroyedPieceIds).toHaveLength(0);
      expect(result.segments.at(-1)!.to.col).toBeGreaterThan(5);
    });
    it('S → destroy', () => {
      const result = calculateLaser(laserTestSetup('pyramid', 270, 'S'), 'red');
      expect(result.destroyedPieceIds).toContain('target');
    });
    it('E → destroy', () => {
      const result = calculateLaser(laserTestSetup('pyramid', 270, 'E'), 'red');
      expect(result.destroyedPieceIds).toContain('target');
    });
    it('W → reflect S', () => {
      const result = calculateLaser(laserTestSetup('pyramid', 270, 'W'), 'red');
      expect(result.destroyedPieceIds).toHaveLength(0);
      expect(result.segments.at(-1)!.to.row).toBeLessThan(4);
    });
  });
});

describe('Scarab reflection', () => {
  // deg 0/180 (╲): N↔W, E↔S — always reflects, never destroyed
  it.each([
    [0, 'N'], [0, 'W'], [0, 'E'], [0, 'S'],
    [180, 'N'], [180, 'W'], [180, 'E'], [180, 'S'],
  ] as [OrientationDeg, Direction][])('deg %d from %s → reflects', (deg, dir) => {
    const result = calculateLaser(laserTestSetup('scarab', deg, dir), 'red');
    expect(result.destroyedPieceIds).toHaveLength(0);
  });

  // deg 90/270 (╱): N↔E, S↔W
  it.each([
    [90, 'N'], [90, 'E'], [90, 'S'], [90, 'W'],
  ] as [OrientationDeg, Direction][])('deg %d from %s → reflects', (deg, dir) => {
    const result = calculateLaser(laserTestSetup('scarab', deg, dir), 'red');
    expect(result.destroyedPieceIds).toHaveLength(0);
  });
});

describe('Anubis', () => {
  // deg 0 = shield N. Shield blocks beam traveling S (hits the N face).
  // Beams traveling N/E/W hit non-shield faces → destroy.
  it('deg 0: S → block (hits shield)', () => {
    const result = calculateLaser(laserTestSetup('anubis', 0, 'S'), 'red');
    expect(result.destroyedPieceIds).toHaveLength(0);
  });
  it('deg 0: N → destroy', () => {
    const result = calculateLaser(laserTestSetup('anubis', 0, 'N'), 'red');
    expect(result.destroyedPieceIds).toContain('target');
  });
  it('deg 0: E → destroy', () => {
    const result = calculateLaser(laserTestSetup('anubis', 0, 'E'), 'red');
    expect(result.destroyedPieceIds).toContain('target');
  });
  it('deg 0: W → destroy', () => {
    const result = calculateLaser(laserTestSetup('anubis', 0, 'W'), 'red');
    expect(result.destroyedPieceIds).toContain('target');
  });

  // deg 180 = shield S. Blocks beam traveling N (hits the S face).
  it('deg 180: N → block', () => {
    const result = calculateLaser(laserTestSetup('anubis', 180, 'N'), 'red');
    expect(result.destroyedPieceIds).toHaveLength(0);
  });
  it('deg 180: S → destroy', () => {
    const result = calculateLaser(laserTestSetup('anubis', 180, 'S'), 'red');
    expect(result.destroyedPieceIds).toContain('target');
  });
});

describe('King', () => {
  it('destroyed from any direction', () => {
    for (const dir of ['N', 'S', 'E', 'W'] as Direction[]) {
      const result = calculateLaser(laserTestSetup('king', 0, dir), 'red');
      expect(result.destroyedPieceIds).toContain('target');
    }
  });
});

describe('Sphinx', () => {
  it('blocks laser from any direction', () => {
    for (const dir of ['N', 'S', 'E', 'W'] as Direction[]) {
      const board = laserTestSetup('sphinx', 0, dir, 'red');
      board.pieces[1] = makePiece('target', 'sphinx', 'blue', 5, 4, 0);
      const result = calculateLaser(board, 'red');
      expect(result.destroyedPieceIds).toHaveLength(0);
    }
  });
});
