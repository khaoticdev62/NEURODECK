import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Select } from "./Select";

const meta: Meta<typeof Select> = {
  title: "Design System/Select",
  component: Select,
  argTypes: {
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

const OPTIONS = [
  { value: "gemini", label: "Gemini" },
  { value: "ollama", label: "Ollama" },
  { value: "openai", label: "OpenAI" },
];

export const Default: Story = {
  render: function DefaultStory() {
    const [value, setValue] = useState("gemini");
    return <Select label="Provider" value={value} onChange={setValue} options={OPTIONS} />;
  },
};

export const WithPlaceholder: Story = {
  render: function WithPlaceholderStory() {
    const [value, setValue] = useState("");
    return (
      <Select
        label="Model"
        value={value}
        onChange={setValue}
        options={OPTIONS}
        placeholder="Choose a model"
      />
    );
  },
};

export const Error: Story = {
  render: function ErrorStory() {
    const [value, setValue] = useState("");
    return (
      <Select
        label="Required field"
        value={value}
        onChange={setValue}
        options={OPTIONS}
        error="Please select a provider"
      />
    );
  },
};

export const Disabled: Story = {
  render: function DisabledStory() {
    const [value, setValue] = useState("gemini");
    return (
      <Select label="Provider" value={value} onChange={setValue} options={OPTIONS} disabled />
    );
  },
};
