import type { Piece, Player } from '../types';
import { COLORS } from '../constants';

interface Props {
  currentPlayer: Player;
  turnNumber: number;
  capturedPieces: Piece[];
  onBackToMenu: () => void;
}

export function GameHUD({ currentPlayer, turnNumber, capturedPieces, onBackToMenu }: Props) {
  const redCaptured = capturedPieces.filter(p => p.owner === 'red');
  const blueCaptured = capturedPieces.filter(p => p.owner === 'blue');

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      maxWidth: 720,
      padding: '0 16px',
      marginBottom: 12,
    }}>
      <button
        onClick={onBackToMenu}
        style={{
          background: 'none',
          border: 'none',
          color: COLORS.textDim,
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        ← Menu
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <PlayerBadge player="blue" isActive={currentPlayer === 'blue'} captured={blueCaptured} />
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}>
          <span style={{ fontSize: 12, color: COLORS.textDim }}>Turn {turnNumber}</span>
          <span style={{
            fontSize: 14,
            fontWeight: 'bold',
            color: currentPlayer === 'red' ? COLORS.red : COLORS.blue,
          }}>
            {currentPlayer === 'red' ? 'Red' : 'Blue'}'s Turn
          </span>
        </div>
        <PlayerBadge player="red" isActive={currentPlayer === 'red'} captured={redCaptured} />
      </div>

      <div style={{ width: 60 }} />
    </div>
  );
}

function PlayerBadge({ player, isActive, captured }: { player: Player; isActive: boolean; captured: Piece[] }) {
  const color = player === 'red' ? COLORS.red : COLORS.blue;
  return (
    <div style={{
      padding: '6px 12px',
      borderRadius: 6,
      border: `2px solid ${isActive ? color : 'transparent'}`,
      backgroundColor: isActive ? `${color}15` : 'transparent',
      minWidth: 80,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 13, fontWeight: 'bold', color }}>
        {player === 'red' ? 'Red' : 'Blue'}
      </div>
      {captured.length > 0 && (
        <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 2 }}>
          Lost: {captured.map(p => pieceIcon(p.type)).join(' ')}
        </div>
      )}
    </div>
  );
}

function pieceIcon(type: string): string {
  switch (type) {
    case 'pyramid': return '△';
    case 'anubis': return '▣';
    case 'scarab': return '★';
    case 'king': return '♚';
    default: return '?';
  }
}
