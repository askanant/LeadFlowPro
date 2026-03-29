import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TokenBlacklistService } from './token-blacklist.service';

describe('TokenBlacklistService', () => {
  beforeEach(() => {
    TokenBlacklistService.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('blacklists a token', () => {
    const expiry = new Date(Date.now() + 60000);
    TokenBlacklistService.blacklist('token-1', expiry);
    expect(TokenBlacklistService.isBlacklisted('token-1')).toBe(true);
  });

  it('returns false for non-blacklisted token', () => {
    expect(TokenBlacklistService.isBlacklisted('unknown')).toBe(false);
  });

  it('auto-removes token after expiry', () => {
    const expiry = new Date(Date.now() + 5000);
    TokenBlacklistService.blacklist('token-2', expiry);
    expect(TokenBlacklistService.isBlacklisted('token-2')).toBe(true);

    vi.advanceTimersByTime(6000);
    expect(TokenBlacklistService.isBlacklisted('token-2')).toBe(false);
  });

  it('immediately removes already-expired token', () => {
    const pastDate = new Date(Date.now() - 1000);
    TokenBlacklistService.blacklist('expired-token', pastDate);
    expect(TokenBlacklistService.isBlacklisted('expired-token')).toBe(false);
  });

  it('manually removes a token', () => {
    TokenBlacklistService.blacklist('token-3', new Date(Date.now() + 60000));
    TokenBlacklistService.remove('token-3');
    expect(TokenBlacklistService.isBlacklisted('token-3')).toBe(false);
  });

  it('clears all tokens', () => {
    TokenBlacklistService.blacklist('a', new Date(Date.now() + 60000));
    TokenBlacklistService.blacklist('b', new Date(Date.now() + 60000));
    expect(TokenBlacklistService.size()).toBe(2);
    TokenBlacklistService.clear();
    expect(TokenBlacklistService.size()).toBe(0);
  });

  it('reports correct size', () => {
    expect(TokenBlacklistService.size()).toBe(0);
    TokenBlacklistService.blacklist('x', new Date(Date.now() + 60000));
    expect(TokenBlacklistService.size()).toBe(1);
  });
});
