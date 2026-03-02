# Liftpictures Dashboard App (Expo)

This repository is the mobile app version of the dashboard, built with Expo + React Native so it can be shipped to the Apple App Store and Google Play.

## What is included

- Isolated mobile codebase (separate from the original web dashboard repo)
- Supabase auth + session persistence for React Native
- Park access flow (`verify_park_access`)
- Dashboard screens for:
  - Overview
  - Revenue
  - Purchases
  - Users
  - Photos
  - Leads
  - Support
  - System Health
  - Settings
- Placeholder screen for advanced Personalization UI
- EAS build config for app store builds

## Environment

Create a `.env` file from `.env.example`.

```bash
cp .env.example .env
```

Use:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_PRIVACY_POLICY_URL`
- `EXPO_PUBLIC_SUPPORT_URL`

## Run locally

```bash
npm install
npm run start
npm run ios
npm run android
npm run typecheck
```

## Build for app stores

Install and login to EAS:

```bash
npm install -g eas-cli
eas login
```

Build:

```bash
npm run build:ios
npm run build:android
```

Submit:

```bash
eas submit --platform ios
eas submit --platform android
```

## Push Notifications (TestFlight + App Store)

Implemented in this repo:

- Device token registration in app settings
- Per-user notification preferences (global + purchase + registration + health alerts)
- Supabase schema migration for token/preference storage
- Supabase Edge Function `send-push-notifications` for dispatching pushes

### 1) Run DB migration

Apply:

- `supabase/migrations/20260302123000_push_notifications.sql`

### 2) Deploy Edge Function

```bash
supabase functions deploy send-push-notifications
supabase functions deploy delete-account
```

Required security secret for push delivery:

```bash
supabase secrets set NOTIFICATION_WEBHOOK_SECRET=your_secret
```

Send this header when calling the push function:

- `x-notify-secret: your_secret`

### 3) Hook events to pushes

Call the function whenever these backend events happen:

- purchase completed
- user account registered
- health alert/down event

Example payload:

```json
{
  "eventType": "purchase",
  "title": "New photo purchase",
  "body": "A new purchase was completed.",
  "organizationId": "org_uuid",
  "data": { "purchaseId": "payment_123" }
}
```

### 4) iOS/TestFlight behavior

- Works in TestFlight and App Store builds.
- Requires user permission and a physical iPhone device.
- Expo Go is not enough for full remote push testing. Use an EAS build.

## Account Deletion (App Store requirement)

- In-app account deletion is implemented in Settings.
- Deploy the `delete-account` edge function for production use:

```bash
supabase functions deploy delete-account
```

## Notes before production submission

- Update app icons/splash assets in `assets/`
- Confirm `ios.bundleIdentifier` and `android.package` in `app.json`
- Add privacy policy URL and support URL in App Store Connect (and set matching in-app URLs via env vars)
- Complete App Store Connect / Google Play metadata and screenshots
