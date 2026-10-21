import { describe, it, expect } from 'vitest';
import { getActivityTheme } from './activity-styles';
import { ActivityCategory } from '@/types/routine';

describe('Activity Themes & Background Styles', () => {
  it('returns distinct themes for different categories', () => {
    const mindfulness = getActivityTheme('mindfulness');
    const fitness = getActivityTheme('fitness');
    const learning = getActivityTheme('learning');
    const work = getActivityTheme('work');
    const family = getActivityTheme('family');

    expect(mindfulness.cardGradient).toContain('emerald');
    expect(fitness.cardGradient).toContain('teal');
    expect(learning.cardGradient).toContain('purple');
    expect(work.cardGradient).toContain('blue');
    expect(family.cardGradient).toContain('rose');

    // Ensure distinct gradients
    expect(mindfulness.cardGradient).not.toBe(fitness.cardGradient);
    expect(learning.cardGradient).not.toBe(work.cardGradient);
  });

  it('provides ambient glow properties and timeline current styling', () => {
    const health = getActivityTheme('health');
    expect(health.ambientGlowA).toBeDefined();
    expect(health.ambientGlowB).toBeDefined();
    expect(health.timelineCurrentRing).toBeDefined();
    expect(health.borderColor).toBeDefined();
  });

  it('falls back gracefully to other theme for unknown categories', () => {
    const unknown = getActivityTheme('non_existent_category' as ActivityCategory);
    expect(unknown).toBeDefined();
    expect(unknown.cardGradient).toBeDefined();
    expect(unknown.ambientGlowA).toBeDefined();
  });
});
