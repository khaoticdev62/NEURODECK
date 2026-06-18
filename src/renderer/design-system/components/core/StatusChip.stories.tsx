import type { Meta, StoryObj } from "@storybook/react";
import { StatusChip } from "./StatusChip";

const meta: Meta<typeof StatusChip> = {
  title: "Design System/StatusChip",
  component: StatusChip,
  argTypes: {
    tone: { control: "select", options: ["info", "success", "warning", "error"] },
    size: { control: "select", options: ["sm", "md"] },
    pulse: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof StatusChip>;

export const Default: Story = {
  args: {
    children: "Running",
  },
};

export const Tones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <StatusChip tone="info">Info</StatusChip>
      <StatusChip tone="success">Success</StatusChip>
      <StatusChip tone="warning">Warning</StatusChip>
      <StatusChip tone="error">Error</StatusChip>
    </div>
  ),
};

export const Pulse: Story = {
  args: {
    tone: "success",
    pulse: true,
    children: "Live",
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <StatusChip size="sm">Small</StatusChip>
      <StatusChip size="md">Medium</StatusChip>
    </div>
  ),
};
