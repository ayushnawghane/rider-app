* **Auth: Clerk**
* **Backend: Supabase**
* **Frontend: Ionic**
* **Map-first, Uber-like modern UX**
* **Operational, scalable, enterprise-grade**

---

# PRODUCT REQUIREMENT DOCUMENT (PRD)

## Ride Management & Support Platform

**(Map-First, Safety-Focused, Operations-Driven)**

---

## 1. PRODUCT OVERVIEW

A **map-first, mobile-first ride management platform** that allows users to create, track, and manage rides, view routes on a live map, communicate with drivers and support, raise disputes, and trigger SOS safety actions.

The platform prioritizes **clarity, safety, and operational reliability** over gamification, with a modern, minimal, and highly usable design.

---

## 2. DESIGN PHILOSOPHY (MODERN UX)

### Visual Language

* Clean, neutral color palette
* White / soft gray surfaces
* High-contrast black primary CTAs
* Rounded cards, subtle elevation
* No clutter, no decorative animations

### Interaction Principles

* **Map is context, not decoration**
* Bottom sheets for decisions
* Single primary action per screen
* Gesture-driven navigation
* Clear system states (loading, active, completed)

### Inspiration

* Uber (ride selection)
* Google Maps (clarity)
* Apple Maps (spacing + typography)
* Modern fintech apps (restraint, focus)

---

## 3. USER ROLES

### Rider

* Creates and manages rides
* Views routes and ride status
* Contacts driver/support
* Raises disputes
* Triggers SOS

### Driver

* Receives assigned rides
* Updates ride status
* Shares live location (optional)
* Communicates with rider/support

### Admin / Support

* Manages users, rides, disputes
* Reviews KYC
* Monitors SOS events
* Sends notifications
* Views analytics

---

## 4. COMPLETE APP FLOW (END-TO-END)

---

## A. Rider App Flow (Primary)

### 1. Splash

* App logo
* Fast transition (<1s)

---

### 2. Authentication (Clerk)

* OTP / Email / OAuth
* Secure session handling
* Role resolution (Rider)

---

### 3. Onboarding (First Time)

* Language selection
* Profile basics
* KYC upload (if required)
* Permissions:

  * Location (only when needed)
  * Notifications

---

### 4. Home Screen

**Layout**

* Map (collapsed or minimized)
* Primary actions as cards:

  * “Add Ride”
  * “Current Ride” (if active)
  * “Ride History”
  * “Support”
  * “SOS”

---

### 5. Pickup & Drop Selection

* Full-screen map
* Search bar (pickup / drop)
* Pin-drop support
* Recent locations
* Confirm pickup & drop

---

### 6. Route Preview & Ride Selection (CORE SCREEN)

*(Based on the image you shared)*

**Map Layer**

* Pickup marker
* Drop marker
* Route polyline
* Auto-fit bounds

**Bottom Sheet**

* List of ride options
* Each option shows:

  * Ride type
  * Capacity
  * ETA
  * Estimated price
* Tap to select → highlight
* Sticky CTA:

  * “Choose [Ride Type]”

**Rules**

* CTA disabled until selection
* Map stays visible during scrolling
* Changing locations recalculates route + estimates

---

### 7. Ride Confirmation

* Selected ride summary
* Pickup / drop
* Price estimate
* Confirm CTA

---

### 8. Active Ride

* Full-screen map
* Driver location (optional)
* Ride status timeline
* Actions:

  * Contact driver
  * Contact support
  * SOS

---

### 9. Ride Completion

* Status changes to `COMPLETED`
* Route snapshot stored
* Redirect to Ride Details

---

### 10. Ride Details

* Static route map
* Ride metadata
* Attachments
* Actions:

  * Raise dispute
  * Download receipt (if applicable)

---

### 11. Disputes & Support

* Create dispute
* Attach evidence
* Track status
* In-app chat with support

---

### 12. SOS Flow

* One-tap SOS
* Share live location
* Alert support + emergency contacts
* Persistent banner until resolved

---

### 13. Profile

* KYC status
* Documents
* Settings
* Logout

---

## B. Driver App Flow

1. Auth (Clerk)
2. Driver Home
3. Assigned Rides List
4. Ride Detail

   * Map route
   * Pickup / drop
5. Start Ride
6. Live Tracking (optional)
7. Complete Ride
8. Contact Support

---

## C. Admin / Support Panel Flow (Web)

1. Admin Login (Clerk)
2. Dashboard

   * Active rides
   * SOS alerts
   * Disputes
3. User Management
4. Ride Management

   * Map snapshots
5. Dispute Resolution
6. Notifications
7. Content (FAQs)
8. Logs & Analytics

---

## 5. MAPS INTEGRATION (CORE FEATURE)

### Providers

* Google Maps (primary)
* MapsMyIndia (optional)

---

### Map Use Cases

#### Add Ride

* Pickup/drop selection
* Distance estimation

#### Route Preview

* Polyline rendering
* ETA calculation

#### Active Ride

* Live driver location
* Auto-recenter option

#### Ride Details

* Static route snapshot

#### Disputes

* Evidence visualization

#### SOS

* Live location sharing

---

### Stored Map Data (Supabase)

**Ride**

* pickup_lat / lng
* drop_lat / lng
* route_polyline
* distance_m
* duration_s
* map_snapshot_url

**Live Locations**

* ride_id
* lat / lng
* timestamp

**SOS Events**

* user_id
* ride_id (optional)
* lat / lng
* status
* timestamps

---

## 6. TECHNICAL ARCHITECTURE

### Frontend

* **Ionic**
* Bottom sheets
* Gesture-based navigation
* Offline-tolerant UI

### Authentication

* **Clerk**
* Session + role management

### Backend

* **Supabase**
* PostgreSQL
* RLS for access control
* Edge Functions for:

  * Route calculations
  * Ride estimates
  * Notifications

### Storage

* Supabase Storage
* KYC docs
* Dispute attachments
* Map snapshots

---

## 7. NON-FUNCTIONAL REQUIREMENTS

### Performance

* App load < 2s
* Map render < 1.5s
* Ride creation < 300ms

### Security

* Encrypted storage
* RLS enforcement
* Role-based access
* Minimal location retention

### Reliability

* 99.5% uptime
* Retryable API calls

### Scalability

* 100k+ DAU ready
* Horizontal backend scaling

---

## 8. OUT OF SCOPE (INTENTIONAL)

* Rewards
* Points
* Tiers
* Leaderboards
* Referrals
* Gamification

---

## 9. SUCCESS METRICS

* Ride creation success rate
* Dispute resolution time
* SOS response time
* App crash-free sessions
* Map load success rate

---