# Auth Migration Status

Updated: 2026-06-21

## Completed in this pass

- Rebuilt Flutter auth state around the current `iot-uni-app` source flow instead of the old placeholder page logic.
- Added unified token persistence in `lib/services/session_store.dart`.
- Added startup session restore via stored token + `/auth/me` bootstrap.
- Added unauthorized handling in `lib/services/api_client.dart` and `lib/providers/auth_provider.dart`.
- Rebuilt `lib/features/auth/login_page.dart` to match the uni-app auth panel structure:
  - email/password login
  - email/password register
  - phone + SMS code login
  - quick-login area and support hint area
- Added `/splash` bootstrap route so the app no longer jumps straight to `/login` before session recovery finishes.

## Current limitation

- Flutter native WeChat / Google quick login is not yet wired to native SDK capability.
- The current Flutter implementation exposes the same entry area in UI, but marks native quick login as unsupported and surfaces a reason instead of pretending it works.

## Next auth-related work

1. Wire Android native WeChat login capability.
2. Wire Android native Google login capability.
3. Re-check the auth page against a real Android device after the native quick-login slice lands.

## Remaining migration priority after auth

1. Port the add-device multi-step flow 1:1.
2. Rebuild device detail against the uni-app controller logic.
3. Replace profile placeholders with real subpages.
4. Port merchant / promotion modules.
