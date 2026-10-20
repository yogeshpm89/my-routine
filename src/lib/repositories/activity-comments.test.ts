import { describe, it, expect, beforeEach } from 'vitest';
import { LogRepository } from './log-repository';
import { generateDailyOccurrences } from '@/lib/occurrence-generator';
import { RoutineTemplate } from '@/types/routine';

describe('Activity Comments & Daily Notes System', () => {
  const userId = 'test-comment-user';
  const targetDate = '2026-10-20';
  const templateId = 'template_reading_session';

  const template: RoutineTemplate = {
    id: templateId,
    userId,
    title: 'Evening Reading',
    category: 'personal',
    startTime: '20:00',
    endTime: '21:00',
    isFixed: false,
    recurrence: {
      frequency: 'daily',
      daysOfWeek: [],
      startDate: '2026-10-01',
      exceptions: [],
    },
    notifications: [],
    notes: 'Read at least 20 pages',
    color: '#8b5cf6',
    timezone: 'Asia/Kolkata',
    isArchived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('adds a new comment to an activity log and persists it', async () => {
    const updatedLog = await LogRepository.addComment(
      userId,
      targetDate,
      templateId,
      'Finished chapter 4, great insights on habits!'
    );

    expect(updatedLog).toBeDefined();
    expect(updatedLog.comments).toBeDefined();
    expect(updatedLog.comments?.length).toBe(1);
    expect(updatedLog.comments?.[0].text).toBe('Finished chapter 4, great insights on habits!');
    expect(updatedLog.comments?.[0].id).toMatch(/^comm_/);
    expect(updatedLog.comments?.[0].createdAt).toBeGreaterThan(0);

    // Verify retrieval from local logs
    const logs = LogRepository.getLocalLogs(userId);
    const persisted = logs.find((l) => l.id === `${targetDate}_${templateId}`);
    expect(persisted?.comments?.length).toBe(1);
    expect(persisted?.comments?.[0].text).toBe('Finished chapter 4, great insights on habits!');
  });

  it('supports multiple timestamped comments on the same activity', async () => {
    await LogRepository.addComment(userId, targetDate, templateId, 'First note: Started at 20:05');
    const secondLog = await LogRepository.addComment(
      userId,
      targetDate,
      templateId,
      'Second note: Finished at 20:55, read 30 pages'
    );

    expect(secondLog.comments?.length).toBe(2);
    expect(secondLog.comments?.[0].text).toBe('First note: Started at 20:05');
    expect(secondLog.comments?.[1].text).toBe('Second note: Finished at 20:55, read 30 pages');
  });

  it('updates an existing comment without affecting other comments', async () => {
    await LogRepository.addComment(userId, targetDate, templateId, 'Initial draft note');
    const withSecond = await LogRepository.addComment(userId, targetDate, templateId, 'Keep this note');
    const commentToEdit = withSecond.comments?.[0];
    expect(commentToEdit).toBeDefined();

    const afterUpdate = await LogRepository.updateComment(
      userId,
      targetDate,
      templateId,
      commentToEdit!.id,
      'Revised refined note text'
    );

    expect(afterUpdate.comments?.length).toBe(2);
    expect(afterUpdate.comments?.[0].text).toBe('Revised refined note text');
    expect(afterUpdate.comments?.[0].updatedAt).toBeDefined();
    expect(afterUpdate.comments?.[1].text).toBe('Keep this note');
  });

  it('deletes a comment while keeping remaining comments intact', async () => {
    await LogRepository.addComment(userId, targetDate, templateId, 'Comment to delete');
    const withSecond = await LogRepository.addComment(userId, targetDate, templateId, 'Comment to keep');
    const commentToDelete = withSecond.comments?.[0];

    const afterDelete = await LogRepository.deleteComment(
      userId,
      targetDate,
      templateId,
      commentToDelete!.id
    );

    expect(afterDelete.comments?.length).toBe(1);
    expect(afterDelete.comments?.[0].text).toBe('Comment to keep');
  });

  it('preserves comments when updating activity status or toggling steps', async () => {
    await LogRepository.addComment(userId, targetDate, templateId, 'Important reflection note');

    // Update status to completed
    const updatedStatusLog = await LogRepository.updateStatus(
      userId,
      targetDate,
      templateId,
      'completed'
    );
    expect(updatedStatusLog.comments?.length).toBe(1);
    expect(updatedStatusLog.comments?.[0].text).toBe('Important reflection note');

    // Toggle a checklist step
    const toggledLog = await LogRepository.toggleStep(userId, targetDate, templateId, 'step_1');
    expect(toggledLog.comments?.length).toBe(1);
    expect(toggledLog.comments?.[0].text).toBe('Important reflection note');
  });

  it('maps comments correctly onto generated daily occurrences', async () => {
    await LogRepository.addComment(
      userId,
      targetDate,
      templateId,
      'Check occurrence generator mapping'
    );

    const logs = LogRepository.getLocalLogs(userId);
    const occurrences = generateDailyOccurrences([template], [], logs, targetDate);

    expect(occurrences.length).toBe(1);
    expect(occurrences[0].comments).toBeDefined();
    expect(occurrences[0].comments?.length).toBe(1);
    expect(occurrences[0].comments?.[0].text).toBe('Check occurrence generator mapping');
  });

  it('correctly handles legacy log notes in update and delete operations', async () => {
    // Simulate a legacy log with completionNotes
    const legacyLog = {
      id: `${targetDate}_${templateId}`,
      userId,
      templateId,
      date: targetDate,
      status: 'completed' as const,
      actualDurationMinutes: 0,
      targetDurationMinutes: 0,
      completionNotes: 'Legacy completion note from quick log',
      comments: [],
      updatedAt: Date.now(),
    };
    await LogRepository.saveLog(legacyLog);

    // Delete legacy note via log_note_ identifier
    const afterDelete = await LogRepository.deleteComment(
      userId,
      targetDate,
      templateId,
      `log_note_${targetDate}_${templateId}`
    );
    expect(afterDelete.completionNotes).toBe('');

    // Update legacy note
    await LogRepository.saveLog({
      ...legacyLog,
      completionNotes: 'Old legacy note',
    });
    const afterUpdate = await LogRepository.updateComment(
      userId,
      targetDate,
      templateId,
      `log_note_${targetDate}_${templateId}`,
      'Updated migrated note'
    );
    expect(afterUpdate.completionNotes).toBe('Updated migrated note');
  });
});
