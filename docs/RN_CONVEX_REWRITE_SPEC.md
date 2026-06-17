# BlinkCar Rider App — React Native + Convex Rewrite Spec

> **Goal:** Rebuild the BlinkCar carpool rider app from scratch in **React Native (Expo)** + **Convex**, with a BlaBlaCar-grade UX. The #1 success criterion is **zero UX bugs** — every flow must be predictable, recoverable, and obvious. This document is the build plan: follow it phase by phase. Each phase has scope, deliverables, a Convex/RN spec, and a **UX Definition of Done** that must pass before moving on.
>
> **Visual target:** The look-and-feel is already designed. The folder `../blinkcar/blinkcar` is a high-fidelity React web prototype implementing the **"Aurora" design system** (warm orange→pink gradients, cream surfaces, Space Grotesk + Inter type, grain texture, glassmorphism). It covers the same flows as this app. **We port that exact visual identity to React Native** — it is the source of truth for colors, type, radii, shadows, components, and screen layouts. See **Appendix A**. When this spec and the Aurora prototype disagree on *behavior*, this spec wins (it fixes the UX bugs); when they disagree on *visuals*, the Aurora prototype wins.

---

## 0. Why this rewrite exists (read first)

The current app (React + Ionic + Capacitor + Supabase) works but has accumulated UX rough edges:

- Rides auto-transition `pending → active → completed` on a timer with **no explicit "start ride" action** — users don't know when a ride is live.
- **Location detection** can hang on weak GPS with no offline fallback or clear loading/error state.
- **Realtime subscriptions** are set up ad-hoc per page and can leak channels.
- **Profile completion** treats all fields as equally required; users don't know what's blocking them.
- **No driver↔passenger chat** (only dispute chat exists).
- **No real cancellation flow**, no payment, ratings can be left without completing a ride.
- OTP rate-limit countdowns aren't surfaced in the UI.

This rewrite fixes the *system* that produced those bugs, not just the bugs. The core principles below are non-negotiable and apply to every phase.

### 0.1 Non-negotiable UX principles (the "BlaBlaCar bar")

1. **Every screen has 4 explicit states:** `loading`, `empty`, `error` (with retry), `content`. No blank screens, no infinite spinners. A spinner that runs >8s must convert to an error+retry.
2. **Every async action is optimistic-where-safe and always reversible-feeling.** Buttons show a pending state, disable on tap, and re-enable on failure with a clear toast. No double-submits ever.
3. **State transitions are explicit and user-driven.** A ride becomes "active" because the driver tapped **Start ride**, not because of a clock. The user always knows what state they're in and what the next step is.
4. **One primary action per screen.** The main CTA is visually dominant, thumb-reachable (bottom), and never ambiguous.
5. **Progress is always visible** in multi-step flows (a stepper: 1 Route · 2 Details · 3 Review · 4 Publish). Back never loses entered data.
6. **Locations are confirmed on a map, never just typed.** Like BlaBlaCar: autocomplete → drop a confirmable pin → "Confirm pickup".
7. **Permissions are requested in context with a pre-prompt** ("We use your location to find rides near you"), never cold on app launch.
8. **No dead ends.** Errors, empty results, and rejections always offer a next action.
9. **Realtime is reliable:** subscriptions are owned by Convex hooks (auto cleanup), reconnect on foreground, and show a subtle "reconnecting" banner when offline.
10. **Accessibility & i18n from day one:** every interactive element has a label; all strings come from an i18n catalog; tap targets ≥ 44pt.

> **Rule:** A phase is not "done" until its UX Definition of Done passes on a real device (or simulator) for both iOS and Android, in both online and offline-degraded conditions.

---

## 1. Target architecture

### 1.1 Stack decisions

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Expo (managed) + React Native** | EAS Build for native; `expo-dev-client` for native modules. |
| Navigation | **Expo Router** (file-based) | Typed routes; deep links for free. |
| Backend / DB | **Convex** | Schema, queries, mutations, actions, realtime, file storage, scheduled functions, cron. |
| Auth | **Convex Auth** with a **custom phone-OTP provider** | Wraps MSG91 in a Convex action. Keep email/password as fallback. |
| Maps | **react-native-maps** (Google provider) | Plus Google Places (Autocomplete + Directions) via Convex actions to hide the API key. |
| Location | **expo-location** | Foreground + background (for active ride tracking). |
| Push | **expo-notifications** + Convex action → Expo Push (or FCM/APNs) | Replaces Supabase edge function + raw FCM. |
| State | **Convex hooks + React Context** for session/UI only | No Redux. Convex is the source of truth. |
| Forms | **react-hook-form + zod** | Shared zod schemas validate on client AND in Convex. |
| Styling | **NativeWind** + a typed theme module | Map Aurora tokens (Appendix A) to a `theme.ts`; build the DS component lib first. |
| Gradients | **expo-linear-gradient** | For `grad-hot` / `grad-soft` / `grad-text` and aurora backgrounds. |
| Fonts | **expo-font** (Space Grotesk + Inter) | Load via `useFonts`; gate splash until ready. |
| Grain / glass | grain PNG overlay + `expo-blur` (BlurView) | Recreate the grain texture + glassmorphism cards. |
| Animation | **react-native-reanimated** + Moti | Press-scale (0.97), staggered fade-up lists, track-marker motion, progress bars. |
| i18n | **i18next + expo-localization** | All strings externalized from day one. |
| Error monitoring | **Sentry (expo)** | Capture crashes + handled errors; tag by screen. |
| Analytics | **PostHog or Amplitude** | Funnel tracking for each core flow (see §13). |

