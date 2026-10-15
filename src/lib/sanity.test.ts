import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('Sanity test', () => {
  it('correctly merges class names', () => {
    expect(cn('px-2', 'py-1', { 'bg-blue-500': true })).toBe('px-2 py-1 bg-blue-500');
  });
});
