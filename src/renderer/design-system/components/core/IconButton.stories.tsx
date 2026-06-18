import type { Meta, StoryObj } from "@storybook/react";
import { Settings, Trash2 } from "lucide-react";
import { IconButton } from "./IconButton";

const meta: Meta<typeof IconButton> = {
  title: "Design System/IconButton",
  component: IconButton,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "primary", "danger", "subtle", "outline", "ghost"],
    },
    size: { control: "select", options: ["sm", "md", "lg"] },
    disabled: { control: "boolean" },
    showTooltip: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof IconButton>;

export const Default: Story = {
  args: {
    icon: <Settings className="h-4 w-4" />,
    label: "Settings",
  },
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <IconButton variant="default" icon={<Settings className="h-4 w-4" />} label="Default" />
      <IconButton variant="primary" icon={<Settings className="h-4 w-4" />} label="Primary" />
      <IconButton variant="danger" icon={<Trash2 className="h-4 w-4" />} label="Danger" />
      <IconButton variant="subtle" icon={<Settings className="h-4 w-4" />} label="Subtle" />
      <IconButton variant="outline" icon={<Settings className="h-4 w-4" />} label="Outline" />
      <IconButton variant="ghost" icon={<Settings className="h-4 w-4" />} label="Ghost" />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <IconButton size="sm" icon={<Settings className="h-3.5 w-3.5" />} label="Small" />
      <IconButton size="md" icon={<Settings className="h-4 w-4" />} label="Medium" />
      <IconButton size="lg" icon={<Settings className="h-5 w-5" />} label="Large" />
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    icon: <Settings className="h-4 w-4" />,
    label: "Settings",
    disabled: true,
  },
};
