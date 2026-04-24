import { describe, it, expect } from 'vitest';
import { buildKey } from '../cache/helpers';

describe('buildKey', () => {
  it('joins namespace and parts with colon', () => {
    const key = buildKey('gpu:status', 'server-1', 'gpu-2');
    expect(key).toBe('gpu:status:server-1:gpu-2');
  });

  it('converts numbers to strings', () => {
    const key = buildKey('user:allocations', 42);
    expect(key).toBe('user:allocations:42');
  });

  it('works with just namespace', () => {
    const key = buildKey('server:status');
    expect(key).toBe('server:status');
  });
});
