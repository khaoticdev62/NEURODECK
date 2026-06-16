import type { Preview } from "@storybook/react";
import "../src/react/index.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "neurodeck",
      values: [
        { name: "neurodeck", value: "#05070a" },
        { name: "light", value: "#f8fafc" },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "padded",
  },
};

export default preview;