### 1.2 Convex project layout

```
convex/
  schema.ts            # all tables + indexes + validators
  auth.ts              # Convex Auth config (phone OTP + email)
  auth/otp.ts          # MSG91 send/verify action + rate limiting
  users.ts             # profile queries/mutations
  rides.ts             # create/search/update/cancel rides
  bookings.ts          # join/leave/seat management
  tracking.ts          # live location writes + queries
  chat.ts              # ride chat + dispute chat
  ratings.ts           # post-ride ratings
  rewards.ts           # points ledger (idempotent via eventKey)
  notifications.ts     # in-app + push fan-out
  disputes.ts          # support lifecycle
  sos.ts               # emergency alerts
  admin.ts             # admin-only queries/mutations (role-guarded)
  files.ts             # storage upload URLs (KYC, avatars)
  crons.ts             # cleanup, stale-ride reconciliation
  lib/
    auth.ts            # getCurrentUser, requireUser, requireAdmin helpers
    validators.ts      # shared zod/convex validators
    geo.ts             # haversine, polyline decode
```

### 1.3 App layout (Expo Router)

```
app/
  _layout.tsx                 # ConvexProvider + Auth gate + theme + i18n
  (auth)/
    login.tsx                 # phone OTP (default) + email toggle
    verify.tsx                # OTP entry with resend countdown
    register.tsx
  (onboarding)/
    profile-setup.tsx         # progressive: name → photo → done
    permissions.tsx           # in-context location/notif pre-prompts
  (tabs)/
    _layout.tsx               # bottom tab nav (Home, Rides, Inbox, Profile)
    index.tsx                 # Home / search entry
    rides.tsx                 # My rides (upcoming + history, segmented)
    inbox.tsx                 # Notifications + chats
    profile.tsx
  search/
    results.tsx               # ride search results
    [rideId].tsx              # ride detail + join
  publish/
    route.tsx                 # step 1
    details.tsx               # step 2
    review.tsx                # step 3 + publish
  ride/
    [rideId]/
      active.tsx              # live tracking + chat + start/complete
      chat.tsx
      rate.tsx
  location-picker.tsx         # map-confirm picker (modal)
  safety.tsx
  support/
    index.tsx
    new.tsx
    [disputeId].tsx
  rewards.tsx
  settings.tsx
  kyc.tsx
components/
  ui/                         # DS: Button, Card, Sheet, Field, Stepper, StateView...
  ride/                       # RideCard, SeatPicker, RouteMap, DriverChip...
hooks/
lib/
i18n/
```

---

## 2. Data model (Convex schema)

This consolidates and cleans the legacy Supabase model. Note: the legacy app had **two parallel ride models** (`rides` and `published_rides`) and overlapping `ride_participants`/`bookings`. We collapse to **one `rides` table + one `bookings` table**.

