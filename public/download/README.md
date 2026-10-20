# My Routine APK Distribution

Because Firebase Spark (free) plan blocks direct hosting of `.apk` binaries, Android release APKs are distributed via **GitHub Releases** and linked through `public/version.json` and `public/download/index.html`.

## Distribution Architecture:
1. **Automated CI/CD (`.github/workflows/build-apk.yml`)**:
   - Compiles release and debug APKs using Gradle.
   - Publishes `my-routine-release.apk` directly to GitHub Releases under tag `latest`.
   - Updates `out/version.json` with the exact generated binary size.
   - Deploys web assets and `version.json` cleanly to Firebase Hosting.

2. **In-App Updates (`src/lib/updates/update-manager.ts`)**:
   - Installed mobile apps fetch `https://my-routine-app-3f631.web.app/version.json` on launch or from the Settings screen.
   - When a newer `versionCode` or semver is detected, users tap **"Update & Install APK"**.
   - The app downloads `my-routine-release.apk` directly from GitHub Releases and triggers system package installer.

