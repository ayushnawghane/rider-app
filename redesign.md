# Blinkcar Redesign — Page-by-Page Todo

Redesign the whole app to a **bold, grainy orange "golden horizon" / fire-gradient GenZ** theme.
Work through this list **one item at a time**; check it off when the page is redesigned, reviewed, and builds clean.

## Design direction (north star)
- **Vibe:** bold restructured layouts, grainy orange aurora gradients, golden-horizon + fire gradients, GenZ energy.
- **Type:** big, bold display headings; tight tracking; confident hierarchy.
- **Color:** fiery orange/ember primary, golden amber accents, warm near-black ink text, warm cream backgrounds.
- **Texture:** subtle film-grain over gradient surfaces; glassy/frosted cards; warm orange glow shadows.
- **Motion:** tasteful — aurora drift, float, slide-up/fade-in on entry, springy active states.

## Per-page checklist (definition of done)
For every page below:
- [ ] Restructure layout for the new bold hierarchy (not just recolor)
- [ ] Apply theme tokens/gradients (fire/golden-horizon/aurora) + grain where it fits
- [ ] Bold display headings + restyled buttons, inputs, cards, badges
- [ ] Verify states: loading / empty / error / disabled
- [ ] Mobile + safe-area check (top notch, bottom nav clearance)
- [ ] `npm run build` clean + relevant tests pass

---

## 0. Foundation (do FIRST — propagates everywhere)
- [x] `tailwind.config.js` — fire palette (red/orange/amber/gold/yellow/glow), paper/char/ink, accents, glow shadows, fonts, aurora animations
- [x] `src/theme/variables.css` — CSS tokens (golden + fire-night modes), grain overlay, aurora/glass/text-fire utilities, bold base typography, reskinned component classes
- [x] `index.html` — Clash Display + Inter fonts, theme-color
- [x] `src/components/ui/Aurora.tsx` — reusable `<Aurora>` background + `<Grain>` overlay components
- [x] `THEME.md` — token + helper documentation
- [x] `src/components/SplashScreen.tsx` — brand reveal + onboarding slides ✅ screenshotted

## 1. Shared components (do SECOND — used across many pages)
- [ ] `src/components/navigation/MobileBottomNav.tsx` — restructured dock (Home / Publish / Your Rides / Inbox / Rewards)
- [ ] `src/components/Button.tsx`
- [ ] `src/components/ui/PageHeader.tsx` (plain / gradient / toolbar variants)
- [ ] `src/components/ui/AppCard.tsx`
- [ ] `src/components/ui/BackButton.tsx`
- [ ] `src/components/ui/StatusBadge.tsx`
- [ ] `src/components/ui/EmptyState.tsx`
- [ ] `src/components/ui/PageLoader.tsx`
- [ ] `src/components/Skeleton.tsx`
- [ ] `src/components/LoadingOverlay.tsx`
- [ ] `src/components/profile/ProfileCompletionBanner.tsx`
- [ ] `src/components/maps/MapComponent.tsx` (map controls / overlays styling)
- [ ] `src/components/maps/LocationSearch.tsx`
- [ ] `src/components/maps/RoutePreview.tsx`
- [ ] `src/components/permissions/LocationPermission.tsx`

## 2. Auth (first impressions — make them strong)
- [x] `src/pages/auth/LoginPage.tsx` — `/login` ✅ Golden Horizon aurora + glass card, screenshotted

- [x] `src/pages/auth/RegisterPage.tsx` — `/register` ✅ Aurora Mist glass card matching Login, fire submit, screenshotted (tests pass)
- [x] `src/pages/auth/KycUploadPage.tsx` — `/profile/kyc` ✅ aura header, warm status banner, fire upload dropzone, fire-check requirements, fire upload + success, screenshotted
- [x] `src/pages/auth/DeleteAccountPage.tsx` — `/delete-account` ✅ red emergency header + delete button, warm warning, DELETE confirm, screenshotted (tests pass)
- [x] `src/pages/auth/PrivacyPolicyPage.tsx` — `/privacy-policy` ✅ aura header + fire badge, white content card with fire section icons, screenshotted

## 3. Home
- [ ] `src/pages/home/HomePage.tsx` — `/home` (hero, search/route card, quick actions, routes, promo)

