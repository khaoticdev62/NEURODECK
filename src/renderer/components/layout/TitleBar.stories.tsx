import type { Meta, StoryObj } from "@storybook/react";
import { TitleBar } from "./TitleBar";

const meta: Meta<typeof TitleBar> = {
  title: "Layout/TitleBar",
  component: TitleBar,
  argTypes: {
    subtitle: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof TitleBar>;

export const Default: Story = {
  args: {
    subtitle: "Session · Gemini · default",
  },
};

export const LongSubtitle: Story = {
  args: {
    subtitle: "Very long project name that should truncate gracefully in the title bar",
  },
};
