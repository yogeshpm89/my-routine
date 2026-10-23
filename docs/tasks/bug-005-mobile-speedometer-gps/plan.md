# Implementation Plan: Fix Mobile Speedometer GPS Detection and Error Handling

## A. Proposed Solution

Resolve mobile GPS speedometer failures by:
1. Adding required Android location permissions (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`) to `android/app/src/main/AndroidManifest.xml`.
2. Refactoring the GPS tracking lifecycle in `SpeedometerModal` to eliminate watcher teardown thrashing caused by dynamic dependencies (`maxSpeedMs`, `isTripActive`).
3. Configuring resilient geolocation options (`timeout: 20000`, `maximumAge: 2000`).
4. Differentiating all error states (`PERMISSION_DENIED`, `POSITION_UNAVAILABLE`, `TIMEOUT`), displaying the exact required message **`GPS signal not available`** prominently, showing placeholder `--` for unknown speed, and adding a **Retry GPS** action.
5. Implementing a 5-second staleness watchdog to detect signal loss and clear frozen readings.
6. Incrementing application version to `1.2.1` (`versionCode: 4`) per the user's explicit instruction.
7. Adding comprehensive Vitest unit tests with mocked `navigator.geolocation`.

---

## B. Architecture and Data Flow

```text
[ SpeedometerModal Mounted / Opened ]
                 │
                 ├──► [ Check navigator.geolocation availability ]
                 │         │
                 │         ├── If unavailable ──► Set status 'unsupported' / 'GPS signal not available'
                 │         ▼
                 └──► [ Request watchPosition ]
                           │ (enableHighAccuracy: true, timeout: 20s, maxAge: 2s)
                           ▼
          ┌──────────────────────────────────────────────┐
          │                                              │
          ▼                                              ▼
    [ Success Callback ]                           [ Error Callback ]
    • Update lastFixTimestamp                      • Code 1 (PERMISSION_DENIED)
    • If speed valid (>0):                           -> Set status 'denied'
        effectiveSpeed = speed                       -> Show settings instructions
      Else:                                        • Code 2 (POSITION_UNAVAILABLE)
        Compute from delta (if accuracy < 50m)     • Code 3 (TIMEOUT)
    • Update trip distance (via refs)                -> Set status 'unavailable'
    • Set status 'connected'                         -> Display: "GPS signal not available"
          │                                          -> Display speed: "--"
          │                                          -> Provide: [Retry GPS] button
          ▼
   [ 5s Staleness Watchdog ]
   • If now - lastFixTimestamp > 5000ms:
       -> Mark speed as unknown ('--')
       -> Transition status to 'unavailable'
       -> Display "GPS signal not available"
```

---

## C. Data Model and Version Changes

- **Version Increment**:
  - `package.json`: `"version": "1.2.1"`
  - `public/version.json`: `"version": "1.2.1"`, `"versionCode": 4`, `"title": "v1.2.1 — Mobile Speedometer GPS Reliability Fix"`
  - `android/app/build.gradle`: `versionCode 4`, `versionName "1.2.1"`
  - `public/download/index.html`: Badge updated to `Version 1.2.1`
- **Database / Schema**: None. Zero impact on Cloud Firestore or offline IndexedDB persistence.

---

## D. File-by-File Implementation Plan

| File or Directory | Action | Purpose | Verification |
|---|---|---|---|
| `android/app/src/main/AndroidManifest.xml` | Modify | Declare `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, and GPS feature | Gradle dry-run & XML inspection |
| `src/components/speedometer/speedometer-modal.tsx` | Modify | Refactor GPS watcher lifecycle, implement staleness watchdog, error states, and prominent "GPS signal not available" UI | Vitest unit tests & UI inspection |
| `src/lib/speedometer/speedometer-utils.ts` | Modify | Add helper for speed display formatting with placeholder `--` support | Vitest unit tests |
| `src/lib/speedometer/speedometer-utils.test.ts` | Extend | Test invalid/null speed conversion and `--` formatting | `npm run test` |
| `src/components/speedometer/speedometer-modal.test.tsx` | Create | Unit test `SpeedometerModal` with mock geolocation (loading, lock, unavailable, denied, timeout, retry) | `npm run test` |
| `package.json` | Modify | Bump version to `1.2.1` | Version check |
| `public/version.json` | Modify | Bump version to `1.2.1`, `versionCode: 4` | Version check |
| `android/app/build.gradle` | Modify | Bump `versionCode 4`, `versionName "1.2.1"` | Gradle build check |
| `public/download/index.html` | Modify | Update download page version badge to `1.2.1` | HTML check |
| `README.md` | Modify | Update version references in documentation | Review |

---

## E. Implementation Phases

### Phase 1: Android Manifest Permissions & Configuration
- **Objective**: Ensure native Android WebView can request and access GPS.
- **Tasks**:
  1. Add `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION` to `AndroidManifest.xml`.
  2. Add `<uses-feature android:name="android.hardware.location.gps" android:required="false" />`.
- **Files**: `android/app/src/main/AndroidManifest.xml`.
- **Validation**: Check manifest XML and run `cd android; .\gradlew.bat tasks --dry-run`.

### Phase 2: Speedometer Utility Expansion & Speed Formatting
- **Objective**: Enhance speed utility helpers to support `--` placeholder for unknown/lost speed.
- **Tasks**:
  1. Update `formatSpeedDisplay(speedMs: number | null, unit: SpeedUnit)` in `speedometer-utils.ts` to return `--` when speed is null, negative, or invalid.
  2. Add unit tests in `speedometer-utils.test.ts`.
- **Files**: `src/lib/speedometer/speedometer-utils.ts`, `src/lib/speedometer/speedometer-utils.test.ts`.
- **Validation**: Run `npm run test`.

### Phase 3: SpeedometerModal GPS Lifecycle, Error Handling & UI States
- **Objective**: Fix watcher re-creation thrashing, implement error states, staleness watchdog, and UI banners.
- **Tasks**:
  1. Remove `maxSpeedMs` and `isTripActive` from `useEffect` dependency array; manage dynamic callback values via refs.
  2. Set `timeout: 20000`, `maximumAge: 2000`, `enableHighAccuracy: true`.
  3. Differentiate error states: `connecting`, `connected`, `unavailable` (signal lost/timeout/position unavailable), and `denied`.
  4. Display prominent **`GPS signal not available`** in the central dial and status strip.
  5. Display `Acquiring GPS signal...` during acquisition.
  6. Display clear permission denied instructions when `error.code === 1`.
  7. Implement 5-second staleness watchdog to transition to `unavailable` and `--` speed if updates cease.
  8. Provide interactive **Retry GPS** button.
- **Files**: `src/components/speedometer/speedometer-modal.tsx`.
- **Validation**: Unit tests in `speedometer-modal.test.tsx` and static export check.

### Phase 4: Automated Testing Suite for Speedometer
- **Objective**: Verify all geolocation states with automated tests.
- **Tasks**:
  1. Create `src/components/speedometer/speedometer-modal.test.tsx`.
  2. Test initial loading (`Acquiring GPS signal...`).
  3. Test successful position lock and speed conversion.
  4. Test `PERMISSION_DENIED` state and message.
  5. Test `POSITION_UNAVAILABLE` and `TIMEOUT` displaying **`GPS signal not available`**.
  6. Test retry action re-calling `watchPosition`.
  7. Test cleanup on unmount.
- **Files**: `src/components/speedometer/speedometer-modal.test.tsx`.
- **Validation**: `npm run test`.

### Phase 5: Version Increment & Build Verification
- **Objective**: Bump version to `1.2.1` (`versionCode: 4`) and verify full build.
- **Tasks**:
  1. Bump `package.json` to `1.2.1`.
  2. Bump `public/version.json` to `1.2.1` (`versionCode: 4`).
  3. Bump `android/app/build.gradle` to `versionCode 4`, `versionName "1.2.1"`.
  4. Update `public/download/index.html`.
  5. Run `npx tsc --noEmit`.
  6. Run `npm run test`.
  7. Run `npm run build:web`.
  8. Run `npx cap sync android`.
- **Files**: `package.json`, `public/version.json`, `android/app/build.gradle`, `public/download/index.html`.
- **Validation**: All build and test commands report exit code 0.

---

## F. Testing Strategy

1. **Unit Tests (Vitest & JSDOM)**:
   - Mock `navigator.geolocation.watchPosition` and `clearWatch`.
   - Test GeolocationPosition success callbacks.
   - Test GeolocationPositionError error callbacks for codes 1, 2, and 3.
   - Test fake timers advancing >5000ms to verify staleness watchdog.
2. **TypeScript & Static Build**:
   - `npx tsc --noEmit` and `npm run build:web`.
3. **Capacitor Android Sync**:
   - `npm run build:mobile` to verify Android project sync.

---

## G. Migration and Deployment

- Incremental version update to `1.2.1`.
- Standard web deployment via `npm run deploy:hosting`.
- Release APK distribution via GitHub Releases.

---

## H. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Excessive battery usage from GPS | Low | Medium | Watcher is active strictly while the modal is open. When closed, `clearWatch` is guaranteed. |
| Inaccurate speed jumps from noisy GPS | Medium | Low | Maintain existing speed filter (`dMeters < 80`, stationary threshold `0.4 m/s`). |
| Android permission popup blocked | Low | Medium | Declare permissions in `AndroidManifest.xml` so Capacitor Bridge can prompt the OS dialog. |

---

## I. Definition of Done

- [ ] Android permissions declared in `AndroidManifest.xml`.
- [ ] Watcher lifecycle stable with zero unnecessary teardown/restarts.
- [ ] Prominent **`GPS signal not available`** banner displayed during signal loss/timeout.
- [ ] `Acquiring GPS signal...` displayed during connection.
- [ ] Placeholder `--` displayed when speed is unavailable.
- [ ] Interactive Retry button functional.
- [ ] 5-second staleness watchdog active.
- [ ] Version incremented to `1.2.1` (`versionCode: 4`).
- [ ] Automated tests pass (`npm run test`).
- [ ] Production build succeeds (`npm run build:web`).
- [ ] Capacitor sync succeeds (`npm run build:mobile`).

---

## J. Complexity Assessment

- **Complexity**: Medium.
- **Primary Factors**: Managing Geolocation API mocks, Android WebView permission bridging, and ensuring responsive React state without thrashing timers.
