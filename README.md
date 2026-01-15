# RiderApp - Ride Management & Support Platform

A mobile-first ride management and support platform built with Ionic (React) and Supabase.

## Features

- **Authentication**: OTP-based phone login with Supabase Auth
- **Ride Management**: Upload rides, view history, track active rides
- **Support & Disputes**: Raise disputes, chat with support team
- **Safety**: SOS emergency button with location tracking
- **Profile & Settings**: Manage profile, KYC verification, preferences
- **Admin Panel**: Dashboard, user/ride/dispute management
- **Real-time**: Live chat and notifications with Supabase Realtime

## Tech Stack

- **Frontend**: Ionic Framework + React + TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions)
- **Build Tool**: Vite

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and update with your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase URL and anon key:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set Up Supabase

1. Create a new Supabase project at https://supabase.com
2. Go to the SQL Editor and run the contents of `supabase/schema.sql`
3. Create storage buckets:
   - `kyc-documents` for KYC document uploads
   - `ride-images` for ride-related images (optional)

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:8100`

### 5. Build for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/       # Reusable UI components
├── context/          # React contexts (Auth)
├── pages/            # Page components
│   ├── admin/        # Admin panel pages
│   ├── auth/         # Login, Register, KYC
│   ├── home/         # Dashboard
│   ├── profile/      # Profile, Settings, Notifications
│   ├── rides/        # Ride management
│   ├── safety/       # SOS, Safety features
│   └── support/      # Disputes, Chat
├── services/         # API services
├── theme/            # Ionic theme variables
├── types/            # TypeScript type definitions
└── utils/            # Helper functions
```

## Supabase Edge Functions

The `supabase/functions/` directory contains Edge Functions for:
- `send-notification`: Push notification handling

Deploy Edge Functions:
```bash
supabase functions deploy send-notification
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key |
| `FCM_SERVER_KEY` | Firebase Cloud Messaging server key (for push notifications) |

## License

MIT
