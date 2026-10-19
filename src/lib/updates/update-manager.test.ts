import { describe, it, expect, beforeEach, vi } from 'vitest';
import { compareSemver, UpdateManager } from './update-manager';
import { AppUpdateManifest } from '@/types/updates';

describe('UpdateManager & Semver', () => {
  describe('compareSemver', () => {
    it('compares standard semver versions accurately', () => {
      expect(compareSemver('1.1.0', '1.0.0')).toBe(1);
      expect(compareSemver('1.0.0', '1.1.0')).toBe(-1);
      expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
      expect(compareSemver('v2.0.0', '1.9.9')).toBe(1);
      expect(compareSemver('1.0.1', '1.0.0')).toBe(1);
      expect(compareSemver('1.0.0', '1.0.1')).toBe(-1);
      expect(compareSemver('2.1', '2.0.5')).toBe(1);
      expect(compareSemver('1.0.0', '1.0')).toBe(0);
    });
  });

  describe('Update Preferences & Dismissals', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('manages auto-check and dismissal preferences', () => {
      const initialPrefs = UpdateManager.getPreferences();
      expect(initialPrefs.autoCheckOnLaunch).toBe(true);
      expect(initialPrefs.dismissedVersions).toEqual([]);

      UpdateManager.dismissVersion('1.1.0');
      expect(UpdateManager.isVersionDismissed('1.1.0')).toBe(true);
      expect(UpdateManager.isVersionDismissed('1.2.0')).toBe(false);

      UpdateManager.clearDismissedVersions();
      expect(UpdateManager.isVersionDismissed('1.1.0')).toBe(false);
    });
  });

  describe('checkForUpdates logic', () => {
    beforeEach(() => {
      localStorage.clear();
      vi.restoreAllMocks();
    });

    it('identifies when an update is available', async () => {
      const mockManifest: AppUpdateManifest = {
        version: '1.2.0',
        versionCode: 3,
        minSupportedVersion: '1.0.0',
        releaseDate: '2026-10-19',
        title: 'New Release',
        changelog: ['Feature A', 'Feature B'],
        apkUrl: 'https://example.com/app.apk',
        fileSizeBytes: 5000000,
        isCritical: false,
      };

      vi.spyOn(UpdateManager, 'getCurrentVersionInfo').mockResolvedValue({
        version: '1.0.0',
        versionCode: 1,
        build: '1',
      });

      vi.spyOn(UpdateManager, 'fetchLatestManifest').mockResolvedValue(mockManifest);

      const result = await UpdateManager.checkForUpdates();
      expect(result.isUpdateAvailable).toBe(true);
      expect(result.isCritical).toBe(false);
      expect(result.latestVersion).toBe('1.2.0');
      expect(result.currentVersion).toBe('1.0.0');
    });

    it('marks update as critical if minSupportedVersion is higher than installed', async () => {
      const mockManifest: AppUpdateManifest = {
        version: '2.0.0',
        versionCode: 10,
        minSupportedVersion: '1.5.0',
        releaseDate: '2026-10-19',
        title: 'Breaking Schema Change',
        changelog: ['Database Migration'],
        apkUrl: 'https://example.com/app.apk',
        isCritical: false,
      };

      vi.spyOn(UpdateManager, 'getCurrentVersionInfo').mockResolvedValue({
        version: '1.2.0',
        versionCode: 2,
        build: '2',
      });

      vi.spyOn(UpdateManager, 'fetchLatestManifest').mockResolvedValue(mockManifest);

      const result = await UpdateManager.checkForUpdates();
      expect(result.isUpdateAvailable).toBe(true);
      expect(result.isCritical).toBe(true);
    });

    it('reports up-to-date when current matches or exceeds manifest', async () => {
      const mockManifest: AppUpdateManifest = {
        version: '1.1.0',
        versionCode: 2,
        releaseDate: '2026-10-19',
        title: 'Current Release',
        changelog: ['Patch'],
        apkUrl: 'https://example.com/app.apk',
      };

      vi.spyOn(UpdateManager, 'getCurrentVersionInfo').mockResolvedValue({
        version: '1.1.0',
        versionCode: 2,
        build: '2',
      });

      vi.spyOn(UpdateManager, 'fetchLatestManifest').mockResolvedValue(mockManifest);

      const result = await UpdateManager.checkForUpdates();
      expect(result.isUpdateAvailable).toBe(false);
    });
  });
});