## 4. Rides (core flows)
- [x] `src/pages/rides/FindRidePage.tsx` — `/find-ride` ✅ fire search form, glossy pin/route icons, fire sort pills, driver cards w/ fire→gold route line, fire empty state, screenshotted
- [x] `src/pages/rides/RideDetailPage.tsx` — `/rides/detail/:id` ✅ aura + map card, fire status badge, fire→gold from/to timeline, fire join/owner actions, fire SOS, screenshotted
- [x] `src/pages/rides/PublishRidePage.tsx` — `/publish-ride` ✅ aura header, fire route selectors, fire seat stepper, fire vehicle cards, fire +50 points card, fire publish button, screenshotted
- [ ] `src/pages/rides/UploadRidePage.tsx` — `/upload-ride`
- [ ] `src/pages/rides/SimpleUploadRidePage.tsx` — simple upload variant
- [ ] `src/pages/rides/EditRidePage.tsx` — `/rides/edit/:id`
- [x] `src/pages/rides/RideHistoryPage.tsx` — `/rides` ✅ fire header + aura, glossy car icons, warm status badges, fire empty state, screenshotted
- [x] `src/pages/rides/ActiveRidePage.tsx` — `/rides/active/:id` ✅ themed header/map chrome, fire status timeline, fire route, fire/red action tiles + confirm modals, screenshotted
- [x] `src/pages/rides/TripTrackingPage.tsx` — `/trips/tracking/:id` ✅ themed header + status pill, fire progress bar, fire route, screenshotted

## 5. Rewards (showcase — make it pop)
- [x] `src/pages/rewards/RewardsPage.tsx` — `/rewards` ✅ fire hero card, glossy AppIcons, fire tabs/chips, screenshotted

## 6. Inbox & Support
- [x] `src/pages/inbox/InboxPage.tsx` — `/inbox` ✅ aura header, glossy inbox/message icons, fire active-chat chip, bold empty states, screenshotted
- [x] `src/pages/support/SupportPage.tsx` — `/support` ✅ aura header, fire add button, dispute cards w/ fire status badges, fire empty state, screenshotted
- [x] `src/pages/support/NewDisputePage.tsx` — `/support/dispute/new` ✅ aura header, fire-selected type cards, themed inputs, warm tips card, fire submit + success state, screenshotted
- [x] `src/pages/support/DisputeChatPage.tsx` — `/support/dispute/:id` ✅ fire user bubbles / white support bubbles, fire send bar, themed empty + skeleton, screenshotted

## 7. Safety
- [x] `src/pages/safety/SafetyPage.tsx` — `/safety`, `/safety/sos` ✅ de-inline-styled to Tailwind: aura header, location card + live badge, bold red SOS card, fire-icon safety tips, red/fire contacts, fire success state, screenshotted

## 8. Profile & Settings
- [x] `src/pages/profile/ProfilePage.tsx` — `/profile` ✅ aura header, fire avatar, fire-tinted info/menu chips, fire edit forms + toggles, fire setup wizard, screenshotted
- [x] `src/pages/profile/SettingsPage.tsx` — `/profile/settings` ✅ aura header, fire-icon menu rows, muted disabled rows, screenshotted
- [x] `src/pages/profile/NotificationsPage.tsx` — `/notifications` ✅ de-Ionic'd to aura header + glossy type icons + fire NEW pills + unread tint, kept pull-to-refresh, screenshotted

## 9. Location pickers
- [ ] `src/pages/common/SelectLocationPage.tsx` — `/select-location`
- [ ] `src/pages/location/SelectLocationPage.tsx` — location variant (confirm which is active)

## 10. Admin
- [ ] `src/pages/admin/AdminDashboardPage.tsx` — `/admin`
- [ ] `src/pages/admin/AdminListPage.tsx` — `/admin/:section`

---

## Legacy / verify-then-skip (not in active routes — confirm before touching)
- [ ] `src/pages/Tab1.tsx`, `Tab2.tsx`, `Tab3.tsx` (+ their `.css`) — appear unused; delete or skip
- [ ] `src/components/ExploreContainer.tsx` — appears unused

## Notes
- Reference price/empty/loading states for each page before styling so nothing regresses.
- Keep all logic, routing, and copy meaning unchanged — visual/layout only.
- Re-run `npm run build`, `npm run lint`, and `npm run test.unit` after each batch.
