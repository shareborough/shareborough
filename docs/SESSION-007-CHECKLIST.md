# Session 007 Checklist — Service Worker, Push Notifications, Accessibility

**Date**: 2026-02-10
**Starting from**: Session 006 complete — 417 tests passing, 37 test files

---

## Session Goals

1. ✅ Create session 007 checklist
2. ✅ Implement service worker for offline PWA functionality
3. ✅ Add web push notifications for borrow request alerts
4. ⬜ Implement image srcset for responsive images (deferred to session 008)
5. ⬜ Add dark mode with system preference detection (deferred to session 008)
6. ⬜ Perform WCAG 2.1 AA accessibility audit (deferred to session 008)
7. ✅ Update behaviors spec with new features
8. ✅ Ensure full test coverage for all new features
9. ✅ Create session 007 handoff document

---

## Priority 1: Service Worker (Offline Caching) ✅

### Implementation Tasks
- [x] Create `public/sw.js` service worker file
- [x] Implement cache-first strategy for static assets (JS, CSS, fonts, images)
- [x] Implement network-first strategy for API calls with fallback
- [x] Add service worker registration in `main.tsx`
- [x] Add service worker update detection and prompt
- [x] Handle offline scenarios gracefully
- [x] Cache versioning for updates

### Testing Tasks
- [x] ServiceWorker.test.tsx — registration, caching, offline behavior (19 tests)
- [x] Test cache-first for static assets
- [x] Test network-first for API with fallback
- [x] Test service worker updates
- [ ] E2E test for offline functionality (deferred — requires manual testing)

### Expected Behaviors
- ✅ Static assets load from cache when offline
- ✅ API calls fail gracefully with user feedback
- ✅ Updates prompt user to refresh
- ✅ No breaking changes to existing functionality

---

## Priority 2: Push Notifications ✅

### Implementation Tasks
- [x] Add push notification permission request UI
- [x] Implement service worker push event handler
- [x] Frontend: subscribe/unsubscribe UI in settings
- [x] Notification click handling (navigate to dashboard)
- [x] Notification icon and badge
- [ ] Backend: push subscription storage (table + endpoints) — **deferred to backend implementation**
- [ ] Backend: push notification sending on borrow request — **deferred to backend implementation**

### Testing Tasks
- [x] PushNotifications.test.tsx — permission, subscribe, receive (17 tests)
- [x] Settings.test.tsx updated with push notification mocks (15 tests still passing)
- [ ] Backend tests for push subscription CRUD — **deferred**
- [ ] Backend tests for push notification sending — **deferred**
- [ ] E2E test for push notification flow — **deferred**

### Expected Behaviors
- ✅ User prompted for notification permission on subscription
- ✅ Clicking notification opens dashboard
- ✅ User can disable notifications in settings
- ✅ Graceful degradation if notifications unsupported
- ⬜ Notifications sent when borrow request created — **requires backend**

---

## Priority 3: Image Srcset (Responsive Images)

### Implementation Tasks
- [ ] Update storage upload to create multiple image sizes (thumbnail, medium, full)
- [ ] Add srcset attribute to all item images
- [ ] Implement sizes attribute based on viewport
- [ ] Update AddItem photo upload to generate sizes
- [ ] Backend: image resize utility (using sharp or similar)

### Testing Tasks
- [ ] ImageSrcset.test.tsx — srcset generation, sizes attribute
- [ ] Backend tests for image resize
- [ ] Visual regression tests for image rendering

### Expected Behaviors
- Mobile devices load smaller images
- Desktop loads full-size images
- Bandwidth savings on mobile
- No quality degradation

---

## Priority 4: Dark Mode

### Implementation Tasks
- [ ] Create theme context (light, dark, system)
- [ ] Add dark mode CSS variables
- [ ] Implement theme toggle in settings
- [ ] Detect system preference on load
- [ ] Persist theme preference in localStorage
- [ ] Update all components for dark mode support
- [ ] Update PWA theme-color for dark mode

### Testing Tasks
- [ ] DarkMode.test.tsx — theme context, toggle, persistence
- [ ] Visual regression tests for dark mode
- [ ] Test all components in dark mode
- [ ] Test theme-color meta tag updates

### Expected Behaviors
- System preference detected on first visit
- Theme persists across sessions
- All components readable in both themes
- Smooth transition between themes
- Toggle accessible via settings

---

## Priority 5: Accessibility Audit (WCAG 2.1 AA)

### Audit Areas
- [ ] **Keyboard navigation** — all interactive elements accessible
- [ ] **Focus indicators** — visible focus states on all controls
- [ ] **ARIA labels** — meaningful labels for screen readers
- [ ] **Color contrast** — 4.5:1 for normal text, 3:1 for large text
- [ ] **Alt text** — all images have descriptive alt text
- [ ] **Form labels** — all inputs properly labeled
- [ ] **Semantic HTML** — proper heading hierarchy, landmarks
- [ ] **Error messages** — associated with form fields
- [ ] **Skip links** — skip to main content
- [ ] **Touch targets** — minimum 44x44px (already implemented)

### Testing Tasks
- [ ] Automated accessibility tests using axe-core
- [ ] Manual keyboard navigation testing
- [ ] Screen reader testing (VoiceOver, NVDA)
- [ ] Color contrast validation
- [ ] Document accessibility fixes

### Expected Behaviors
- All functionality accessible via keyboard
- Screen readers can navigate and use the app
- Color contrast meets WCAG AA
- Focus states clearly visible
- Error messages announced to screen readers

---

## Test Coverage Requirements

### New Test Files Needed
- [ ] `tests/ServiceWorker.test.tsx`
- [ ] `tests/PushNotifications.test.tsx`
- [ ] `tests/ImageSrcset.test.tsx`
- [ ] `tests/DarkMode.test.tsx`
- [ ] `tests/Accessibility.test.tsx`
- [ ] `e2e/offline.spec.ts`
- [ ] `e2e/push-notifications.spec.ts`
- [ ] `e2e/accessibility.spec.ts`

### Updated Test Files
- [ ] Update `testHelpers.tsx` for theme provider
- [ ] Update existing component tests for dark mode
- [ ] Update existing tests for accessibility assertions

---

## Documentation Updates

- [ ] Update `BEHAVIORS.md` with service worker behaviors
- [ ] Update `BEHAVIORS.md` with push notification behaviors
- [ ] Update `BEHAVIORS.md` with dark mode behaviors
- [ ] Update `BEHAVIORS.md` with accessibility requirements
- [ ] Update `CHECKLIST.md` with completed items
- [ ] Create accessibility audit report

---

## Success Criteria

- [ ] All tests passing (target: 500+ tests)
- [ ] No TypeScript errors
- [ ] No React Router warnings
- [ ] Service worker caches assets correctly
- [ ] Push notifications work on supported browsers
- [ ] Images load responsively with srcset
- [ ] Dark mode works across all components
- [ ] WCAG 2.1 AA compliance achieved
- [ ] Zero accessibility errors from axe-core
- [ ] Manual accessibility testing passed
- [ ] All new features documented in BEHAVIORS.md

---

## Notes

- Service worker requires HTTPS (works on localhost)
- Push notifications require HTTPS and user permission
- Image srcset requires backend image processing
- Dark mode should respect prefers-color-scheme
- Accessibility is an ongoing commitment, not a one-time fix
