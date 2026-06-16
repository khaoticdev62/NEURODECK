# Storybook + Chromatic Setup

## Local development

Start the Storybook dev server:

```bash
npm run storybook
```

Then open http://localhost:6006.

## Build static Storybook

```bash
npm run build-storybook
```

Output is written to `frontend/storybook-static`.

## Adding a story

Stories live next to the component they document:

- `frontend/src/design-system/components/core/*.stories.tsx` for design-system primitives
- `frontend/src/react/components/primitives/*.stories.tsx` for app-level primitives
- `frontend/src/react/components/layout/*.stories.tsx` for shell chrome

Use the CSF 3 pattern:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { MyComponent } from "./MyComponent";

const meta: Meta<typeof MyComponent> = {
  title: "Category/MyComponent",
  component: MyComponent,
};

export default meta;
type Story = StoryObj<typeof MyComponent>;

export const Default: Story = {
  args: {
    // ...
  },
};
```

## Chromatic visual regression

Chromatic runs automatically on pull requests and pushes to `master` via `.github/workflows/chromatic.yml`.

### Required setup

1. Create a project at https://www.chromatic.com/
2. Add the `CHROMATIC_PROJECT_TOKEN` secret to the repository.

### Manual publish

```bash
npm run chromatic
```

This requires `CHROMATIC_PROJECT_TOKEN` to be set as an environment variable.

## Notes

- Storybook is configured to import `frontend/src/react/index.css`, so Tailwind and all design tokens are available.
- The default canvas background is set to the NEURODECK app shell color (`#05070a`).
- Storybook was initialized with the Vite builder to match the frontend toolchain.
