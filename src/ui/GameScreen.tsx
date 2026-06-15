import { useRef, useEffect, useState, useCallback } from 'react';
import type { Board, GameState, MoveAction, Piece } from '../types';
import { COLORS, CELL_SIZE } from '../constants';
import { createGame, executeMove, type MoveResult } from '../core/game';
import { CLASSIC_LAYOUT } from '../core/layouts';
import { getValidMovePositions, getSwapTargets } from '../core/pieces';
import { getPieceAt } from '../core/board';
import { drawBoard, getCanvasSize, screenToCell, drawValidMoves, drawSelection, drawSwapTargets, cellToScreen } from '../renderer/board-renderer';
import { drawPieces, type PieceAnimOverride } from '../renderer/piece-renderer';
import { drawLaserAnimated, getLaserAnimDuration, type LaserAnimState } from '../renderer/laser-renderer';
import { triggerExplosion, updateAndDrawExplosions, clearExplosions } from '../renderer/effects';
import { SoundManager } from '../audio/sound-manager';
import { findBestMove } from '../core/ai';
import type { AIConfig } from '../App';
import { GameHUD } from './GameHUD';

const MOVE_ANIM_DURATION = 200;

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

interface MoveAnimState {
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
  moveAction: MoveAction;
  swapTargetId?: string;
  swapFromX?: number;
  swapFromY?: number;
  swapToX?: number;
  swapToY?: number;
}

type Phase = 'idle' | 'moveAnim' | 'laser' | 'explosions';

interface Props {
  onBackToMenu: () => void;
  aiConfig?: AIConfig | null;
}

