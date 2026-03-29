vi.mock('../../config', () => ({
  config: {
    JWT_SECRET: 'a]1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p',
    NODE_ENV: 'development',
    AWS_REGION: 'us-east-1',
  },
}));

import { describe, it, expect, vi } from 'vitest';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  describe('encrypt / decrypt', () => {
    it('encrypts and decrypts a string round-trip', async () => {
      const plaintext = 'my-secret-api-key-12345';
      const { ciphertext, iv } = await EncryptionService.encrypt(plaintext);

      expect(ciphertext).toBeTruthy();
      expect(iv).toBeTruthy();
      expect(ciphertext).not.toBe(plaintext);

      const decrypted = await EncryptionService.decrypt(ciphertext, iv);
      expect(decrypted).toBe(plaintext);
    });

    it('produces different ciphertext for same input (unique IV)', async () => {
      const plaintext = 'same-text';
      const result1 = await EncryptionService.encrypt(plaintext);
      const result2 = await EncryptionService.encrypt(plaintext);

      expect(result1.iv).not.toBe(result2.iv);
      expect(result1.ciphertext).not.toBe(result2.ciphertext);
    });

    it('handles empty string', async () => {
      const { ciphertext, iv } = await EncryptionService.encrypt('');
      const decrypted = await EncryptionService.decrypt(ciphertext, iv);
      expect(decrypted).toBe('');
    });

    it('handles unicode characters', async () => {
      const text = 'Hello 世界 🌍';
      const { ciphertext, iv } = await EncryptionService.encrypt(text);
      const decrypted = await EncryptionService.decrypt(ciphertext, iv);
      expect(decrypted).toBe(text);
    });
  });

  describe('encryptObject / decryptObject', () => {
    it('round-trips a JSON object', async () => {
      const obj = { apiKey: 'sk_live_123', region: 'us-east-1' };
      const { encrypted, iv } = await EncryptionService.encryptObject(obj);
      const decrypted = await EncryptionService.decryptObject(encrypted, iv);
      expect(decrypted).toEqual(obj);
    });

    it('handles nested objects', async () => {
      const obj = { credentials: { user: 'admin', pass: 'secret' }, enabled: true };
      const { encrypted, iv } = await EncryptionService.encryptObject(obj);
      const decrypted = await EncryptionService.decryptObject(encrypted, iv);
      expect(decrypted).toEqual(obj);
    });
  });
});
