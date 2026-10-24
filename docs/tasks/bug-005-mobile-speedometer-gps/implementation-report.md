# Implementation Report: Fix Mobile Speedometer GPS Detection and Error Handling

## Task Metadata

- **Task ID**: `bug-005-mobile-speedometer-gps`
- **Task Title**: Fix Mobile Speedometer GPS Detection, Error States, and Android Location Permissions
- **Source**: [GitHub Issue #5](https://github.com/yogeshpm89/my-routine/issues/5)
- **Status**: COMPLETED
- **Branch**: `fix/issue-5-mobile-speedometer-gps`
- **Target Release Version**: `1.2.1` (`versionCode: 4`)
- **Completion Date**: 2026-10-23

---

## 1. Executive Summary

This implementation directly addresses and resolves **GitHub Issue #5** ("Fix Mobile Speedometer GPS Detection and Error Handling"). 

Previously, when running inside the Android Capacitor WebView or under adverse GPS conditions (e.g., cold fix timeouts, signal loss in tunnels, indoors, or missing device permissions), the mobile speedometer would fail silently, thrash watcher subscriptions continuously in a loop, fabricate misleading `0.0` speed readings, and fail to distinguish permission denial from lack of satellite signal.

The fix introduces:
1. **Android Native Location Manifest Declarations**: Declares `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, and `android.hardware.location.gps` (`required=false`) in `AndroidManifest.xml` so Android WebView geolocation prompts appear correctly.
2. **Speed Utility Standardization**: Introduces `isValidSpeed` and `formatSpeedValue` supporting clean placeholder `--` (and `--:--` for pace) when speed data is absent, unknown, or disconnected.
3. **Watcher Lifecycle Stabilization**: Decouples `watchPosition` from dynamic acceleration state (`maxSpeedMs`) and user pause/resumes (`isTripActive`) using React mutable refs (`maxSpeedMsRef`, `isTripActiveRef`), eliminating continuous teardown and cold timeout loops.
4. **5-Second Signal Staleness Watchdog**: Automatically identifies when GPS updates cease (e.g. going through an underpass or losing satellite lock) and transitions status to `GPS signal not available` with `--` display.
5. **Prominent UI & User Recovery**: Displays the exact required string **`GPS signal not available`** across both the central dial badge and error banner, with an interactive **`Retry GPS`** button for instant re-acquisition.
6. **Permission Segregation**: Accurately distinguishes `PERMISSION_DENIED` (`Location Permission Denied`) from signal timeouts/unavailability (`GPS signal not available`).
7. **Version Bump**: Increments project version to `1.2.1` and `versionCode: 4` across all distribution manifests.

---

## 2. Files Created and Modified

### Created
- `docs/tasks/bug-005-mobile-speedometer-gps/README.md`
- `docs/tasks/bug-005-mobile-speedometer-gps/investigation.md`
- `docs/tasks/bug-005-mobile-speedometer-gps/plan.md`
- `docs/tasks/bug-005-mobile-speedometer-gps/approval.md`
- `docs/tasks/bug-005-mobile-speedometer-gps/implementation-report.md`
- `src/components/speedometer/speedometer-modal.test.tsx`

### Modified
- `android/app/src/main/AndroidManifest.xml`
- `src/lib/speedometer/speedometer-utils.ts`
- `src/lib/speedometer/speedometer-utils.test.ts`
- `src/components/speedometer/speedometer-modal.tsx`
- `src/lib/notifications/notification-manager.test.ts`
- `package.json`
- `public/version.json`
- `android/app/build.gradle`
- `public/download/index.html`

---

## 3. Requirement-to-Implementation Mapping

| Requirement ID | Description | Implementation File | Verification Status |
|---|---|---|---|
| **FR-001** | Android Location Permissions | `android/app/src/main/AndroidManifest.xml` | Verified (Capacitor sync & Gradle) |
| **FR-002** | Geolocation Watcher Lifecycle Stabilization | `src/components/speedometer/speedometer-modal.tsx` | Verified (`speedometer-modal.test.tsx`) |
| **FR-003** | Geolocation Options (`timeout: 20000`, `maximumAge: 2000`) | `src/components/speedometer/speedometer-modal.tsx` | Verified (`speedometer-modal.test.tsx`) |
| **FR-004** | Error Code Classification (`PERMISSION_DENIED` vs `POSITION_UNAVAILABLE` / `TIMEOUT`) | `src/components/speedometer/speedometer-modal.tsx` | Verified (`speedometer-modal.test.tsx`) |
| **FR-005** | Prominently display exact string **`GPS signal not available`** | `src/components/speedometer/speedometer-modal.tsx` | Verified (UI badges & banners tested) |
| **FR-006** | Acquisition loading status (`Acquiring GPS signal...`) | `src/components/speedometer/speedometer-modal.tsx` | Verified (`speedometer-modal.test.tsx`) |
| **FR-007** | Speed placeholder `--` when disconnected or invalid (no `0.0` fabrication) | `src/lib/speedometer/speedometer-utils.ts`, `speedometer-modal.tsx` | Verified (16 util tests + 7 modal tests) |
| **FR-008** | Interactive Retry GPS Action | `src/components/speedometer/speedometer-modal.tsx` | Verified (`speedometer-modal.test.tsx`) |
| **FR-009** | 5-Second Staleness Watchdog Timer | `src/components/speedometer/speedometer-modal.tsx` | Verified (`speedometer-modal.test.tsx` timer advance) |
| **FR-010** | Increment Version to `1.2.1` (`versionCode: 4`) | `package.json`, `version.json`, `build.gradle`, `download/index.html` | Verified |
| **FR-011** | Automated Unit & Component Tests | `speedometer-utils.test.ts`, `speedometer-modal.test.tsx` | Verified (All 23 tests pass) |

---

## 4. Verification & Test Execution Results

### A. TypeScript Compilation
- **Command**: `npx tsc --noEmit`
- **Result**: Passed with exit code 0. Zero compiler errors or missing types.

### B. Automated Test Suite (Vitest)
- **Command**: `npm run test`
- **Results Summary**:
  - Test Files: **21 passed (21 total)**
  - Tests: **158 passed (158 total)**
  - Speedometer Utility Tests: **16/16 passed** (`src/lib/speedometer/speedometer-utils.test.ts`)
  - Speedometer Modal Tests: **7/7 passed** (`src/components/speedometer/speedometer-modal.test.tsx`)
    - `renders acquiring GPS state with placeholder "--" when modal opens` (Passed)
    - `updates to locked state and formatted speed when GPS fix is acquired` (Passed)
    - `prominently displays "GPS signal not available" and "--" when GPS error occurs` (Passed)
    - `restarts GPS acquisition when "Retry GPS" is clicked` (Passed)
    - `distinguishes permission denied from signal unavailable` (Passed)
    - `marks signal unavailable when GPS fix goes stale for over 5 seconds` (Passed)
    - `supports interactive demo mode and cleanly returns to GPS mode on exit` (Passed)

### C. Web Static Export Build
- **Command**: `npm run build:web` (`node scripts/build-web.js`)
- **Result**: Passed with exit code 0.
- **Output**: Static export created under `out/` with all routes compiled and prerendered.

### D. Mobile Build & Capacitor Sync
- **Command**: `npm run build:mobile` (`node scripts/build-mobile.js`)
- **Result**: Passed with exit code 0.
- **Output**: Web assets copied to `android/app/src/main/assets/public`, plugins synchronized:
  - `@capacitor-firebase/authentication@8.5.2`
  - `@capacitor/app@8.1.2`
  - `@capacitor/local-notifications@8.3.1`

---

## 5. Deviations from the Approved Plan

- In `src/lib/notifications/notification-manager.test.ts`, the hardcoded `baseDate = '2026-10-20'` without a `Date.now()` mock previously caused tests to evaluate against past calendar dates and discard all notifications. Fixed by mocking `Date.now()` with `vi.spyOn(Date, 'now')` to `'2030-01-01'` (consistent with `notification-reliability.test.ts`).

---

## 6. Known Limitations

- Real GPS satellite reception requires physical line-of-sight to the sky; when tested inside shielded buildings or basements, hardware GPS will correctly report `GPS signal not available` as expected.
- For indoor testing and demonstration, users can toggle the **Test Drive / Demo** mode to simulate any arbitrary speed from 0 to 160 km/h without needing a satellite lock.

---

## 7. Migration & Deployment Instructions

### Web Deployment
```bash
npm run deploy:hosting
```

### Android APK Build
```bash
npm run build:mobile
cd android
./gradlew assembleRelease
```
The resulting APK will be at `android/app/build/outputs/apk/release/app-release-unsigned.apk` (or debug build at `android/app/build/outputs/apk/debug/app-debug.apk`).

---

## 8. Rollback Instructions

If required, all changes on branch `fix/issue-5-mobile-speedometer-gps` can be reverted cleanly without affecting main:
```bash
git checkout main
```
Or to revert individual commits if merged:
```bash
git revert <commit-hash>
```
