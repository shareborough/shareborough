# Handoff 006 — PWA Manifest, Library Stats, Image Optimization, React Router v7

**Date**: 2026-02-10
**Session**: 006
**Status**: Complete — 417 tests passing, 37 test files, 0 failures, TypeScript clean, 0 React Router warnings

---

## What was built

### 1. PWA Manifest ("Add to Home Screen")
- `public/manifest.json` — full PWA manifest with `display: standalone`, portrait orientation
- App icons: 192x192 and 512x512 PNG (regular + maskable variants) in `public/icons/`
- `index.html` updated with: `<link rel="manifest">`, `<meta name="theme-color">` (#4a7c59 sage), `<link rel="apple-touch-icon">`, Apple Web App meta tags
- Background color (#faf9f7 warm-50) matches app background for splash screen
- App installable on Android Chrome, mobile Safari (15.4+), Edge

### 2. Library Stats on Dashboard Cards
- Dashboard now fetches **all loans** (not just active) to compute stats
- Each library card shows: "{N} lent" and "{N} friend(s) helped"
- Stats use `data-testid` attributes for reliable test targeting
- "Friends helped" counts unique borrower IDs per library
- Singular "friend" vs plural "friends" grammar
- Stats section hidden when library has zero loans (no clutter)

### 3. Image Optimization
- All remote item images use `loading="lazy"` for deferred loading below the fold
- All remote item images use `decoding="async"` for non-blocking decode
- Pages updated: LibraryDetail, PublicLibrary, PublicItem
- AddItem preview image intentionally NOT lazy-loaded (client-side data URL, would be counterproductive)

### 4. React Router v7 Migration (Future Flags)
- `BrowserRouter` in `main.tsx` includes `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}`
- All test wrappers updated: `testHelpers.tsx`, `NavBar.test.tsx`, `Landing.test.tsx`, `NotFound.test.tsx`, `AuthGuards.test.tsx`
- **Zero React Router deprecation warnings** during dev or test
- Smooth upgrade path when ready to move to React Router v7

---

## Key files for next session

| Document | Path |
|----------|------|
| **Master Checklist** | `docs/CHECKLIST.md` |
| **Session Checklist** | `docs/SESSION-006-CHECKLIST.md` |
| **Behaviors Spec** | `docs/BEHAVIORS.md` |
| **This Handoff** | `handoffs/006-pwa-stats-images-router.md` |

---

## Test summary

| Category | Files | Tests |
|----------|-------|-------|
| Component tests | 28 files | 320 tests |
| Unit tests (logic) | 6 files | 33 tests |
| Integration (vitest) | 3 files | 64 tests |
| **Total vitest** | **37 files** | **417 tests** |
| E2E (Playwright) | 6 files | ~34 tests |

---

## Next priorities (from master checklist)

1. **Service worker** — offline caching for PWA (cache-first for static, network-first for API)
2. **Push notifications** — web push for borrow request alerts
3. **Image srcset** — responsive image sizes for different viewports
4. **Dark mode** — theme toggle with system preference detection
5. **Accessibility audit** — WCAG 2.1 AA compliance pass
6. **React Router v7 upgrade** — full upgrade (future flags already enabled)

---

## Architecture notes for next session

### PWA manifest structure
```
public/
├── manifest.json          # PWA web app manifest
├── icons/
│   ├── icon-192.png       # Regular 192x192
│   ├── icon-512.png       # Regular 512x512
│   ├── icon-maskable-192.png  # Android adaptive icon
│   └── icon-maskable-512.png  # Android adaptive icon
├── _redirects             # SPA routing (Netlify)
└── _headers               # Asset caching
```

### Library stats data flow
```
Dashboard loadAll() → Promise.all([
  libraries,
  requests,
  activeLoans,
  allLoans,        ← NEW: fetches ALL loans for stats
  items,
])

Stats computed from allLoans:
- lentCountByLibrary: Map<libId, count>
- friendsByLibrary: Map<libId, Set<borrowerId>>
```

### React Router v7 upgrade path
All future flags are enabled. When ready to upgrade:
1. `npm install react-router@7` (replaces react-router-dom)
2. Change imports from `react-router-dom` → `react-router`
3. Remove `future` prop (flags become default behavior)
4. Update route loaders if adopting data router patterns

### No remaining known bugs or warnings
All issues resolved. Clean test output, clean TypeScript, clean console.