```ts
// convex/schema.ts (abridged — implement fully in Phase 1)
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    authId: v.string(),                 // Convex Auth subject
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    fullName: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    role: v.union(v.literal("rider"), v.literal("driver"), v.literal("admin")),
    kycStatus: v.union(v.literal("none"), v.literal("pending"),
                       v.literal("approved"), v.literal("rejected")),
    kycDocStorageId: v.optional(v.id("_storage")),
    vehicle: v.optional(v.object({
      type: v.string(), make: v.optional(v.string()), model: v.optional(v.string()),
      number: v.string(), color: v.optional(v.string()),
    })),
    language: v.string(),               // default "en"
    notifPrefs: v.object({ rides: v.boolean(), chat: v.boolean(), marketing: v.boolean() }),
    isBlocked: v.boolean(),
    points: v.number(),
    ratingDriver: v.optional(v.number()),
    ratingPassenger: v.optional(v.number()),
    ridesTaken: v.number(),
    ridesPublished: v.number(),
    expoPushTokens: v.array(v.string()),
    profileComplete: v.boolean(),       // computed on write
  }).index("by_authId", ["authId"]).index("by_phone", ["phone"]),

  rides: defineTable({
    driverId: v.id("users"),
    from: v.object({ label: v.string(), lat: v.number(), lng: v.number() }),
    to: v.object({ label: v.string(), lat: v.number(), lng: v.number() }),
    departAt: v.number(),               // epoch ms
    seatsTotal: v.number(),
    seatsBooked: v.number(),
    pricePerSeat: v.number(),
    vehicleType: v.string(),
    vehicleNumber: v.string(),
    distanceKm: v.optional(v.number()),
    durationMin: v.optional(v.number()),
    routePolyline: v.optional(v.string()),
    notes: v.optional(v.string()),
    // EXPLICIT lifecycle — driver-driven, never timer-driven:
    status: v.union(v.literal("scheduled"), v.literal("started"),
                    v.literal("completed"), v.literal("cancelled")),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    cancelReason: v.optional(v.string()),
  }).index("by_driver", ["driverId"])
    .index("by_status_depart", ["status", "departAt"])
    // geo search handled via bounding-box filter in query; add lat buckets if needed
    ,

  bookings: defineTable({
    rideId: v.id("rides"),
    passengerId: v.id("users"),
    seats: v.number(),
    status: v.union(v.literal("requested"), v.literal("confirmed"),
                    v.literal("completed"), v.literal("cancelled")),
    pickupNote: v.optional(v.string()),
    totalPrice: v.number(),
    requestedAt: v.number(),
    confirmedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    cancelledBy: v.optional(v.union(v.literal("rider"), v.literal("driver"))),
  }).index("by_ride", ["rideId"])
    .index("by_passenger", ["passengerId"])
    .index("by_ride_passenger", ["rideId", "passengerId"]),

  liveLocations: defineTable({
    rideId: v.id("rides"), userId: v.id("users"),
    lat: v.number(), lng: v.number(), heading: v.optional(v.number()),
    accuracy: v.optional(v.number()), at: v.number(),
  }).index("by_ride", ["rideId"]).index("by_ride_user", ["rideId", "userId"]),

  chatMessages: defineTable({
    threadType: v.union(v.literal("ride"), v.literal("dispute")),
    threadId: v.string(),               // rideId or disputeId
    senderId: v.id("users"),
    body: v.string(),
    at: v.number(),
    readBy: v.array(v.id("users")),
  }).index("by_thread", ["threadType", "threadId", "at"]),

  ratings: defineTable({
    rideId: v.id("rides"), raterId: v.id("users"), rateeId: v.id("users"),
    stars: v.number(), review: v.optional(v.string()),
    direction: v.union(v.literal("of_driver"), v.literal("of_passenger")), at: v.number(),
  }).index("by_ride", ["rideId"]).index("by_ratee", ["rateeId"]),

  rewards: defineTable({
    userId: v.id("users"), points: v.number(), action: v.string(),
    eventKey: v.string(),               // UNIQUE → idempotent
    rideId: v.optional(v.id("rides")), at: v.number(),
  }).index("by_user", ["userId"]).index("by_eventKey", ["eventKey"]),

  notifications: defineTable({
    userId: v.id("users"), title: v.string(), body: v.string(),
    type: v.union(v.literal("ride"), v.literal("chat"),
                  v.literal("dispute"), v.literal("system")),
    data: v.optional(v.any()), read: v.boolean(), at: v.number(),
  }).index("by_user_read", ["userId", "read"]).index("by_user_at", ["userId", "at"]),

  disputes: defineTable({
    userId: v.id("users"), rideId: v.optional(v.id("rides")),
    type: v.string(), description: v.string(),
    status: v.union(v.literal("open"), v.literal("in_review"), v.literal("resolved")),
    agentId: v.optional(v.id("users")), at: v.number(),
  }).index("by_user", ["userId"]).index("by_status", ["status"]),

  sosAlerts: defineTable({
    userId: v.id("users"), rideId: v.optional(v.id("rides")),
    lat: v.number(), lng: v.number(),
    status: v.union(v.literal("active"), v.literal("resolved")),
    at: v.number(), resolvedAt: v.optional(v.number()),
  }).index("by_status", ["status"]),

  otpRequests: defineTable({           // rate limiting + verification
    phone: v.string(), codeHash: v.string(), expiresAt: v.number(),
    attempts: v.number(), sends: v.number(), windowStart: v.number(),
  }).index("by_phone", ["phone"]),
});
```

**Key model fixes vs. legacy:**
- Single ride model (no `published_rides` duplication).
- `status` is an **explicit lifecycle** with `startedAt`/`completedAt` set by mutations, never by reading the clock.
- `bookings.status` is the single source of truth for a passenger's relationship to a ride (no separate `ride_participants`).
- `rewards.eventKey` enforces idempotency so points can never double-award.

---

## Phase-by-phase plan

Each phase is independently shippable to TestFlight/internal track. Don't start a phase until the previous phase's **UX Definition of Done** passes.

---

## Phase 1 — Foundation & design system

**Goal:** A runnable Expo app wired to Convex, with the design-system primitives that guarantee consistent UX states everywhere.

### Scope
- Expo + Expo Router + TypeScript + NativeWind + Convex client provider.
- Convex project created; `schema.ts` fully implemented from §2.
- i18n catalog (`en` to start) wired; no hardcoded strings allowed past this phase.
- Sentry + analytics initialized.
- **Port the Aurora design system (Appendix A) to a typed `theme.ts`**: all color tokens, gradients, radii (`r-sm..r-xl`, `pill`), shadows (`sm/md/lg/glow`), and typography (Space Grotesk display + Inter sans). Load fonts with `expo-font`. Build the shared primitives the prototype relies on: `AuroraBackground` (radial-gradient orbs + grain + drift), `GlassCard` (BlurView), gradient text/buttons.
- **Design system** (`components/ui`) matching the Aurora prototype's components 1:1: `Button` (`primary` = grad-hot + shadow-glow, `dark`, `ghost`/glass; press-scale 0.97; built-in pending/disabled states), `IconButton` (42px glass circle, `solid` variant), `TextField`/`Field` (label + bordered input-wrap, orange focus ring), `Chip` (`soft`/`good`/active), `Card`/`GlassCard`, `Stepper` (4-dot progress), `Avatar` (gradient + initials), `StarRating`, `VerifiedBadge`, `RouteLine` (orange start dot → dashed stem → ink end dot), `BottomNav` (frosted, center FAB), and the critical **`StateView`** wrapper that renders `loading | empty | error(retry) | content` consistently.
- Light theme is the baseline (the Aurora system is light/cream). Dark theme deferred.
- Global **OfflineBanner** + **toast** system, styled to Aurora.

