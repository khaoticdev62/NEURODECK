import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "../../../design-system/components/core/Button";

const meta: Meta<typeof Modal> = {
  title: "Primitives/Modal",
  component: Modal,
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg", "xl"] },
    closeOnBackdrop: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

function DefaultStory(args: React.ComponentProps<typeof Modal>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Modal</Button>
      <Modal
        {...args}
        open={open}
        onClose={() => setOpen(false)}
        title="Confirm Action"
        description="This will restart the Rust sidecar."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setOpen(false)}>
              Confirm
            </Button>
          </>
        }
      >
        <p className="text-sm text-nd-text-secondary">
          Any active PTY sessions will be disconnected.
        </p>
      </Modal>
    </>
  );
}

export const Default: Story = {
  render: (args) => <DefaultStory {...args} />,
};

function SizesStory() {
  const [size, setSize] = useState<"sm" | "md" | "lg" | "xl">("md");
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {(["sm", "md", "lg", "xl"] as const).map((s) => (
          <Button key={s} variant="secondary" onClick={() => { setSize(s); setOpen(true); }}>
            {s.toUpperCase()}
          </Button>
        ))}
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`${size.toUpperCase()} Modal`}
        size={size}
        footer={<Button onClick={() => setOpen(false)}>Close</Button>}
      >
        <p className="text-sm text-nd-text-secondary">This modal uses the {size} size.</p>
      </Modal>
    </>
  );
}

export const Sizes: Story = {
  render: () => <SizesStory />,
};
