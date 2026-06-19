import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Search } from "lucide-react";
import { TextInput } from "./TextInput";

const meta: Meta<typeof TextInput> = {
  title: "Design System/TextInput",
  component: TextInput,
  argTypes: {
    disabled: { control: "boolean" },
    type: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof TextInput>;

export const Default: Story = {
  render: function DefaultStory() {
    const [value, setValue] = useState("");
    return <TextInput label="Prompt" value={value} onChange={setValue} placeholder="Ask anything..." />;
  },
};

export const WithIcon: Story = {
  render: function WithIconStory() {
    const [value, setValue] = useState("");
    return (
      <TextInput
        label="Search"
        value={value}
        onChange={setValue}
        placeholder="Search memory..."
        icon={<Search className="h-4 w-4" />}
      />
    );
  },
};

export const WithHint: Story = {
  render: function WithHintStory() {
    const [value, setValue] = useState("");
    return (
      <TextInput
        label="API Key"
        value={value}
        onChange={setValue}
        placeholder="sk-..."
        hint="Stored in the OS keychain"
      />
    );
  },
};

export const WithError: Story = {
  render: function WithErrorStory() {
    const [value, setValue] = useState("invalid");
    return (
      <TextInput
        label="Email"
        value={value}
        onChange={setValue}
        error="Please enter a valid email address"
      />
    );
  },
};

export const Disabled: Story = {
  render: function DisabledStory() {
    const [value, setValue] = useState("locked");
    return <TextInput label="Read-only" value={value} onChange={setValue} disabled />;
  },
};
