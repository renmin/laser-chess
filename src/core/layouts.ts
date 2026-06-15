import type { Board, Layout, LayoutPieceDef, Piece, OrientationDeg } from '../types';
import { createEmptyBoard } from './board';

let nextId = 1;
function makeId(def: LayoutPieceDef): string {
  return `${def.owner}-${def.type}-${nextId++}`;
}

export function createBoardFromLayout(layout: Layout): Board {
  nextId = 1;
  const board = createEmptyBoard();
  for (const def of layout.pieces) {
    const piece: Piece = {
      id: makeId(def),
      type: def.type,
      owner: def.owner,
      position: { col: def.col, row: def.row },
      deg: def.deg,
    };
    board.pieces.push(piece);
  }
  return board;
}

export const CLASSIC_LAYOUT: Layout = {
  name: 'Classic',
  pieces: [
    { type: 'sphinx', owner: 'red', col: 9, row: 0, deg: 0 },
    { type: 'sphinx', owner: 'blue', col: 0, row: 7, deg: 180 },

    { type: 'king', owner: 'red', col: 4, row: 0, deg: 0 },
    { type: 'king', owner: 'blue', col: 5, row: 7, deg: 0 },

    { type: 'anubis', owner: 'red', col: 3, row: 0, deg: 0 },
    { type: 'anubis', owner: 'red', col: 5, row: 0, deg: 0 },
    { type: 'anubis', owner: 'blue', col: 4, row: 7, deg: 180 },
    { type: 'anubis', owner: 'blue', col: 6, row: 7, deg: 180 },

    { type: 'scarab', owner: 'red', col: 4, row: 3, deg: 270 },   // was 90
    { type: 'scarab', owner: 'red', col: 5, row: 3, deg: 0 },
    { type: 'scarab', owner: 'blue', col: 4, row: 4, deg: 0 },
    { type: 'scarab', owner: 'blue', col: 5, row: 4, deg: 270 },   // was 90

    { type: 'pyramid', owner: 'red', col: 2, row: 0, deg: 270 },   // was 90
    { type: 'pyramid', owner: 'red', col: 7, row: 1, deg: 0 },
    { type: 'pyramid', owner: 'red', col: 3, row: 5, deg: 270 },   // was 90
    { type: 'pyramid', owner: 'red', col: 2, row: 3, deg: 270 },   // was 90
    { type: 'pyramid', owner: 'red', col: 2, row: 4, deg: 180 },
    { type: 'pyramid', owner: 'red', col: 9, row: 3, deg: 180 },
    { type: 'pyramid', owner: 'red', col: 9, row: 4, deg: 270 },   // was 90

    { type: 'pyramid', owner: 'blue', col: 7, row: 7, deg: 90 },   // was 270
    { type: 'pyramid', owner: 'blue', col: 2, row: 6, deg: 180 },
    { type: 'pyramid', owner: 'blue', col: 6, row: 2, deg: 90 },   // was 270
    { type: 'pyramid', owner: 'blue', col: 7, row: 3, deg: 0 },
    { type: 'pyramid', owner: 'blue', col: 7, row: 4, deg: 90 },   // was 270
    { type: 'pyramid', owner: 'blue', col: 0, row: 3, deg: 90 },   // was 270
    { type: 'pyramid', owner: 'blue', col: 0, row: 4, deg: 0 },
  ],
};
