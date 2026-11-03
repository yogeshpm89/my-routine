import { describe, it, expect, beforeEach } from 'vitest';
import { DailyActivityGoalSchema, DailyActivityGoal, RoutineTemplate, OccurrenceOverride } from '@/types/routine';
import { LifeGoal } from '@/types/goals';
import { generateDailyOccurrences } from '@/lib/occurrence-generator';
import { LifeGoalRepository } from '@/lib/repositories/life-goal-repository';

describe('Daily Activity Goal & Life Goal Integration', () => {
  const userId = 'test_user_daily_goal';
  const testDate = '2026-10-15';

  beforeEach(() => {
    localStorage.clear();
  });

  describe('DailyActivityGoalSchema validation', () => {
    it('validates a complete phase task target', () => {
      const input = {
        id: 'dg_1',
        text: 'Complete Prompt Engg course',
        lifeGoalId: 'life_goal_coursera',
        lifeGoalTitle: '10 Specializations on Coursera',
        phaseId: 'ph_genai',
        phaseTitle: 'Generative AI',
        phaseTaskId: 'pt_prompt_engg',
        isCompleted: false,
      };

      const parsed = DailyActivityGoalSchema.parse(input);
      expect(parsed.text).toBe('Complete Prompt Engg course');
      expect(parsed.lifeGoalId).toBe('life_goal_coursera');
      expect(parsed.phaseId).toBe('ph_genai');
      expect(parsed.phaseTaskId).toBe('pt_prompt_engg');
      expect(parsed.isCompleted).toBe(false);
    });

    it('defaults isCompleted to false when omitted', () => {
      const input = {
        id: 'dg_2',
        text: 'Read Chapter 3',
        lifeGoalId: 'life_goal_books',
        itemId: 'book_ddia',
        targetUnits: 15,
        unitLabel: 'pages',
      };

      const parsed = DailyActivityGoalSchema.parse(input);
      expect(parsed.isCompleted).toBe(false);
      expect(parsed.targetUnits).toBe(15);
      expect(parsed.itemId).toBe('book_ddia');
      expect(parsed.unitLabel).toBe('pages');
    });

    it('validates free-text target without life goal link', () => {
      const input = {
        id: 'dg_3',
        text: 'Practice 2 leetcode hard problems',
        isCompleted: true,
      };

      const parsed = DailyActivityGoalSchema.parse(input);
      expect(parsed.text).toBe('Practice 2 leetcode hard problems');
      expect(parsed.lifeGoalId).toBeUndefined();
      expect(parsed.isCompleted).toBe(true);
    });
  });

  describe('generateDailyOccurrences integration', () => {
    const courseraTemplate: RoutineTemplate = {
      id: 'routine_coursera',
      userId,
      title: 'Coursera learning',
      startTime: '12:30',
      endTime: '13:00',
      category: 'learning',
      color: '#3B82F6',
      recurrence: {
        frequency: 'daily',
        daysOfWeek: [1, 2, 3, 4, 5],
        startDate: '2026-01-01',
        exceptions: [],
      },
      isFixed: false,
      notifications: [],
      notes: '',
      timezone: 'Asia/Kolkata',
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    it('attaches dailyGoal from override to generated occurrence', () => {
      const dailyGoal: DailyActivityGoal = {
        id: 'dg_100',
        text: 'Complete Generative AI Module 1',
        lifeGoalId: 'life_goal_123',
        phaseId: 'ph_1',
        phaseTaskId: 'pt_1',
        isCompleted: false,
      };

      const override: OccurrenceOverride = {
        id: `override_routine_coursera_${testDate}`,
        templateId: 'routine_coursera',
        date: testDate,
        userId,
        isCancelled: false,
        isPostponed: false,
        dailyGoal,
        updatedAt: Date.now(),
      };

      const occurrences = generateDailyOccurrences([courseraTemplate], [override], [], testDate);

      expect(occurrences).toHaveLength(1);
      expect(occurrences[0].dailyGoal).toBeDefined();
      expect(occurrences[0].dailyGoal?.text).toBe('Complete Generative AI Module 1');
      expect(occurrences[0].dailyGoal?.lifeGoalId).toBe('life_goal_123');
      expect(occurrences[0].dailyGoal?.phaseTaskId).toBe('pt_1');
    });
  });

  describe('LifeGoalRepository sync and revert', () => {
    const mockLifeGoal: LifeGoal = {
      id: 'life_goal_coursera',
      userId,
      title: '10 Specializations on Coursera',
      category: 'career',
      domain: 'personal',
      status: 'in_progress',
      trackingMode: 'phases',
      startDate: '2026-01-01',
      targetDate: '2026-12-31',
      startValue: 0,
      currentValue: 2,
      targetValue: 10,
      unit: 'specializations',
      color: '#3B82F6',
      linkedTemplateIds: ['routine_coursera'],
      phases: [
        {
          id: 'ph_genai',
          title: 'Generative AI for software developers Specialization',
          description: 'DeepLearning.AI specialization',
          status: 'in_progress',
          tasks: [
            {
              id: 'pt_intro',
              text: 'Introduction and applications',
              isCompleted: true,
              completedAt: Date.now(),
            },
            {
              id: 'pt_prompt_engg',
              text: 'Prompt Engg',
              isCompleted: false,
            },
            {
              id: 'pt_elevate',
              text: 'Elevate SDE career',
              isCompleted: false,
            },
          ],
        },
      ],
      progressLogs: [],
      activityRecords: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    beforeEach(async () => {
      await LifeGoalRepository.saveGoal(mockLifeGoal);
    });

    it('completes the targeted phase task when syncing completed routine', async () => {
      const dailyGoal: DailyActivityGoal = {
        id: 'dg_sync_1',
        text: 'Prompt Engg',
        lifeGoalId: 'life_goal_coursera',
        phaseId: 'ph_genai',
        phaseTaskId: 'pt_prompt_engg',
        isCompleted: true,
      };

      const updatedGoals = await LifeGoalRepository.syncCompletedRoutineToLifeGoals(
        userId,
        testDate,
        'routine_coursera',
        'Coursera learning',
        30,
        'Finished prompt engineering lab with 100% score',
        { dailyGoal }
      );

      expect(updatedGoals).toHaveLength(1);
      const goal = updatedGoals[0];

      // Check that the task was marked completed
      const phase = goal.phases?.find((p) => p.id === 'ph_genai');
      const task = phase?.tasks?.find((t) => t.id === 'pt_prompt_engg');
      expect(task?.isCompleted).toBe(true);
      expect(task?.completedAt).toBeDefined();

      // Check that activity record captured the note and goal
      const record = goal.activityRecords?.find((e) => e.date === testDate);
      expect(record).toBeDefined();
      expect(record?.notes).toContain('Goal: Prompt Engg');
    });

    it('reverts completed phase task when routine status is reset to pending', async () => {
      const dailyGoal: DailyActivityGoal = {
        id: 'dg_revert_1',
        text: 'Prompt Engg',
        lifeGoalId: 'life_goal_coursera',
        phaseId: 'ph_genai',
        phaseTaskId: 'pt_prompt_engg',
        isCompleted: true,
      };

      // 1. Sync completion first
      await LifeGoalRepository.syncCompletedRoutineToLifeGoals(
        userId,
        testDate,
        'routine_coursera',
        'Coursera learning',
        30,
        '',
        { dailyGoal }
      );

      // Verify it was marked completed
      let saved = (await LifeGoalRepository.getLifeGoals(userId)).find((g) => g.id === 'life_goal_coursera')!;
      let task = saved.phases?.find((p) => p.id === 'ph_genai')?.tasks?.find((t) => t.id === 'pt_prompt_engg');
      expect(task?.isCompleted).toBe(true);

      // 2. Revert
      const revertedGoals = await LifeGoalRepository.revertCompletedRoutineFromLifeGoals(
        userId,
        testDate,
        'routine_coursera',
        dailyGoal
      );

      expect(revertedGoals).toHaveLength(1);
      const revertedGoal = revertedGoals[0];

      // Verify task is reset to uncompleted
      task = revertedGoal.phases?.find((p) => p.id === 'ph_genai')?.tasks?.find((t) => t.id === 'pt_prompt_engg');
      expect(task?.isCompleted).toBe(false);
      expect(task?.completedAt).toBeUndefined();
    });

    it('advances tracked item units and overall progress if tracked item is targeted', async () => {
      const itemGoal: LifeGoal = {
        id: 'life_goal_reading',
        userId,
        title: 'Read 12 Software Architecture Books',
        category: 'skills',
        domain: 'personal',
        status: 'in_progress',
        trackingMode: 'items',
        startDate: '2026-01-01',
        targetDate: '2026-12-31',
        startValue: 0,
        currentValue: 3,
        targetValue: 12,
        unit: 'books',
        color: '#3B82F6',
        linkedTemplateIds: ['routine_reading'],
        items: [
          {
            id: 'item_ddia',
            title: 'Designing Data-Intensive Applications',
            itemType: 'book',
            unitLabel: 'pages',
            totalUnits: 500,
            currentUnits: 150,
            status: 'in_progress',
            summary: '',
            notes: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
        progressLogs: [],
        activityRecords: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await LifeGoalRepository.saveGoal(itemGoal);

      const dailyGoal: DailyActivityGoal = {
        id: 'dg_read_1',
        text: 'Read DDIA Chapter 4 (25 pages)',
        lifeGoalId: 'life_goal_reading',
        itemId: 'item_ddia',
        targetUnits: 25,
        unitLabel: 'pages',
        isCompleted: true,
      };

      const updated = await LifeGoalRepository.syncCompletedRoutineToLifeGoals(
        userId,
        testDate,
        'routine_reading',
        'Evening Reading',
        45,
        'Read partitioning chapter',
        { dailyGoal }
      );

      expect(updated).toHaveLength(1);
      const item = updated[0].items?.find((i) => i.id === 'item_ddia');
      expect(item?.currentUnits).toBe(175); // 150 + 25
    });
  });
});
