import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GoalProgressCard } from './goal-progress-card';
import { GoalTarget } from '@/types/routine';
import { GoalFulfillment } from '@/lib/analytics/analytics-calculator';
import { GoalProgressEntry } from '@/types/goal-progress';

describe('GoalProgressCard Component', () => {
  const mockGoal: GoalTarget = {
    id: 'goal_cycling_exercise',
    userId: 'user-1',
    title: 'Cycling & Exercise',
    categories: ['fitness'],
    templateIds: [],
    frequency: 'daily',
    targetMinutes: 120,
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    isArchived: false,
    updatedAt: Date.now(),
  };

  const mockFulfillment: GoalFulfillment = {
    goal: mockGoal,
    targetMinutes: 120,
    plannedMinutes: 0,
    actualMinutes: 45,
    manualMinutes: 45,
    fulfillmentPercentage: 37.5,
    status: 'under_target',
    deficitMinutes: 75,
  };

  const mockEntries: GoalProgressEntry[] = [
    {
      id: 'gp-1',
      userId: 'user-1',
      goalId: 'goal_cycling_exercise',
      date: '2026-10-24',
      amount: 15,
      unitValue: 15,
      unit: 'km',
      minutes: 45,
      durationMinutes: 45,
      notes: 'Morning ride',
      note: 'Morning ride',
      source: 'manual',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  it('renders goal title, target, and completion percentage to 1 decimal place', () => {
    render(
      <GoalProgressCard
        goal={mockGoal}
        fulfillment={mockFulfillment}
        date="2026-10-24"
        entries={mockEntries}
        onRecordProgress={vi.fn()}
        onDeleteEntry={vi.fn()}
        onUndoLastEntry={vi.fn()}
      />
    );

    expect(screen.getByText('Cycling & Exercise')).toBeDefined();
    expect(screen.getByText(/37.5% completed/)).toBeDefined();
    expect(screen.getAllByText(/15 km/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/1h 15m remaining/)).toBeDefined();
  });

  it('triggers onRecordProgress with converted minutes when quick-add is clicked', async () => {
    const handleRecord = vi.fn();
    render(
      <GoalProgressCard
        goal={mockGoal}
        fulfillment={mockFulfillment}
        date="2026-10-24"
        entries={mockEntries}
        onRecordProgress={handleRecord}
        onDeleteEntry={vi.fn()}
        onUndoLastEntry={vi.fn()}
      />
    );

    // Click "+5 km" quick-add button
    const quickAdd5km = screen.getByText('+5 km');
    await act(async () => {
      fireEvent.click(quickAdd5km);
    });

    expect(handleRecord).toHaveBeenCalledWith({
      goalId: 'goal_cycling_exercise',
      amount: 5,
      unit: 'km',
      durationMinutes: 15, // 5 km * 3.0 min/km = 15m
      source: 'quick_add',
    });
  });

  it('submits custom input with calculation preview', async () => {
    const handleRecord = vi.fn();
    render(
      <GoalProgressCard
        goal={mockGoal}
        fulfillment={mockFulfillment}
        date="2026-10-24"
        entries={[]}
        onRecordProgress={handleRecord}
        onDeleteEntry={vi.fn()}
        onUndoLastEntry={vi.fn()}
      />
    );

    // Open Custom input drawer
    const customButton = screen.getByText('Custom');
    await act(async () => {
      fireEvent.click(customButton);
    });

    const input = screen.getByPlaceholderText('e.g. 15');
    await act(async () => {
      fireEvent.change(input, { target: { value: '20' } });
    });

    // Submit form
    const logButton = screen.getByText('Log Progress');
    await act(async () => {
      fireEvent.click(logButton);
    });

    expect(handleRecord).toHaveBeenCalledWith({
      goalId: 'goal_cycling_exercise',
      amount: 20,
      unit: 'km',
      durationMinutes: 60, // 20 km * 3.0 min/km = 60m
      notes: undefined,
      source: 'manual',
    });
  });

  it('calls onUndoLastEntry when undo button is clicked', async () => {
    const handleUndo = vi.fn();
    render(
      <GoalProgressCard
        goal={mockGoal}
        fulfillment={mockFulfillment}
        date="2026-10-24"
        entries={mockEntries}
        onRecordProgress={vi.fn()}
        onDeleteEntry={vi.fn()}
        onUndoLastEntry={handleUndo}
      />
    );

    const undoBtn = screen.getByRole('button', { name: /undo/i });
    await act(async () => {
      fireEvent.click(undoBtn);
    });

    expect(handleUndo).toHaveBeenCalledWith('goal_cycling_exercise', '2026-10-24');
  });
});
