# Apple "Sign in with Apple" — credential request (Blinkcar)

Hi — we're adding **Sign in with Apple** to the Blinkcar app and need a few
things set up in **your** Apple Developer account. You will **not** share your
Apple login. At the end you send back **4 items** (listed at the bottom).

It takes ~15 minutes. You need the **Account Holder** or **Admin** role in an
**Apple Developer Program** membership (the paid $99/yr one).

## Values to use (already decided — please use exactly these)

| Field | Value |
|-------|-------|
| App Bundle ID (App ID) | `com.blinkcar.app` |
| Services ID to create | `com.blinkcar.app.signin` |
| Domain | `ndlczqehttpranitnrac.supabase.co` |
| Return URL | `https://ndlczqehttpranitnrac.supabase.co/auth/v1/callback` |

Everything is at <https://developer.apple.com/account> → **Certificates,
Identifiers & Profiles**.

---

## Step 1 — Enable Sign in with Apple on the App ID
1. Left menu → **Identifiers**.
2. Find and click the App ID **`com.blinkcar.app`** (Type = App IDs).
   - If it does not exist, tell us — the app team will create it; you only need
     to enable the capability.
3. In the **Capabilities** list, tick **Sign in with Apple**.
4. Click **Save** (confirm if it warns about modifying the App ID).

## Step 2 — Create a Services ID
1. **Identifiers** → blue **＋** → choose **Services IDs** → **Continue**.
2. Fill in:
   - **Description:** `Blinkcar Sign in`
   - **Identifier:** `com.blinkcar.app.signin`
3. **Continue** → **Register**.
4. Open the Services ID you just created, tick **Sign in with Apple**, then click
   **Configure** and set:
   - **Primary App ID:** `com.blinkcar.app`
   - **Domains and Subdomains:** `ndlczqehttpranitnrac.supabase.co`
   - **Return URLs:** `https://ndlczqehttpranitnrac.supabase.co/auth/v1/callback`
5. **Next** / **Done** → **Continue** → **Save**.

## Step 3 — Create a Sign in with Apple key (.p8)
1. Left menu → **Keys** → blue **＋**.
2. **Key Name:** `Blinkcar Sign in Key`.
3. Tick **Sign in with Apple** → click its **Configure** → **Primary App ID:**
   `com.blinkcar.app` → **Save**.
4. **Continue** → **Register**.
5. Click **Download**. This saves a file named `AuthKey_XXXXXXXXXX.p8`.
   - ⚠️ **You can only download this once.** Keep it safe. If lost, you must
     revoke the key and make a new one.
6. Note the **Key ID** shown on that key's page (10 characters, e.g. `K1A2B3C4D5`).

## Step 4 — Find the Team ID
- Top-right of the Apple Developer site → **Membership details** (or the account
  menu). The **Team ID** is a 10-character code (e.g. `A1B2C3D4E5`).

---

## What to send back (4 items)
Please send these to us **via a secure channel** (the `.p8` is a secret key —
do not email it in plain text; use a password manager share, encrypted file, or
a private link):

1. **Team ID** — from Step 4
2. **Key ID** — from Step 3 (the 10-char code on the key)
3. **Services ID** — `com.blinkcar.app.signin` (confirm if you changed it)
4. **The `AuthKey_XXXXXXXXXX.p8` file** — from Step 3

That's everything. We generate the rest on our side. Thank you! 🙏
