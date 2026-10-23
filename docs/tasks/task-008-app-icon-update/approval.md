# Approval Document: Update My Routine App Icon (Web + Android)

## 1. Task Summary

- **Task ID**: `task-008-app-icon-update`
- **Task Title**: Update My Routine App Icon across Web, PWA, and Android Launcher
- **Source**: [GitHub Issue #8](https://github.com/yogeshpm89/my-routine/issues/8)
- **Prepared Date**: 2026-10-23
- **Approval Date**: 2026-10-23
- **Current Status**: **APPROVED**
- **Approved Scope**: Full implementation of Web, PWA, and Android launcher icons from master artwork in GitHub Issue #8

---

## 2. Problem Being Solved

The application currently uses an old placeholder icon (`/logo.png` / `MyRoutine.png`) across the web app, has no standard PWA manifest declaring 192x192 / 512x512 / maskable assets, and contains unscaled 2000x2000 pixel raw image copies in its Android native launcher mipmap directories.

A brand-new 1254x1254 master icon artwork has been designed and provided in GitHub Issue #8. This task integrates the new artwork as the single source of truth across browser tabs, iOS home-screen bookmarks, PWA installs, and Android native launcher/adaptive icons without distorting proportions or breaking existing workflows.

---

## 3. Expected Behavior

1. **Browser & Web Surfaces**:
   - Browser tabs display the new icon via `/favicon.ico`, `/favicon-16x16.png`, and `/favicon-32x32.png`.
   - iOS bookmarks use `/apple-touch-icon.png` (180x180 px).
   - In-app headers and auth modals display updated high-resolution branding.
   - APK download page ([public/download/index.html](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/public/download/index.html)) uses the updated assets.
2. **PWA & Installation**:
   - `public/manifest.json` provides standard PWA manifest with `icon-192x192.png`, `icon-512x512.png`, and safe-zone padded `icon-maskable-512x512.png`.
   - Next.js root layout metadata links the manifest and modern icon set.
3. **Android Native Launcher**:
   - Standard legacy launcher icons (`ic_launcher.png`, `ic_launcher_round.png`) generated for all 5 densities (`mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`).
   - Adaptive launcher foreground icons (`ic_launcher_foreground.png`) generated with the central 66% safe-zone to guarantee zero clipping on circular or squircle Android launcher masks.
   - Adaptive background color in [ic_launcher_background.xml](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/android/app/src/main/res/values/ic_launcher_background.xml) updated to match the dark navy artwork tone `#0B1A32`.
4. **Build & Sync**:
   - Next.js static export (`npm run build:web`) and Capacitor sync (`npm run build:mobile`) complete cleanly.
   - Android Gradle compilation (`gradlew.bat assembleDebug`) builds successfully.

---

## 4. Proposed Solution

1. Store the master 1254x1254 artwork at `public/icon-master.png`.
2. Create an automated, reusable Node.js generation script (`scripts/generate-icons.js`) utilizing the repository's existing `sharp` library.
3. Generate all web and Android density-specific assets programmatically.
4. Update `src/app/layout.tsx` metadata and add `public/manifest.json`.
5. Update `android/app/src/main/res/values/ic_launcher_background.xml` color to `#0B1A32`.
6. Run full verification: TypeScript check, web static build, Capacitor sync, and Android Gradle debug build.

---

## 5. Important Architectural Decisions

1. **Use Existing `sharp` Library**:
   - `sharp` is already present in `node_modules`. Using it in `scripts/generate-icons.js` provides deterministic Lanczos3 downsampling, padding for safe zones, and multi-size ICO generation without introducing new external packages or services.
2. **Safe-Zone Preservation for Android & Maskable Icons**:
   - Android adaptive icons and PWA maskable icons require central safe-zone framing so circular or rounded masks do not cut off the clock or checklist. The script pads the foreground layer with background color `#0B1A32` so the central elements sit strictly within the inner 66% safe radius.
3. **Static Manifest & App Router Metadata**:
   - Uses static `public/manifest.json` paired with Next.js `layout.tsx` metadata. This works seamlessly with Next.js Turbopack static export (`output: 'export'`) used for Capacitor without requiring dynamic server routes.

---

## 6. Main Files Expected to Change

| File Path | Nature of Change |
|---|---|
| `public/icon-master.png` | **New master asset** from Issue #8 |
| `scripts/generate-icons.js` | **New automated generation script** |
| `public/manifest.json` | **New PWA Web App Manifest** |
| `src/app/layout.tsx` | **Update metadata** (icons array + manifest link) |
| `src/app/favicon.ico` | **Replace** legacy icon with new multi-size ICO |
| `public/download/index.html` | **Update** favicon link |
| `public/logo.png` & `public/MyRoutine.png` | **Update** in-app branding images |
| `android/app/src/main/res/values/ic_launcher_background.xml` | **Update** background color to `#0B1A32` |
| `android/app/src/main/res/mipmap-*/*` | **Update** all 15 density-specific PNG launcher assets |
| `README.md` | **Add** developer documentation for icon regeneration |

---

## 7. Data Model or Persistence Implications

- **No schema changes**: Zero impact on Firestore, local IndexedDB/localStorage, or mutation queues.
- **Zero impact on core features**: Routine scheduling, conflict detection, recurrence, quiet hours, local notifications, and Amazfit/Zepp mirroring are 100% untouched.

---

## 8. Testing Strategy

1. **Dimension Verification**: Run script to inspect pixel dimensions of all 22 output images across web and Android buckets.
2. **TypeScript Compilation**: `npx tsc --noEmit` to ensure clean type checking.
3. **Web Production Build**: `npm run build:web` to ensure static export and metadata compilation succeed.
4. **Capacitor Synchronization**: `npx cap sync android` to ensure web assets sync without overwriting native launcher resources.
5. **Android Native Compilation**: `cd android; .\gradlew.bat assembleDebug` to verify resource compilation into `app-debug.apk`.
6. **Regression Tests**: `npm run test` (Vitest) to verify test suite stability.

---

## 9. Key Risks & Mitigations

- **Risk**: Android adaptive icon clipping on OEM devices.
  - *Mitigation*: Adaptive foreground is scaled with padding so the central visual motif is fully within the 72dp safe zone.
- **Risk**: Web manifest or icon 404s.
  - *Mitigation*: All paths in `layout.tsx` and `manifest.json` map 1:1 to generated files verified in `public/`.
- **Risk**: Capacitor build disruption.
  - *Mitigation*: Both `npm run build:web` and `npm run build:mobile` verified before and after implementation.

---

## 10. Open Questions

- None. All requirements, assets, colors, and dimensions are fully established.

---

## 11. Acceptance Criteria

- [x] Master artwork identified, verified (1254x1254 px), and downloaded to scratch.
- [ ] Master artwork installed at `public/icon-master.png`.
- [ ] Browser favicon, Apple touch icon, and PWA icons generated.
- [ ] `public/manifest.json` created and linked in `layout.tsx`.
- [ ] Android launcher and adaptive foreground icons generated across all 5 densities.
- [ ] Adaptive background color `#0B1A32` configured.
- [ ] `npx tsc --noEmit`, `npm run build:web`, and `npm run build:mobile` succeed.
- [ ] `gradlew.bat assembleDebug` compiles debug APK successfully.
- [ ] Icon maintenance instructions documented in `README.md`.

---

## 12. Scope Exclusions

- No redesign of the artwork provided in Issue #8.
- No changes to Capacitor plugin configurations or push notification payload handling.
- No changes to routine scheduling, authentication, or sync engine logic.

---

## 13. Approval Checklist

Before proceeding to implementation, please confirm:
- [ ] The planned icon assets and density mappings meet requirements.
- [ ] The implementation approach and proposed files are approved.
- [ ] Authorization is granted to execute the implementation phases.

---

**Status: APPROVED (Approved by User on 2026-10-23)**
