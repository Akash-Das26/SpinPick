import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { QuickFlipModal } from '../components/QuickFlipModal';

const meta = {
  title: 'Modals/QuickFlipModal',
  component: QuickFlipModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: { control: 'boolean' },
  },
  args: {
    onClose: fn(),
  },
} satisfies Meta<typeof QuickFlipModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    isOpen: true,
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
  },
};
