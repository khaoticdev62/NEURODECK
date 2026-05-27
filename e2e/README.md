# E2E Utilities

This folder contains Playwright support tooling for end-to-end workflows.

## PDF Generation

Generate a PDF from an HTML file with:

```bash
npm run --prefix e2e generate:pdf -- <source-html> <output-pdf>
```

You can also use environment variables:

- `PDF_SOURCE`
- `PDF_OUTPUT`

If no paths are passed, the helper falls back to the design-system spec paths used by the original utility:

- `design-system/design-system-spec.html`
- `design-system/design-system-spec.pdf`
