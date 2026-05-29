# fonts/

Self-host scaffold for the three brand families. **The `.woff2` files are not committed** — they're fetched by `download.sh` (the build environment can't pull binary font files, so this is a one-command local step).

| Family | Role | Weights used |
|---|---|---|
| **Orbitron** | Display — headings, stats, wordmark | 700, 900 |
| **Share Tech Mono** | Mono — eyebrows, code, CTAs, IDs | 400 |
| **Exo 2** | Body — paragraphs, UI text | 300, 400, 500, 600 |

## To self-host

```bash
cd fonts
./download.sh        # pulls woff2 from Google Fonts into ./files/
```

Then in any page, swap the CDN `@import` in `colors_and_type.css` for:

```html
<link rel="stylesheet" href="fonts/fonts.css" />
```

`fonts.css` already has the `@font-face` blocks pointing at `./files/`. Until you run the script, pages fall back to the Google Fonts CDN `@import` at the top of `colors_and_type.css` — so everything works either way.

## Why self-host?

- **Offline / portable** — the downloadable Skill works with no network.
- **No FOUT** — `font-display: swap` + preload kills the flash (see `.corrections.log` entry on Exo 2 weight-300 on Safari).
- **Privacy** — no Google Fonts request from client browsers.

## License

All three are **SIL Open Font License 1.1** — free for commercial use, self-hosting allowed. Keep `OFL.txt` alongside the files if you redistribute.
