# Notifications setup (app + email)

BlinkCar notifications are **server-driven**: database triggers create in-app
notifications automatically on the events that matter, and (optionally) fan out
email. This avoids the RLS problem where a client can't write a notification row
for another user.

## 1. Run the migration (required for in-app notifications)

```bash
# Supabase SQL editor, or:
supabase db execute --file supabase/notifications_and_integrity.sql
```

This adds:
- a `create_notification(...)` SECURITY DEFINER RPC + a self-insert RLS policy,
- triggers that notify on **ride join / cancel**, **new chat message**, and
  **ride cancelled / completed**,
- a trigger that keeps `rides.booked_seats` in sync with `ride_participants`
  (fixes over-booking, since passengers can't update another user's ride),
- `profiles.fcm_token` for push,
- adds `notifications` + `ride_messages` to the realtime publication so the
  in-app bell/badge updates live.

After this, the in-app bell (home header), the Notifications screen, and the
unread badge all work with zero extra config.

## 2. Email (optional)

```bash
supabase functions deploy notify-email
supabase secrets set RESEND_API_KEY=...            # from https://resend.com
supabase secrets set NOTIFY_EMAIL_FROM="BlinkCar <no-reply@yourdomain.com>"
supabase secrets set NOTIFY_EMAIL_HOOK_SECRET=$(openssl rand -hex 16)
```

Then point the DB at the function so `create_notification` fans out email
(best-effort; failures never block the in-app notification):

```sql
ALTER DATABASE postgres SET app.notify_email_url = 'https://<project-ref>.functions.supabase.co/notify-email';
ALTER DATABASE postgres SET app.notify_email_hook_secret = '<the NOTIFY_EMAIL_HOOK_SECRET value>';
-- pg_net must be enabled: create extension if not exists pg_net;
```

Until `RESEND_API_KEY` is set, `notify-email` returns success without sending, so
nothing breaks. Placeholder OTP emails (`*@otp.riderapp.local`) and users who
turned notifications off are skipped automatically.

## 3. Push (optional, native only)

`supabase/functions/send-notification` sends FCM push and reads
`profiles.fcm_token`. To use it, install `@capacitor/push-notifications`,
register the device token into `profiles.fcm_token` on login, set `FCM_SERVER_KEY`,
and call the function (or extend `create_notification` similarly to email).
