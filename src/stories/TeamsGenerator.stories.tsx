import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { TeamsGenerator } from '../components/TeamsGenerator';

const SAMPLE_ITEMS = [
  { id: '1', text: 'Alice', color: '#ff6b6b', weight: 1, enabled: true },
  { id: '2', text: 'Bob', color: '#ffd93d', weight: 1, enabled: true },
  { id: '3', text: 'Charlie', color: '#6bcb77', weight: 1, enabled: true },
  { id: '4', text: 'Diana', color: '#4d96ff', weight: 1, enabled: true },
  { id: '5', text: 'Eve', color: '#ff6bff', weight: 1, enabled: true },
  { id: '6', text: 'Frank', color: '#ff9671', weight: 1, enabled: true },
];

const meta = {
  title: 'Modals/TeamsGenerator',
  component: TeamsGenerator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    onClose: fn(),
  },
} satisfies Meta<typeof TeamsGenerator>;

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
