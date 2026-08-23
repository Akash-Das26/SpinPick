import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { TournamentMode } from '../components/TournamentMode';

const SAMPLE_ITEMS = [
  { id: '1', text: 'Alpha', color: '#ff6b6b', weight: 1, enabled: true },
  { id: '2', text: 'Bravo', color: '#ffd93d', weight: 1, enabled: true },
  { id: '3', text: 'Charlie', color: '#6bcb77', weight: 1, enabled: true },
  { id: '4', text: 'Delta', color: '#4d96ff', weight: 1, enabled: true },
  { id: '5', text: 'Echo', color: '#ff6bff', weight: 1, enabled: true },
  { id: '6', text: 'Foxtrot', color: '#ff9671', weight: 1, enabled: true },
  { id: '7', text: 'Golf', color: '#9b59ff', weight: 1, enabled: true },
  { id: '8', text: 'Hotel', color: '#00f2fe', weight: 1, enabled: true },
];

const meta = {
  title: 'Modals/TournamentMode',
  component: TournamentMode,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    onClose: fn(),
  },
} satisfies Meta<typeof TournamentMode>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    items: SAMPLE_ITEMS,
    isOpen: true,
  },
};

export const Closed: Story = {
  args: {
    items: SAMPLE_ITEMS,
    isOpen: false,
  },
};
