# Approval Document: Fix Mobile Speedometer GPS Detection and Error Handling

## 1. Task Summary

- **Task ID**: `bug-005-mobile-speedometer-gps`
- **Task Title**: Fix Mobile Speedometer GPS Detection, Error States, and Android Location Permissions
- **Source**: [GitHub Issue #5](https://github.com/yogeshpm89/my-routine/issues/5)
- **Branch**: `fix/issue-5-mobile-speedometer-gps`
- **Date Prepared**: 2026-10-23
- **Approval Date**: 2026-10-23
- **Current Status**: **APPROVED**
- **Approved Scope**: Full implementation of mobile speedometer GPS detection, Android permissions, staleness watchdog, and error handling

---

## 2. Problem Being Solved

The GPS speedometer fails on mobile devices due to:
1. Complete omission of `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION` permissions in `AndroidManifest.xml`, causing Android WebView in Capacitor to reject all geolocation attempts with `PERMISSION_DENIED`.
2. React `useEffect` dependency thrashing in `SpeedometerModal`, where changing speeds causes `maxSpeedMs` to re-trigger, clearing and re-starting the hardware GPS watch repeatedly.
3. Premature 10-second timeout on mobile cold fixes.
4. Failure to prominently display the required notice **`GPS signal not available`** when location fix is lost or unavailable, misleading users with a fabricated `0.0` or freezing the last observed speed.

---

## 3. Expected Behavior

1. **Native Android Compatibility**:
   - `AndroidManifest.xml` explicitly declares `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, and `android.hardware.location.gps` (`required=false`).
   - Capacitor's WebView can prompt and acquire runtime GPS permissions seamlessly on Android phones.
2. **Clear GPS Status States**:
   - **Loading**: Shows `Acquiring GPS signal...` with an animated amber beacon.
   - **Unavailable**: When signal is lost or position cannot be obtained, prominently shows **`GPS signal not available`** across the central dial and status bar.
   - **Permission Denied**: Clearly explains permission requirement with troubleshooting guidance, distinguishable from signal loss.
   - **Unknown Speed**: Displays `--` placeholder instead of inventing `0.0`.
   - **Retry Action**: Provides an interactive "Retry GPS" button.
3. **Resilient Lifecycle**:
   - The GPS watcher runs only while the modal is open.
   - State updates (speed, distance, trip active) do NOT restart the underlying GPS watcher.
   - A 5-second staleness watchdog detects signal dropouts and updates UI to `GPS signal not available`.
4. **Version Increment**:
   - Per user instruction, version increments to `1.2.1` (`versionCode: 4`).

---

## 4. Proposed Solution

1. Add Android location permissions in `android/app/src/main/AndroidManifest.xml`.
2. Refactor `SpeedometerModal` GPS watcher to remove `maxSpeedMs` and `isTripActive` from dependencies, maintaining dynamic values via `useRef`.
3. Set `timeout: 20000`, `maximumAge: 2000`, and `enableHighAccuracy: true`.
4. Implement the 5-second staleness watchdog.
5. Update gauge UI to render `--` when speed is null/unavailable, and prominent **`GPS signal not available`** banner with Retry button when disconnected.
6. Create automated Vitest unit tests in `src/components/speedometer/speedometer-modal.test.tsx` and extend `speedometer-utils.test.ts`.
7. Increment version to `1.2.1` (`versionCode: 4`) in `package.json`, `public/version.json`, `android/app/build.gradle`, and `README.md`.

---

## 5. Important Architectural Decisions

1. **Preserve Web Geolocation API in Capacitor**:
   - Capacitor's native `BridgeActivity` directly supports `navigator.geolocation` via its `WebChromeClient` once `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION` are present in `AndroidManifest.xml`.
   - This keeps the codebase unified between mobile web (PWA) and Android native without introducing competing plugins or breaking static export.
2. **Ref-Based Dynamic Tracking**:
   - By accessing `isTripActive`, `maxSpeedMs`, and `movingSamples` via React refs inside `handleSuccess`, the GPS watch remains open and continuous throughout the user's run or drive, saving battery and eliminating reconnection latency.
3. **Staleness Watchdog Timer**:
   - A lightweight 1-second interval checks `Date.now() - lastFixTimestamp > 5000`. If satellites are blocked (e.g. entering a tunnel), it transitions to `unavailable` and displays **`GPS signal not available`** without waiting for browser timeout.

---

## 6. Main Files Expected to Change

| File Path | Nature of Change |
|---|---|
| `android/app/src/main/AndroidManifest.xml` | Add `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, and GPS feature |
| `src/components/speedometer/speedometer-modal.tsx` | Stable watcher lifecycle, staleness watchdog, error handling, and prominent UI |
| `src/lib/speedometer/speedometer-utils.ts` | Format speed with `--` placeholder support |
| `src/lib/speedometer/speedometer-utils.test.ts` | Test speed formatting and invalid speed fallbacks |
| `src/components/speedometer/speedometer-modal.test.tsx` | New unit tests for loading, errors, timeout, and retries |
| `package.json` | Increment version to `1.2.1` |
| `public/version.json` | Increment version to `1.2.1`, `versionCode: 4` |
| `android/app/build.gradle` | Increment `versionCode 4`, `versionName "1.2.1"` |
| `public/download/index.html` | Update version badge to `1.2.1` |
| `README.md` | Update version references and documentation |

---

## 7. Data Model or Persistence Implications

- **No schema or persistence changes**: Routine occurrence definitions, Firestore rules, and local storage remain unaffected.
- **Trip Log Compatibility**: Routine activity comment logging from trips continues to function with identical summary formatting.

---

## 8. Testing Strategy

1. **Vitest Unit Tests**:
   - Mock `navigator.geolocation.watchPosition` and `clearWatch`.
   - Test initial `Acquiring GPS signal...` state.
   - Test successful position updates and speed calculations.
   - Test `PERMISSION_DENIED`, `POSITION_UNAVAILABLE`, and `TIMEOUT` error codes.
   - Test 5-second staleness watchdog using Vitest fake timers.
   - Test "Retry GPS" button interaction.
2. **Build Verifications**:
   - `npx tsc --noEmit` (TypeScript validation).
   - `npm run test` (Vitest test suite).
   - `npm run build:web` (static Next.js bundle generation).
   - `npm run build:mobile` (Capacitor sync to Android).
   - `cd android; .\gradlew.bat tasks --dry-run` (Android Gradle verification).

---

## 9. Key Risks & Mitigations

- **Risk**: Android runtime permission prompt fails.
  - *Mitigation*: Both coarse and fine location permissions are added to `AndroidManifest.xml`, allowing Capacitor Bridge to delegate to the Android OS permission dialog.
- **Risk**: Memory leak from GPS watcher or staleness interval.
  - *Mitigation*: Cleanup function in `useEffect` clears both `watchPosition` and the staleness interval on unmount or modal close.

---

## 10. Open Questions

- None. Requirements from GitHub Issue #5 and the user prompt are concrete.

---

## 11. Acceptance Criteria Checklist

- [ ] Android permissions declared in `AndroidManifest.xml`.
- [ ] Initial state shows `Acquiring GPS signal...`.
- [ ] Signal loss / timeout prominently displays **`GPS signal not available`**.
- [ ] Permission denied provides distinct guidance without claiming signal is unavailable.
- [ ] Unavailable speed displays `--` rather than a fabricated `0.0`.
- [ ] Interactive Retry button allows re-attempting GPS acquisition.
- [ ] Watcher lifecycle remains stable when speed increases or trip toggles.
- [ ] Staleness watchdog detects lost signal after 5 seconds.
- [ ] Application version incremented to `1.2.1` (`versionCode: 4`).
- [ ] Unit tests, TypeScript, and builds pass cleanly.

---

## 12. Scope Exclusions

- No background location tracking (foreground tracking while modal is open satisfies all requirements).
- No changes to routine scheduling, authentication, or synchronization.

---

## 13. Approval Checklist

Before proceeding to implementation, please confirm:
- [ ] The planned Android permissions and lifecycle architecture meet requirements.
- [ ] The UI status messages, error handling, and `--` placeholders are approved.
- [ ] The version increment to `1.2.1` (`versionCode: 4`) is approved.
- [ ] Authorization is granted to execute the implementation phases on branch `fix/issue-5-mobile-speedometer-gps`.

---

**Status: APPROVED (Approved by User on 2026-10-23)**
