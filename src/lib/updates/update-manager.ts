import { Capacitor } from '@capacitor/core';
import {
  AppVersionInfo,
  AppUpdateManifest,
  UpdateCheckResult,
  UpdatePreferences,
} from '@/types/updates';

const UPDATE_PREFS_KEY = 'my_routine_update_prefs';
const REMOTE_MANIFEST_URL = 'https://my-routine-app-3f631.web.app/version.json';

/**
 * Compare two semver strings (e.g. "1.1.0" vs "1.0.0").
 * Returns > 0 if v1 > v2, < 0 if v1 < v2, 0 if v1 == v2.
 */
export function compareSemver(v1: string, v2: string): number {
  const parse = (v: string) =>
    v
      .replace(/^v/i, '')
      .split('.')
      .map((part) => parseInt(part, 10) || 0);

  const parts1 = parse(v1);
  const parts2 = parse(v2);

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export class UpdateManager {
  private static cachedVersionInfo: AppVersionInfo | null = null;

  /**
   * Get the current running app version and build code.
   */
  static async getCurrentVersionInfo(): Promise<AppVersionInfo> {
    if (this.cachedVersionInfo) {
      return this.cachedVersionInfo;
    }

    const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

    if (isNative) {
      try {
        const { App } = await import('@capacitor/app');
        const info = await App.getInfo();
        const versionCode = parseInt(info.build, 10) || 1;
        this.cachedVersionInfo = {
          version: info.version || '1.0.0',
          versionCode,
          build: info.build,
          name: info.name,
        };
        return this.cachedVersionInfo;
      } catch (err) {
        console.warn('Failed to get native App.getInfo, using fallback:', err);
      }
    }

    // Default version for web or testing
    this.cachedVersionInfo = {
      version: '1.0.0',
      versionCode: 1,
      build: '1',
      name: 'My Routine',
    };
    return this.cachedVersionInfo;
  }

  /**
   * Fetch the latest version manifest from Firebase Hosting.
   */
  static async fetchLatestManifest(): Promise<AppUpdateManifest | null> {
    const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
    const isLocalOrHosting =
      !isNative &&
      typeof window !== 'undefined' &&
      (window.location.origin.includes('my-routine-app-3f631') ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1');

    const manifestUrl = isLocalOrHosting
      ? `/version.json?t=${Date.now()}`
      : `${REMOTE_MANIFEST_URL}?t=${Date.now()}`;

    try {
      const res = await fetch(manifestUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = (await res.json()) as AppUpdateManifest;
      return data;
    } catch (err) {
      console.warn('Failed to fetch update manifest from Firebase:', err);
      return null;
    }
  }

  /**
   * Check if a newer version is available.
   */
  static async checkForUpdates(manual: boolean = false): Promise<UpdateCheckResult> {
    const current = await this.getCurrentVersionInfo();
    const manifest = await this.fetchLatestManifest();

    const prefs = this.getPreferences();
    this.savePreferences({
      ...prefs,
      lastCheckedAt: Date.now(),
    });

    if (!manifest) {
      return {
        isUpdateAvailable: false,
        isCritical: false,
        currentVersion: current.version,
        currentVersionCode: current.versionCode,
        error: 'Unable to check for updates right now. Please check your internet connection.',
      };
    }

    // Version comparison
    const versionDiff = compareSemver(manifest.version, current.version);
    const codeDiff = (manifest.versionCode || 0) - current.versionCode;
    const isNewer = versionDiff > 0 || (versionDiff === 0 && codeDiff > 0);

    // Criticality check
    let isCritical = Boolean(manifest.isCritical);
    if (!isCritical && manifest.minSupportedVersion) {
      isCritical = compareSemver(manifest.minSupportedVersion, current.version) > 0;
    }

    return {
      isUpdateAvailable: isNewer,
      isCritical,
      currentVersion: current.version,
      currentVersionCode: current.versionCode,
      latestVersion: manifest.version,
      latestVersionCode: manifest.versionCode,
      manifest,
    };
  }

  /**
   * Trigger the download & installation of the APK.
   */
  static async downloadAndInstall(apkUrl: string): Promise<void> {
    if (typeof window === 'undefined') return;

    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      try {
        // On Android native, opening the direct APK download URL prompts
        // Chrome/system download manager which finishes and launches the APK installer
        window.open(apkUrl, '_system');
        return;
      } catch (nativeErr) {
        console.warn('window.open _system failed, falling back to window.location:', nativeErr);
      }
    }

    // Web fallback or direct browser trigger
    const link = document.createElement('a');
    link.href = apkUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('download', 'my-routine-release.apk');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Preferences management
   */
  static getPreferences(): UpdatePreferences {
    if (typeof window === 'undefined') {
      return { autoCheckOnLaunch: true, dismissedVersions: [] };
    }
    const raw = localStorage.getItem(UPDATE_PREFS_KEY);
    if (!raw) {
      return { autoCheckOnLaunch: true, dismissedVersions: [] };
    }
    try {
      return JSON.parse(raw) as UpdatePreferences;
    } catch {
      return { autoCheckOnLaunch: true, dismissedVersions: [] };
    }
  }

  static savePreferences(prefs: UpdatePreferences): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(UPDATE_PREFS_KEY, JSON.stringify(prefs));
  }

  static isVersionDismissed(version: string): boolean {
    const prefs = this.getPreferences();
    return (prefs.dismissedVersions || []).includes(version);
  }

  static dismissVersion(version: string): void {
    const prefs = this.getPreferences();
    const dismissed = new Set(prefs.dismissedVersions || []);
    dismissed.add(version);
    this.savePreferences({
      ...prefs,
      dismissedVersions: Array.from(dismissed),
    });
  }

  static clearDismissedVersions(): void {
    const prefs = this.getPreferences();
    this.savePreferences({
      ...prefs,
      dismissedVersions: [],
    });
  }
}
