import type { Meta, StoryObj } from "@storybook/react";
import { Toast } from "../../design-system/components/feedback/Toast";

const meta: Meta<typeof Toast> = {
  title: "Primitives/Toast",
  component: Toast,
  argTypes: {
    tone: { control: "select", options: ["info", "success", "warning", "error"] },
  },
};

export default meta;
type Story = StoryObj<typeof Toast>;

export const Default: Story = {
  args: {
    tone: "info",
    title: "Heads up",
    message: "A new agent version is available.",
    onClose: () => {},
  },
};

export const Tones: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Toast tone="info" title="Info" message="Something happened." onClose={() => {}} />
      <Toast tone="success" title="Success" message="Operation completed." onClose={() => {}} />
      <Toast tone="warning" title="Warning" message="Check your settings." onClose={() => {}} />
      <Toast tone="error" title="Error" message="Sidecar connection lost." onClose={() => {}} />
    </div>
  ),
};

export const Dismissible: Story = {
  args: {
    tone: "success",
    title: "Saved",
    message: "Your preferences were updated.",
    onClose: () => {},
  },
};
