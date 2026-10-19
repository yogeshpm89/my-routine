# My Routine APK Distribution

This folder hosts the downloadable Android APK (`my-routine-release.apk`) referenced by `public/version.json`.

## How In-App Updates Work:
1. When a new release is built via Android Studio (`Build > Generate Signed Bundle / APK` or `assembleRelease`), copy the output APK here:
   `public/download/my-routine-release.apk`
2. Update `public/version.json` with the new version name, version code, and changelog.
3. Run `npm run deploy:hosting` to deploy the web bundle and APK.
4. Installed mobile apps will detect the new version on next launch or when the user taps "Check for Updates" in the Settings tab.
5. Users tap **"Update & Install APK"** to immediately download and install the update.
