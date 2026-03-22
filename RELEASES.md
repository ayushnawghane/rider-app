# Blinkcar Release Tracker

Keep track of all production builds, database migrations, and major feature updates below.

---

## v1.0.0 (Initial Release) - 2026-03-22
**Release Name:** Genesis

### Overview
The foundational release for the Blinkcar rider application, compiling the full React footprint into an Android App Bundle (`app-release.aab`) ready for Google Play.

### Core Features
- **Carpooling Engine:** Full support for searching, publishing, and joining intercity rides via seamless Supabase integration.
- **Live Trip Tracking:** Real-time GPS location syncing between drivers and co-riders, featuring animated Uber-style map markers and ETA calculations.
- **Driver Console:** Dedicated driver status controls ("Start Trip", "Complete Trip", "Cancel Trip") with custom-built Tailwind CSS interactive confirmation modals.
- **Editable Rides:** Dynamic permissions allowing publishers to update Departure Time, Available Seats, Price, Vehicle Details, and Notes before their journey begins.
- **Authentication & Onboarding:** Custom gamified brand Splash Screen, alongside sleek Google OAuth and OTP Phone authentication modules.
- **Safety First:** Integrated emergency SOS flows and simple Driver Contact routing directly on the active ride details.
