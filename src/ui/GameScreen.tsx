import { useRef, useEffect, useState, useCallback } from 'react';
import type { GameState, MoveAction, Piece, Position } from '../types';
import { COLORS, CELL_SIZE } from '../constants';
import { createGame, executeMove, type MoveResult } from '../core/game';
import { CLASSIC_LAYOUT } from '../core/layouts';
import { getValidMovePositions, getSwapTargets } from '../core/pieces';
import { getPieceAt } from '../core/board';
import { drawBoard, getCanvasSize, screenToCell, drawValidMoves, drawSelection, drawSwapTargets, cellToScreen } from '../renderer/board-renderer';
import { drawPieces, type PieceAnimOverride } from '../renderer/piece-renderer';
import { drawLaser } from '../renderer/laser-renderer';
import { GameHUD } from './GameHUD';

const ANIM_DURATION = 200;

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

interface AnimState {
  pieceId: string;
  type: 'move' | 'rotate';
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  rotFrom: number;
  rotTo: number;
  startTime: number;
  pendingResult: MoveResult;
  swapTargetId?: string;
  swapFromX?: number;
  swapFromY?: number;
  swapToX?: number;
  swapToY?: number;
}

interface Props {
  onBackToMenu: () => void;
}

export function GameScreen({ onBackToMenu }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(() => createGame(CLASSIC_LAYOUT));
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [showLaser, setShowLaser] = useState(false);
  const [animating, setAnimating] = useState(false);
  const animRef = useRef<AnimState | null>(null);
  const rafRef = useRef<number>(0);
  const { width, height } = getCanvasSize();

  const renderFrame = useCallback((overrides?: Map<string, PieceAnimOverride>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    drawBoard(ctx, gameState.board);

    if (selectedPiece && !animating) {
      drawSelection(ctx, selectedPiece.position.col, selectedPiece.position.row);
      const validPositions = getValidMovePositions(gameState.board, selectedPiece);
      drawValidMoves(ctx, validPositions);
      const swapTargets = getSwapTargets(gameState.board, selectedPiece);
      drawSwapTargets(ctx, swapTargets.map(p => p.position));
    }

    drawPieces(ctx, gameState.board, overrides);

    if (showLaser && gameState.lastLaser) {
      drawLaser(ctx, gameState.lastLaser);
    }
  }, [gameState, selectedPiece, showLaser, animating, width, height]);

  useEffect(() => {
    if (!animating) renderFrame();
  }, [renderFrame, animating]);

  function startAnimation(anim: AnimState) {
    animRef.current = anim;
    setAnimating(true);
    setSelectedPiece(null);

    const tick = (now: number) => {
      const a = animRef.current;
      if (!a) return;
      const elapsed = now - a.startTime;
      const t = Math.min(elapsed / ANIM_DURATION, 1);
      const e = easeOut(t);

      const overrides = new Map<string, PieceAnimOverride>();
      if (a.type === 'move') {
        overrides.set(a.pieceId, {
          screenX: a.fromX + (a.toX - a.fromX) * e,
          screenY: a.fromY + (a.toY - a.fromY) * e,
        });
        if (a.swapTargetId && a.swapFromX != null && a.swapToX != null) {
          overrides.set(a.swapTargetId, {
            screenX: a.swapFromX + (a.swapToX - a.swapFromX) * e,
            screenY: a.swapFromY! + (a.swapToY! - a.swapFromY!) * e,
          });
        }
      } else {
        overrides.set(a.pieceId, {
          rotationRad: a.rotFrom + (a.rotTo - a.rotFrom) * e,
        });
      }

      renderFrame(overrides);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        animRef.current = null;
        finishMove(a.pendingResult);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }

  function finishMove(result: MoveResult) {
    setAnimating(false);
    setShowLaser(true);
    setGameState(result.state);

    setTimeout(() => {
      setShowLaser(false);
    }, 1200);
  }

  function doMove(action: MoveAction) {
    const piece = gameState.board.pieces.find(p => p.id === action.pieceId);
    if (!piece) return;
    const result = executeMove(gameState, action);
    if (!result) return;

    if (action.type === 'move') {
      const fromScreen = cellToScreen(piece.position.col, piece.position.row);
      const toScreen = cellToScreen(action.to.col, action.to.row);
      startAnimation({
        pieceId: action.pieceId,
        type: 'move',
        fromX: fromScreen.x,
        fromY: fromScreen.y,
        toX: toScreen.x,
        toY: toScreen.y,
        rotFrom: 0,
        rotTo: 0,
        startTime: performance.now(),
        pendingResult: result,
      });
    } else if (action.type === 'rotate') {
      // Canvas rotate: positive = clockwise on screen
      // Rotate Left (ccw) = visual counterclockwise = negative angle
      // Rotate Right (cw) = visual clockwise = positive angle
      const angle = action.direction === 'ccw' ? -Math.PI / 2 : Math.PI / 2;
      startAnimation({
        pieceId: action.pieceId,
        type: 'rotate',
        fromX: 0,
        fromY: 0,
        toX: 0,
        toY: 0,
        rotFrom: 0,
        rotTo: angle,
        startTime: performance.now(),
        pendingResult: result,
      });
    } else if (action.type === 'swap') {
      const target = gameState.board.pieces.find(p => p.id === action.targetId);
      if (!target) { finishMove(result); return; }
      const fromScreen = cellToScreen(piece.position.col, piece.position.row);
      const toScreen = cellToScreen(target.position.col, target.position.row);
      startAnimation({
        pieceId: action.pieceId,
        type: 'move',
        fromX: fromScreen.x,
        fromY: fromScreen.y,
        toX: toScreen.x,
        toY: toScreen.y,
        rotFrom: 0,
        rotTo: 0,
        startTime: performance.now(),
        pendingResult: result,
        swapTargetId: action.targetId,
        swapFromX: toScreen.x,
        swapFromY: toScreen.y,
        swapToX: fromScreen.x,
        swapToY: fromScreen.y,
      });
    } else {
      finishMove(result);
    }
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (gameState.status !== 'playing' || animating) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const sx = (e.clientX - rect.left) * scaleX;
    const sy = (e.clientY - rect.top) * scaleY;
    const cell = screenToCell(sx, sy);
    if (!cell) return;

    const clickedPiece = getPieceAt(gameState.board, cell.col, cell.row);

    if (selectedPiece) {
      if (clickedPiece && clickedPiece.id === selectedPiece.id) {
        setSelectedPiece(null);
        return;
      }

      if (selectedPiece.type === 'scarab' && clickedPiece) {
        const swapTargets = getSwapTargets(gameState.board, selectedPiece);
        if (swapTargets.find(t => t.id === clickedPiece.id)) {
          doMove({ type: 'swap', pieceId: selectedPiece.id, targetId: clickedPiece.id });
          return;
        }
      }

      const validPositions = getValidMovePositions(gameState.board, selectedPiece);
      const isValid = validPositions.some(p => p.col === cell.col && p.row === cell.row);
      if (isValid) {
        doMove({ type: 'move', pieceId: selectedPiece.id, to: cell });
        return;
      }

      if (clickedPiece && clickedPiece.owner === gameState.currentPlayer) {
        setSelectedPiece(clickedPiece);
        return;
      }

      setSelectedPiece(null);
      return;
    }

    if (clickedPiece && clickedPiece.owner === gameState.currentPlayer) {
      setSelectedPiece(clickedPiece);
    }
  }

  function handleRotate(direction: 'cw' | 'ccw') {
    if (!selectedPiece || animating) return;
    if (selectedPiece.type === 'king') return;
    doMove({ type: 'rotate', pieceId: selectedPiece.id, direction });
  }

  function handleNewGame() {
    cancelAnimationFrame(rafRef.current);
    animRef.current = null;
    setAnimating(false);
    setGameState(createGame(CLASSIC_LAYOUT));
    setSelectedPiece(null);
    setShowLaser(false);
  }

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const winner = gameState.status !== 'playing' ? gameState.status : null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: COLORS.background,
      minHeight: '100vh',
      padding: '16px 0',
      fontFamily: 'Arial, sans-serif',
      color: COLORS.text,
    }}>
      <GameHUD
        currentPlayer={gameState.currentPlayer}
        turnNumber={gameState.turnNumber}
        capturedPieces={gameState.capturedPieces}
        onBackToMenu={onBackToMenu}
      />

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        style={{
          cursor: animating ? 'default' : 'pointer',
          maxWidth: '95vw',
          maxHeight: '65vh',
          borderRadius: 8,
        }}
      />

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button
          onClick={() => handleRotate('ccw')}
          disabled={!selectedPiece || selectedPiece.type === 'king' || animating}
          style={actionBtnStyle}
        >
          ↶ Rotate Left
        </button>
        <button
          onClick={() => handleRotate('cw')}
          disabled={!selectedPiece || selectedPiece.type === 'king' || animating}
          style={actionBtnStyle}
        >
          ↷ Rotate Right
        </button>
      </div>

      {selectedPiece && !animating && (
        <div style={{ marginTop: 8, color: COLORS.textDim, fontSize: 13 }}>
          Selected: {selectedPiece.owner} {selectedPiece.type} at ({selectedPiece.position.col}, {selectedPiece.position.row}) deg={selectedPiece.deg}
        </div>
      )}

      {winner && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 100,
        }}>
          <div style={{
            backgroundColor: '#16213e',
            padding: '48px 64px',
            borderRadius: 12,
            textAlign: 'center',
            border: `2px solid ${winner === 'red_wins' ? COLORS.red : COLORS.blue}`,
          }}>
            <h2 style={{
              color: winner === 'red_wins' ? COLORS.red : COLORS.blue,
              fontSize: 28,
              margin: 0,
            }}>
              {winner === 'red_wins' ? 'Red' : 'Blue'} Wins!
            </h2>
            <p style={{ color: COLORS.textDim, margin: '12px 0 24px' }}>
              The King has been destroyed!
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={handleNewGame} style={actionBtnStyle}>
                New Game
              </button>
              <button onClick={onBackToMenu} style={actionBtnStyle}>
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  padding: '10px 24px',
  fontSize: 14,
  fontWeight: 'bold',
  border: `1px solid ${COLORS.gridLine}`,
  borderRadius: 6,
  cursor: 'pointer',
  backgroundColor: '#16213e',
  color: COLORS.text,
};
