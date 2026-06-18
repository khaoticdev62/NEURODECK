import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./Badge";

const meta: Meta<typeof Badge> = {
  title: "Design System/Badge",
  component: Badge,
  argTypes: {
    tone: { control: "select", options: ["neutral", "info", "success", "warning", "error", "agent"] },
    size: { control: "select", options: ["sm", "md"] },
    variant: { control: "select", options: ["fill", "outline"] },
    dot: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: "Badge",
  },
};

export const Tones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge tone="neutral">Neutral</Badge>
      <Badge tone="info">Info</Badge>
      <Badge tone="success">Success</Badge>
      <Badge tone="warning">Warning</Badge>
      <Badge tone="error">Error</Badge>
      <Badge tone="agent">Agent</Badge>
    </div>
  ),
};

export const Outline: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge tone="neutral" variant="outline">Neutral</Badge>
      <Badge tone="info" variant="outline">Info</Badge>
      <Badge tone="success" variant="outline">Success</Badge>
      <Badge tone="warning" variant="outline">Warning</Badge>
      <Badge tone="error" variant="outline">Error</Badge>
      <Badge tone="agent" variant="outline">Agent</Badge>
    </div>
  ),
};

export const WithDot: Story = {
  args: {
    tone: "success",
    dot: true,
    children: "Online",
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
    </div>
  ),
};