### Deliverables
- `app/_layout.tsx` mounts `ConvexProvider`, theme, i18n, fonts, Sentry, offline detection.
- A Storybook-style `/dev` screen demoing every DS component in all states (dev-only), side-by-side with screenshots of the Aurora prototype for visual diffing.

### UX Definition of Done
- Side-by-side, the DS primitives are visually indistinguishable from the Aurora prototype (colors, radii, shadows, gradients, type) on a 390pt-wide device.
- Fonts (Space Grotesk / Inter) load before first paint — no font flash.
- Every DS component renders correctly in loading/empty/error/content.
- `Button` cannot be double-tapped (debounced + disabled while pending) — verified by spamming taps; press-scale animation runs at 60fps.
- Killing the network shows the OfflineBanner within 2s and removes it on reconnect.
- App cold-starts to first screen < 2.5s on a mid-range Android.

---

## Phase 2 — Authentication (phone OTP + email fallback)

**Goal:** Frictionless, recoverable sign-in matching BlaBlaCar's smoothness.

### Scope
- Convex Auth configured with a **custom phone-OTP provider**:
  - `convex/auth/otp.ts` action: `sendOtp(phone)` and `verifyOtp(phone, code)`.
  - MSG91 integration server-side; dev mode supports a dummy code via env.
  - Rate limiting in `otpRequests` table: max 3 sends / 10 min, 8 verify attempts; lockout surfaced to client with remaining seconds.
- Email/password fallback via Convex Auth.
- On first successful auth, create the `users` row (idempotent on `authId`).

### Screens
- `login.tsx` — phone field with country picker (default to device region), big primary "Send code". Email toggle is a secondary text link.
- `verify.tsx` — 6-digit segmented OTP input, **auto-submit on 6th digit**, **auto-read SMS** (Android `expo-sms-retriever` / iOS keyboard OTP suggestion), visible **resend countdown** ("Resend in 0:27"), "Wrong number? Edit".

### UX Definition of Done
- OTP auto-fills from SMS on both platforms (where supported); manual entry works otherwise.
- Resend is disabled with a live countdown; tapping send while rate-limited shows exact wait time, never a generic error.
- Wrong OTP shows inline error under the field (not a toast), keeps digits, lets retry without re-sending.
- Back from `verify` returns to `login` with the phone number preserved.
- Network failure mid-verify shows retry, never logs the user into a half state.
- Session persists across app restart; no flash of login screen for an authed user (gate on a hydrated auth state with a splash).

---

## Phase 3 — Onboarding, profile & permissions

**Goal:** Get users to a "complete enough" profile to transact, without a wall of forms.

### Scope
- **Progressive profile**: only name is required to continue; photo + vehicle (for drivers) prompted contextually later (e.g., when first publishing).
- `users.profileComplete` computed server-side from a defined rule set; the UI shows a **single, specific** next-step banner ("Add a profile photo to build trust"), not a generic "complete your profile".
- In-context permission pre-prompts (`permissions.tsx` + reusable hook): explain-then-request for **location** and **notifications**. Handle "denied" gracefully with a path to Settings.
- Profile screen: view/edit name, photo (upload via Convex storage), language, notification prefs, vehicle, KYC entry point, logout, delete account.
- KYC upload screen (file → Convex storage, sets `kycStatus = pending`).

### UX Definition of Done
- A new user reaches the Home screen in ≤ 3 taps after OTP (name → continue → home).
- Denying location never blocks the app; search still works via manual location entry, with a clear "Enable location" affordance.
- Profile photo upload shows progress, optimistic preview, and rollback on failure.
- The completion banner always names exactly ONE concrete missing item and deep-links to fix it.
- Delete account requires typed confirmation and explains consequences; it actually deletes server-side and signs out.

---

## Phase 4 — Location picker & maps foundation

**Goal:** BlaBlaCar-style location entry — type, then **confirm on a map**. This is the backbone of search and publish, so it ships as its own reusable module.

### Scope
- `location-picker.tsx` modal: Google Places **autocomplete** (debounced, biased to current location/region) → select → **map with draggable/confirmable pin** → "Confirm pickup/dropoff".
- "Use current location" shortcut (with permission handling from Phase 3).
- Recent locations + saved places (home/work) persisted per user.
- Places + Directions API calls proxied through **Convex actions** so the API key never ships in the bundle.
- `components/ride/RouteMap` — renders a polyline + markers; reused in detail/active/review.

### UX Definition of Done
- Typing shows results < 400ms after debounce; no jank, no key warnings.
- Selecting a place always lands on a confirm-on-map step (no "wrong pin" surprises later).
- "Use current location" resolves in < 5s or falls back to manual with a clear message (never an infinite spinner).
- Map respects safe areas; the confirm button is always above the home indicator and reachable by thumb.
- Re-opening the picker preserves the previously confirmed location.

---

## Phase 5 — Publish a ride (driver flow)

**Goal:** A clear, 3-step, never-lose-your-work ride creation flow with a visible stepper.

### Scope
- Stepper flow under `publish/`:
  1. **Route** — from/to via the Phase 4 picker; date & time; auto-calc distance/duration/polyline via Convex Directions action.
  2. **Details** — seats, price per seat (with suggested price hint), vehicle (prefill from profile; prompt to add if missing), notes.
  3. **Review** — map + full summary + fare; single **Publish** primary CTA.
- `convex/rides.ts: createRide` mutation — validates with shared zod, sets `status: "scheduled"`, awards idempotent publish reward.
- Draft persistence: if the user leaves mid-flow, the draft is restored next time.

