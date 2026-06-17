# Social Login Setup (Google + Apple)

Two different mechanisms, by provider:

- **Google** — Supabase web OAuth redirect on **every** platform. On native the
  app opens the system browser (`@capacitor/browser`), the user signs in there,
  Google returns to the `com.blinkcar.app://auth/callback` deep link
  (`@capacitor/app`), and the app exchanges the code for a session
  (`exchangeCodeForSession`). **No Google client id is needed in the app** —
  Supabase's own web client does the work.
- **Apple** — native sheet on iOS via
  [`@capgo/capacitor-social-login`](https://github.com/Cap-go/capacitor-social-login)
  → `signInWithIdToken`. Web uses the OAuth redirect. Hidden on Android.

Availability: Google shows on web + iOS + Android; Apple shows on web + iOS.

Code lives in `src/services/socialAuth.ts`; the buttons are in
`src/pages/auth/LoginPage.tsx`.

> Profile rows are created automatically. The `handle_new_user` trigger in
> `supabase/schema.sql` fills `full_name` from the Google/Apple `name` claim and
> assigns a `temp_<uid>` placeholder phone (the `profiles.phone` column is
> `UNIQUE NOT NULL`). Users can add a real phone later from their profile.

---

## 1. Environment variables

Add these to your local `.env` and to the CI / Vercel build environment (see
`.env.example`):

```
VITE_APPLE_CLIENT_ID=com.blinkcar.app.signin        # Apple Services ID
VITE_APPLE_REDIRECT_URL=https://<project>.supabase.co/auth/v1/callback
```

> Google needs **no** app-side env vars — it runs entirely through Supabase's
> web OAuth client.

---

## 2. Google

### 2a. Google Cloud Console — one web OAuth client
Under **APIs & Services → Credentials**, you only need a **Web application**
OAuth client (no iOS/Android clients, since the app never holds a Google token):
- **Authorized redirect URIs:** `https://<project>.supabase.co/auth/v1/callback`

### 2b. Supabase Dashboard — Google provider
**Authentication → Providers → Google → Enable**:
- **Client ID (for OAuth):** the Web client id.
- **Client Secret:** the Web client secret.

That's it — no `Info.plist` change and no authorized-client-ids list, because the
native apps use the same web redirect (the system browser deep-links back to
`com.blinkcar.app://auth/callback`).

> The native deep link is already registered: scheme `com.blinkcar.app` in
> `ios/App/App/Info.plist` and the `<intent-filter>` in
> `android/app/src/main/AndroidManifest.xml`.

---

## 3. Apple

> Requires the paid Apple Developer Program. Sign in with Apple is **mandatory**
> for App Store approval because the app offers Google sign-in.

### 3a. Apple Developer
1. **Certificates, Identifiers & Profiles → Identifiers**:
   - On the app id `com.blinkcar.app`, enable the **Sign in with Apple**
     capability.
   - Create a **Services ID** (e.g. `com.blinkcar.app.signin`) — this is the web
     `VITE_APPLE_CLIENT_ID`. Configure its *Return URL* to
     `https://<project>.supabase.co/auth/v1/callback`.
2. **Keys**: create a key with **Sign in with Apple** enabled; download the
   `.p8`. Note the **Key ID** and your **Team ID**.

### 3b. Xcode — enable the capability
Open `ios/App/App.xcworkspace` → target **App** → **Signing & Capabilities** →
**+ Capability → Sign in with Apple**. This adds the entitlement and updates the
provisioning profile. (There is no manual `.entitlements` edit to commit beyond
what Xcode generates.)

### 3c. Supabase Dashboard — Apple provider
**Authentication → Providers → Apple → Enable**:
- **Client IDs** (comma-separated): add the **app bundle id** `com.blinkcar.app`
  (audience of the native iOS token) **and** the Services ID
  `com.blinkcar.app.signin` (used by the web flow).
- **Secret Key (for OAuth)**: generate from Team ID + Key ID + the `.p8` (the
  dashboard has a generator, or use the Supabase CLI). Apple secrets expire every
  6 months — set a reminder to rotate.

> Android: the Apple button is intentionally hidden on Android
> (`isAppleSignInAvailable` in `socialAuth.ts`) to avoid hosting a custom
> redirect page. Google covers Android.

---

## 4. Supabase redirect URLs (REQUIRED for Google)
**Authentication → URL Configuration → Redirect URLs** — add **all** of:
- `com.blinkcar.app://auth/callback` ← **native Google** deep link (without this,
  native Google sign-in fails after the browser step)
- `http://localhost:5173/home` ← local web dev
- `https://<prod-domain>/home` ← production web

---

## 5. After config — rebuild native
```
npm run build
npx cap sync
npx cap open ios      # / android
```
Run on a real device (the system-browser OAuth + deep link round-trip is hard to
exercise in a simulator; Apple's native sheet works in the simulator when signed
into an Apple ID).

## Quick test checklist
- [ ] Web: Google + Apple buttons redirect out and return signed-in.
- [ ] iOS device: Google opens the system browser → returns signed in; Apple
      native sheet → signed in.
- [ ] Android device: Google opens the system browser → returns signed in
      (Apple button hidden).
- [ ] New social user gets a `profiles` row with name + `temp_` phone.
- [ ] Dismissing the browser/sheet shows no error toast.
