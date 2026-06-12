import { useState } from 'react';
import { MainMenu } from './ui/MainMenu';
import { GameScreen } from './ui/GameScreen';
import { TestHarness } from './ui/TestHarness';
import { LayoutEditor } from './ui/LayoutEditor';
import type { Player } from './types';

export interface AIConfig {
  aiPlayer: Player;
  depth: number;
}

type Screen = 'menu' | 'game';

function getMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('test') === 'laser') return 'test';
  if (params.has('editor')) return 'editor';
  return 'game';
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const mode = getMode();

  if (mode === 'test') return <TestHarness />;
  if (mode === 'editor') return <LayoutEditor />;

  if (screen === 'menu') {
    return (
      <MainMenu
        onStartLocal={() => { setAiConfig(null); setScreen('game'); }}
        onStartAI={(depth) => { setAiConfig({ aiPlayer: 'blue', depth }); setScreen('game'); }}
      />
    );
  }

  return <GameScreen onBackToMenu={() => setScreen('menu')} aiConfig={aiConfig} />;
}