### UX Definition of Done
- The stepper shows current step; Back never loses entered data; Forward is disabled until the step is valid (with inline reasons).
- Editing the date can't produce a past departure (picker constrained; server re-validates).
- Publishing is idempotent (rapid double-tap creates exactly one ride).
- On success, user lands on the ride's manage screen with a clear "You're all set — riders can now request seats."
- If vehicle is missing, the flow inlines a quick add-vehicle sheet instead of dead-ending.

---

## Phase 6 — Search & discovery (passenger flow)

**Goal:** Find rides fast, with results that are scannable and trustworthy (BlaBlaCar list quality).

### Scope
- Home search entry: from/to (Phase 4 picker), date, seats; "Search".
- `search/results.tsx`: `convex/rides.ts: searchRides` query — bounding-box geo filter on from/to + date window + `status = scheduled` + `seatsBooked < seatsTotal`; sort options (departure time, price, driver rating).
- `RideCard`: driver avatar + name + rating, route with times, seats left, price/seat, est. duration. Trust signals (verified KYC badge) visible.
- Empty state offers: widen date, create a ride alert, or publish your own.
- `search/[rideId].tsx`: full detail — route map, driver profile, passengers already onboard, seat picker, **Request seats** CTA.

### UX Definition of Done
- Search returns or shows a real empty state in < 1.5s on a warm query; loading uses skeleton cards (no spinner-only).
- Zero results never dead-ends (always 3 suggested actions).
- Ride cards never show stale seat counts — counts update live via Convex reactivity while the list is open.
- Detail screen's primary CTA reflects exact state: "Request 2 seats · ₹240", disabled with reason if full or own ride.
- Tapping a card and returning preserves scroll position and filters.

---

## Phase 7 — Booking & seat management

**Goal:** Requesting/confirming/cancelling seats with zero ambiguity and no oversell.

### Scope
- `convex/bookings.ts`:
  - `requestSeats(rideId, seats)` — transactional seat check (no oversell), creates booking `requested` (or `confirmed` if driver auto-accept is on), increments `seatsBooked` atomically, notifies driver, awards idempotent join reward on confirm.
  - `cancelBooking(bookingId)` — releases seats atomically, records who cancelled, notifies the other party.
  - Driver-side `respondToRequest(bookingId, accept)` if manual approval is enabled.
- Booking states reflected on both passenger and driver screens in realtime.

### UX Definition of Done
- Concurrent requests for the last seat: exactly one succeeds; the other gets a clear "Just sold out" message and a refreshed card — never a negative/overbooked count (verify with a concurrency test).
- Cancelling shows a confirm sheet with policy text, then optimistically updates and reconciles.
- Both parties see status changes within ~1s without manual refresh.
- A passenger can always find "where is my booking" — it's on the Rides tab under Upcoming with a clear status chip.

---

## Phase 8 — Ride lifecycle, live tracking & active ride

**Goal:** Fix the legacy's biggest UX bug: explicit, driver-controlled ride states with reliable live tracking.

### Scope
- Explicit transitions in `convex/rides.ts`: `startRide` (driver only, sets `started`/`startedAt`), `completeRide` (sets `completed`/`completedAt`, marks bookings completed, triggers rating prompts + completion rewards), `cancelRide(reason)` (notifies all passengers).
- `ride/[rideId]/active.tsx`:
  - Driver controls: **Start ride** / **Complete ride** / Cancel, contextually shown by status.
  - Passenger view: live driver location on map, ETA, driver contact, **Share trip** (safety), SOS.
  - Live location: `expo-location` writes to `convex/tracking.ts: pushLocation` (throttled, only while ride `started`); map subscribes via Convex query (auto cleanup).
  - Background location for the driver during an active ride (with the proper iOS/Android background mode + a persistent "sharing location" indicator).
- `crons.ts`: reconcile stale rides (e.g., `started` for > X hours with no activity → prompt driver, never silently complete).

### UX Definition of Done
- A ride only becomes "active" when the driver taps **Start ride**; passengers see "Driver is on the way" only then.
- Live location updates smoothly (interpolated marker), pauses when app backgrounds appropriately, and shows "Location paused" if permission/Signal lost — never a frozen-but-pretending-live map.
- Losing connectivity shows a "reconnecting" banner; on reconnect, the map catches up without a full reload.
- Completing a ride routes both parties to the rating prompt; cancel notifies everyone with the reason.
- Battery: background tracking throttled (e.g., distance filter) so an hour-long ride doesn't drain >X%.

---

## Phase 9 — In-ride chat & notifications

**Goal:** Driver↔passenger chat (missing in legacy) + a unified, reliable notification system.

### Scope
- `convex/chat.ts`: `sendMessage`, paginated `listMessages` (Convex pagination), `markRead`. Ride chat is gated to confirmed participants.
- `ride/[rideId]/chat.tsx`: standard messaging UI (optimistic send, delivery/read ticks, typing-safe, keyboard-avoiding).
- Inbox tab merges notifications + chat threads with unread badges.
- Push: `convex/notifications.ts: notify` writes the in-app row AND fans out to `expo-notifications` (Expo push). Tapping a push deep-links to the right screen.
- Notification preferences honored server-side per type.

### UX Definition of Done
- Messages send optimistically and reconcile; failed sends show a retry affordance inline (no lost messages).
- Unread badges are accurate and clear on read across devices.
- A push notification tapped from a cold start deep-links to the exact ride/chat (verify cold + warm).
- Keyboard never covers the input or the last message; list auto-scrolls to newest.
- Muting a notification type actually stops those pushes.

