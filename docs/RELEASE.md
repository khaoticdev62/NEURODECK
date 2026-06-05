# Release Guide

## Version Numbering

NEURODECK follows Semantic Versioning with KFMS codenames:
```
v{MAJOR}.{MINOR}.{PATCH}-{codename}
```
- **MAJOR**: Breaking changes, codenames reset
- **MINOR**: New features, new Egyptian god codename
- **PATCH**: Bug fixes, codename stays same

Current: `v1.8.0-ptah`

## Pre-Release Checklist

### 1. Version Bump
- [ ] `package.json` version updated
- [ ] `Cargo.toml` version updated
- [ ] `frontend/package.json` version updated
- [ ] `infra/meta/meta.json` version updated
- [ ] KFMS stamp run: `./scripts/kfms/khaotic-init.sh stamp`

### 2. Quality Gates
- [ ] `cargo test --workspace` passes
- [ ] `npm run frontend:build` succeeds
- [ ] `npm run quality:fallow:dead-code` = 0
- [ ] `npm run quality:fallow:dupes` = 0
- [ ] `npm run ci` passes

### 3. Security
- [ ] `cargo audit` clean
- [ ] `npm audit` clean (no high/critical)
- [ ] No API keys in source
- [ ] `NEURODECK_ALLOW_UNSAFE_EXEC` not documented as default

### 4. Documentation
- [ ] `CHANGELOG.md` updated
- [ ] `docs/SECURITY.md` current
- [ ] `docs/SETUP.md` reflects current install steps
- [ ] KFMS metadata validated

## Build Process

```bash
# Full production build
npm run build

# Outputs:
# dist/neurodeck_{version}_windows_x64.exe   (NSIS installer)
# dist/neurodeck_{version}_windows_x64.zip   (Portable zip)
# dist/neurodeck_{version}_amd64.AppImage    (Linux)
# dist/neurodeck_{version}_steamdeck_amd64.AppImage  (Steam Deck)
```

## Release Steps

1. **Prepare branch**: `git checkout -b release/v{version}`
2. **Run checklist above**
3. **Build**: `npm run build`
4. **Tag**: `git tag v{version}-{codename}`
5. **Push**: `git push origin release/v{version} --follow-tags`
6. **Create GitHub Release** with artifacts from `dist/`
7. **Announce** in CHANGELOG

## Emergency Hotfix

For critical bugs on `master`:

```bash
git checkout master
git checkout -b hotfix/v{version+1}
# Fix the bug
git commit -m "hotfix: description"
git tag v{version+1}-{codename}
git push origin hotfix/v{version+1} --tags
```

## Supported Versions

| Version | Status | End of Support |
|---------|--------|---------------|
| 1.8.x | Active | TBD |
| 1.7.x | Maintenance | 2026-12-31 |
| < 1.7 | Unsupported | — |
