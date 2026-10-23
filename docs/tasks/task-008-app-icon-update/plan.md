# Implementation Plan: Update My Routine App Icon (Web + Android)

## A. Proposed Solution

Implement a deterministic, automated asset pipeline that ingests the 1254x1254 master icon from GitHub Issue #8 (`public/icon-master.png`), generates all density-specific web, PWA, and Android launcher assets using Node.js and `sharp`, and configures Next.js App Router metadata, PWA manifest, and Android adaptive resources.

This approach guarantees:
1. Exact conformance with Google Android launcher density specifications and adaptive icon safe zones.
2. Complete modern web browser and iOS bookmark coverage (`favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `icon-192x192.png`, `icon-512x512.png`, `icon-maskable-512x512.png`).
3. Single source of truth with an automated script (`scripts/generate-icons.js`) for reproducible future regeneration.
4. Seamless compatibility with Next.js static export (`out/`) and Capacitor mobile synchronization (`npm run build:mobile`).

---

## B. Architecture and Data Flow

```text
[ GitHub Issue #8 Master Image (1254x1254) ]
                   │
                   ▼
       [ public/icon-master.png ]
                   │
                   ▼
      [ scripts/generate-icons.js ] (via sharp)
                   │
         ┌─────────┴───────────────────────┐
         ▼                                 ▼
   [ Web & PWA Assets ]           [ Android Resources ]
   • public/favicon.ico           • res/mipmap-mdpi/ (48px / 108px)
   • public/favicon-16x16.png     • res/mipmap-hdpi/ (72px / 162px)
   • public/favicon-32x32.png     • res/mipmap-xhdpi/ (96px / 216px)
   • public/apple-touch-icon.png  • res/mipmap-xxhdpi/ (144px / 324px)
   • public/icon-192x192.png      • res/mipmap-xxxhdpi/ (192px / 432px)
   • public/icon-512x512.png      • res/values/ic_launcher_background.xml (#0B1A32)
   • public/icon-maskable-512.png
   • public/logo.png & MyRoutine.png
   • src/app/favicon.ico
   • public/manifest.json
         │                                 │
         ▼                                 ▼
   [ Next.js Metadata ]            [ Android Gradle Build ]
   (src/app/layout.tsx)            (assembleDebug APK)
         │                                 ▲
         ▼                                 │
   [ npm run build:web ]                   │
   Generates out/ static bundle            │
         │                                 │
         ▼                                 │
   [ npx cap sync android ] ───────────────┘
   (copies out/ to assets/public without touching res/)
```

---

## C. Data Model Changes

- **Application Data Models**: None.
- **Database Schema**: No Firestore or local database schema modifications.
- **Backward Compatibility**: Fully backward compatible. Legacy paths (`/logo.png`, `/MyRoutine.png`, `/favicon.ico`) remain intact with refreshed visual artwork so existing bookmarks, desktop shortcuts, and cached references resolve cleanly.

---

## D. File-by-File Implementation Plan

| File or Directory | Action | Purpose | Verification |
|---|---|---|---|
| `public/icon-master.png` | Create | Store official master artwork from Issue #8 | File size and dimensions check (1254x1254) |
| `scripts/generate-icons.js` | Create | Automated image pipeline producing all icon variants via `sharp` | `node scripts/generate-icons.js` |
| `public/favicon.ico` | Generate | Multi-size ICO for browser compatibility (16x16, 32x32, 48x48) | Sharp output & browser inspection |
| `public/favicon-16x16.png` | Generate | Standard 16x16 favicon | Sharp output |
| `public/favicon-32x32.png` | Generate | Standard 32x32 favicon | Sharp output |
| `public/apple-touch-icon.png` | Generate | 180x180 iOS home-screen icon | Sharp output |
| `public/icon-192x192.png` | Generate | Standard 192x192 PWA launcher icon | Sharp output |
| `public/icon-512x512.png` | Generate | Standard 512x512 PWA splash / install icon | Sharp output |
| `public/icon-maskable-512x512.png` | Generate | Maskable 512x512 PWA icon with safe-zone margin | Sharp output & maskable compliance check |
| `public/logo.png` | Update | High-res in-app branding logo for drawer & auth modal | UI inspection |
| `public/MyRoutine.png` | Update | High-res branding asset for APK download landing page | [download/index.html](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/public/download/index.html) inspection |
| `src/app/favicon.ico` | Replace | Next.js App Router root favicon route | Browser load test |
| `public/manifest.json` | Create | Web App Manifest declaring PWA identity and icons | PWA manifest validation |
| `src/app/layout.tsx` | Modify | Update Next.js `metadata.icons` and add `metadata.manifest` | `npx tsc --noEmit` & `npm run build:web` |
| `public/download/index.html` | Modify | Update favicon link to `/favicon-32x32.png` | HTML inspection |
| `android/app/src/main/res/values/ic_launcher_background.xml` | Modify | Set adaptive background color to `#0B1A32` | XML check |
| `android/app/src/main/res/mipmap-mdpi/*` | Update | Standard (48px) and adaptive foreground (108px) icons | Dimensions inspection script |
| `android/app/src/main/res/mipmap-hdpi/*` | Update | Standard (72px) and adaptive foreground (162px) icons | Dimensions inspection script |
| `android/app/src/main/res/mipmap-xhdpi/*` | Update | Standard (96px) and adaptive foreground (216px) icons | Dimensions inspection script |
| `android/app/src/main/res/mipmap-xxhdpi/*` | Update | Standard (144px) and adaptive foreground (324px) icons | Dimensions inspection script |
| `android/app/src/main/res/mipmap-xxxhdpi/*` | Update | Standard (192px) and adaptive foreground (432px) icons | Dimensions inspection script |
| `README.md` | Modify | Add developer guide for icon regeneration and asset locations | Documentation review |

---

## E. Implementation Phases

### Phase 1: Master Asset Setup & Automation Script
- **Objective**: Establish `public/icon-master.png` and create `scripts/generate-icons.js`.
- **Tasks**:
  1. Write downloaded 1254x1254 master asset to `public/icon-master.png`.
  2. Implement `scripts/generate-icons.js` using `sharp`:
     - Resampling with Lanczos3 filter.
     - Web favicon and touch icon generation.
     - PWA standard and maskable (padded safe zone on `#0B1A32`) icon generation.
     - Android legacy icon generation (`ic_launcher.png`, `ic_launcher_round.png`).
     - Android adaptive icon foreground generation (`ic_launcher_foreground.png` with central 66% safe zone).
- **Expected Files Changed**: `public/icon-master.png`, `scripts/generate-icons.js`.
- **Dependencies**: `sharp`, Node.js.
- **Validation**: Execute `node scripts/generate-icons.js` and verify all target files are created.

### Phase 2: Web & In-App Icon Asset Updates
- **Objective**: Populate web icon files, root favicon, and in-app brand logos.
- **Tasks**:
  1. Generate `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `icon-192x192.png`, `icon-512x512.png`, `icon-maskable-512x512.png` into `public/`.
  2. Copy generated `favicon.ico` to `src/app/favicon.ico`.
  3. Generate updated `public/logo.png` and `public/MyRoutine.png`.
- **Expected Files Changed**: `public/*`, `src/app/favicon.ico`.
- **Validation**: Inspect dimensions and byte sizes of all generated web assets using Node.js script.

### Phase 3: Web Metadata, PWA Manifest & Download Page
- **Objective**: Wire up Next.js App Router metadata, PWA manifest, and download page.
- **Tasks**:
  1. Create `public/manifest.json` configured for My Routine.
  2. Update [src/app/layout.tsx](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/app/layout.tsx):
     - `icons`: icon array with sizes, apple touch icon.
     - `manifest: '/manifest.json'`.
  3. Update [public/download/index.html](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/public/download/index.html) to link `/favicon-32x32.png`.
- **Expected Files Changed**: `public/manifest.json`, `src/app/layout.tsx`, `public/download/index.html`.
- **Validation**: `npx tsc --noEmit` and `npm run build:web`.

### Phase 4: Android Launcher & Adaptive Icon Generation
- **Objective**: Update density-specific mipmap resources and adaptive background.
- **Tasks**:
  1. Update [android/app/src/main/res/values/ic_launcher_background.xml](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/android/app/src/main/res/values/ic_launcher_background.xml) to `#0B1A32`.
  2. Run `scripts/generate-icons.js` to emit `ic_launcher.png`, `ic_launcher_round.png`, and `ic_launcher_foreground.png` for all 5 densities.
- **Expected Files Changed**: `android/app/src/main/res/values/ic_launcher_background.xml`, `android/app/src/main/res/mipmap-*/*`.
- **Validation**: Inspect image dimensions across all mipmap folders; run `npx cap sync android`.

### Phase 5: Verification, Build & Documentation
- **Objective**: Verify full build pipeline and document asset maintenance.
- **Tasks**:
  1. Run TypeScript check (`npx tsc --noEmit`).
  2. Run static web build (`npm run build:web`).
  3. Run mobile build and sync (`npm run build:mobile`).
  4. Run Android debug compile (`cd android; .\gradlew.bat assembleDebug`).
  5. Run unit test suite (`npm run test`).
  6. Update [README.md](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/README.md) with asset regeneration documentation.
- **Expected Files Changed**: `README.md`.
- **Validation**: Full pass on build and sync commands; report actual execution output.

---

## F. Testing Strategy

1. **Asset Dimensions & Integrity Check**:
   - Automated script to verify exact pixel dimensions for all 22 generated image files (7 web + 15 android mipmap).
2. **Next.js Static Export Validation**:
   - `npm run build:web` to ensure HTML generation, metadata tags, and asset copying to `out/` succeed without errors.
3. **Capacitor Mobile Sync Validation**:
   - `npx cap sync android` to ensure web assets synchronize into `android/app/src/main/assets/public/` without disturbing `res/mipmap-*/`.
4. **Android Native Compilation**:
   - `.\gradlew.bat assembleDebug` in `android/` directory to verify AAPT2 resource compilation and packaging into `app-debug.apk`.
5. **Regression Testing**:
   - `npm run test` (Vitest) to confirm existing application tests remain unaffected.

---

## G. Migration & Deployment

- **Deployment**: Standard static hosting deployment (`npm run deploy:hosting`) will automatically distribute the new web and manifest icons.
- **Mobile Release**: Next release APK compiled via standard Gradle build will package the new launcher and adaptive icon resources.
- **Rollback**: If rollback is required, reverting the Git commit restores the previous assets cleanly without data migration concerns.

---

## H. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Circular launcher mask cuts off clock or checklist | Low | Medium | Adaptive foreground scaled with ~25% padding so central motif sits within the 72dp safe circle. |
| Contrast issues between background and launcher wallpaper | Low | Low | Adaptive background `#0B1A32` matches the deep navy border tone of the master artwork. |
| Incomplete density generation | Low | Medium | Generator script programmatically loops through standard density map `[mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192]`. |

---

## I. Definition of Done

- [ ] Master artwork stored at `public/icon-master.png`.
- [ ] Automated generation script `scripts/generate-icons.js` implemented.
- [ ] All web icon assets generated in `public/` and `src/app/favicon.ico`.
- [ ] `public/manifest.json` created with valid PWA manifest structure.
- [ ] `src/app/layout.tsx` updated with icons and manifest metadata.
- [ ] `public/download/index.html` updated.
- [ ] Android `ic_launcher_background.xml` color updated to `#0B1A32`.
- [ ] Android launcher and adaptive icons generated across all 5 densities.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run build:web` succeeds.
- [ ] `npm run build:mobile` succeeds.
- [ ] `gradlew.bat assembleDebug` succeeds.
- [ ] Developer guide updated in repository `README.md`.

---

## J. Complexity Assessment

- **Complexity**: Small to Medium.
- **Primary Uncertainties**: Android adaptive icon safe zone proportions and Gradle AAPT2 compilation verification. Both have been analyzed and mitigated with verified local tools.
