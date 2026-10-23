# Codebase Investigation: Update My Routine App Icon (Web + Android)

## 1. Repository Structure Relevant to the Task

```text
my-routine/
├── android/
│   ├── app/
│   │   ├── build.gradle
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       └── res/
│   │           ├── mipmap-anydpi-v26/
│   │           │   ├── ic_launcher.xml
│   │           │   └── ic_launcher_round.xml
│   │           ├── mipmap-hdpi/
│   │           ├── mipmap-mdpi/
│   │           ├── mipmap-xhdpi/
│   │           ├── mipmap-xxhdpi/
│   │           ├── mipmap-xxxhdpi/
│   │           └── values/
│   │               ├── ic_launcher_background.xml
│   │               ├── strings.xml
│   │               └── styles.xml
│   └── gradlew.bat
├── capacitor.config.ts
├── next.config.ts
├── package.json
├── public/
│   ├── download/
│   │   └── index.html
│   ├── MyRoutine.png
│   └── logo.png
├── scripts/
│   ├── build-mobile.js
│   └── build-web.js
└── src/
    └── app/
        ├── favicon.ico
        └── layout.tsx
```

---

## 2. Existing Implementation & Behavior

### A. Web Metadata and Icon Declarations
- In [src/app/layout.tsx](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/app/layout.tsx#L24-L33):
  ```typescript
  export const metadata: Metadata = {
    title: 'My Routine — Adaptive Schedule & Focus Engine',
    description:
      'Production personal routine management with flexible daily schedules, conflict detection, category time targets, and Zepp/Amazfit smartwatch alerts.',
    icons: {
      icon: '/logo.png',
      shortcut: '/logo.png',
      apple: '/logo.png',
    },
  };
  ```
  - This is minimal and points exclusively to `/logo.png`.
  - Next.js automatically detects `src/app/favicon.ico` if placed in `src/app/`, but currently `src/app/favicon.ico` has a legacy 15,086-byte placeholder icon.
  - The project does not have a web app manifest (`public/manifest.json` or `src/app/manifest.ts`), leaving PWA installation without branded 192x192, 512x512, and maskable icons.

### B. In-App Assets and Logo Usage
- [public/MyRoutine.png](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/public/MyRoutine.png) and [public/logo.png](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/public/logo.png) are identical 2000x2000 PNG files (170,150 bytes).
- They are displayed in:
  - [src/components/navigation/mobile-drawer.tsx](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/navigation/mobile-drawer.tsx#L144): `<Image src="/logo.png" ... />`
  - [src/components/auth/auth-modal.tsx](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/components/auth/auth-modal.tsx#L157): `<Image src="/logo.png" ... />`
  - [src/app/page.tsx](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/src/app/page.tsx#L1208,L1334): Header logo rendering.
  - [public/download/index.html](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/public/download/index.html#L7,L157): `<link rel="icon" href="/MyRoutine.png">` and `<img src="/MyRoutine.png" class="logo">`.

### C. Android Launcher Icon Resources
- [android/app/src/main/AndroidManifest.xml](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/android/app/src/main/AndroidManifest.xml#L6-L8) configures:
  ```xml
  android:icon="@mipmap/ic_launcher"
  android:roundIcon="@mipmap/ic_launcher_round"
  ```
- [android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml) specifies:
  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
      <background android:drawable="@color/ic_launcher_background"/>
      <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
  </adaptive-icon>
  ```
- [android/app/src/main/res/values/ic_launcher_background.xml](file:///c:/Users/YogeshMurdeshwar/projects/self/my-routine/android/app/src/main/res/values/ic_launcher_background.xml) defines `<color name="ic_launcher_background">#FFFFFF</color>`.
- In `mipmap-mdpi`, `mipmap-hdpi`, `mipmap-xhdpi`, `mipmap-xxhdpi`, and `mipmap-xxxhdpi`, the files `ic_launcher.png`, `ic_launcher_foreground.png`, and `ic_launcher_round.png` are unscaled 2000x2000 px copies. Android expects specific pixel dimensions for each screen density bucket.

---

## 3. Verified New Master Artwork

- **Origin**: [GitHub Issue #8 attachment](https://github.com/user-attachments/assets/40b60b1a-6ce9-4970-9e15-5a3c1bc45def)
- **Downloaded Verification**:
  - Dimensions: `1254 x 1254` pixels
  - Color Space: `sRGB`
  - Channels: 3 (RGB, opaque background)
  - File Size: `1,874,293 bytes` (~1.8 MB)
  - Visual Elements: Central clock face with routine ring, checklist indicators, sunrise/moon celestial motif, and deep navy backdrop (`#09162B` to `#0D2A50` gradient).
  - Background edge color: `#0B1A32` (ideal solid background color for Android adaptive icon background and PWA theme alignment).

---

## 4. Reusable Utilities & Tooling Analysis

- **`sharp`**: Verified present and operational in the local `node_modules` (`node -e "require('sharp')"` succeeds).
  - Sharp provides high-performance Lanczos3 resizing, buffer manipulation, padding/compositing for safe-zone masks, and ICO/PNG generation.
- **Node.js**: v25.8.1 is active in the environment.
- **Gradle**: Gradle 8.14.3 with JVM 17 is installed and verified via `gradlew.bat tasks --dry-run` (Build Successful).
- **Capacitor CLI**: `@capacitor/cli` v8.5.3 installed.

---

## 5. Data Flow and Integration Points

1. **Generation Flow**:
   - Master image `public/icon-master.png` (1254x1254) is read by `scripts/generate-icons.js`.
   - Script uses `sharp` to emit:
     - Web assets into `public/` and `src/app/favicon.ico`.
     - Android mipmap assets into `android/app/src/main/res/mipmap-*/`.
     - Updates `android/app/src/main/res/values/ic_launcher_background.xml` color to `#0B1A32`.
2. **Build Flow**:
   - `npm run build:web`: Next.js Turbopack static export bundles `src/app/layout.tsx` metadata and copies `public/` assets into `out/`.
   - `npm run build:mobile`: Executes `build:web` then runs `npx cap sync android`.
   - Capacitor sync copies `out/` into `android/app/src/main/assets/public/` without altering `android/app/src/main/res/`.
   - Native Android launcher continues to look up `@mipmap/ic_launcher` in `android/app/src/main/res/`.

---

## 6. Baseline Verification & Test Coverage

- **TypeScript Compilation**:
  - `npx tsc --noEmit` exited with code 0 (clean, no type errors).
- **Test Suite**:
  - `npm run test` (Vitest) executed 20 test files:
    - 19 test files passed (143 unit and integration tests passing).
    - 1 pre-existing failure in `src/lib/notifications/notification-manager.test.ts` (related to date mock recurrence).
- **ESLint**:
  - Pre-existing warnings and errors across historical code (`@typescript-eslint/no-explicit-any`).
- **Static Export**:
  - `npm run build:web` succeeds in 5.5s, generating static export in `out/`.
- **Android Gradle**:
  - `cd android; .\gradlew.bat tasks --dry-run` completed with BUILD SUCCESSFUL in 30s.

---

## 7. Compatibility Constraints

1. **Android Adaptive Icon Safe Zone**:
   - Android 8.0+ adaptive icons render using a 108dp x 108dp canvas where the visible area (after OEM squircle/circle/teardrop masking) is the central 72dp diameter (66.6% safe zone).
   - If the full 1254x1254 artwork is scaled directly to 108x108 dp without safe-zone margin, outer details (e.g. edge gradient borders) may be cut off by circular masks.
   - Solution: Generate `ic_launcher_foreground.png` by centering the artwork scaled to ~75% within the canvas with padded background, ensuring the clock face and checklist are 100% inside the safe circle.
2. **PWA Maskable Icon**:
   - PWA maskable icons require safe-zone padding (minimum 10% on each edge) per W3C specification.
   - Solution: `icon-maskable-512x512.png` will feature the artwork scaled to ~80% centered on `#0B1A32` canvas, while `icon-512x512.png` retains the edge-to-edge artwork for standard non-masked surfaces.
3. **Multi-Platform Favicon Format**:
   - Safari, Chrome, Firefox, and Edge handle different combinations of `.ico`, PNG favicons, and Apple touch icons.
   - Solution: Provide `favicon.ico` (multi-size 16x16, 32x32, 48x48) in both `public/` and `src/app/`, alongside explicit PNG links in `layout.tsx`.

---

## 8. Potential Regressions & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Capacitor Sync overwriting native Android icons | High | Verified: Capacitor sync only writes to `android/app/src/main/assets/public/` and does not touch `res/mipmap-*/`. |
| Launcher icon distortion on certain Android OEM skins | Medium | Strictly follow Google Android icon density standards (48px, 72px, 96px, 144px, 192px for legacy; 108px, 162px, 216px, 324px, 432px for adaptive foreground). |
| White flash or white border around adaptive icons | Medium | Update `ic_launcher_background.xml` color from `#FFFFFF` to the sampled `#0B1A32`. |
| Broken links or 404s for favicon or manifest | Low | Verify every path in `layout.tsx` and `manifest.json` against actual files generated in `public/`. |
| Static export failure | Medium | Retest `npm run build:web` after changes to verify Next.js metadata produces valid static HTML. |

---

## 9. Recommended Approach Supported by Repository Evidence

1. Place the verified 1254x1254 master asset at `public/icon-master.png`.
2. Implement a dedicated, clean generator script `scripts/generate-icons.js` using `sharp` that programmatically builds all required formats and dimensions.
3. Update `src/app/layout.tsx` metadata with complete modern icon links and `manifest: '/manifest.json'`.
4. Create `public/manifest.json`.
5. Update `public/logo.png`, `public/MyRoutine.png`, `src/app/favicon.ico`, and `public/download/index.html`.
6. Update `android/app/src/main/res/values/ic_launcher_background.xml` to `#0B1A32`.
7. Run the generator script to populate all web and Android density folders.
8. Validate via `npm run build:web`, `npm run build:mobile`, and Gradle assemble checks.
