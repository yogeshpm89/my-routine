import { describe, it, expect, beforeEach } from 'vitest';
import { MutationQueue } from './mutation-queue';
import { BackupService } from './backup-service';
import { SyncEngine } from './sync-engine';
import { getInitialRoutineTemplates } from '@/lib/seed-data';

describe('Offline Mutation Queue & Backup Service', () => {
  const userId = 'test-sync-user';

  beforeEach(() => {
    MutationQueue.clear(userId);
  });

  it('enqueues mutations and increments pending count', () => {
    expect(MutationQueue.getPendingCount(userId)).toBe(0);

    const mut1 = MutationQueue.enqueue(userId, 'templates', 'set', 'temp_1', { title: 'Focus Sprint' });
    expect(MutationQueue.getPendingCount(userId)).toBe(1);
    expect(mut1.docId).toBe('temp_1');
    expect(mut1.collection).toBe('templates');

    // Adding another mutation for different doc
    MutationQueue.enqueue(userId, 'logs', 'set', 'log_1', { status: 'completed' });
    expect(MutationQueue.getPendingCount(userId)).toBe(2);

    // Dequeuing mut1
    MutationQueue.dequeue(userId, mut1.id);
    expect(MutationQueue.getPendingCount(userId)).toBe(1);
  });

  it('deduplicates multiple mutations targeting the same document', () => {
    MutationQueue.enqueue(userId, 'templates', 'set', 'temp_1', { title: 'First Edit' });
    MutationQueue.enqueue(userId, 'templates', 'set', 'temp_1', { title: 'Second Edit' });

    // Should only have 1 queued mutation with the latest payload
    const queue = MutationQueue.getQueue(userId);
    expect(queue).toHaveLength(1);
    expect(queue[0].payload.title).toBe('Second Edit');
  });

  it('exports and restores full user routine package with fidelity', () => {
    // Seed initial templates
    const initialTemplates = getInitialRoutineTemplates(userId);
    const backup = BackupService.exportAllData(userId);

    expect(backup.version).toBe('1.0');
    expect(backup.userId).toBe(userId);
    expect(backup.exportedAt).toBeDefined();
    expect(backup.templates.length).toBeGreaterThan(0);

    // Test import validation
    const serialized = JSON.stringify(backup);
    const importResult = BackupService.importBackupData(userId, serialized, 'replace');

    expect(importResult.success).toBe(true);
    expect(importResult.counts?.templates).toBe(backup.templates.length);

    // Test corrupt JSON failure handling
    const corruptResult = BackupService.importBackupData(userId, '{"invalid": true}', 'replace');
    expect(corruptResult.success).toBe(false);
  });
});
