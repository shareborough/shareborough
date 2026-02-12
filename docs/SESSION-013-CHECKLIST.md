# SESSION-013: Production Bug Fixes & Mobile E2E Testing

**Date**: 2026-02-10
**Goal**: Fix critical production bugs found during manual testing, improve mobile UX, and add comprehensive E2E test coverage with email verification

## Status: IN PROGRESS

## Critical Production Bugs (from manual testing)

### P0: Photo Upload Issues
- [ ] **B1**: ImageCropper zoom broken — only allows up/down movement, no pinch-to-zoom
- [ ] **B2**: AddItem photo input requires camera, no option to select from gallery
- [ ] **B3**: Mobile photo preview sizing issues (overflow, pinch-zoom needed)
- [ ] **Test**: Add E2E tests for photo upload flow (camera + gallery)

### P0: Settings Display Name Error
- [ ] **B4**: Error when changing display name in Settings page
- [ ] **Investigation**: Reproduce error, check browser console, check API request
- [ ] **Fix**: Apply fix based on investigation
- [ ] **Test**: Add E2E test for Settings save flow

### P0: Add Item Form Error
- [ ] **B5**: "Something went wrong" error when adding item
- [ ] **Investigation**: Check browser console, API response, error handling
- [ ] **Fix**: Add proper error messages with `friendlyError()`
- [ ] **Test**: Add E2E test for item creation flow

### P0: Mobile Responsiveness
- [ ] **B6**: UI overflow on mobile — content extends beyond screen edges
- [ ] **B7**: Text wrapping issues on mobile
- [ ] **B8**: Pinch-to-zoom needed for certain UI elements
- [ ] **Audit**: Review all pages on iPhone SE viewport (375x667)
- [ ] **Fix**: Apply CSS fixes for mobile breakpoints
- [ ] **Test**: Run mobile E2E tests on all pages

## E2E Testing Infrastructure

### MailSlurp Integration
- [ ] **T1**: Install `mailslurp-client` SDK
- [ ] **T2**: Create test helper for disposable email inboxes
- [ ] **T3**: Add E2E test for signup → email verification → login
- [ ] **T4**: Add E2E test for password reset flow
- [ ] **T5**: Add E2E test for account deletion with email confirmation
- [ ] **Environment**: Store MailSlurp API key in `.env.test`

### Production E2E Tests
- [ ] **T6**: Expand production smoke tests to cover:
  - [ ] Full signup flow with email verification
  - [ ] Login flow
  - [ ] Library creation
  - [ ] Item creation with photo
  - [ ] Public library browsing
  - [ ] Borrow request flow
  - [ ] Owner approves request flow
  - [ ] Mark item as returned flow
  - [ ] Settings update flow
- [ ] **T7**: Create read-only smoke tests for production
- [ ] **T8**: Create test data cleanup script
- [ ] **T9**: Run full E2E suite on staging (not production)

## Behaviors Documentation

- [ ] **D1**: Review BEHAVIORS.md for completeness
- [ ] **D2**: Add missing user paths:
  - [ ] Photo upload (camera vs gallery)
  - [ ] Photo editing/cropping
  - [ ] Error states (network failures, validation errors)
  - [ ] Mobile-specific behaviors (touch gestures, pinch-zoom)
  - [ ] Email verification flow
  - [ ] Password reset flow
  - [ ] Account deletion flow
- [ ] **D3**: Update Test Coverage Matrix in BEHAVIORS.md
- [ ] **D4**: Ensure every behavior has corresponding E2E test

## Test Coverage Audit

- [ ] **A1**: Verify all behaviors documented in BEHAVIORS.md have tests
- [ ] **A2**: Check for false positives in existing tests
- [ ] **A3**: Add missing edge case tests
- [ ] **A4**: Run full test suite: `npm test`
- [ ] **A5**: Run production E2E suite: `npx playwright test --config=playwright.config.prod.ts`
- [ ] **A6**: Ensure zero test warnings/errors

## Documentation Updates

- [ ] Update SESSION-013-CHECKLIST.md as work progresses
- [ ] Update master-checklist.md with session results
- [ ] Create handoff document: `handoffs/013-production-fixes-mobile-e2e.md`
- [ ] Update BEHAVIORS.md with new documented behaviors

## Files to Modify

### Bug Fixes
- `src/components/ImageCropper.tsx` — Fix zoom/pinch gestures
- `src/pages/AddItem.tsx` — Add gallery picker option, fix error handling
- `src/pages/Settings.tsx` — Fix display name save error
- `src/pages/*.tsx` — Mobile responsiveness fixes

### Testing
- `package.json` — Add `mailslurp-client` dependency
- `tests/helpers/mailslurp.ts` — New helper for email testing
- `e2e/email-verification.spec.ts` — New E2E test
- `e2e/password-reset.spec.ts` — New E2E test
- `e2e/full-user-journey.spec.ts` — Enhanced golden path test
- `e2e/mobile-responsiveness.spec.ts` — New mobile-specific tests

### Documentation
- `docs/BEHAVIORS.md` — Add missing behaviors
- `docs/SESSION-013-CHECKLIST.md` — This file
- `../../docs/master-checklist.md` — Update priority stack
- `handoffs/013-production-fixes-mobile-e2e.md` — New handoff doc

## Success Criteria

1. ✅ All P0 bugs fixed and deployed to production
2. ✅ Photo upload works with both camera AND gallery on mobile
3. ✅ ImageCropper supports pinch-to-zoom on mobile
4. ✅ Settings save works without errors
5. ✅ Add Item form shows friendly error messages
6. ✅ All pages render correctly on mobile (no overflow)
7. ✅ MailSlurp integrated for email verification E2E tests
8. ✅ Full user journey E2E test passing on production
9. ✅ BEHAVIORS.md complete with all user paths documented
10. ✅ Test Coverage Matrix shows 100% coverage
11. ✅ Production smoke tests expanded to cover critical flows
12. ✅ All tests passing (unit + E2E + production smoke)

## Next Session Priorities

1. Staging environment setup for safe E2E testing
2. Performance monitoring (Core Web Vitals, Lighthouse)
3. Error tracking (Sentry/LogRocket)
4. CI/CD automation (GitHub Actions)
5. Monitoring & alerting (uptime, errors, performance)
