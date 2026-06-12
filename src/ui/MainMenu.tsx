import { COLORS } from '../constants';

interface Props {
  onStartGame: () => void;
}

export function MainMenu({ onStartGame }: Props) {
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
      <button onClick={onStartGame} style={buttonStyle}>
        Play Local
      </button>
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
  transition: 'transform 0.1s, opacity 0.1s',
};
