# My Routine — Adaptive Schedule & Focus Engine

A production-quality personal routine and habit management application built with **Next.js 16 App Router**, **React 19**, **TypeScript (Strict Mode)**, **Tailwind CSS v4**, **Firebase Authentication & Cloud Firestore**, and **Capacitor 8** for Android with native local notifications mirrored to **Amazfit smartwatches via the Zepp app**.

---

## 🌟 Key Features

1. **Deterministic Asia/Kolkata Routine Schedule**:
   - Seeded with 21 baseline routine blocks (morning wake-up at 6:00 AM, meditation, journalling, Keshav's school prep, morning work sprints, lunch, power nap, Melodyarc IST team meetings, football drop-off & cycling window, dinner, protected family time, MA onsite calls, wind-down reading, and sleep window).
   - Dynamic time indicator tracking the current real-time activity and next scheduled transition.

2. **9 Core Goal Targets & Intentional Deficit Auditing**:
   - Real-time tracking against 9 daily targets (Melodyarc/ArayNatech 8.5h, Fullmoon Styles/Megh Malhaar 2h, Cycling 2h, Meditation 30m, Coursera 30m, Mindvalley 30m, Reading 30m, Family time 60m, Sleep 6.5h).
   - Conflict engine flags unscheduled goals and intentional deficits (e.g. 7 hours scheduled against an 8.5-hour target flags an actionable 90-minute deficit warning).

3. **Multi-Tier Conflict & Overlap Detector**:
   - **Errors (Fixed Events)**: Flags collisions involving non-negotiable commitments (school routines, team syncs, fixed calls).
   - **Warnings (Flexible Overlaps)**: Highlights overlapping flexible blocks with time suggestions.
   - **Sleep Window Encroachments**: Alerts when routines intrude upon the protected 11:30 PM – 6:00 AM sleep window.
   - **Goal Allocation Deficits**: Proactively identifies shortfall hours before the day begins.

4. **3-Way Recurrence & Override Engine**:
   - Recurring schedules support daily, weekdays, weekends, weekly, or once frequencies.
   - Editing a recurring block offers 3 isolated scopes:
     - **This occurrence only**: Generates an isolated `OccurrenceOverride` for the specific date without modifying future or past events.
     - **This and future occurrences**: Terminates the original template yesterday and spawns a new forward-looking template starting today.
     - **All occurrences**: Updates the master template across the entire schedule.

5. **Offline-First Persistence & Bidirectional Firestore Sync**:
   - Operates with zero latency using local storage caches and guest mode when offline or unauthenticated.
   - Any mutation while offline queues in an indexed `MutationQueue`.
   - When network connectivity returns, mutations replay deterministically to Cloud Firestore (`users/{userId}/*`).
   - Conflict detection with side-by-side visual diff resolver (`keep_local` vs `accept_remote`).
   - One-click JSON data export, download, and schema-validated restore (`merge` or `replace`).

6. **Rolling 72-Hour Native Android Notifications**:
   - Schedules native local notifications across a rolling 3-day window using `@capacitor/local-notifications`.
   - Dedicated high-priority Android Notification Channel (`routine_reminders`, importance HIGH/4, public visibility, sound & vibration).
   - Actionable notification buttons: **Done** (marks completed), **Snooze 10m** (reschedules 10 minutes later), and **Skip** (records skipped).
   - Configurable Quiet Hours (default 10:00 PM – 6:00 AM) that mute non-critical routine alarms.

7. **Amazfit Smartwatch & Zepp Notification Mirroring**:
   - Formatted notification payloads with concise titles and high-density text optimized for smartwatch displays.
   - Built-in diagnostic test alert and device setup checklist in Settings.

8. **Comprehensive Daily & Weekly Analytics**:
   - Computes planned vs. actual minutes, completion rates, adherence rates, status breakdowns, category distribution charts, and goal fulfillment bars.

---

## 🛠️ Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router, Turbopack) | `16.4.1` | React framework, SSR/SSG & static export |
| **UI Library** | React | `19.3.0` | Declarative UI components |
| **Language** | TypeScript (Strict Mode) | `5.x` | End-to-end type safety with zero `any` |
| **Styling** | Tailwind CSS | `v4` | High-performance modern utility styling |
| **Mobile Runtime**| Capacitor | `8.5.3` | Native Android APK bridge |
| **Notifications** | `@capacitor/local-notifications` | `8.3.1` | Native Android alarms & channels |
| **Backend & Sync**| Firebase Auth & Cloud Firestore | `13.0.0` | Cloud data sync, user isolation & security rules |
| **Validation** | Zod | `4.6.7` | Runtime data schema validation |
| **Icons** | Lucide React | `1.57.0` | Clean, modern iconography |
| **Testing** | Vitest & JSDOM | `4.1.12` | Fast unit and full-system integration tests |

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **npm**: `v10.x`+
- **Android Studio** (for building Android APK): Ladybug / Hedgehog or newer with Android SDK Platform 33+ and JDK 17+.

### 2. Installation

Clone repository and install dependencies:

```bash
git clone https://github.com/yogeshpm89/my-routine.git
cd my-routine
npm install
```

### 3. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

Fill in your Firebase credentials in `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

> **Note**: If you run without Firebase credentials, the application gracefully activates **Offline Guest Mode**, enabling full local routine management, notification scheduling, and JSON backups without any crash or setup barrier.

### 4. Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Running Automated Tests

```bash
# Run all unit and integration tests once
npm test

# Run tests in interactive watch mode
npm run test:watch
```

---

## 📱 Android APK Build & Capacitor Workflow

The application is configured to build as a native Android application using Capacitor.

### 1. Build Static Production Bundle & Sync Android

We have provided a unified script that compiles the Next.js static export (`out/`) and synchronizes assets with the Android native project:

```bash
npm run build:mobile
```

### 2. Open Android Project in Android Studio

```bash
npx cap open android
```

### 3. Permissions Configured in `AndroidManifest.xml`

The following Android permissions are configured in `android/app/src/main/AndroidManifest.xml`:
- `android.permission.INTERNET`: Firebase Firestore cloud synchronization.
- `android.permission.POST_NOTIFICATIONS`: Android 13+ (API 33+) native notifications.
- `android.permission.SCHEDULE_EXACT_ALARM`: Precise alarm scheduling for routine start/end times.
- `android.permission.USE_EXACT_ALARM`: Android 14+ exact alarm execution.
- `android.permission.VIBRATE`: Watch and phone haptic vibration feedback.
- `android.permission.RECEIVE_BOOT_COMPLETED`: Reschedules routine reminders upon phone restart.
- `android.permission.WAKE_LOCK`: Ensures notifications pop on screen and mirror to smartwatch in Doze mode.

### 4. Direct Run on Connected Android Device or Emulator

```bash
npx cap run android
```

---

## ⌚ Amazfit Smartwatch & Zepp Mirroring Checklist

To ensure timely notification delivery and interactive button actions on your Amazfit smartwatch (GTR, GTS, Bip, T-Rex, Balance, Cheetah, Falcon):

1. **Exempt My Routine from Android Battery Optimization**:
   - Go to **Android Phone Settings** → **Apps** → **My Routine** → **Battery** → Select **Unrestricted** (prevents Android Doze mode from freezing local alarms).
2. **Grant Exact Alarms & Reminders**:
   - Go to **Phone Settings** → **Special App Access** → **Alarms & Reminders** → Toggle **Allowed** for **My Routine**.
3. **Enable App Alerts in Zepp App**:
   - Open the **Zepp App** on your Android phone.
   - Navigate to **Profile** → **Your Amazfit Device** → **App Alerts**.
   - Ensure the master **App Alerts** toggle is **ON**.
   - In the app list, search for **My Routine** and toggle it **ON**.
4. **Lock Zepp in Android Recent Apps**:
   - Open Android recent apps overview, long-press the **Zepp** card and tap the **Lock** icon to prevent the system from killing the background Bluetooth service.
5. **Verify with In-App Test Alert**:
   - In **My Routine**, tap the **Settings & Sync** tab.
   - Tap the **Test Alert** button.
   - Verify that your phone chimes/vibrates and the alert appears instantly on your Amazfit watch face with the "Done", "Snooze 10m", and "Skip" action options.

---

## 🔒 Security Architecture & Firestore Rules

All user documents are strictly isolated by authenticated user ID under `/users/{userId}/*`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read, write: if isOwner(userId);

      match /templates/{templateId} { allow read, write: if isOwner(userId); }
      match /overrides/{overrideId} { allow read, write: if isOwner(userId); }
      match /logs/{logId}           { allow read, write: if isOwner(userId); }
      match /goals/{goalId}         { allow read, write: if isOwner(userId); }
      match /settings/{settingId}   { allow read, write: if isOwner(userId); }
      match /registry/{registryId}  { allow read, write: if isOwner(userId); }
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 💾 Backup, Export & Disaster Recovery

- **Export**: Navigate to **Settings & Sync** → **Export Full JSON Backup** to save an encrypted, versioned JSON backup containing all templates, occurrence overrides, activity logs, and goals.
- **Import & Restore**: Import any valid backup JSON with either **Replace Mode** (clean restore) or **Merge Mode** (retaining existing local entries and updating matching IDs).

---

## 🧪 Automated Test Suite

The test suite covers every tier of the application with 27 automated tests:

- [`sanity.test.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/sanity.test.ts): Environment & configuration validation.
- [`occurrence-generator.test.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/occurrence-generator.test.ts): Recurrence frequency rules, date overrides, and cancellations.
- [`conflict-detector.test.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/conflict-detector.test.ts): Fixed collisions, flexible overlaps, sleep intrusions, and goal deficits.
- [`sync-engine.test.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/sync/sync-engine.test.ts): Mutation queue deduplication and side-by-side conflict resolution.
- [`notification-manager.test.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/notifications/notification-manager.test.ts): 72-hour rolling schedule generation, quiet hours filtering, and 32-bit ID hashing.
- [`analytics-calculator.test.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/analytics/analytics-calculator.test.ts): Adherence calculations, category breakdown, and goal fulfillment.
- [`integration.test.ts`](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/lib/integration.test.ts): End-to-end user journey across seed initialization, 3-way edits, status logging, offline queue replay, and backup restoration.
