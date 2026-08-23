import type { Meta, StoryObj } from '@storybook/react-vite';
import { FullscreenStage } from '../components/FullscreenStage';

const SAMPLE_ITEMS = [
  { id: '1', text: 'Option A', color: '#ff6b6b', weight: 2, enabled: true, icon: '🎯' },
  { id: '2', text: 'Option B', color: '#6bcb77', weight: 1, enabled: true, icon: '🎲' },
  { id: '3', text: 'Option C', color: '#4d96ff', weight: 3, enabled: true, icon: '🔥' },
];

const DEFAULT_THEME = {
  id: 'cyber-neon',
  name: 'Cyber Neon',
  description: 'Electric cyber theme',
  sliceColors: ['#ff6b6b', '#6bcb77', '#4d96ff', '#ffd93d', '#ff6bff', '#00f2fe', '#ff9671', '#9b59ff'],
  rimColor: '#1a1a2e',
  rimBorder: '#6366f1',
  hubColor: '#0f0f1a',
  hubBorder: '#6366f1',
  needleColor: '#ffffff',
  needleAccent: '#6366f1',
  textColor: '#ffffff',
  glowColor: '#6366f1',
  bgGradient: 'radial-gradient(circle, #0a0a14 0%, #020205 100%)',
};

const DEFAULT_CONFIG = {
  spinDuration: 5,
  spinSpeed: 'normal' as const,
  pointerPosition: 'top' as const,
  fontFamily: 'Outfit' as const,
  fontSizeMultiplier: 1.0,
  textTransform: 'none' as const,
  enableSound: true,
  soundVolume: 0.7,
  enableConfetti: true,
  mysteryMode: false,
  eliminationMode: false,
  winningAnimation: 'confetti' as const,
  title: 'Fullscreen Demo',
  centerText: 'SPIN',
};

const meta = {
  title: 'Overlays/FullscreenStage',
  component: FullscreenStage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  args: {
    onSpinStart: () => {},
    onSpinEnd: () => {},
    onExitFullscreen: () => {},
    onToggleSound: () => {},
    onTriggerSpin: () => {},
  },
} satisfies Meta<typeof FullscreenStage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: SAMPLE_ITEMS,
    theme: DEFAULT_THEME,
    config: DEFAULT_CONFIG,
    isSpinning: false,
  },
};
