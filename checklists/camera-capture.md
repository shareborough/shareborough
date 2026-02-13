# Camera Capture — Feature Checklist

## Implementation

- [x] `capture="environment"` attribute on file input (AddItem.tsx:130)
- [x] `accept="image/*"` to filter to image files only
- [x] Photo preview via FileReader after file selection
- [x] "Upload Photo" / "Change Photo" toggle label
- [x] Helper text: "JPG, PNG, or HEIC. Tap to use camera."
- [x] Upload to AYB storage `item-photos` bucket on submit
- [x] Photo URL stored on item record (`photo_url` field)

## Tests

- [x] `capture="environment"` attribute present on input
- [x] `accept="image/*"` attribute present on input
- [x] Photo preview renders after file selection
- [x] "Change Photo" label shown after file selected
- [x] "Tap to use camera" helper text displayed
- [x] Photo upload called with correct bucket name
- [x] Item created with correct `photo_url` path
- [x] Item created with null `photo_url` when no photo selected

## Docs

- [x] CHECKLIST.md updated with camera capture line item
- [x] TESTING.md updated with AddItem test coverage
- [x] Handoff doc created (handoffs/002-camera-capture-tests.md)

## Not in Scope (future)

- [ ] Image compression before upload (reduce bandwidth on mobile)
- [ ] Multiple photos per item
- [ ] Photo crop/rotate UI
- [ ] Custom camera UI via `getUserMedia()` (not needed for catalog use case)
- [ ] HEIC → JPEG conversion for non-Safari browsers
