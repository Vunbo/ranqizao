# iot-app-dev

Client-side app reference project for the Android app and miniapp.

- Frontend-only project
- Uses runtime config from `public/runtime-config.json`
- Keeps `src/features` for business modules and `src/shared` for shared code

## Runtime Config

- Edit `public/runtime-config.json` to change the backend API host
- Use `public/runtime-config.example.json` as the deployment template
- After deployment, you can change the API host without rebuilding the frontend bundle

## Directory Overview

- `src/features/auth`: sign-in, sign-up, auth UI
- `src/features/devices`: device list, detail, bind, share
- `src/features/homes`: home management and device-home linking
- `src/features/sharing`: home/device sharing management
- `src/features/safety`: safety monitoring and alerts
- `src/features/profile`: profile and personal center
- `src/shared/api`: API request wrappers
- `src/shared/config`: runtime config loading
- `src/shared/ui`: shared UI components
- `public/runtime-config.json`: runtime API config

## Start

```bash
npm run dev
```

## Build

```bash
npm run build
```
