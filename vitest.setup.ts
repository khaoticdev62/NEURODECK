import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// vitest.config.mts does not enable `globals: true`, so Testing Library's
// automatic afterEach-cleanup detection never fires — without this, DOM from
// one test leaks into the next (e.g. duplicate nav links across `it` blocks).
afterEach(cleanup)
