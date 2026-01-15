# Clerk + Supabase Integration Guide

This guide provides step-by-step instructions for integrating Clerk authentication with Supabase in the RiderApp.

## Prerequisites

- A Clerk account (https://clerk.com)
- A Supabase account (https://supabase.com)
- Node.js 18+ installed

## Step 1: Set Up Clerk

### 1.1 Create a Clerk Application

1. Go to https://clerk.com and sign in to your account
2. Click "Add Application" to create a new application
3. Enter your application name (e.g., "RiderApp")
4. Select "React" as the framework
5. Configure sign-in methods:
   - Email Address (required)
   - Phone Number (optional, for SMS OTP)
   - Username (optional)
6. Click "Create Application"

### 1.2 Get Your Clerk Keys

1. In your Clerk dashboard, navigate to **API Keys** section
2. Copy the following keys:
   - **Publishable Key** (starts with `pk_`)
   - **Secret Key** (starts with `sk_`)

### 1.3 Configure Clerk User Metadata

1. Go to **User & Authentication > Metadata** in Clerk dashboard
2. Add custom fields for your users:
   - `phone` (string)
   - `role` (string, default: "rider")
   - `full_name` (string)
3. Save the configuration

## Step 2: Set Up Supabase

### 2.1 Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Enter project name (e.g., "rider-app")
4. Set a secure database password
5. Wait for the project to be created

### 2.2 Get Your Supabase Keys

1. In Supabase dashboard, go to **Project Settings > API**
2. Copy the following keys:
   - **Project URL** (e.g., `https://xyz.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

### 2.3 Run the Database Schema

Open Supabase's SQL Editor and run the schema from `supabase/schema.sql` (after updating it for Clerk integration - see Step 3).

### 2.4 Set Up Storage Buckets

1. Go to **Storage** in Supabase dashboard
2. Create the following buckets:
   - `kyc-documents` (private)
   - `ride-images` (private)
3. Set appropriate storage policies

## Step 3: Update Supabase Schema for Clerk

### 3.1 Drop Existing Tables (if any)

```sql
-- WARNING: This will delete all data. Run only for fresh setup.

DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS disputes CASCADE;
DROP TABLE IF EXISTS sos_alerts CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS rides CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS faq CASCADE;
DROP TABLE IF EXISTS notices CASCADE;

-- Drop triggers and functions
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_rides_updated_at ON rides;
DROP TRIGGER IF EXISTS update_disputes_updated_at ON disputes;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS public.handle_new_user();
```

### 3.2 Create New Schema with Clerk Integration

Run the updated schema SQL (provided in `supabase/schema_clerk.sql`).

### 3.3 Enable Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq ENABLE ROW LEVEL SECURITY;
```

## Step 4: Configure Environment Variables

### 4.1 Update `.env` File

Create or update your `.env` file with the following:

```env
# Clerk Configuration
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx
```

### 4.2 Update `.env.example`

Add the same variables to `.env.example` for reference:

```env
# Clerk Configuration
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Supabase Configuration
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Step 5: Install Dependencies

### 5.1 Install Clerk React SDK

```bash
npm install @clerk/clerk-react
```

### 5.2 Verify Current Dependencies

Ensure you have these in `package.json`:
```json
{
  "dependencies": {
    "@clerk/clerk-react": "^5.0.0",
    "@supabase/supabase-js": "^2.90.1",
    "react": "^18.0.0",
    "react-router-dom": "^5.3.4"
  }
}
```

## Step 6: Update Application Code

### 6.1 Create Clerk Provider

Update `src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ClerkProvider } from '@clerk/clerk-react';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/login">
      <App />
    </ClerkProvider>
  </React.StrictMode>
);
```

### 6.2 Update Auth Context

Update `src/context/AuthContext.tsx` to use Clerk:

```tsx
import { useClerk } from '@clerk/clerk-react';
// Replace Supabase auth with Clerk auth
```

### 6.3 Update Supabase Client

Update `src/lib/supabase.ts` to use Clerk's JWT for Supabase:

```tsx
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../context/AuthContext';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false, // Handled by Clerk
    persistSession: false,
  },
});
```

### 6.4 Update Sign-In/Sign-Up Pages

Replace `LoginPage.tsx` and `RegisterPage.tsx` with Clerk's components:

```tsx
import { SignIn, SignUp } from '@clerk/clerk-react';
```

### 6.5 Update Protected Routes

Update `src/App.tsx` to use Clerk's authentication state:

```tsx
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

const { isSignedIn, user } = useClerkAuth();
```

## Step 7: Set Up Webhooks (Optional but Recommended)

### 7.1 Create Clerk Webhook Endpoint

Create a Supabase Edge Function or use Supabase Webhooks to sync Clerk user data:

1. In Clerk, go to **Webhooks**
2. Add a webhook endpoint pointing to your Supabase Edge Function
3. Select events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
   - `session.created`

### 7.2 Create Supabase Edge Function

```typescript
// supabase/functions/clerk-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const body = await req.json();
  const { type, data } = body;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  if (type === 'user.created') {
    await supabase.from('profiles').insert({
      id: data.id,
      email: data.email_addresses[0]?.email_address,
      full_name: data.first_name && data.last_name 
        ? `${data.first_name} ${data.last_name}`
        : data.first_name || 'User',
      phone: data.phone_numbers?.[0]?.phone_number || '',
      role: 'rider',
    });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
```

### 7.3 Deploy Webhook Function

```bash
supabase functions deploy clerk-webhook
```

### 7.4 Configure Clerk Webhook

1. Get the function URL from Supabase
2. Add it to Clerk webhook settings
3. Copy the signing secret to your environment variables

## Step 8: Testing

### 8.1 Test Clerk Authentication

1. Start the development server: `npm run dev`
2. Navigate to `/login`
3. Try signing in with email/phone
4. Verify you can sign out

### 8.2 Test Supabase Data Sync

1. After signing up, check the `profiles` table in Supabase
2. Verify the user record was created automatically
3. Test protected routes

### 8.3 Test RLS Policies

1. Create a test user
2. Try to access another user's data
3. Verify access is denied

## Step 9: Production Deployment

### 9.1 Update Environment Variables

Ensure all environment variables are set in your deployment platform:

- **Vite**: Set in `.env.production`
- **Vercel/Netlify**: Set in project settings
- **Clerk**: Configure production instance

### 9.2 Configure Clerk for Production

1. In Clerk dashboard, add your production domain
2. Update allowed redirect URLs:
   - `https://yourdomain.com`
   - `https://yourdomain.com/login`
   - `https://yourdomain.com/callback`

### 9.3 Enable Production Mode in Clerk

1. Go to **Settings > General** in Clerk
2. Click "Enable Production Mode"
3. Generate new production keys

## Troubleshooting

### Common Issues

1. **Clerk not loading**: Check publishable key and ensure correct environment
2. **Supabase auth errors**: Verify RLS policies and JWT configuration
3. **Webhook failures**: Check webhook signing secret and endpoint URL
4. **Session issues**: Ensure Clerk and Supabase are synchronized

### Debug Tips

- Check browser console for Clerk/Supabase errors
- Use Clerk's debugging tools in dashboard
- Check Supabase logs for RLS policy violations
- Verify webhook delivery in Clerk dashboard

## Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Clerk + Supabase Guide](https://supabase.com/docs/guides/auth/clerk)
- [React SDK Reference](https://clerk.com/docs/reference/clerk-react)
