import { useRef, useEffect, useState, useCallback } from 'react';
import type { Board, Piece, PieceType, OrientationDeg, Player } from '../types';
import { COLORS, CELL_SIZE, BOARD_PADDING } from '../constants';
import { createEmptyBoard, getPieceAt } from '../core/board';
import { drawBoard, getCanvasSize, screenToCell, cellToScreen, drawSelection } from '../renderer/board-renderer';
import { drawPieces } from '../renderer/piece-renderer';

type PalettePiece = { type: PieceType; owner: Player };

const PALETTE: PalettePiece[] = [
  { type: 'sphinx', owner: 'red' },
  { type: 'king', owner: 'red' },
  { type: 'anubis', owner: 'red' },
  { type: 'pyramid', owner: 'red' },
  { type: 'scarab', owner: 'red' },
  { type: 'sphinx', owner: 'blue' },
  { type: 'king', owner: 'blue' },
  { type: 'anubis', owner: 'blue' },
  { type: 'pyramid', owner: 'blue' },
  { type: 'scarab', owner: 'blue' },
];

let nextId = 1;

export function LayoutEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [board, setBoard] = useState<Board>(() => createEmptyBoard());
  const [selectedPalette, setSelectedPalette] = useState<PalettePiece | null>(null);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [exportText, setExportText] = useState('');
  const { width, height } = getCanvasSize();

  const render = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);
    drawBoard(ctx, board);
    drawPieces(ctx, board);
    if (selectedPieceId) {
      const p = board.pieces.find(x => x.id === selectedPieceId);
      if (p) drawSelection(ctx, p.position.col, p.position.row);
    }
  }, [board, selectedPieceId, width, height]);

  useEffect(() => { render(); }, [render]);

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const sx = (e.clientX - rect.left) * scaleX;
    const sy = (e.clientY - rect.top) * scaleY;
    const cell = screenToCell(sx, sy);
    if (!cell) return;

    const existing = getPieceAt(board, cell.col, cell.row);

    if (existing) {
      setSelectedPieceId(existing.id);
      setSelectedPalette(null);
      return;
    }

    if (selectedPalette) {
      const newPiece: Piece = {
        id: `p${nextId++}`,
        type: selectedPalette.type,
        owner: selectedPalette.owner,
        position: { col: cell.col, row: cell.row },
        deg: 0,
      };
      setBoard(prev => ({ ...prev, pieces: [...prev.pieces, newPiece] }));
      setSelectedPieceId(newPiece.id);
      return;
    }

    setSelectedPieceId(null);
  }

  function handleRotate() {
    if (!selectedPieceId) return;
    setBoard(prev => ({
      ...prev,
      pieces: prev.pieces.map(p => {
        if (p.id !== selectedPieceId) return p;
        if (p.type === 'king') return p;
        // Unified: +90 for all piece types (same as Rotate Left / ccw)
        return { ...p, deg: ((p.deg + 90) % 360) as OrientationDeg };
      }),
    }));
  }

  function handleDelete() {
    if (!selectedPieceId) return;
    setBoard(prev => ({
      ...prev,
      pieces: prev.pieces.filter(p => p.id !== selectedPieceId),
    }));
    setSelectedPieceId(null);
  }

  function handleExport() {
    const data = board.pieces.map(p => ({
      type: p.type,
      owner: p.owner,
      col: p.position.col,
      row: p.position.row,
      deg: p.deg,
    }));
    setExportText(JSON.stringify(data, null, 2));
  }

  function handleImport() {
    try {
      const data = JSON.parse(exportText);
      const pieces: Piece[] = data.map((d: any, i: number) => ({
        id: `p${nextId++}`,
        type: d.type,
        owner: d.owner,
        position: { col: d.col, row: d.row },
        deg: d.deg,
      }));
      setBoard({ ...createEmptyBoard(), pieces });
      setSelectedPieceId(null);
    } catch {
      alert('Invalid JSON');
    }
  }

  const selectedPiece = selectedPieceId ? board.pieces.find(p => p.id === selectedPieceId) : null;

  return (
    <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', padding: 16, color: COLORS.text, fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>Layout Editor</h2>

      {/* Palette */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {PALETTE.map((pp, i) => (
          <button
            key={i}
            onClick={() => { setSelectedPalette(pp); setSelectedPieceId(null); }}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              cursor: 'pointer',
              backgroundColor: selectedPalette?.type === pp.type && selectedPalette?.owner === pp.owner ? '#334' : '#1e2a3a',
              color: pp.owner === 'red' ? COLORS.red : COLORS.blue,
              border: selectedPalette?.type === pp.type && selectedPalette?.owner === pp.owner ? '2px solid #fff' : '1px solid #444',
              borderRadius: 4,
            }}
          >
            {pp.owner} {pp.type}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        style={{ cursor: 'pointer', maxWidth: '90vw', display: 'block', marginBottom: 12 }}
      />

      {/* Selected piece info + actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        {selectedPiece && (
          <span style={{ fontSize: 13, color: '#aaa' }}>
            Selected: {selectedPiece.owner} {selectedPiece.type} at ({selectedPiece.position.col},{selectedPiece.position.row}) deg={selectedPiece.deg}
          </span>
        )}
        <button onClick={handleRotate} disabled={!selectedPiece} style={btnStyle}>Rotate 90°</button>
        <button onClick={handleDelete} disabled={!selectedPiece} style={{ ...btnStyle, color: '#f66' }}>Delete</button>
        <button onClick={() => { setBoard({ ...createEmptyBoard(), pieces: [] }); setSelectedPieceId(null); }} style={btnStyle}>Clear All</button>
      </div>

      {/* Export / Import */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button onClick={handleExport} style={{ ...btnStyle, backgroundColor: '#0984e3', color: '#fff' }}>Export JSON</button>
        <button onClick={handleImport} style={btnStyle}>Import JSON</button>
      </div>
      <textarea
        value={exportText}
        onChange={e => setExportText(e.target.value)}
        style={{
          width: '100%',
          maxWidth: 700,
          height: 200,
          backgroundColor: '#0a1628',
          color: '#ccc',
          border: '1px solid #334',
          borderRadius: 4,
          padding: 8,
          fontSize: 12,
          fontFamily: 'monospace',
        }}
        placeholder="Click Export to generate layout JSON, or paste JSON here and click Import"
      />
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '6px 16px',
  fontSize: 13,
  cursor: 'pointer',
  backgroundColor: '#1e2a3a',
  color: '#ccc',
  border: '1px solid #444',
  borderRadius: 4,
};
