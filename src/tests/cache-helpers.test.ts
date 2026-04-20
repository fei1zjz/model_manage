import { describe, it, expect } from 'vitest';
import { buildKey } from '../cache/helpers';

describe('buildKey', () => {
  it('joins namespace and parts with colon', () => {
    const key = buildKey('gpu', 'server-1', 'gpu-2');
    expect(key).toBe('gpu:server-1:gpu-2');
  });

  it('converts numbers to strings', () => {
    const key = buildKey('allocation', 42);
    expect(key).toBe('allocation:42');
  });

  it('works with just namespace', () => {
    const key = buildKey('server');
    expect(key).toBe('server');
  });
});
