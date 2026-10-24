import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DayTemplateRepository } from '@/lib/repositories/day-template-repository';
import { DayTemplateResolver } from '@/lib/templates/day-template-resolver';
import { TemplateIO } from '@/lib/templates/template-io';
import { getDefaultDayTemplates, getDefaultWeeklyPlanner } from '@/lib/seed-templates';
import { BackupService } from '@/lib/sync/backup-service';
import { NotificationManager } from '@/lib/notifications/notification-manager';
import { DayRoutineTemplate, WeeklyPlannerConfig } from '@/types/routine-templates';
import { NotificationPreferences } from '@/types/notifications';

describe('Day Routine Templates & Weekly Planner', () => {
  const userId = 'test-user-templates';

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Seed Templates & DayTemplateRepository', () => {
    it('creates default weekday and weekend templates for user', () => {
      const templates = getDefaultDayTemplates(userId);
      expect(templates.length).toBe(2);

      const weekday = templates.find((t) => t.isDefault);
      expect(weekday).toBeDefined();
      expect(weekday?.name).toBe('Default Weekday Routine');
      expect(weekday?.blocks.length).toBeGreaterThan(15);

      const weekend = templates.find((t) => !t.isDefault);
      expect(weekend).toBeDefined();
      expect(weekend?.name).toBe('Weekend Routine');
      expect(weekend?.blocks.length).toBeGreaterThan(5);
    });

    it('initializes and caches templates in localStorage', () => {
      const templates = DayTemplateRepository.getLocalTemplates(userId);
      expect(templates.length).toBe(2);

      const raw = localStorage.getItem(`my_routine_day_templates_${userId}`);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.length).toBe(2);
    });

    it('duplicates a template with regenerated block IDs', async () => {
      const templates = DayTemplateRepository.getLocalTemplates(userId);
      const source = templates[0];

      const copy = await DayTemplateRepository.duplicateTemplate(userId, source.id, 'My Custom Copy');
      expect(copy.id).not.toBe(source.id);
      expect(copy.name).toBe('My Custom Copy');
      expect(copy.isDefault).toBe(false);
      expect(copy.blocks.length).toBe(source.blocks.length);
      expect(copy.blocks[0].id).not.toBe(source.blocks[0].id);

      const all = DayTemplateRepository.getLocalTemplates(userId);
      expect(all.length).toBe(3);
    });

    it('blocks deletion of a template currently assigned in Weekly Planner', async () => {
      const templates = DayTemplateRepository.getLocalTemplates(userId);
      const weekdayTemplate = templates.find((t) => t.isDefault)!;

      // Attempting to delete weekdayTemplate which is assigned Mon-Fri and default
      await expect(DayTemplateRepository.deleteTemplate(userId, weekdayTemplate.id)).rejects.toThrow(
        /currently assigned in the Weekly Planner/
      );

      // Verify it was not deleted
      const after = DayTemplateRepository.getLocalTemplates(userId);
      expect(after.some((t) => t.id === weekdayTemplate.id)).toBe(true);
    });

    it('allows deleting an unassigned template', async () => {
      const templates = DayTemplateRepository.getLocalTemplates(userId);
      const copy = await DayTemplateRepository.duplicateTemplate(userId, templates[0].id, 'Temp Template');
      expect(DayTemplateRepository.getLocalTemplates(userId).length).toBe(3);

      await DayTemplateRepository.deleteTemplate(userId, copy.id);
      expect(DayTemplateRepository.getLocalTemplates(userId).length).toBe(2);
    });

    it('updates weekly day assignments and date overrides', async () => {
      const templates = DayTemplateRepository.getLocalTemplates(userId);
      const custom = await DayTemplateRepository.duplicateTemplate(userId, templates[0].id, 'Holiday Routine');

      // Set Wednesday (3) to custom
      await DayTemplateRepository.setDayAssignment(userId, 3, custom.id);
      let planner = DayTemplateRepository.getLocalWeeklyPlanner(userId);
      expect(planner.assignments['3']).toBe(custom.id);

      // Set date override for 2026-12-25
      await DayTemplateRepository.setDateOverride(userId, '2026-12-25', custom.id);
      planner = DayTemplateRepository.getLocalWeeklyPlanner(userId);
      expect(planner.dateOverrides['2026-12-25']).toBe(custom.id);

      // Clear date override
      await DayTemplateRepository.clearDateOverride(userId, '2026-12-25');
      planner = DayTemplateRepository.getLocalWeeklyPlanner(userId);
      expect(planner.dateOverrides['2026-12-25']).toBeUndefined();
    });
  });

  describe('DayTemplateResolver & Precedence Engine', () => {
    let weekdayTpl: DayRoutineTemplate;
    let weekendTpl: DayRoutineTemplate;
    let holidayTpl: DayRoutineTemplate;
    let planner: WeeklyPlannerConfig;

    beforeEach(async () => {
      const defaults = getDefaultDayTemplates(userId);
      weekdayTpl = defaults[0];
      weekendTpl = defaults[1];
      holidayTpl = {
        ...weekdayTpl,
        id: 'tpl_holiday_custom',
        name: 'Holiday Routine',
        isDefault: false,
        blocks: [weekdayTpl.blocks[0]], // 1 block only
      };

      planner = {
        userId,
        assignments: {
          '1': weekdayTpl.id, // Mon
          '2': weekdayTpl.id, // Tue
          '3': weekdayTpl.id, // Wed
          '4': weekdayTpl.id, // Thu
          '5': weekdayTpl.id, // Fri
          '6': weekendTpl.id, // Sat
          '0': weekendTpl.id, // Sun
        },
        defaultTemplateId: weekdayTpl.id,
        dateOverrides: {},
        updatedAt: Date.now(),
      };
    });

    it('resolves weekday assignment for a Monday (2026-10-26 is Monday)', () => {
      const resolved = DayTemplateResolver.resolveTemplateForDate(
        '2026-10-26',
        planner,
        [weekdayTpl, weekendTpl, holidayTpl]
      );
      expect(resolved.source).toBe('weekly_assignment');
      expect(resolved.template?.id).toBe(weekdayTpl.id);
      expect(resolved.template?.name).toBe('Default Weekday Routine');
    });

    it('resolves weekend assignment for a Saturday (2026-10-24 is Saturday)', () => {
      const resolved = DayTemplateResolver.resolveTemplateForDate(
        '2026-10-24',
        planner,
        [weekdayTpl, weekendTpl, holidayTpl]
      );
      expect(resolved.source).toBe('weekly_assignment');
      expect(resolved.template?.id).toBe(weekendTpl.id);
      expect(resolved.template?.name).toBe('Weekend Routine');
    });

    it('prioritizes date override above weekly assignment (Tier 2 > Tier 3)', () => {
      // 2026-10-26 is Monday (normally weekdayTpl)
      planner.dateOverrides['2026-10-26'] = holidayTpl.id;

      const resolved = DayTemplateResolver.resolveTemplateForDate(
        '2026-10-26',
        planner,
        [weekdayTpl, weekendTpl, holidayTpl]
      );
      expect(resolved.source).toBe('date_override');
      expect(resolved.template?.id).toBe(holidayTpl.id);
      expect(resolved.template?.name).toBe('Holiday Routine');
    });

    it('falls back to defaultTemplateId when a day is unassigned in planner', () => {
      const sparsePlanner: WeeklyPlannerConfig = {
        userId,
        assignments: {}, // No days assigned
        defaultTemplateId: weekendTpl.id,
        dateOverrides: {},
        updatedAt: Date.now(),
      };

      const resolved = DayTemplateResolver.resolveTemplateForDate(
        '2026-10-28', // Wednesday
        sparsePlanner,
        [weekdayTpl, weekendTpl]
      );
      expect(resolved.source).toBe('default_fallback');
      expect(resolved.template?.id).toBe(weekendTpl.id);
    });

    it('returns empty blocks if no templates exist', () => {
      const blocks = DayTemplateResolver.resolveBlocksForDate('2026-10-28', planner, []);
      expect(blocks).toEqual([]);
    });
  });

  describe('TemplateIO: Export, Import & Schema Validation', () => {
    it('exports a template as standardized JSON without userId', () => {
      const templates = getDefaultDayTemplates(userId);
      const jsonStr = TemplateIO.exportTemplateAsJson(templates[0]);
      expect(jsonStr).toContain('"schemaVersion": 1');
      expect(jsonStr).toContain('"type": "my_routine_template"');
      expect(jsonStr).toContain('"name": "Default Weekday Routine"');

      const parsed = JSON.parse(jsonStr);
      expect(parsed.template.userId).toBeUndefined();
    });

    it('parses and validates valid template JSON', () => {
      const templates = getDefaultDayTemplates(userId);
      const jsonStr = TemplateIO.exportTemplateAsJson(templates[0]);

      const result = TemplateIO.parseAndValidateTemplateJson(jsonStr);
      expect(result.success).toBe(true);
      expect(result.data?.template.name).toBe('Default Weekday Routine');
      expect(result.data?.template.blocks.length).toBeGreaterThan(0);
    });

    it('rejects invalid JSON syntax and schema mismatches', () => {
      const invalidJson = '{ not valid json';
      const result1 = TemplateIO.parseAndValidateTemplateJson(invalidJson);
      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Invalid JSON file');

      const invalidSchema = JSON.stringify({ type: 'wrong_type', blocks: [] });
      const result2 = TemplateIO.parseAndValidateTemplateJson(invalidSchema);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Template schema validation failed');
    });

    it('handles name collisions on import with copy mode', () => {
      const templates = getDefaultDayTemplates(userId);
      const jsonStr = TemplateIO.exportTemplateAsJson(templates[0]);
      const { data } = TemplateIO.parseAndValidateTemplateJson(jsonStr);

      const imported = TemplateIO.prepareImportedTemplate(userId, data!, templates, { collisionMode: 'copy' });
      expect(imported.name).toBe('Default Weekday Routine (Imported)');
      expect(imported.userId).toBe(userId);
      expect(imported.id).not.toBe(templates[0].id);
      expect(imported.blocks[0].id).not.toBe(templates[0].blocks[0].id);
    });
  });

  describe('BackupService with Day Templates & Weekly Planner', () => {
    it('exports version 1.1 backup with dayTemplates and weeklyPlanner', () => {
      DayTemplateRepository.initializeTemplates(userId);
      const backup = BackupService.exportAllData(userId);

      expect(backup.version).toBe('1.1');
      expect(backup.dayTemplates).toBeDefined();
      expect(backup.dayTemplates!.length).toBe(2);
      expect(backup.weeklyPlanner).toBeDefined();
      expect(backup.weeklyPlanner!.assignments['1']).toBeDefined();
    });

    it('imports and upgrades legacy v1.0 backup safely', () => {
      const legacyBackup = {
        version: '1.0',
        exportedAt: '2026-01-01T00:00:00.000Z',
        userId,
        templates: getDefaultDayTemplates(userId)[0].blocks.slice(0, 5),
        overrides: [],
        logs: [],
        goals: [],
      };

      const result = BackupService.importBackupData(userId, JSON.stringify(legacyBackup), 'replace');
      expect(result.success).toBe(true);

      const dayTemplates = DayTemplateRepository.getLocalTemplates(userId);
      expect(dayTemplates.length).toBe(2);
      expect(dayTemplates[0].name).toBe('Restored Weekday Routine');
      expect(dayTemplates[0].blocks.length).toBe(5);

      const planner = DayTemplateRepository.getLocalWeeklyPlanner(userId);
      expect(planner.assignments['1']).toBe(dayTemplates[0].id);
    });
  });

  describe('72-Hour Notification Window with Day Templates', () => {
    const prefs: NotificationPreferences = {
      userId,
      soundEnabled: true,
      vibrationEnabled: true,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '06:00',
      snoozeDurationMinutes: 10,
      defaultAdvanceReminders: [-10],
      updatedAt: Date.now(),
    };

    it('schedules notifications using resolved daily templates per date', () => {
      // Mock future timestamp
      const mockNow = new Date('2030-05-10T05:00:00.000Z').getTime();
      vi.spyOn(Date, 'now').mockReturnValue(mockNow);

      const dayTemplates = getDefaultDayTemplates(userId);
      const weekdayTpl = dayTemplates.find((t) => t.isDefault)!;
      const weekendTpl = dayTemplates.find((t) => !t.isDefault)!;

      // 2030-05-10 is Friday, 2030-05-11 is Saturday, 2030-05-12 is Sunday
      const planner: WeeklyPlannerConfig = {
        userId,
        assignments: {
          '5': weekdayTpl.id,
          '6': weekendTpl.id,
          '0': weekendTpl.id,
        },
        defaultTemplateId: weekdayTpl.id,
        dateOverrides: {},
        updatedAt: mockNow,
      };

      const scheduled = NotificationManager.compute72HourSchedule(
        weekdayTpl.blocks,
        [],
        prefs,
        '2030-05-10',
        [],
        dayTemplates,
        planner
      );

      expect(scheduled.length).toBeGreaterThan(0);
      // Weekend blocks have cycling on Saturday / Sunday
      const cyclingReminders = scheduled.filter((s) => s.title.includes('Cycling'));
      expect(cyclingReminders.length).toBeGreaterThan(0);
    });
  });
});
