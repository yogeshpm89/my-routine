import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TodayTimeline } from './today-timeline';
import { DayRoutineTemplate } from '@/types/routine-templates';
import { GoalTarget } from '@/types/routine';

describe('TodayTimeline Mobile Layout & Navigation', () => {
  const dummyTemplate: DayRoutineTemplate = {
    id: 'tpl_weekday',
    userId: 'user1',
    name: 'Weekday Schedule',
    description: 'Weekday routine template',
    color: '#3b82f6',
    icon: 'briefcase',
    blocks: [],
    isDefault: true,
    schemaVersion: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const dummyWeekendTemplate: DayRoutineTemplate = {
    id: 'tpl_weekend',
    userId: 'user1',
    name: 'Weekend Leisure',
    description: 'Weekend leisure routine template',
    color: '#10b981',
    icon: 'sun',
    blocks: [],
    isDefault: false,
    schemaVersion: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const dummyGoal: GoalTarget = {
    id: 'goal_cycling',
    userId: 'user1',
    title: 'Cycling & Exercise',
    categories: ['fitness'],
    templateIds: [],
    frequency: 'daily',
    targetMinutes: 60,
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    isArchived: false,
    updatedAt: Date.now(),
  };

  it('renders dedicated routine template bar and switches template on mobile', () => {
    const onQuickSwitch = vi.fn();
    const onNavigateToTemplates = vi.fn();

    render(
      <TodayTimeline
        occurrences={[]}
        selectedDate="2026-10-24"
        onSelectDate={vi.fn()}
        onUpdateStatus={vi.fn()}
        onOpenCreate={vi.fn()}
        onEdit={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        activeDayTemplate={dummyTemplate}
        allDayTemplates={[dummyTemplate, dummyWeekendTemplate]}
        onQuickSwitchTemplate={onQuickSwitch}
        onNavigateToTemplates={onNavigateToTemplates}
      />
    );

    // Verify template dropdown exists
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select).toBeDefined();
    expect(select.value).toBe('tpl_weekday');

    // Quick switch to weekend template
    fireEvent.change(select, { target: { value: 'tpl_weekend' } });
    expect(onQuickSwitch).toHaveBeenCalledWith('tpl_weekend');

    // Verify direct Planner button exists and can be clicked
    const plannerBtn = screen.getByRole('button', { name: /planner/i });
    expect(plannerBtn).toBeDefined();
    fireEvent.click(plannerBtn);
    expect(onNavigateToTemplates).toHaveBeenCalledTimes(1);
  });

  it('renders TodayGoalQuickBar when dailyGoals are provided', () => {
    const onRecordProgress = vi.fn();

    render(
      <TodayTimeline
        occurrences={[]}
        selectedDate="2026-10-24"
        onSelectDate={vi.fn()}
        onUpdateStatus={vi.fn()}
        onOpenCreate={vi.fn()}
        onEdit={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        dailyGoals={[dummyGoal]}
        goalProgress={[]}
        onRecordGoalProgress={onRecordProgress}
      />
    );

    // Daily Goal Tracker should be visible
    expect(screen.getByText('Daily Goal Tracker')).toBeDefined();
    expect(screen.getByText('Cycling & Exercise')).toBeDefined();
  });
});
