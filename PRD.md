* **Auth: Clerk**
* **Backend: Supabase**
* **Frontend: Ionic**
* **Carpool-first, community-driven UX**
* **Gamified rewards system**
* **Operational, scalable, enterprise-grade**

---

# PRODUCT REQUIREMENT DOCUMENT (PRD)

## Carpool & Ride Sharing Platform

**(Community-Driven, Rewards-Focused, Carpool-First)**

---

## 1. PRODUCT OVERVIEW

A **carpool-first, mobile-first ride sharing platform** that connects drivers with empty seats to passengers heading the same way. Unlike traditional cab services, this platform enables everyday drivers to publish their routes and share rides with others traveling on the same path.

The platform features a **warm, energetic design** with a robust **gamification and rewards system** that incentivizes both publishing rides (as a driver) and taking rides (as a passenger). Users earn points, level up, and unlock benefits based on their activity.

---

## 2. DESIGN PHILOSOPHY (WARM & ENERGETIC UX)

### Visual Language

* **Primary Color:** Warm Orange (#F97316 or similar)
* **Background:** Soft white/off-white surfaces
* **Accent Colors:** Orange gradients for CTAs, gold/yellow for rewards
* **Cards:** Rounded corners (16-20px radius), subtle shadows
* **Icons:** Line-style icons with orange accents
* **Typography:** Clean, modern sans-serif, bold headers

### Interaction Principles

* **Single primary action per screen**
* **Quick toggles** between "Publish" and "Find" modes
* **Visual feedback** for rewards and achievements
* **Gesture-driven navigation**
* **Clear status indicators** for ride states

### Inspiration

* BlaBlaCar (carpool community)
* Uber (simplicity)
* Duolingo (gamification elements)
* Modern fintech apps (clean cards, clear hierarchy)

---

## 3. USER ROLES

### User (Dual Role)

Every user can act as both a **Driver (Publisher)** and **Passenger (Finder)**:

**As a Driver (Publisher):**
* Publishes rides from Point A to Point B
* Sets available seats and departure time
* Views passenger requests
* Confirms/book seats for co-travelers
* Earns reward points for publishing rides

**As a Passenger (Finder):**
* Searches for available rides on their route
* Books seats in published rides
* Communicates with driver
* Tracks ride status
* Earns reward points for taking rides

**Common Actions:**
* Views reward points and level
* Accesses ride history
* Manages profile and KYC
* Triggers SOS for safety
* Contacts support

### Admin / Support

* Manages users, rides, disputes
* Reviews KYC and driver verification
* Monitors SOS events
* Manages rewards system configuration
* Sends notifications
* Views analytics

---

## 4. COMPLETE APP FLOW (END-TO-END)

---

## A. User App Flow (Primary)

### 1. Splash

* App logo
* Fast transition (<1s)

---

### 2. Authentication (Clerk)

* OTP / Email / OAuth
* Secure session handling
* Profile creation

---

### 3. Onboarding (First Time)

* Language selection
* Profile basics (name, photo)
* KYC upload (for driver verification)
* Vehicle details (if planning to publish rides)
* Permissions:
  * Location (only when needed)
  * Notifications

---

### 4. Home Screen (CORE SCREEN)

Based on the provided UI design:

**Header Section (Orange Gradient Background)**
* Greeting with user name ("Hi, Omkar")
* Location badge (e.g., "Mumbai, IN")
* Level indicator (e.g., "Lvl 12")
* Notification bell icon
* User profile avatar

**Search & Route Section (White Card)**
* Search bar at top
* **From/To Selection:**
  * "From" field with "Pick Up" label
  * Swap icon between fields
  * "To" field with "Drop Off" label
* Departure time selector (clock icon + time)
* Passenger count selector (person icon + number)

**Primary CTA:**
* "Find Drivers" button (orange, full-width)

**Active Ride Card (if applicable):**
* Driver photo with rating badge
* Driver name (e.g., "Rahul S")
* Star rating (e.g., "4.9")
* Status: "Driver arriving in 3 mins"
* Progress bar
* Route info: "Pickup: Mumbai → Drop Off: Pune"
* Action buttons:
  * Call (phone icon)
  * Message (chat icon)
  * View Map (secondary button)

**Quick Actions Grid (4 columns):**
* **Publish Ride** - Car with plus icon (orange)
* **Find Ride** - Car with location icon (orange)
* **Reward Points** - Coins/medal icon (orange)
* **Help** - Question mark icon (orange)

**Main Routes Section:**
* Section title: "Main Routes"
* Subtitle: "Select the best way to travel"
* Horizontal scroll of city cards:
  * City image
  * City name (e.g., "Mumbai", "Pune")
  * Starting price: "Starting at XXXX"

**Promotional Banner:**
* Orange gradient background
* Title: "Earn whilst you travel"
* Subtitle: "Get 2x points on your first 3 rides this month"
* CTA: "See Rewards"

**Bottom Navigation:**
* Home (active)
* Publish
* Find
* Rewards
* Profile

---

### 5. Publish Ride Flow (Driver Mode)

**5.1 Publish Ride Form**
* Toggle to switch to "Publish" mode
* From/To location selection
* Departure date and time
* Available seats (1-4+)
* Price per seat (suggested based on distance)
* Vehicle selection (if multiple vehicles)
* Additional notes (optional)
* "Publish Ride" CTA

**5.2 My Published Rides**
* List of active published rides
* Each card shows:
  * Route (From → To)
  * Date/time
  * Available/Booked seats
  * Status (Active, Completed, Cancelled)
* Tap to view details and passenger requests

**5.3 Passenger Requests**
* List of booking requests for a specific ride
* Shows passenger name, rating, requested seats
* Accept/Reject actions
* Auto-confirm option based on passenger rating

**5.4 Published Ride Details**
* Route map
* Passenger list with contact options
* Start/Cancel ride actions
* Share ride link

---

### 6. Find Ride Flow (Passenger Mode)

**6.1 Search Rides**
* From/To location input
* Date/time preference
* Number of seats needed
* "Search Rides" CTA

**6.2 Available Rides List**
* List of matching published rides
* Each card shows:
  * Driver photo and name
  * Driver rating
  * Departure time
  * Available seats
  * Price per seat
  * Vehicle details
* Sort/filter options (price, time, rating)

**6.3 Ride Details (Before Booking)**
* Driver profile with verification badges
* Route map
* Departure/arrival estimates
* Price breakdown
* Available seats
* Vehicle info and photos
* Driver preferences (smoking, pets, etc.)
* "Book Seat(s)" CTA

**6.4 Booking Confirmation**
* Seat selection (1-N)
* Total price
* Payment method (if applicable)
* "Confirm Booking" CTA

---

### 7. Active Ride

* Full-screen map
* Driver location (if shared)
* Ride status timeline:
  * Booked
  * Driver En Route
  * Picked Up
  * In Progress
  * Completed
* Actions:
  * Contact driver (call/message)
  * View driver profile
  * Share live location with trusted contacts
  * SOS

---

### 8. Ride Completion

* Status changes to `COMPLETED`
* Rate driver experience (1-5 stars)
* Optional review/feedback
* Reward points earned notification
* Redirect to Ride Details

---

### 9. Ride Details

* Static route map
* Ride metadata (driver, passengers, vehicle)
* Booking details (seats, price)
* Actions:
  * Raise dispute
  * Download receipt
  * Rebook similar ride

---

### 10. Rewards & Gamification System

**10.1 Rewards Dashboard**
* Current points balance (large display)
* Current level with progress bar
* Points history
* Available rewards/benefits

**10.2 Earning Points**
Users earn points for:
* Publishing a ride: 50 points
* Completing a ride as passenger: 30 points
* First ride of the week: Bonus 20 points
* Streak bonus (3+ rides in a week): 40 points
* Referring a friend: 100 points
* Getting 5-star rating: 10 points

**10.3 Levels & Tiers**
* Level 1-10: Bronze
* Level 11-20: Silver
* Level 21-30: Gold
* Level 31+: Platinum

**10.4 Redeeming Rewards**
* Discount on future rides
* Priority booking
* Featured driver status
* Cashback (if applicable)

**10.5 Achievements/Badges**
* "Early Bird" - Publish ride before 7 AM
* "Night Owl" - Complete ride after 10 PM
* "Road Warrior" - 50 rides completed
* "Community Champion" - 25 published rides
* "5-Star Driver" - Maintain 4.9+ rating over 20 rides

---

### 11. Disputes & Support

* Create dispute
* Attach evidence (photos, messages)
* Track status
* In-app chat with support
* FAQ and help center

---

### 12. SOS Flow

* One-tap SOS button (always accessible)
* Share live location with emergency contacts
* Alert platform support
* Option to call emergency services
* Persistent banner until resolved

---

### 13. Profile

* Profile photo and name
* Level and points display
* Verification badges (KYC, Email, Phone)
* Vehicle details (if driver)
* Ride statistics:
  * Rides taken
  * Rides published
  * Rating as driver
  * Rating as passenger
* Settings
* Logout

---

## B. Admin / Support Panel Flow (Web)

1. Admin Login (Clerk)
2. Dashboard
   * Active carpools
   * SOS alerts
   * Pending disputes
   * Daily/monthly ride stats
3. User Management
   * View all users
   * KYC verification
   * Driver approval
   * Ban/suspend users
4. Ride Management
   * View all published rides
   * Monitor active carpools
   * Map view of ongoing rides
5. Dispute Resolution
   * View all disputes
   * Assign to support agents
   * Resolution tools
6. Rewards Management
   * Configure point values
   * Create promotional campaigns
   * View rewards analytics
7. Notifications
   * Send push notifications
   * Schedule announcements
8. Content Management
   * FAQs
   * Help articles
   * Terms and conditions
9. Analytics & Reports
   * User growth
   * Ride completion rates
   * Revenue (if commission-based)
   * Safety incidents

---

## 5. MAPS INTEGRATION (CORE FEATURE)

### Providers

* Google Maps (primary)
* MapsMyIndia (optional for India market)

---

### Map Use Cases

#### Publish Ride
* Select start and end points
* View route options
* Distance and duration calculation
* Waypoint support (optional stops)

#### Find Ride
* View available routes on map
* Filter by proximity to route
* See driver location (after booking)

#### Active Ride
* Live driver location tracking
* Passenger location sharing
* Route navigation for driver

#### Ride Details
* Static route snapshot
* Start/end markers

#### SOS
* Live location sharing with support

---

### Stored Map Data (Supabase)

**Published Ride**
* driver_id
* start_lat / lng
* end_lat / lng
* route_polyline
* distance_m
* duration_s
* departure_time
* available_seats
* price_per_seat
* status (active, completed, cancelled)

**Booking**
* ride_id (reference to published ride)
* passenger_id
* seats_booked
* booking_status (pending, confirmed, completed, cancelled)
* total_price

**Live Locations**
* ride_id
* user_id
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

* **Ionic + React/Capacitor**
* Orange-themed UI components
* Bottom sheets for ride selection
* Real-time location tracking
* Offline support for critical features

### Authentication

* **Clerk**
* Session + role management
* Social login support

### Backend

* **Supabase**
* PostgreSQL database
* Row Level Security (RLS) for access control
* Realtime subscriptions for:
  * Live location sharing
  * Chat messages
  * Ride status updates
* Edge Functions for:
  * Route calculations
  * Price estimates
  * Notification triggers
  * Points calculation

### Storage

* Supabase Storage
* Profile photos
* KYC documents
* Vehicle photos
* Dispute attachments

### Notifications

* Push notifications via Firebase/OneSignal
* SMS notifications (optional)
* Email notifications

---

## 7. NON-FUNCTIONAL REQUIREMENTS

### Performance

* App load < 2s
* Map render < 1.5s
* Ride search results < 1s
* Real-time location updates < 3s latency

### Security

* Encrypted storage for sensitive data
* RLS enforcement on all tables
* Role-based access control
* Location data retention: 30 days max
* GDPR/privacy compliance

### Reliability

* 99.5% uptime
* Automatic retry for failed API calls
* Offline queue for actions

### Scalability

* Support 100k+ DAU
* Horizontal scaling ready
* Database connection pooling

---

## 8. IN SCOPE (PRIORITY FEATURES)

* User registration and profiles
* Publish ride functionality
* Find and book rides
* Real-time ride tracking
* In-app messaging between driver and passengers
* Rating and review system
* **Gamification & Rewards System**
  * Points earning
  * Level progression
  * Achievements/badges
  * Redeemable rewards
* SOS safety feature
* Dispute management
* Push notifications
* Admin panel

---

## 9. OUT OF SCOPE (FUTURE VERSIONS)

* In-app payment processing (MVP uses cash/UPI outside app)
* Corporate/business accounts
* Scheduled recurring rides
* Package delivery
* Multi-stop rides (waypoints)
* Carpool for specific events (concerts, airports)

---

## 10. SUCCESS METRICS

### User Engagement
* Daily/Monthly Active Users (DAU/MAU)
* Rides published per day
* Rides booked per day
* Average seats filled per published ride

### Quality Metrics
* Driver rating average
* Passenger rating average
* Ride completion rate
* Cancellation rate

### Safety Metrics
* SOS triggers and response time
* Dispute resolution time
* Reported incidents

### Gamification Metrics
* Average points per user
* Level progression speed
* Reward redemption rate
* User retention by level

### Technical Metrics
* App crash-free sessions (>99%)
* Map load success rate (>99%)
* API response times (<500ms p95)

---

## 11. REVISION HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 2.0 | 2026-02-17 | Product Team | Transformed from cab app to carpool app. Added publish ride functionality, gamification system, rewards, orange UI theme. |
| 1.0 | Previous | Product Team | Initial cab/ride-hailing PRD |

---