---

## Phase 10 — Ratings, rewards & trust

**Goal:** Close the loop with ratings tied to completed rides, and a transparent rewards system.

### Scope
- `convex/ratings.ts: rateRide` — only allowed after `completed`, one rating per (ride, rater, direction); updates the ratee's aggregate rating.
- `ride/[rideId]/rate.tsx`: star + optional review, prompted right after completion (skippable, re-promptable from Rides history).
- `convex/rewards.ts`: idempotent ledger (publish/join/complete/5-star/streak/referral) via `eventKey`; `rewards.tsx` shows points, level, history, and how to earn more.
- Trust surfacing: ratings + KYC badge shown on cards and profiles.

### UX Definition of Done
- You cannot rate a ride that isn't completed, and cannot double-rate (server-enforced + UI reflects already-rated).
- Skipping a rating is fine and re-accessible later; no nagging loops.
- Points never double-award on retries/double-taps (verify by replaying the mutation).
- Rewards screen clearly explains the next achievable reward.

---

## Phase 11 — Safety (SOS) & support (disputes)

**Goal:** Trustworthy safety + a clean support loop.

### Scope
- `safety.tsx`: prominent SOS that captures current location → `convex/sos.ts: raiseSos` → notifies support/admin + (optionally) shares with a trusted contact; safety tips; "Share trip" link.
- Support: `support/index.tsx` (FAQ), `new.tsx` (create dispute, optional ride link + evidence upload), `[disputeId].tsx` (realtime dispute chat reusing the Phase 9 chat engine with `threadType: "dispute"`).

### UX Definition of Done
- SOS works in ≤ 2 taps from anywhere during an active ride, confirms it was sent, and shows status; works even on degraded location (uses last-known with a timestamp).
- Dispute chat is realtime and clearly shows agent vs. user messages and status.
- Evidence upload shows progress and is retryable.

---

## Phase 12 — Admin (role-guarded) & operational hardening

**Goal:** Minimal admin tooling + production readiness. (Admin can be a separate web surface, but role-guarded Convex functions live here regardless.)

### Scope
- `convex/admin.ts`: `requireAdmin` guard on every function; list/manage users (block/unblock, role), rides (cancel), disputes (assign/resolve), SOS (resolve).
- Optional lightweight admin screens or a separate Convex-powered web app.
- `crons.ts`: stale-ride reconciliation, OTP cleanup, push-token pruning.
- Rate limiting, input validation parity (zod on client + Convex), and authorization checks audited on every mutation.

### UX Definition of Done
- No non-admin can call admin functions (verify with a non-admin token → rejected).
- Every mutation validates input and authorization; fuzzing common endpoints yields clean rejections, not 500s.

---

## Phase 13 — UX hardening, QA & launch

**Goal:** Prove the "no UX bugs" bar across the whole app.

### Scope
- **Funnel analytics** wired for: signup, profile, publish, search→request→confirm, complete, rate. Identify drop-offs.
- **E2E tests** (Maestro or Detox) for the golden paths: sign in, publish a ride, find & book a ride, run the live ride, complete & rate, cancel flows.
- **Chaos/UX matrix** run on each core flow (see checklist below).
- Accessibility audit (labels, contrast, tap targets, dynamic type).
- Performance pass (list virtualization, image caching, map memory).
- Crash-free sessions target ≥ 99.5% before public launch.

### Global UX bug checklist (run per flow before sign-off)
For every core flow, verify:
- [ ] Loading uses skeletons/placeholders, never a bare spinner > 8s.
- [ ] Empty state has a helpful next action.
- [ ] Error state has a retry and a human message (no raw error codes).
- [ ] Every button: disabled+pending on tap, re-enabled on failure, no double-submit.
- [ ] Back/Cancel never loses entered data mid-flow.
- [ ] Offline: clear banner, queued/blocked actions explained, auto-recovery on reconnect.
- [ ] Slow network (throttle to 3G): no frozen UI, all spinners time out to retry.
- [ ] Permissions denied: graceful fallback path, never a dead end.
- [ ] Realtime data (seats, location, messages, status) updates without manual refresh and reconciles after reconnect.
- [ ] Deep links / push taps land on the correct screen from cold and warm start.
- [ ] Keyboard never covers inputs; safe areas respected on notch + home-indicator devices.
- [ ] All text from i18n; no truncation in longer languages; RTL doesn't break layout.
- [ ] Concurrency: no oversell, no double-award, no duplicate creates.

---

## 14. Cross-cutting engineering rules

1. **Validation lives in one place.** Define zod schemas in `lib/validators` shared by RN forms and Convex args. Never trust the client.
2. **Authorization on every Convex function.** Use `requireUser`/`requireAdmin`; default-deny.
3. **Idempotency** for anything that awards/creates on user action — use `eventKey`/dedupe keys; assume the client will retry.
4. **No secrets in the bundle.** Google/MSG91/push keys live in Convex env; the app calls Convex actions.
5. **Reactivity over polling.** Use Convex live queries; don't `setInterval` to refetch.
6. **One source of truth for state.** A ride's status is the `status` field set by explicit mutations — never derived from the clock on read.
7. **Every screen uses `StateView`** so loading/empty/error/content are impossible to forget.
8. **Errors are observable.** Log handled errors to Sentry with screen + action tags; show users a friendly retry.

---

## 15. Migration & rollout notes

