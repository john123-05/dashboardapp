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

## Notes before production submission

- Update app icons/splash assets in `assets/`
- Confirm `ios.bundleIdentifier` and `android.package` in `app.json`
- Add privacy policy URL and support URL in store listings
- Complete App Store Connect / Google Play metadata and screenshots
