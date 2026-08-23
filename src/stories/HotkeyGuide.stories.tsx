import type { Meta, StoryObj } from '@storybook/react-vite';
import { HotkeyGuide } from '../components/HotkeyGuide';

const meta = {
  title: 'Overlays/HotkeyGuide',
  component: HotkeyGuide,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof HotkeyGuide>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