- **Data migration** from Supabase is optional; if needed, write a one-off importer that maps `profiles → users`, `rides/published_rides → rides`, `ride_participants/bookings → bookings`, ledgers, etc. Reconcile the dual ride models on import.
- Ship phase-by-phase to an internal track; dogfood each phase against the UX DoD before widening.
- Keep the legacy app live until Phase 8 (lifecycle/tracking) reaches parity, since that's the core value loop.
- Public launch gated on Phase 13 (crash-free ≥ 99.5%, all golden-path E2E green, UX checklist passed per flow).

---

## 16. Phase summary

| Phase | Title | Core outcome |
|---|---|---|
| 1 | Foundation & design system | Runnable app, Convex schema, DS with guaranteed states |
| 2 | Auth (phone OTP + email) | Smooth, recoverable sign-in |
| 3 | Onboarding & permissions | Progressive profile, in-context permissions |
| 4 | Location picker & maps | Type-then-confirm-on-map, key-safe proxy |
| 5 | Publish a ride | 3-step stepper, no lost work, idempotent |
| 6 | Search & discovery | Fast, trustworthy, live-accurate results |
| 7 | Booking & seats | No oversell, clear status both sides |
| 8 | Lifecycle & live tracking | Explicit driver-driven states, reliable tracking |
| 9 | Chat & notifications | Driver↔passenger chat, unified push/inbox |
| 10 | Ratings, rewards & trust | Completed-ride ratings, idempotent rewards |
| 11 | Safety & support | 2-tap SOS, realtime disputes |
| 12 | Admin & hardening | Role-guarded ops, validation/authz audit |
| 13 | UX hardening & launch | E2E + chaos matrix, crash-free ≥ 99.5% |

> Build in order. Each phase ends only when its **UX Definition of Done** passes on iOS and Android, online and offline-degraded. That discipline — not any single feature — is what delivers the BlaBlaCar-grade, bug-free UX you're rewriting for.

---

## Appendix A — Aurora design system (visual source of truth)

The reference implementation lives at `../blinkcar/blinkcar` (React + Vite web prototype). All tokens below are copied verbatim from its `src/index.css`. **Port these to a typed `theme.ts` in Phase 1.** When implementing any screen, open the matching prototype page in `blinkcar/blinkcar/src/pages/` and match it.

### A.1 Color tokens

```ts
// theme.ts — colors
export const color = {
  // aurora palette
  red:    '#ff3b2e',
  orange: '#ff6a1a',   // = accent
  tang:   '#ff8a00',
  amber:  '#ffb627',
  gold:   '#ffd24c',
  pink:   '#ff7b9c',
  rose:   '#ff5c86',
  blush:  '#ffd9d0',
  // neutrals
  ink:    '#1a0d08',
  ink2:   '#4a3a32',
  muted:  '#9b8a80',
  line:   'rgba(26,13,8,0.08)',
  line2:  'rgba(26,13,8,0.14)',
  cream:  '#fffdfb',   // app background
  cream2: '#fff3ec',
  paper:  '#ffffff',   // cards
  glass:  'rgba(255,255,255,0.62)',
  glassLine: 'rgba(255,255,255,0.7)',
  // semantic
  accent: '#ff6a1a',
  accentInk: '#ffffff',
  good:   '#1fb877',
  warn:   '#ff9f0a',
  stage:  '#160b07',   // dark frame behind the app (use for splash/immersive)
};
```

### A.2 Gradients (use `expo-linear-gradient`)

```ts
export const gradient = {
  // hot: primary buttons, active trip banner, FAB, track marker/route
  hot:  { colors: ['#ff3b2e', '#ff6a1a', '#ffb627'], locations: [0, 0.45, 1], start: {x:0,y:0}, end: {x:1,y:1} },
  // soft: secondary / decorative
  soft: { colors: ['#ff7b9c', '#ff6a1a', '#ffb627'], locations: [0, 0.6, 1],  start: {x:0,y:0}, end: {x:1,y:1} },
  // text: gradient-filled headings/totals (use MaskedView + LinearGradient)
  text: { colors: ['#ff3b2e', '#ff6a1a', '#ff9f0a'], locations: [0, 0.5, 1],  start: {x:0,y:0}, end: {x:1,y:0} },
};
```

### A.3 Shape (border radius)

```ts
export const radius = { sm: 12, md: 18, lg: 26, xl: 34, pill: 999 };
// inputs/small cards → md; standard cards → lg; hero cards → xl; buttons/chips/avatars → pill
```

### A.4 Elevation (shadows — note the warm orange tint)

```ts
export const shadow = {
  sm:   { shadowColor: '#1a0d08', shadowOpacity: 0.06, shadowRadius: 8,  shadowOffset: {width:0,height:2},  elevation: 2 },
  md:   { shadowColor: '#ff5a1e', shadowOpacity: 0.28, shadowRadius: 30, shadowOffset: {width:0,height:10}, elevation: 8 },
  lg:   { shadowColor: '#ff4614', shadowOpacity: 0.40, shadowRadius: 60, shadowOffset: {width:0,height:30}, elevation: 16 },
  glow: { shadowColor: '#ff641e', shadowOpacity: 0.55, shadowRadius: 40, shadowOffset: {width:0,height:12}, elevation: 14 }, // primary buttons / FAB
};
```

### A.5 Typography

