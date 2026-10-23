# Task README: Update My Routine App Icon (Web + Android)

## A. Task Metadata

- **Task ID**: `task-008-app-icon-update`
- **Task Title**: Update My Routine App Icon across Web, PWA, and Android Launcher
- **Task Type**: Enhancement / Asset Branding Update
- **Source Request / Issue**: [GitHub Issue #8](https://github.com/yogeshpm89/my-routine/issues/8)
- **Date Prepared**: 2026-10-23
- **Current Workflow Stage**: Implementation & Verification Completed
- **Approval Status**: APPROVED

---

## B. Problem Statement

The **My Routine — Adaptive Schedule & Focus Engine** application currently uses an outdated placeholder app icon asset across its web surfaces and native Android application. The icon is not consistently sized or configured:
1. Web favicon and metadata references in [layout.tsx](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/app/layout.tsx) point to `/logo.png`.
2. There is no web app manifest (`manifest.json`) declaring standard PWA icons (192x192, 512x512, maskable 512x512).
3. The Android launcher resources under [android/app/src/main/res/](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/android/app/src/main/res/) in all `mipmap-*` folders (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi) currently hold unscaled 2000x2000 pixel raw image files, without density-optimized assets or properly proportioned adaptive foreground/background layers.
4. A brand-new 1254x1254 master icon artwork has been designed and provided in GitHub Issue #8 (featuring the clock, sunrise/moon, checklist, and dark navy gradient). The application must be updated to use this master asset as the single source of truth across all platforms without distortion, stretching, or loss of visual fidelity.

---

## C. Current Behavior (Verified from Repository Evidence)

- **Web Metadata & Favicon**:
  - [src/app/layout.tsx](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/app/layout.tsx#L28-L32) sets `icons: { icon: '/logo.png', shortcut: '/logo.png', apple: '/logo.png' }`.
  - [src/app/favicon.ico](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/app/favicon.ico) contains a legacy 15 KB icon.
  - [public/MyRoutine.png](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/public/MyRoutine.png) and [public/logo.png](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/public/logo.png) are identical 2000x2000 PNG files (170,150 bytes) with old artwork.
  - [public/download/index.html](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/public/download/index.html#L7) references `/MyRoutine.png`.
  - No `public/manifest.json` or Next.js `manifest.ts` is currently present.
- **Android Launcher Icons**:
  - [android/app/src/main/AndroidManifest.xml](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/android/app/src/main/AndroidManifest.xml#L6-L8) references `android:icon="@mipmap/ic_launcher"` and `android:roundIcon="@mipmap/ic_launcher_round"`.
  - [android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml) configures background `@color/ic_launcher_background` (`#FFFFFF` in [ic_launcher_background.xml](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/android/app/src/main/res/values/ic_launcher_background.xml)) and foreground `@mipmap/ic_launcher_foreground`.
  - In all mipmap density folders (`mipmap-mdpi`, `mipmap-hdpi`, `mipmap-xhdpi`, `mipmap-xxhdpi`, `mipmap-xxxhdpi`), `ic_launcher.png`, `ic_launcher_foreground.png`, and `ic_launcher_round.png` are unscaled 2000x2000 copies of the legacy asset rather than density-specific dimensions.

---

## D. Expected Behavior

1. **Master Asset Integration**: The 1254x1254 artwork from GitHub Issue #8 is preserved as `public/icon-master.png`.
2. **Web Presence**:
   - Modern browser favicon set: `favicon.ico` (multi-resolution 16x16 & 32x32), `favicon-16x16.png`, and `favicon-32x32.png`.
   - Apple Touch Icon: `apple-touch-icon.png` (180x180 px).
   - High-resolution PWA icons: `icon-192x192.png`, `icon-512x512.png`, and `icon-maskable-512x512.png` (with 10-15% safe-zone margin for Android adaptive PWA launcher masking).
   - Next.js root layout metadata in [src/app/layout.tsx](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/app/layout.tsx) cleanly configures `icons` and links `manifest: '/manifest.json'`.
   - Web App Manifest: `public/manifest.json` configured with valid standalone display settings, theme color `#020617`, and icon definitions.
   - APK download page [public/download/index.html](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/public/download/index.html) and UI headers ([logo.png](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/public/logo.png)) consistently show the new icon branding.
3. **Android Native Launcher**:
   - Standard legacy launcher icons (`ic_launcher.png` and `ic_launcher_round.png`) generated for all Android densities:
     - mdpi: 48x48 px
     - hdpi: 72x72 px
     - xhdpi: 96x96 px
     - xxhdpi: 144x144 px
     - xxxhdpi: 192x192 px
   - Adaptive launcher foreground icons (`ic_launcher_foreground.png`):
     - mdpi: 108x108 px (inner 72x72 safe zone)
     - hdpi: 162x162 px (inner 108x108 safe zone)
     - xhdpi: 216x216 px (inner 144x144 safe zone)
     - xxhdpi: 324x324 px (inner 216x216 safe zone)
     - xxxhdpi: 432x432 px (inner 288x288 safe zone)
   - Adaptive launcher background updated in [android/app/src/main/res/values/ic_launcher_background.xml](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/android/app/src/main/res/values/ic_launcher_background.xml) to match the dark navy backdrop `#0B1A32` so masks blend seamlessly.
   - The primary artwork (clock, checklist, sun/moon) remains fully visible and legible when Android applies round, squircle, or teardrop launcher masks.
4. **Build & Sync Workflow**:
   - `npm run build:web` continues to export static files cleanly to `out/`.
   - `npm run build:mobile` continues to synchronize web assets to Capacitor Android without wiping native launcher mipmap resources.
   - Android Gradle compilation (`./gradlew.bat assembleDebug`) builds successfully.

---

## E. Functional Requirements

- **FR-001**: Place the verified 1254x1254 master asset from GitHub Issue #8 into `public/icon-master.png`.
- **FR-002**: Generate density-accurate web icon assets in `public/`:
  - `favicon.ico` (multi-resolution 16x16, 32x32, 48x48)
  - `favicon-16x16.png`
  - `favicon-32x32.png`
  - `apple-touch-icon.png` (180x180)
  - `icon-192x192.png`
  - `icon-512x512.png`
  - `icon-maskable-512x512.png` (safe-zone padded to prevent launcher clipping)
- **FR-003**: Replace [src/app/favicon.ico](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/app/favicon.ico) with the generated multi-size `.ico` so Next.js App Router default favicon route resolves to the new asset.
- **FR-004**: Update `public/logo.png` and `public/MyRoutine.png` to the new high-resolution branding to keep in-app navigation headers and auth modal graphics consistent.
- **FR-005**: Create `public/manifest.json` declaring PWA metadata, name "My Routine", short name "My Routine", theme color `#020617`, background color `#020617`, standalone display, and icon array (192x192, 512x512, and maskable 512x512).
- **FR-006**: Update Next.js App Router metadata in [src/app/layout.tsx](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/app/layout.tsx) with icons mapping (`favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`) and manifest declaration.
- **FR-007**: Update [public/download/index.html](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/public/download/index.html) icon and logo tags.
- **FR-008**: Generate density-specific Android launcher icons across `mipmap-mdpi`, `mipmap-hdpi`, `mipmap-xhdpi`, `mipmap-xxhdpi`, and `mipmap-xxxhdpi` for `ic_launcher.png`, `ic_launcher_round.png`, and `ic_launcher_foreground.png`.
- **FR-009**: Update [android/app/src/main/res/values/ic_launcher_background.xml](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/android/app/src/main/res/values/ic_launcher_background.xml) from `#FFFFFF` to `#0B1A32` to match the artwork background.
- **FR-010**: Provide an automated, reproducible icon generation script (`scripts/generate-icons.js`) using the existing `sharp` dependency so future icon updates can be run deterministically.

---

## F. Non-Functional Requirements

- **NFR-001 (Performance & Asset Optimization)**: Generated PNG assets must be compressed with lossless optimization. Total bundle addition must remain minimal (< 1.5 MB total across all platforms).
- **NFR-002 (Visual Quality & Aspect Ratio)**: The original 1:1 aspect ratio must be strictly preserved without stretching, skewing, or distortion.
- **NFR-003 (Adaptive Mask Safe Zone)**: Adaptive icon foregrounds and maskable icons must place the primary visual elements within the central 66% safe diameter so Android circles, squircles, and teardrops do not truncate the clock or checklist.
- **NFR-004 (Build Compatibility)**: Must not introduce new runtime dependencies or change static export output behavior. All script operations must use existing tools (`sharp`, Node.js).
- **NFR-005 (Preservation of Existing Subsystems)**: Must make zero changes to routine scheduling, recurrence, Firestore sync, local notifications, quiet hours, or Zepp/Amazfit mirroring.

---

## G. Acceptance Criteria

- [x] **AC-001**: Browser tabs display the new My Routine icon via `/favicon.ico` and `/favicon-32x32.png`.
- [x] **AC-002**: iOS bookmarks / home-screen shortcuts use `/apple-touch-icon.png` (180x180 px).
- [x] **AC-003**: `public/manifest.json` exists, validates against standard PWA manifest schema, and references existing icon assets.
- [x] **AC-004**: Next.js App Router metadata in `layout.tsx` generates standard HTML `<link rel="icon">`, `<link rel="apple-touch-icon">`, and `<link rel="manifest">` tags without console warnings or duplicate tags.
- [x] **AC-005**: All five Android mipmap folders (`mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`) contain exact standard dimensions for `ic_launcher.png`, `ic_launcher_round.png`, and `ic_launcher_foreground.png`.
- [x] **AC-006**: Android adaptive icon background color in `ic_launcher_background.xml` matches the dark navy artwork tone `#0B1A32`.
- [x] **AC-007**: `scripts/generate-icons.js` exists, executes cleanly without errors, and can regenerate all web and Android assets on demand (`npm run icons:generate`).
- [x] **AC-008**: `npm run build:web` succeeds with static export to `out/`.
- [x] **AC-009**: `npx cap sync android` completes without overwriting native `mipmap-*` launcher icons.
- [x] **AC-010**: Android build configuration and Gradle tasks compile successfully with the new resources (`gradlew tasks --dry-run`).
- [x] **AC-011**: Existing unit tests (`npm run test`) continue to run without new regressions.

---

## H. Scope

### In Scope
- Master icon asset storage (`public/icon-master.png`).
- Generation script (`scripts/generate-icons.js`) utilizing `sharp`.
- Web icon generation (`favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `icon-192x192.png`, `icon-512x512.png`, `icon-maskable-512x512.png`).
- In-app branding assets (`public/logo.png`, `public/MyRoutine.png`, `src/app/favicon.ico`).
- PWA manifest (`public/manifest.json`) and Next.js metadata in [src/app/layout.tsx](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/app/layout.tsx).
- Download page update in [public/download/index.html](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/public/download/index.html).
- Android mipmap resources across all 5 densities + adaptive background color in [android/app/src/main/res/values/ic_launcher_background.xml](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/android/app/src/main/res/values/ic_launcher_background.xml).
- Validation commands execution and developer documentation update in [README.md](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/README.md).

### Out of Scope
- Redesigning or changing the artwork elements provided in Issue #8.
- Introducing service worker caching frameworks or complex PWA offline service workers.
- Modifying Capacitor plugin configurations, notification sounds, or notification small status bar icons (`ic_stat_icon_config_sample`).
- Modifying routine domain logic, Firestore rules, or authentication.

### Optional Future Improvements
- Android notification small icon monochrome silhouette generation if custom status bar icon is requested in a future issue.
- Splash screen / launch screen branding update if a splash screen redesign issue is filed.

---

## I. Dependencies and Open Questions

- **Dependencies**: Node.js v25.8.1, `sharp` (already present in `node_modules`), Android SDK / Gradle 8.14.3.
- **Resolved Questions**:
  - *Source asset confirmed*: Successfully verified and retrieved from GitHub Issue #8 attachment (1254x1254 opaque PNG).
  - *Background color confirmed*: Dark navy tone `#0B1A32` sampled from artwork border pixels.
  - *Manifest strategy*: Next.js static export recommends a static `public/manifest.json` linked via `layout.tsx` `manifest: '/manifest.json'`.
- **Open Questions for User**: None blocking; all requirements are concrete.

---

## J. Requirement Traceability Matrix

| Requirement | Acceptance Criteria | Implementation Phase | Verification Method |
|---|---|---|---|
| FR-001 (Master Asset) | AC-007 | Phase 1 | File existence & dimensions check |
| FR-002 (Web Icons) | AC-001, AC-002 | Phase 2 | Dimensions & Sharp output verification |
| FR-003 (App Favicon) | AC-001 | Phase 2 | Next.js App Router root favicon verification |
| FR-004 (In-App Logos) | AC-001 | Phase 2 | Visual verification in UI drawers/modals |
| FR-005 (PWA Manifest) | AC-003 | Phase 3 | JSON validation & HTTP check |
| FR-006 (Layout Metadata) | AC-004 | Phase 3 | `layout.tsx` TypeScript check & build check |
| FR-007 (Download Page) | AC-004 | Phase 3 | HTML inspection |
| FR-008 (Android Mipmaps) | AC-005 | Phase 4 | File dimensions inspection across all 5 densities |
| FR-009 (Adaptive Background)| AC-006 | Phase 4 | XML content check & Gradle assemble check |
| FR-010 (Generator Script) | AC-007 | Phase 1 | Script execution `node scripts/generate-icons.js` |
