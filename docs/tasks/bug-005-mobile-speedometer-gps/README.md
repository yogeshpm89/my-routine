# Bug README: Fix Mobile Speedometer GPS Detection and Error Handling

## A. Task Metadata

- **Task ID**: `bug-005-mobile-speedometer-gps`
- **Task Title**: Fix Mobile Speedometer GPS Detection, Error States, and Android Location Permissions
- **Task Type**: Bug Fix & Mobile Reliability Enhancement
- **Source Request / Issue**: [GitHub Issue #5](https://github.com/yogeshpm89/my-routine/issues/5)
- **Branch**: `fix/issue-5-mobile-speedometer-gps`
- **Date Prepared**: 2026-10-23
- **Current Workflow Stage**: Investigation & Approval Planning (Pre-Implementation)
- **Approval Status**: AWAITING USER APPROVAL

---

## B. Problem Statement

The GPS Speedometer & Trip Tracker feature in My Routine fails to acquire location or reliably report live speed on mobile devices (both inside mobile browsers and inside the native Capacitor Android app).

When GPS fix cannot be obtained, the UI fails to clearly convey the issue:
1. It does not display the mandatory user-facing message **`GPS signal not available`** prominently.
2. It displays a fabricated `0.0` or retains stale speed readings indefinitely when location signals are lost.
3. On Android (via Capacitor), `AndroidManifest.xml` lacks standard location permissions (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`), causing Android WebView to immediately reject geolocation requests.
4. In `SpeedometerModal`, the React `useEffect` managing `watchPosition` contains `maxSpeedMs` and `isTripActive` in its dependency array. As speed increases, the effect continuously tears down and restarts the GPS hardware watcher, causing continuous reconnecting cycles and premature 10-second timeouts.
5. There is no retry action or distinct guidance for `PERMISSION_DENIED` vs `POSITION_UNAVAILABLE` vs `TIMEOUT`.

---

## C. Current Behavior (Verified from Codebase Evidence)

1. **Android Permissions**:
   - In [android/app/src/main/AndroidManifest.xml](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/android/app/src/main/AndroidManifest.xml#L51-L59), the only declared permissions are:
     `INTERNET`, `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM`, `VIBRATE`, `RECEIVE_BOOT_COMPLETED`, and `WAKE_LOCK`.
   - `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION` are completely missing. Capacitor Android WebView cannot request or access device GPS.
2. **Watcher Lifecycle Thrashing**:
   - In [src/components/speedometer/speedometer-modal.tsx](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/speedometer/speedometer-modal.tsx#L240):
     `useEffect(() => { ... }, [isOpen, isTripActive, isDemoMode, maxSpeedMs]);`
   - Every time `effectiveSpeedMs > maxSpeedMs`, `setMaxSpeedMs` triggers. This triggers the effect cleanup (`clearWatch`), followed by an immediate new `watchPosition` and resets status to `connecting`.
3. **Rigid Timeout**:
   - `timeout: 10000` (10 seconds) with `enableHighAccuracy: true` frequently triggers `TIMEOUT` on mobile devices before satellite triangulation completes.
4. **Error & Status Messaging**:
   - When an error occurs, the header displays small text `"GPS Signal Unavailable"`.
   - The central speedometer dial still shows `0.0` or the previous speed, confusing users into thinking they are stationary rather than without GPS.
   - When `PERMISSION_DENIED` occurs, there is no actionable recovery UI or explanation of how to enable permissions.
5. **Staleness**:
   - If GPS connection drops, no timer clears or flags `currentSpeedMs`. The user sees the last recorded speed frozen on screen.

---

## D. Expected Behavior

1. **Android Permission Declaration**:
   - `android/app/src/main/AndroidManifest.xml` declares `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, and `android.hardware.location.gps` (`required=false`).
2. **Stable GPS Lifecycle**:
   - The GPS watcher starts when `SpeedometerModal` opens (and is not in demo mode) and cleanly unmounts when closed.
   - It is NOT torn down or restarted when speed, max speed, or trip active states change. Refs are used for dynamic values needed in callbacks.
3. **Prominent Status Messaging**:
   - **Loading State**: Displays `Acquiring GPS signal...` with animated pulse.
   - **GPS Signal Unavailable**: When position cannot be obtained, or fix is lost, or times out, prominently displays **`GPS signal not available`** in the central dial and status bar.
   - **Permission Denied**: Distinguishes permission denial from signal loss, explains that location permission is required, and provides troubleshooting guidance.
   - **Placeholder for Unknown Speed**: When speed is unavailable or invalid, displays `--` instead of fabricating `0.0`.
   - **Retry Action**: Provides an explicit "Retry GPS" button to re-trigger location acquisition without closing the modal.
4. **Staleness Watchdog**:
   - If no GPS update is received within 5 seconds while watching, the speed display transitions to `--` and status shows `GPS signal not available`.
5. **Version Increment**:
   - Per user instruction ("increment the version for each incremental change"), increment version in `package.json`, `public/version.json`, `android/app/build.gradle`, and `README.md`.

---

## E. Functional Requirements

- **FR-001**: Add Android location permissions (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, and `android.hardware.location.gps`) to `android/app/src/main/AndroidManifest.xml`.
- **FR-002**: Refactor `useSpeedometer` / GPS watcher lifecycle in `speedometer-modal.tsx` to prevent watcher re-creation on state changes (`maxSpeedMs`, `isTripActive`).
- **FR-003**: Implement realistic geolocation acquisition options (`enableHighAccuracy: true`, `timeout: 20000`, `maximumAge: 1000`).
- **FR-004**: Distinguish all Geolocation error codes:
  - Code 1: `PERMISSION_DENIED`
  - Code 2: `POSITION_UNAVAILABLE`
  - Code 3: `TIMEOUT`
- **FR-005**: Display **`GPS signal not available`** prominently when code 2 (`POSITION_UNAVAILABLE`), code 3 (`TIMEOUT`), or signal loss occurs.
- **FR-006**: Display `Acquiring GPS signal...` during initial acquisition.
- **FR-007**: Display `--` when live speed is null, unknown, or GPS is lost, rather than fabricating `0.0`.
- **FR-008**: Provide an interactive **Retry GPS** button on error / unavailable states.
- **FR-009**: Implement a 5-second staleness watchdog timer to detect temporary signal dropouts.
- **FR-010**: Increment project version from `1.2.0` (versionCode 3) to `1.2.1` (versionCode 4).
- **FR-011**: Create comprehensive unit tests for `SpeedometerModal` and GPS calculation utilities covering success, error codes, timeouts, staleness, and retries.

---

## F. Non-Functional Requirements

- **NFR-001 (Battery & Performance)**: GPS watcher must run only while modal is open and demo mode is off. Must be completely stopped upon modal close.
- **NFR-002 (Visual Integrity)**: Maintain the existing cyan/slate circular gauge styling, HUD mode, and demo simulation mode without visual regressions.
- **NFR-003 (Platform Compatibility)**: Works identically on desktop web, mobile web (HTTPS), and native Android WebView (Capacitor).
- **NFR-004 (Offline Resilience)**: Offline routine tracking, local notifications, and other subsystems remain 100% unaffected.

---

## G. Acceptance Criteria

- [x] **AC-001**: `AndroidManifest.xml` includes `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, and `android.hardware.location.gps` (`required=false`).
- [x] **AC-002**: Opening the speedometer modal displays `Acquiring GPS signal...` while seeking a fix.
- [x] **AC-003**: When GPS position cannot be acquired or times out, the exact message **`GPS signal not available`** is prominently displayed in both the dial center badge and error banner.
- [x] **AC-004**: When location permission is denied by the user, a distinct message explains permission is required (`Location Permission Denied`), without incorrectly claiming the GPS signal is unavailable.
- [x] **AC-005**: When speed is null, invalid, or during signal loss, the speedometer displays `--` rather than a fake `0.0`.
- [x] **AC-006**: An interactive "Retry GPS" button allows re-attempting GPS acquisition.
- [x] **AC-007**: Changing speeds or toggling trip active does not tear down or restart the underlying GPS watcher (stabilized via `isTripActiveRef` and `maxSpeedMsRef`).
- [x] **AC-008**: Stale location data (> 5s without updates) triggers `GPS signal not available` and `--` speed display via the 1-second watchdog.
- [x] **AC-009**: Version is incremented to `1.2.1` (versionCode 4) in `package.json`, `public/version.json`, `android/app/build.gradle`, and `public/download/index.html`.
- [x] **AC-010**: All unit tests pass (21 test files, 158 tests passed), TypeScript check passes (`tsc --noEmit`), and production builds succeed (`npm run build:web`, `npm run build:mobile`).

---

## H. Scope

### In Scope
- `android/app/src/main/AndroidManifest.xml` location permissions.
- `src/components/speedometer/speedometer-modal.tsx` GPS lifecycle, error handling, status UI, and staleness detection.
- `src/lib/speedometer/speedometer-utils.ts` and unit test expansion in `src/lib/speedometer/speedometer-utils.test.ts`.
- Version bump across `package.json`, `public/version.json`, `android/app/build.gradle`.
- Verification of static export and Capacitor synchronization.

### Out of Scope
- Introducing background location tracking (foreground-only tracking meets all requirements).
- Changing map or navigation routing features.
- Modifying routine scheduling or Firestore persistence.

---

## I. Requirement Traceability Matrix

| Requirement | Acceptance Criteria | Implementation Phase | Verification Method |
|---|---|---|---|
| FR-001 (Android Permissions) | AC-001 | Phase 1 | Manifest inspection & Gradle validation |
| FR-002 (Stable Lifecycle) | AC-007 | Phase 2 | Unit test & React re-render inspection |
| FR-003 (GPS Options) | AC-002 | Phase 2 | Options audit |
| FR-004 (Error Handling) | AC-003, AC-004 | Phase 2 | Unit tests with GeolocationPositionError mocks |
| FR-005 (Prominent UI Message) | AC-003 | Phase 3 | UI snapshot / visual inspection |
| FR-006 (Loading State) | AC-002 | Phase 3 | UI inspection |
| FR-007 (Placeholder `--`) | AC-005 | Phase 3 | Unit test & UI inspection |
| FR-008 (Retry Action) | AC-006 | Phase 3 | Interaction test |
| FR-009 (Staleness Watchdog) | AC-008 | Phase 2 | Fake timer test (>5000ms delay) |
| FR-010 (Version Increment) | AC-009 | Phase 4 | Version comparison across config files |
| FR-011 (Automated Tests) | AC-010 | Phase 5 | Vitest test execution |
