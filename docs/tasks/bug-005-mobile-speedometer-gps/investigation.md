# Codebase Investigation: Fix Mobile Speedometer GPS Detection and Error Handling

## 1. Repository Structure Relevant to the Task

```text
my-routine/
├── android/
│   └── app/
│       ├── build.gradle                              <-- versionCode 3, versionName "1.2.0"
│       └── src/main/
│           ├── AndroidManifest.xml                   <-- Missing ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION
│           └── java/com/antigravity/myroutine/
│               └── MainActivity.java                 <-- Capacitor BridgeActivity
├── package.json                                      <-- version "1.2.0"
├── public/
│   └── version.json                                  <-- In-app update manifest
└── src/
    ├── app/
    │   └── page.tsx                                  <-- Speedometer modal triggers
    ├── components/
    │   ├── routine/
    │   │   └── current-activity-card.tsx             <-- Speedometer trigger button
    │   ├── navigation/
    │   │   └── mobile-drawer.tsx                     <-- Speedometer drawer button
    │   └── speedometer/
    │       └── speedometer-modal.tsx                 <-- Core modal, GPS watcher, UI gauge
    └── lib/
        └── speedometer/
            ├── speedometer-utils.ts                  <-- Speed conversion & distance math
            └── speedometer-utils.test.ts             <-- Unit tests
```

---

## 2. Root Cause Analysis

Investigation reveals 5 concrete root causes explaining why the speedometer fails on mobile devices:

### Root Cause 1: Missing Android Permissions in `AndroidManifest.xml`
- **Location**: [android/app/src/main/AndroidManifest.xml](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/android/app/src/main/AndroidManifest.xml#L51-L59)
- **Finding**:
  ```xml
  <!-- Permissions -->
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
  <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
  <uses-permission android:name="android.permission.USE_EXACT_ALARM" />
  <uses-permission android:name="android.permission.VIBRATE" />
  <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
  <uses-permission android:name="android.permission.WAKE_LOCK" />
  ```
  Neither `android.permission.ACCESS_FINE_LOCATION` nor `android.permission.ACCESS_COARSE_LOCATION` is declared.
- **Impact**: In Android WebView with Capacitor, the operating system blocks `navigator.geolocation` immediately with `PERMISSION_DENIED` (error code 1) because the host application has not declared location capabilities in its manifest. Android will not even display the system permission prompt dialog to the user.

### Root Cause 2: React GPS Watcher Teardown & Reconnect Thrashing
- **Location**: [src/components/speedometer/speedometer-modal.tsx](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/speedometer/speedometer-modal.tsx#L138-L240)
- **Finding**:
  ```typescript
  useEffect(() => {
    ...
    const handleSuccess = (position: GeolocationPosition) => {
      ...
      if (effectiveSpeedMs > maxSpeedMs) {
        setMaxSpeedMs(effectiveSpeedMs); // <-- Updates state!
      }
      ...
    };
    ...
  }, [isOpen, isTripActive, isDemoMode, maxSpeedMs]);
  ```
  `maxSpeedMs` and `isTripActive` are listed in the dependency array. Whenever speed exceeds `maxSpeedMs` (every time the user accelerates), React triggers the effect cleanup:
  `navigator.geolocation.clearWatch(watchIdRef.current)`
  followed by an immediate new `watchPosition(...)` and `setGpsStatus('connecting')`.
- **Impact**: On real mobile hardware, continuous tearing down and re-requesting of the GPS satellite lock forces the GPS chip into constant re-initialization, preventing sustained tracking and producing false connection dropouts.

### Root Cause 3: Overly Aggressive 10-Second Timeout on Cold Starts
- **Location**: [src/components/speedometer/speedometer-modal.tsx](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/speedometer/speedometer-modal.tsx#L231)
- **Finding**:
  ```typescript
  watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 10000,
  });
  ```
- **Impact**: Satellite GPS acquisition from a cold state on mobile phones commonly takes 15 to 25 seconds. A 10-second timeout causes error code 3 (`TIMEOUT`) before the device can deliver its first fix.

### Root Cause 4: Misleading UI States and Missing "GPS signal not available" Notice
- **Location**: [src/components/speedometer/speedometer-modal.tsx](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/speedometer/speedometer-modal.tsx#L289-L295,L611-L618)
- **Finding**:
  - `displayCurrentSpeed` returns `0.0` whenever `currentSpeedMs === 0`, even when GPS is disconnected or has never locked.
  - When GPS fails, the central dial still displays a bold `0.0` with units, misleading the user into thinking the device is connected and reading 0 speed.
  - The required prominent message **`GPS signal not available`** is never displayed in the central dial or prominent banner.
  - When `PERMISSION_DENIED` occurs, there is no actionable message directing the user to device location settings.
  - There is no "Retry GPS" button.

### Root Cause 5: Lack of Staleness Watchdog
- **Finding**: If GPS signal drops while driving or running, `currentSpeedMs` retains its last updated value forever because `handleSuccess` simply stops firing.
- **Impact**: The app displays a frozen historical speed as if it were a live measurement.

---

## 3. Existing Tests and Coverage Gaps

- Current tests in [src/lib/speedometer/speedometer-utils.test.ts](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/speedometer/speedometer-utils.test.ts) test pure mathematical utilities:
  - Haversine distance (`calculateDistanceMeters`).
  - Speed unit conversions (`convertSpeed`).
  - Pace formatting (`formatPace`).
  - Trip duration formatting (`formatTripDuration`).
  - Heading compass formatting (`getHeadingCompass`).
- **Missing Coverage**:
  - No tests for GPS watcher lifecycle.
  - No tests for `PERMISSION_DENIED`, `POSITION_UNAVAILABLE`, or `TIMEOUT` handling.
  - No tests verifying that `--` is displayed when speed is unavailable.
  - No tests for the 5-second staleness watchdog.
  - No tests for the retry action.

---

## 4. Technical Approach & Design

1. **Android Manifest Permissions**:
   Add to `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
   <uses-feature android:name="android.hardware.location.gps" android:required="false" />
   ```
2. **Stable GPS Watcher Lifecycle**:
   - Move dynamic callback values (`isTripActive`, `maxSpeedMs`) to `useRef`.
   - Effect dependency array reduced to: `[isOpen, isDemoMode, retryCount]`.
   - On unmount or close: clean up `watchPosition` and clear staleness timer.
3. **Robust Geolocation Acquisition**:
   - `enableHighAccuracy: true`, `maximumAge: 2000`, `timeout: 20000`.
4. **Comprehensive Error States**:
   - `connecting`: Shows `Acquiring GPS signal...` with pulsing amber dot.
   - `connected`: Shows `GPS Locked (±Xm)` with green dot.
   - `unavailable` (`POSITION_UNAVAILABLE`, `TIMEOUT`, or stale timeout): Displays prominent badge & dial banner **`GPS signal not available`**, with speed placeholder `--` and a **Retry GPS** button.
   - `denied` (`PERMISSION_DENIED`): Displays a prominent message that location permission is required with a **Grant Permission / Retry** action and instructions for browser/device settings.
5. **Staleness Watchdog**:
   - A 5-second interval checks if `Date.now() - lastFixTime > 5000`. If stale, mark speed as unavailable (`--`) and transition to `GPS signal not available`.
6. **Version Increment**:
   - Increment `version` to `1.2.1` and `versionCode` to `4` across:
     - `package.json`
     - `public/version.json`
     - `android/app/build.gradle`
     - `README.md`
7. **Comprehensive Unit Testing**:
   - Add automated Vitest unit tests covering all Geolocation scenarios with mocked `navigator.geolocation`.
