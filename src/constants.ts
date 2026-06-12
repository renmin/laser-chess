export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 8;
export const CELL_SIZE = 64;
export const BOARD_PADDING = 32;

export const COLORS = {
  background: '#1a1a2e',
  boardBg: '#0f3460',
  gridLine: '#1a4a7a',
  red: '#e94560',
  redDark: '#c81d4e',
  blue: '#00d4ff',
  blueDark: '#0984e3',
  laser: '#ffe66d',
  laserGlow: 'rgba(255, 230, 109, 0.3)',
  mirror: '#c0e0ff',
  shield: '#cccccc',
  gold: '#daa520',
  validMove: 'rgba(0, 184, 148, 0.35)',
  selectedOutline: '#ffffff',
  text: '#dddddd',
  textDim: '#888888',
  redZone: 'rgba(233, 69, 96, 0.1)',
  blueZone: 'rgba(0, 212, 255, 0.1)',
  crown: '#ffe66d',
  destroyed: '#ff4444',
};

export const DIRECTION_VECTORS: Record<string, { dc: number; dr: number }> = {
  N: { dc: 0, dr: 1 },
  S: { dc: 0, dr: -1 },
  E: { dc: 1, dr: 0 },
  W: { dc: -1, dr: 0 },
  NE: { dc: 1, dr: 1 },
  NW: { dc: -1, dr: 1 },
  SE: { dc: 1, dr: -1 },
  SW: { dc: -1, dr: -1 },
};
