import { useState } from 'react';
import { COLORS } from '../constants';

interface Props {
  onStartLocal: () => void;
  onStartAI: (depth: number) => void;
}

export function MainMenu({ onStartLocal, onStartAI }: Props) {
  const [showAI, setShowAI] = useState(false);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: COLORS.background,
      color: COLORS.text,
      fontFamily: 'Arial, sans-serif',
    }}>
      <h1 style={{ fontSize: 36, marginBottom: 8, letterSpacing: 2 }}>
        CHESS <span style={{ color: COLORS.laser }}>with</span> LASERS
      </h1>
      <div style={{
        width: 200,
        height: 2,
        background: `linear-gradient(to right, ${COLORS.blue}, ${COLORS.laser}, ${COLORS.red})`,
        marginBottom: 48,
      }} />

      {!showAI ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={onStartLocal} style={buttonStyle}>
            Local Multiplayer
          </button>
          <button onClick={() => setShowAI(true)} style={{ ...buttonStyle, backgroundColor: COLORS.red }}>
            vs AI
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 14, color: COLORS.textDim, marginBottom: 4 }}>Select Difficulty</div>
          <button onClick={() => onStartAI(1)} style={{ ...buttonStyle, backgroundColor: '#27ae60' }}>
            Easy
          </button>
          <button onClick={() => onStartAI(2)} style={{ ...buttonStyle, backgroundColor: '#f39c12' }}>
            Medium
          </button>
          <button onClick={() => onStartAI(3)} style={{ ...buttonStyle, backgroundColor: '#e74c3c' }}>
            Hard
          </button>
          <button onClick={() => setShowAI(false)} style={{ ...buttonStyleSmall, marginTop: 8 }}>
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '14px 48px',
  fontSize: 18,
  fontWeight: 'bold',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  backgroundColor: COLORS.blue,
  color: '#1a1a2e',
  minWidth: 220,
};

const buttonStyleSmall: React.CSSProperties = {
  padding: '8px 24px',
  fontSize: 14,
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  backgroundColor: 'transparent',
  color: COLORS.textDim,
};
