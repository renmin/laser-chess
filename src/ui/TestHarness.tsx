import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import type { GameState, MoveAction, Piece, PieceType, OrientationDeg } from '../types';
import { COLORS, CELL_SIZE, BOARD_PADDING, BOARD_HEIGHT, BOARD_WIDTH } from '../constants';
import { createEmptyBoard } from '../core/board';
import { calculateLaser } from '../core/laser';
import { drawBoard, getCanvasSize } from '../renderer/board-renderer';
import { drawPieces } from '../renderer/piece-renderer';
import { drawLaserAnimated } from '../renderer/laser-renderer';

type Direction = 'N' | 'S' | 'E' | 'W';

interface TestConfig {
  piece: PieceType;
  deg: OrientationDeg;
  laserDir: Direction;
}

function parseTestConfig(): TestConfig | null {
  const params = new URLSearchParams(window.location.search);
  if (params.get('test') !== 'laser') return null;
  const piece = params.get('piece') as PieceType;
  const deg = Number(params.get('deg') || '0') as OrientationDeg;
  const dir = (params.get('dir') || 'N') as Direction;
  if (!piece) return null;
  return { piece, deg, laserDir: dir };
}

const DIR_OFFSETS: Record<Direction, { dc: number; dr: number }> = {
  N: { dc: 0, dr: -3 },
  S: { dc: 0, dr: 3 },
  E: { dc: -3, dr: 0 },
  W: { dc: 3, dr: 0 },
};

const OPPOSITE: Record<Direction, Direction> = { N: 'S', S: 'N', E: 'W', W: 'E' };
const DEG_MAP: Record<Direction, OrientationDeg> = { N: 0, E: 90, S: 180, W: 270 };

function buildTestBoard(config: TestConfig) {
  const board = createEmptyBoard();
  const targetCol = 5;
  const targetRow = 4;

  board.pieces.push({
    id: 'target',
    type: config.piece,
    owner: 'blue',
    position: { col: targetCol, row: targetRow },
    deg: config.deg,
  });

  const sphinxFacing = config.laserDir;
  const off = DIR_OFFSETS[config.laserDir];
  const sphinxCol = targetCol + off.dc;
  const sphinxRow = targetRow + off.dr;

  board.pieces.push({
    id: 'sphinx',
    type: 'sphinx',
    owner: 'red',
    position: { col: sphinxCol, row: sphinxRow },
    deg: DEG_MAP[sphinxFacing],
  });

  return board;
}

export function TestHarness() {
  const config = useMemo(() => parseTestConfig(), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [board, setBoard] = useState(() => config ? buildTestBoard(config) : createEmptyBoard());
  const [laserResult, setLaserResult] = useState<ReturnType<typeof calculateLaser> | null>(null);
  const [fired, setFired] = useState(false);
  const { width, height } = getCanvasSize();

  const render = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);
    drawBoard(ctx, board);
    drawPieces(ctx, board);
    if (laserResult) {
      // Show laser in "hold" phase: offset so elapsed = beamTime + 100ms (within hold window)
      const beamMs = laserResult.segments.length / 18 * 1000;
      drawLaserAnimated(ctx, { laser: laserResult, startTime: performance.now() - beamMs - 100, phase: 'hold' });
    }
  }, [board, laserResult, width, height]);

  useEffect(() => { render(); }, [render]);

  function fireLaser() {
    if (!config || fired) return;
    const result = calculateLaser(board, 'red');
    setLaserResult(result);

    // Remove destroyed pieces
    const newBoard = {
      ...board,
      pieces: board.pieces.filter(p => !result.destroyedPieceIds.includes(p.id)),
    };
    setBoard(newBoard);
    setFired(true);
  }

  if (!config) {
    return <div style={{ color: '#fff', padding: 20 }}>No test config. Use ?test=laser&piece=pyramid&deg=0&dir=N</div>;
  }

  const resultText = laserResult
    ? laserResult.destroyedPieceIds.length > 0
      ? `DESTROYED: ${laserResult.destroyedPieceIds.join(', ')}`
      : `NO DESTRUCTION (reflected or blocked). Segments: ${laserResult.segments.length}`
    : 'Not fired yet';

  return (
    <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', padding: 16, color: COLORS.text, fontFamily: 'Arial' }}>
      <div style={{ marginBottom: 8, fontSize: 14 }}>
        <strong>Test:</strong> {config.piece} deg={config.deg} | Laser from {config.laserDir} | {resultText}
      </div>
      <canvas ref={canvasRef} width={width} height={height} style={{ maxWidth: '95vw' }} />
      <div style={{ marginTop: 8 }}>
        <button
          id="fire-btn"
          onClick={fireLaser}
          disabled={fired}
          style={{ padding: '8px 24px', fontSize: 14, cursor: 'pointer' }}
        >
          Fire Laser
        </button>
      </div>
    </div>
  );
}
