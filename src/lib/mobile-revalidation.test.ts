import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DayTemplateRepository } from '@/lib/repositories/day-template-repository';
import { GoalRepository } from '@/lib/repositories/goal-repository';
import { UpdateManager } from '@/lib/updates/update-manager';
import { Capacitor } from '@capacitor/core';

describe('Mobile App & Offline Revalidation', () => {
  const userId = 'mobile-test-user';

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Local Storage Fallback for Empty Arrays', () => {
    it('DayTemplateRepository.getLocalTemplates falls back to default templates when stored array is empty', () => {
      // Simulate previously synced empty array
      localStorage.setItem(`my_routine_day_templates_${userId}`, JSON.stringify([]));

      const templates = DayTemplateRepository.getLocalTemplates(userId);
      expect(templates.length).toBeGreaterThanOrEqual(2);
      expect(templates.some((t) => t.isDefault)).toBe(true);
      expect(templates[0].userId).toBe(userId);
    });

    it('GoalRepository.getLocalGoals falls back to initial goals when stored array is empty', () => {
      // Simulate previously synced empty array
      localStorage.setItem(`my_routine_goals_${userId}`, JSON.stringify([]));

      const goals = GoalRepository.getLocalGoals(userId);
      expect(goals.length).toBeGreaterThanOrEqual(3);
      expect(goals.some((g) => g.title.includes('Melodyarc'))).toBe(true);
      expect(goals.some((g) => g.title.includes('Cycling'))).toBe(true);
      expect(goals[0].userId).toBe(userId);
    });
  });

  describe('UpdateManager Native Android Remote URL', () => {
    it('fetches remote manifest URL from Firebase Hosting when running on native Capacitor platform', async () => {
      // Mock Capacitor native platform check
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        return {
          ok: true,
          json: async () => ({
            version: '1.5.0',
            versionCode: 8,
            minSupportedVersion: '1.0.0',
            releaseDate: '2026-10-24',
            title: 'v1.5.0',
            changelog: ['Minute-level progress', 'Multiple templates', 'Mobile layout fixes'],
            apkUrl: 'https://github.com/yogeshpm89/my-routine/releases/latest/download/my-routine-release.apk',
            fileSizeBytes: 9952841,
            isCritical: false,
          }),
        } as any;
      });

      const manifest = await UpdateManager.fetchLatestManifest();
      expect(manifest).not.toBeNull();
      expect(manifest?.version).toBe('1.5.0');

      // Crucial: Must fetch from remote firebase hosting URL, NOT localhost
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://my-routine-app-3f631.web.app/version.json'),
        expect.any(Object)
      );
    });
  });

  describe('Real-time Subscriptions Exist on DayTemplateRepository', () => {
    it('provides subscribeTemplates method that immediately emits local data', () => {
      const listener = vi.fn();
      const unsub = DayTemplateRepository.subscribeTemplates(userId, listener);

      expect(listener).toHaveBeenCalled();
      const emitted = listener.mock.calls[0][0];
      expect(Array.isArray(emitted)).toBe(true);
      expect(emitted.length).toBeGreaterThanOrEqual(2);

      unsub();
    });

    it('provides subscribeWeeklyPlanner method that immediately emits local planner', () => {
      const listener = vi.fn();
      const unsub = DayTemplateRepository.subscribeWeeklyPlanner(userId, listener);

      expect(listener).toHaveBeenCalled();
      const emitted = listener.mock.calls[0][0];
      expect(emitted).toBeDefined();
      expect(emitted.userId).toBe(userId);
      expect(emitted.defaultTemplateId).toBeDefined();

      unsub();
    });
  });
});