- **Display** (`Space Grotesk`, 700, letter-spacing ≈ -0.02em, line-height 1.02): all headings, buttons, brand, big numbers.
- **Sans** (`Inter`): body, labels, descriptions.
- Scale: `display-xl` 34–46 (hero) · `display-lg` 30 · `h-section` 21/700 · body/`sub` 14, line-height 1.5, color `ink2` · label 12/600 letter-spacing 0.02em · `eyebrow` 12/600 UPPERCASE letter-spacing 0.16em color `orange`.
- Selection highlight: `amber` bg, `ink` text (web only; ignore on RN).

### A.6 Layout & spacing

- Screen horizontal padding **20**, bottom **24**. Card padding **18**. Row gap **10**. Section margin: top **22**, bottom **12**.
- Press feedback: scale **0.97**, transition **0.14–0.2s** → Reanimated/Moti.
- `AuroraBackground`: stacked radial gradients (pink top-left, orange top-right, red bottom) over `cream`, with a **grain** PNG overlay (~32% opacity) and a slow **drift** animation (~22s alternate). Used behind Home/Onboarding; immersive screens (Track/Chat) use the darker `stage` frame.

### A.7 Component → Aurora mapping

| DS component | Aurora source | Notes |
|---|---|---|
| `Button` primary / dark / ghost | `.btn-*` in `index.css` | primary = grad-hot + `shadow.glow`; ghost = glass + blur + border |
| `IconButton` | `.icon-btn` / `.solid` | 42px circle, glass; `solid` = ink fill |
| `Card` / `GlassCard` | `.card` / `.glass-card` | white + `shadow.sm` + `radius.lg`; glass = BlurView |
| `Chip` | `.chip` / `.chip-soft` / `.chip-good` | pill; soft = orange 12% bg; good = green tint |
| `Field` / input | `.field` / `.input-wrap` | label + 1.5px bordered wrap; focus = orange border + soft orange shadow; lead icons orange 18px |
| `RouteLine` | `.route` | orange start dot → dashed stem → ink end dot; city/time/area |
| `Avatar` | gradient + initials | per-user hue → gold |
| `BottomNav` + FAB | `.bottomnav` / `.navitem` / `.fab` | frosted cream 0.82 + blur; active item gets gradient icon + glow; center FAB 56px grad-hot, elevated |
| `Stepper` | Offer progress dots | 4 dots, filled with grad-hot |
| Eco/impact stat | Home `.glass-card` stat | icon + big num + muted label (CO₂ green, savings orange) |

### A.8 Fonts setup

Use `expo-font` with `@expo-google-fonts/space-grotesk` and `@expo-google-fonts/inter` (weights 400/500/600/700). Gate the splash screen until `useFonts` resolves so there's no font flash (ties into Phase 1 DoD).

### A.9 Assets to bring over

- Grain texture (recreate the `--grain` fractal-noise SVG as a tiling PNG, or generate at build time).
- `aurora-texture.jpg` and `favicon.svg`/logo from `blinkcar/blinkcar/public/` → adapt to app icon + splash (`expo-splash-screen`, background `stage` `#160b07`).
- Icons: **lucide-react-native** (the prototype uses `lucide-react`) — same icon set, so names map 1:1.

---

## Appendix B — Aurora prototype screens → spec mapping

The prototype already designed every screen. Match each one; the spec only changes *behavior* (the UX fixes), not the visuals.

| Aurora page (`blinkcar/blinkcar/src/pages/`) | This spec's screen / route | Phase | Behavioral changes vs. prototype |
|---|---|---|---|
| `Onboarding.tsx` | `(onboarding)/*` | 3 | + in-context permission pre-prompts |
| `Auth.tsx` | `(auth)/login`, `verify`, `register` | 2 | phone OTP default + resend countdown + auto-read SMS |
| `Home.tsx` | `(tabs)/index` | 6 | live-reactive active-trip banner & "rides for you"; real search entry |
| `Search.tsx` | `search/results` | 6 | live seat counts; skeleton loading; non-dead-end empty state |
| `RideDetail.tsx` | `search/[rideId]` | 6 | CTA reflects exact state (full / own ride / price) |
| `Booking.tsx` | booking sheet/screen | 7 | atomic no-oversell seat booking; clear status both sides |
| `Offer.tsx` (4-step) | `publish/route` → `details` → `review` | 5 | draft persistence; per-step validation; idempotent publish |
| `Track.tsx` | `ride/[rideId]/active` | 8 | **explicit driver Start/Complete**; reliable live location + reconnect |
| `Inbox.tsx` | `(tabs)/inbox` | 9 | unified notifications + chat threads, accurate unread |
| `Chat.tsx` | `ride/[rideId]/chat`, `support/[disputeId]` | 9 / 11 | optimistic send + retry; one chat engine, two thread types |
| `Trips.tsx` | `(tabs)/rides` | 7 / 10 | upcoming vs history segmented; rate-from-history |
| `Profile.tsx` | `(tabs)/profile`, `settings`, `rewards`, `kyc` | 3 / 10 | progressive completion; idempotent rewards ledger |
| *(new)* | `safety`, `support/new` | 11 | 2-tap SOS, dispute creation (prototype shows entry points) |
| *(new)* | `admin/*` | 12 | role-guarded; can be a separate web surface |

> The prototype's `Offer` is a 4-step form; this spec's publish flow is 3 steps (Route · Details · Review) — collapse Offer's "when" into the Route step or keep 4 steps if you prefer the prototype's pacing. Either is fine; keep the stepper + no-lost-work guarantees.
