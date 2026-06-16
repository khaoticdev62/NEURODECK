import type { Meta, StoryObj } from "@storybook/react";
import { Panel } from "./Panel";

const meta: Meta<typeof Panel> = {
  title: "Design System/Panel",
  component: Panel,
  argTypes: {
    emphasis: { control: "select", options: ["default", "raised", "active", "critical"] },
    density: { control: "select", options: ["compact", "normal", "spacious"] },
  },
};

export default meta;
type Story = StoryObj<typeof Panel>;

export const Default: Story = {
  args: {
    title: "Panel Title",
    description: "A reusable tactical-glass content surface.",
    children: <p className="text-sm text-nd-text-secondary">Panel body content goes here.</p>,
  },
};

export const WithEyebrow: Story = {
  args: {
    eyebrow: "System",
    title: "Diagnostics",
    description: "Runtime health and IPC telemetry.",
    children: <p className="text-sm text-nd-text-secondary">All systems nominal.</p>,
  },
};

export const EmphasisStates: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Panel title="Default" emphasis="default">
        Default panel surface.
      </Panel>
      <Panel title="Raised" emphasis="raised">
        Raised emphasis with extra shadow.
      </Panel>
      <Panel title="Active" emphasis="active">
        Active emphasis with cyan glow.
      </Panel>
      <Panel title="Critical" emphasis="critical">
        Critical emphasis with red glow.
      </Panel>
    </div>
  ),
};

export const Densities: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Panel title="Compact" density="compact">
        Compact padding.
      </Panel>
      <Panel title="Normal" density="normal">
        Normal padding.
      </Panel>
      <Panel title="Spacious" density="spacious">
        Spacious padding.
      </Panel>
    </div>
  ),
};
