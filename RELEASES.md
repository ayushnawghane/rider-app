# Blinkcar Release Tracker

Keep track of all production builds, database migrations, and major feature updates below.

---

## v1.0.6 - 2026-07-02

### Overview
Version bump for App Store resubmission (the `1.0.4` train was closed for new
builds — CFBundleShortVersionString must exceed the last approved version).
`MARKETING_VERSION` (iOS) and `appVersionName` (Android) synced to `1.0.6` via
`npm run version:sync`; the iOS build number is set by CI.

### Included since 1.0.4
- Ride chat, app + email notifications (server-side triggers), booking/seat
  integrity, monthly reward-points cap, phone-OTP registration, maps/tracking
  robustness fixes, and a broad bug sweep. See PR #25.

---

## v1.0.0 (Initial Release) - 2026-03-22
**Release Name:** Genesis

### Overview
The foundational release for the Blinkcar rider application, compiled into an Android App Bundle (`app-release.aab`) with the unique package ID `com.blinkcar.app`. Ready for Google Play submission.

### Core Features
- **Carpooling Engine:** Full support for searching, publishing, and joining intercity rides via seamless Supabase integration.
- **Live Trip Tracking:** Real-time GPS location syncing between drivers and co-riders, featuring animated Uber-style map markers and ETA calculations.
- **Driver Console:** Dedicated driver status controls ("Start Trip", "Complete Trip", "Cancel Trip") with custom-built Tailwind CSS interactive confirmation modals.
- **Editable Rides:** Dynamic permissions allowing publishers to update Departure Time, Available Seats, Price, Vehicle Details, and Notes before their journey begins.
- **Authentication & Onboarding:** Custom gamified brand Splash Screen, alongside sleek Google OAuth and OTP Phone authentication modules.
- **Safety First:** Integrated emergency SOS flows and simple Driver Contact routing directly on the active ride details.
