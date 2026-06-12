import { useState } from 'react';
import { MainMenu } from './ui/MainMenu';
import { GameScreen } from './ui/GameScreen';
import { TestHarness } from './ui/TestHarness';
import { LayoutEditor } from './ui/LayoutEditor';

type Screen = 'menu' | 'game';

function getMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('test') === 'laser') return 'test';
  if (params.has('editor')) return 'editor';
  return 'game';
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const mode = getMode();

  if (mode === 'test') return <TestHarness />;
  if (mode === 'editor') return <LayoutEditor />;

  if (screen === 'menu') {
    return <MainMenu onStartGame={() => setScreen('game')} />;
  }

  return <GameScreen onBackToMenu={() => setScreen('menu')} />;
}
