import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { WinnerModal } from '../components/WinnerModal';

const meta = {
  title: 'Modals/WinnerModal',
  component: WinnerModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    onClose: fn(),
    onSpinAgain: fn(),
    onRemoveWinner: fn(),
    onRestoreAll: fn(),
  },
} satisfies Meta<typeof WinnerModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ClassicWinner: Story = {
  args: {
    winner: {
      id: 'w1',
      text: 'Pizza Night',
      color: '#ff6b6b',
      weight: 2,
      enabled: true,
      icon: '🍕',
      note: 'A delicious choice for tonight!',
    },
    isOpen: true,
    mode: 'classic',
    totalActiveCount: 8,
    totalWeight: 12,
    isEliminationMode: false,
    enableConfetti: true,
    confettiIntensity: 'normal',
    confettiDuration: 3,
  },
};

export const BattleRoyaleWinner: Story = {
  args: {
    winner: {
      id: 'w1',
      text: 'Last One Standing',
      color: '#ffd93d',
      weight: 1,
      enabled: true,
      icon: '🏆',
    },
    isOpen: true,
    mode: 'elimination',
    totalActiveCount: 1,
    totalWeight: 5,
    isEliminationMode: true,
    enableConfetti: true,
    confettiIntensity: 'epic',
    confettiDuration: 5,
  },
};

export const Closed: Story = {
  args: {
    winner: null,
    isOpen: false,
    mode: 'classic',
    totalActiveCount: 8,
    totalWeight: 12,
    isEliminationMode: false,
    enableConfetti: true,
  },
};
