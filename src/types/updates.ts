export interface AppVersionInfo {
  version: string;
  versionCode: number;
  build?: string;
  name?: string;
}

export interface AppUpdateManifest {
  version: string;
  versionCode: number;
  minSupportedVersion?: string;
  releaseDate: string;
  title: string;
  changelog: string[];
  apkUrl: string;
  fileSizeBytes?: number;
  isCritical?: boolean;
}

export interface UpdateCheckResult {
  isUpdateAvailable: boolean;
  isCritical: boolean;
  currentVersion: string;
  currentVersionCode: number;
  latestVersion?: string;
  latestVersionCode?: number;
  manifest?: AppUpdateManifest;
  error?: string;
}

export interface UpdatePreferences {
  autoCheckOnLaunch: boolean;
  lastCheckedAt?: number;
  dismissedVersions?: string[];
}
