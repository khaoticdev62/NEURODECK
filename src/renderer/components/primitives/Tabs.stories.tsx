import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from "./Tabs";

const meta: Meta<typeof TabGroup> = {
  title: "Primitives/Tabs",
  component: TabGroup,
};

export default meta;
type Story = StoryObj<typeof TabGroup>;

function DefaultStory() {
  const [value, setValue] = useState("chat");
  return (
    <TabGroup value={value} onChange={setValue} className="w-full max-w-md">
      <TabList aria-label="Primary navigation">
        <Tab value="chat">Chat</Tab>
        <Tab value="canvas">Canvas</Tab>
        <Tab value="terminal">Terminal</Tab>
      </TabList>
      <TabPanels className="mt-3 rounded-lg border border-nd-border-subtle bg-nd-surface-secondary/50 p-4">
        <TabPanel value="chat">Chat content</TabPanel>
        <TabPanel value="canvas">Canvas content</TabPanel>
        <TabPanel value="terminal">Terminal content</TabPanel>
      </TabPanels>
    </TabGroup>
  );
}

export const Default: Story = {
  render: () => <DefaultStory />,
};

function WithDisabledTabStory() {
  const [value, setValue] = useState("chat");
  return (
    <TabGroup value={value} onChange={setValue} className="w-full max-w-md">
      <TabList aria-label="Settings sections">
        <Tab value="general">General</Tab>
        <Tab value="privacy">Privacy</Tab>
        <Tab value="advanced" disabled>
          Advanced
        </Tab>
      </TabList>
      <TabPanels className="mt-3 rounded-lg border border-nd-border-subtle bg-nd-surface-secondary/50 p-4">
        <TabPanel value="general">General settings</TabPanel>
        <TabPanel value="privacy">Privacy settings</TabPanel>
        <TabPanel value="advanced">Advanced settings</TabPanel>
      </TabPanels>
    </TabGroup>
  );
}

export const WithDisabledTab: Story = {
  render: () => <WithDisabledTabStory />,
};
