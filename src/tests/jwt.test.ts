import { describe, it, expect } from 'vitest';
import { generateToken, verifyToken, JwtPayload } from '../auth/jwt';

const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
  userId: 'user-123',
  email: 'test@example.com',
  role: 'user',
};

describe('JWT', () => {
  it('generates a token and verifies it', () => {
    const token = generateToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });

  it('throws on invalid token', () => {
    expect(() => verifyToken('invalid.token.here')).toThrow();
  });

  it('throws on tampered token', () => {
    const token = generateToken(payload);
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(() => verifyToken(tampered)).toThrow();
  });
});
