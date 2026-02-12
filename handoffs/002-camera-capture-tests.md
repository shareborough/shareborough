# Handoff 002 — Camera Capture & AddItem Tests

**Date:** 2026-02-09
**Status:** Complete

---

## What Was Done

### Camera Capture (already implemented)

The AddItem page already had `capture="environment"` on the file input (line 130 of `src/pages/AddItem.tsx`). This was implemented during the initial build. On mobile devices:

- **iOS Safari / Android Chrome**: Tapping "Upload Photo" opens the native camera app directly
- **Desktop browsers**: Opens the standard file picker (the `capture` attribute is ignored)
- **PWA standalone mode**: Works reliably because it uses the native `<input>` approach, not `getUserMedia()`

The implementation is the simplest, most compatible approach:

```html
<input type="file" accept="image/*" capture="environment" />
```

Key attributes:
- `accept="image/*"` — Only show image files in the picker
- `capture="environment"` — Prefer the rear-facing (environment) camera on mobile

No additional libraries, permissions dialogs, or polyfills needed.

### AddItem Component Tests (new)

Created `tests/AddItem.test.tsx` with **20 tests** covering:

**Basic rendering (3 tests)**
- Redirects to `/login` when not authenticated
- Shows loading state while library data loads
- Renders full form (photo, name, description, submit button)
- Back link navigates to correct library

**Camera capture (4 tests)**
- File input has `capture="environment"` attribute
- File input has `accept="image/*"` attribute
- Photo preview appears after selecting a file (with FileReader mock)
- Helper text "Tap to use camera" is visible

**Form submission (6 tests)**
- Creates item without photo (null photo_url)
- Uploads photo to `item-photos` bucket before creating item
- Includes description when provided
- Shows specific error message on API failure
- Shows generic "Failed to add item" for non-Error exceptions
- Shows "Adding..." loading state during submission

**Facet fields (7 tests)**
- Renders text input for text-type facets
- Renders select dropdown for facets with predefined options
- Renders Yes/No select for boolean facets
- Renders number input for number-type facets
- Creates facet value records on submission
- Skips empty/unfilled facet values

### Docs Updated

- `docs/TESTING.md` — Added AddItem row to "What We Test" table
- `docs/CHECKLIST.md` — Added camera capture line item, updated test count (65 -> 85)

---

## Technical Notes

### Why `capture="environment"` (not `getUserMedia`)

| Approach | Pros | Cons |
|----------|------|------|
| `<input capture>` | Zero JS, works everywhere, no permissions prompt, native UX | No live preview, can't customize camera UI |
| `getUserMedia()` | Custom camera UI, live preview, filters | iOS PWA bugs, permission complexity, needs polyfills |

For a lending library catalog where users snap a quick photo of an item, the native camera approach is the right call. Users get a familiar camera experience with zero friction.

### FileReader Mock Pattern

Testing the photo preview required mocking `FileReader` because jsdom doesn't support it:

```typescript
const mockFileReader = {
  readAsDataURL: vi.fn(),
  result: "data:image/jpeg;base64,abc123",
  onload: null as (() => void) | null,
};
vi.spyOn(window, "FileReader").mockImplementation(
  () => mockFileReader as unknown as FileReader
);

// Trigger file selection
fireEvent.change(fileInput, { target: { files: [file] } });
// Manually fire the onload callback
mockFileReader.onload!();
```

This pattern can be reused for any component that needs to test file upload previews.

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `tests/AddItem.test.tsx` | Created | 20 component tests for AddItem page |
| `tests/LibraryDetail.test.tsx` | Created | 16 component tests for LibraryDetail page |
| `tests/AddFacet.test.tsx` | Created | 12 component tests for AddFacet component |
| `tests/PublicItem.test.tsx` | Fixed | Added navigation verification to borrow flow (was a false positive) |
| `tests/CreateLibrary.test.tsx` | Fixed | Added slug format + description assertions (was a false positive) |
| `docs/TESTING.md` | Updated | Added new test files to coverage table |
| `docs/CHECKLIST.md` | Updated | Added camera capture item, updated test count |

---

## Test Results

```
113 tests passing (15 test files)
- AddItem.test.tsx: 20 tests (new)
- LibraryDetail.test.tsx: 16 tests (new)
- AddFacet.test.tsx: 12 tests (new)
- PublicItem.test.tsx: +1 assertion (navigation verification)
- CreateLibrary.test.tsx: tightened slug/description assertions
- All other existing tests: unchanged
```
