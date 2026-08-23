import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ExporterModal } from '../components/ExporterModal';

const SAMPLE_ITEMS = [
  { id: '1', text: 'Pizza', color: '#ff6b6b', weight: 3, enabled: true, icon: '🍕' },
  { id: '2', text: 'Sushi', color: '#6bcb77', weight: 2, enabled: true, icon: '🍣' },
  { id: '3', text: 'Tacos', color: '#ffd93d', weight: 1, enabled: true, icon: '🌮' },
  { id: '4', text: 'Burgers', color: '#4d96ff', weight: 1, enabled: true, icon: '🍔' },
];

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
  title: 'What to Eat Tonight',
  centerText: 'SPIN',
};

const meta = {
  title: 'Modals/ExporterModal',
  component: ExporterModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    onClose: fn(),
  },
} satisfies Meta<typeof ExporterModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    isOpen: true,
    items: SAMPLE_ITEMS,
    config: DEFAULT_CONFIG,
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    items: SAMPLE_ITEMS,
    config: DEFAULT_CONFIG,
  },
};
