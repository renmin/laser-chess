import { describe, it, expect } from 'vitest';
import { rotatePiece } from '../core/pieces';
import type { Piece, OrientationDeg } from '../types';

function makePiece(type: Piece['type'], deg: OrientationDeg): Piece {
  return { id: 'test', type, owner: 'red', position: { col: 0, row: 0 }, deg };
}

// Unified: cw = deg+90, ccw = deg-90 for ALL piece types

describe('Pyramid rotation', () => {
  it('cw: 0 → 90 → 180 → 270 → 0', () => {
    const p = makePiece('pyramid', 0);
    rotatePiece(p, 'cw'); expect(p.deg).toBe(90);
    rotatePiece(p, 'cw'); expect(p.deg).toBe(180);
    rotatePiece(p, 'cw'); expect(p.deg).toBe(270);
    rotatePiece(p, 'cw'); expect(p.deg).toBe(0);
  });
  it('ccw: 0 → 270 → 180 → 90 → 0', () => {
    const p = makePiece('pyramid', 0);
    rotatePiece(p, 'ccw'); expect(p.deg).toBe(270);
    rotatePiece(p, 'ccw'); expect(p.deg).toBe(180);
    rotatePiece(p, 'ccw'); expect(p.deg).toBe(90);
    rotatePiece(p, 'ccw'); expect(p.deg).toBe(0);
  });
});

describe('Scarab rotation', () => {
  it('cw: 0 → 90 → 180 → 270 → 0', () => {
    const p = makePiece('scarab', 0);
    rotatePiece(p, 'cw'); expect(p.deg).toBe(90);
    rotatePiece(p, 'cw'); expect(p.deg).toBe(180);
    rotatePiece(p, 'cw'); expect(p.deg).toBe(270);
    rotatePiece(p, 'cw'); expect(p.deg).toBe(0);
  });
});

describe('Sphinx rotation', () => {
  it('cw: 0 → 90 → 180 → 270 → 0', () => {
    const p = makePiece('sphinx', 0);
    rotatePiece(p, 'cw'); expect(p.deg).toBe(90);
    rotatePiece(p, 'cw'); expect(p.deg).toBe(180);
    rotatePiece(p, 'cw'); expect(p.deg).toBe(270);
    rotatePiece(p, 'cw'); expect(p.deg).toBe(0);
  });
  it('ccw: 0 → 270 → 180 → 90 → 0', () => {
    const p = makePiece('sphinx', 0);
    rotatePiece(p, 'ccw'); expect(p.deg).toBe(270);
    rotatePiece(p, 'ccw'); expect(p.deg).toBe(180);
    rotatePiece(p, 'ccw'); expect(p.deg).toBe(90);
    rotatePiece(p, 'ccw'); expect(p.deg).toBe(0);
  });
});

describe('King rotation', () => {
  it('does not rotate', () => {
    const p = makePiece('king', 0);
    rotatePiece(p, 'cw'); expect(p.deg).toBe(0);
    rotatePiece(p, 'ccw'); expect(p.deg).toBe(0);
  });
});