export function GameScreen({ onBackToMenu, aiConfig }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(() => createGame(CLASSIC_LAYOUT));
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const moveAnimRef = useRef<MoveAnimState | null>(null);
  const laserAnimRef = useRef<LaserAnimState | null>(null);
  const pendingResultRef = useRef<MoveResult | null>(null);
  const displayBoardRef = useRef<Board | null>(null);
  const rafRef = useRef(0);
  const pulseRef = useRef(0);
  const audioInitRef = useRef(false);
  const showWinnerRef = useRef(false);
  const [showWinner, setShowWinner] = useState(false);
  const { width, height } = getCanvasSize();

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const selectedPieceRef = useRef(selectedPiece);
  selectedPieceRef.current = selectedPiece;

  const renderFrame = useCallback((overrides?: Map<string, PieceAnimOverride>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const gs = gameStateRef.current;
    const board = displayBoardRef.current ?? gs.board;
    const sel = selectedPieceRef.current;

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);
    drawBoard(ctx, board);

    if (sel && phaseRef.current === 'idle') {
      drawSelection(ctx, sel.position.col, sel.position.row, pulseRef.current);
      drawValidMoves(ctx, getValidMovePositions(gs.board, sel));
      drawSwapTargets(ctx, getSwapTargets(gs.board, sel).map(p => p.position));
    }

    drawPieces(ctx, board, overrides);

    if (laserAnimRef.current) {
      drawLaserAnimated(ctx, laserAnimRef.current);
    }

    const dt = 1 / 60;
    updateAndDrawExplosions(ctx, dt);
  }, [width, height]);

  // Idle render loop for pulse animation
  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      if (phaseRef.current === 'idle') {
        pulseRef.current = performance.now() / 1000;
        renderFrame();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [renderFrame]);

  function initAudio() {
    if (!audioInitRef.current) {
      SoundManager.init();
      SoundManager.startBGM();
      audioInitRef.current = true;
    }
  }

  function doMove(action: MoveAction) {
    initAudio();
    const piece = gameStateRef.current.board.pieces.find(p => p.id === action.pieceId);
    if (!piece) return;
    const result = executeMove(gameStateRef.current, action);
    if (!result) return;

    if (action.type === 'move') {
      SoundManager.pieceMove();
      const fromScreen = cellToScreen(piece.position.col, piece.position.row);
      const toScreen = cellToScreen(action.to.col, action.to.row);
      startMoveAnim({
        pieceId: action.pieceId, type: 'move',
        fromX: fromScreen.x, fromY: fromScreen.y,
        toX: toScreen.x, toY: toScreen.y,
        rotFrom: 0, rotTo: 0,
        startTime: performance.now(),
        pendingResult: result, moveAction: action,
      });
    } else if (action.type === 'rotate') {
      SoundManager.pieceRotate();
      const piece_ = gameStateRef.current.board.pieces.find(p => p.id === action.pieceId);
      // Sphinx/Anubis: deg+90 = visual CW. Pyramid/Scarab: deg+90 = visual CCW.
      const invertAnim = piece_ && (piece_.type === 'pyramid' || piece_.type === 'scarab');
      const canvasCW = invertAnim ? -Math.PI / 2 : Math.PI / 2;
      const angle = action.direction === 'cw' ? canvasCW : -canvasCW;
      startMoveAnim({
        pieceId: action.pieceId, type: 'rotate',
        fromX: 0, fromY: 0, toX: 0, toY: 0,
        rotFrom: 0, rotTo: angle,
        startTime: performance.now(),
        pendingResult: result, moveAction: action,
      });
    } else if (action.type === 'swap') {
      SoundManager.pieceMove();
      const target = gameStateRef.current.board.pieces.find(p => p.id === action.targetId);
      if (!target) { finishTurn(result); return; }
      const fromScreen = cellToScreen(piece.position.col, piece.position.row);
      const toScreen = cellToScreen(target.position.col, target.position.row);
      startMoveAnim({
        pieceId: action.pieceId, type: 'move',
        fromX: fromScreen.x, fromY: fromScreen.y,
        toX: toScreen.x, toY: toScreen.y,
        rotFrom: 0, rotTo: 0,
        startTime: performance.now(),
        pendingResult: result, moveAction: action,
        swapTargetId: action.targetId,
        swapFromX: toScreen.x, swapFromY: toScreen.y,
        swapToX: fromScreen.x, swapToY: fromScreen.y,
      });
    }
  }

  function startMoveAnim(anim: MoveAnimState) {
    moveAnimRef.current = anim;
    phaseRef.current = 'moveAnim';
    setSelectedPiece(null);

    const tick = (now: number) => {
      const a = moveAnimRef.current;
      if (!a) return;
      const t = Math.min((now - a.startTime) / MOVE_ANIM_DURATION, 1);
      const e = easeOut(t);

      const overrides = new Map<string, PieceAnimOverride>();
      if (a.type === 'move') {
        overrides.set(a.pieceId, {
          screenX: a.fromX + (a.toX - a.fromX) * e,
          screenY: a.fromY + (a.toY - a.fromY) * e,
        });
        if (a.swapTargetId && a.swapFromX != null) {
          overrides.set(a.swapTargetId, {
            screenX: a.swapFromX + (a.swapToX! - a.swapFromX) * e,
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
        moveAnimRef.current = null;
        startLaserPhase(a.pendingResult);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function startLaserPhase(result: MoveResult) {
    pendingResultRef.current = result;
    displayBoardRef.current = result.boardAfterMove;

    if (result.laser.segments.length === 0) {
      displayBoardRef.current = null;
      gameStateRef.current = result.state;
      setGameState(result.state);
      phaseRef.current = 'idle';
      SoundManager.turnChange();
      renderFrame();
      scheduleAI(result.state);
      return;
    }

    SoundManager.laserFire();

    const reflectCount = result.laser.segments.length - 1;
    for (let i = 1; i < reflectCount; i++) {
      setTimeout(() => SoundManager.laserReflect(), i * 55);
    }

    phaseRef.current = 'laser';
    const laserAnim: LaserAnimState = {
      laser: result.laser,
      startTime: performance.now(),
      phase: 'beam',
    };
    laserAnimRef.current = laserAnim;

    const totalDuration = getLaserAnimDuration(result.laser);
    const beamTime = result.laser.segments.length / 18 * 1000;
    let piecesRemoved = false;

    const laserTick = () => {
      if (phaseRef.current !== 'laser') return;
      const elapsed = performance.now() - laserAnim.startTime;

      // Remove pieces and trigger explosions when beam reaches the end
      if (!piecesRemoved && elapsed >= beamTime && result.destroyedPieces.length > 0) {
        piecesRemoved = true;
        displayBoardRef.current = null;
        gameStateRef.current = result.state;
        setGameState(result.state);

        for (const dp of result.destroyedPieces) {
          const screen = cellToScreen(dp.position.col, dp.position.row);
          const isKing = dp.type === 'king';
          triggerExplosion(screen.x + CELL_SIZE / 2, screen.y + CELL_SIZE / 2, dp.owner, isKing);
          if (isKing) SoundManager.kingDestroy();
          else SoundManager.pieceDestroy();
        }
      }

      renderFrame();

      if (elapsed < totalDuration + 800) {
        rafRef.current = requestAnimationFrame(laserTick);
      } else {
        laserAnimRef.current = null;
        displayBoardRef.current = null;
        clearExplosions();

        if (!piecesRemoved) {
          gameStateRef.current = result.state;
          setGameState(result.state);
        }

        // Show winner AFTER explosions finish
        if (result.state.status !== 'playing') {
          showWinnerRef.current = true;
          setShowWinner(true);
        } else {
          SoundManager.turnChange();
        }

        phaseRef.current = 'idle';
        renderFrame();
        scheduleAI(result.state);
      }
    };
    rafRef.current = requestAnimationFrame(laserTick);
  }

  function finishTurn(result: MoveResult) {
    displayBoardRef.current = null;
    gameStateRef.current = result.state;
    setGameState(result.state);
    phaseRef.current = 'idle';
    SoundManager.turnChange();
    renderFrame();
    scheduleAI(result.state);
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    initAudio();
    if (gameStateRef.current.status !== 'playing' || phaseRef.current !== 'idle') return;
    if (aiConfig && gameStateRef.current.currentPlayer === aiConfig.aiPlayer) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const sx = (e.clientX - rect.left) * scaleX;
    const sy = (e.clientY - rect.top) * scaleY;
    const cell = screenToCell(sx, sy);
    if (!cell) return;

    const gs = gameStateRef.current;
    const clickedPiece = getPieceAt(gs.board, cell.col, cell.row);

    if (selectedPiece) {
      if (clickedPiece && clickedPiece.id === selectedPiece.id) {
        setSelectedPiece(null);
        return;
      }
      if (selectedPiece.type === 'scarab' && clickedPiece) {
        const swapTargets = getSwapTargets(gs.board, selectedPiece);
        if (swapTargets.find(t => t.id === clickedPiece.id)) {
          doMove({ type: 'swap', pieceId: selectedPiece.id, targetId: clickedPiece.id });
          return;
        }
      }
      const validPositions = getValidMovePositions(gs.board, selectedPiece);
      if (validPositions.some(p => p.col === cell.col && p.row === cell.row)) {
        doMove({ type: 'move', pieceId: selectedPiece.id, to: cell });
        return;
      }
      if (clickedPiece && clickedPiece.owner === gs.currentPlayer) {
        setSelectedPiece(clickedPiece);
        return;
      }
      setSelectedPiece(null);
      return;
    }

    if (clickedPiece && clickedPiece.owner === gs.currentPlayer) {
      setSelectedPiece(clickedPiece);
    }
  }

  function handleRotate(direction: 'cw' | 'ccw') {
    if (!selectedPiece || phaseRef.current !== 'idle') return;
    if (selectedPiece.type === 'king') return;
    doMove({ type: 'rotate', pieceId: selectedPiece.id, direction });
  }

  function handleNewGame() {
    cancelAnimationFrame(rafRef.current);
    moveAnimRef.current = null;
    laserAnimRef.current = null;
    pendingResultRef.current = null;
    displayBoardRef.current = null;
    showWinnerRef.current = false;
    clearExplosions();
    phaseRef.current = 'idle';
    const newState = createGame(CLASSIC_LAYOUT);
    setGameState(newState);
    gameStateRef.current = newState;
    setSelectedPiece(null);
    setShowWinner(false);
    // scheduleAI will be called by the idle render loop if needed
  }

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // AI auto-play trigger
  function scheduleAI(nextState?: GameState) {
    if (!aiConfig) return;
    const state = nextState ?? gameStateRef.current;
    if (state.status !== 'playing') return;
    if (state.currentPlayer !== aiConfig.aiPlayer) return;

    setTimeout(() => {
      if (phaseRef.current !== 'idle') return;
      const s = gameStateRef.current;
      if (s.currentPlayer !== aiConfig.aiPlayer) return;
      if (s.status !== 'playing') return;
      initAudio();
      const move = findBestMove(s, aiConfig.depth);
      if (move) doMove(move);
    }, 400);
  }

  const isIdle = phaseRef.current === 'idle';
  const winner = showWinner && gameState.status !== 'playing' ? gameState.status : null;

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
          cursor: isIdle ? 'pointer' : 'default',
          maxWidth: '95vw',
          maxHeight: '65vh',
          borderRadius: 8,
        }}
      />

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button
          onClick={() => handleRotate('ccw')}
          disabled={!selectedPiece || selectedPiece.type === 'king' || !isIdle}
          style={actionBtnStyle}
        >
          ↶ Rotate Left
        </button>
        <button
          onClick={() => handleRotate('cw')}
          disabled={!selectedPiece || selectedPiece.type === 'king' || !isIdle}
          style={actionBtnStyle}
        >
          ↷ Rotate Right
        </button>
      </div>

      {selectedPiece && isIdle && (
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
              <button onClick={handleNewGame} style={actionBtnStyle}>New Game</button>
              <button onClick={onBackToMenu} style={actionBtnStyle}>Main Menu</button>
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
