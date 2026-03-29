import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';
import crypto from 'crypto';
import { config } from '../../config';
import { LoggerService } from './logger.service';

/**
 * Encryption Service
 * Handles encryption/decryption of sensitive credentials using AWS KMS
 * Falls back to local encryption in development
 */
export class EncryptionService {
  private static kmsClient: KMSClient | null = null;
  private static encryptionKey: string = config.JWT_SECRET; // Fallback key (use KMS in production)

  private static getKMSClient(): KMSClient {
    if (!this.kmsClient && config.NODE_ENV === 'production') {
      this.kmsClient = new KMSClient({ region: config.AWS_REGION });
    }
    return this.kmsClient!;
  }

  /**
   * Encrypt a string value
   * In production, uses AWS KMS
   * In development, uses local AES-256 encryption
   */
  static async encrypt(plaintext: string): Promise<{ ciphertext: string; iv: string }> {
    if (config.NODE_ENV === 'production' && process.env.KMS_KEY_ID) {
      // Use AWS KMS in production
      try {
        const kms = this.getKMSClient();
        const response = await kms.send(
          new EncryptCommand({
            KeyId: process.env.KMS_KEY_ID,
            Plaintext: Buffer.from(plaintext),
          })
        );
        return {
          ciphertext: Buffer.from(response.CiphertextBlob!).toString('base64'),
          iv: 'kms', // KMS doesn't use IV
        };
      } catch (error) {
        LoggerService.logError('KMS encryption failed, falling back to local encryption', error instanceof Error ? error : undefined);
        return this.encryptLocal(plaintext);
      }
    }

    // Use local AES-256 encryption in development
    return this.encryptLocal(plaintext);
  }

  /**
   * Decrypt a string value
   * In production, uses AWS KMS
   * In development, uses local AES-256 decryption
   */
  static async decrypt(ciphertext: string, iv: string): Promise<string> {
    if (iv === 'kms' && config.NODE_ENV === 'production') {
      // Use AWS KMS in production
      try {
        const kms = this.getKMSClient();
        const response = await kms.send(
          new DecryptCommand({
            CiphertextBlob: Buffer.from(ciphertext, 'base64'),
          })
        );
        return Buffer.from(response.Plaintext!).toString('utf-8');
      } catch (error) {
        throw new Error('KMS decryption failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }

    // Use local AES-256 decryption in development
    return this.decryptLocal(ciphertext, iv);
  }

  /**
   * Local AES-256 encryption (for development and KMS fallback)
   */
  private static encryptLocal(plaintext: string): { ciphertext: string; iv: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.slice(0, 32)), iv);
    let ciphertext = cipher.update(plaintext, 'utf-8', 'hex');
    ciphertext += cipher.final('hex');
    return {
      ciphertext,
      iv: iv.toString('hex'),
    };
  }

  /**
   * Local AES-256 decryption
   */
  private static decryptLocal(ciphertext: string, iv: string): string {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(this.encryptionKey.slice(0, 32)),
      Buffer.from(iv, 'hex')
    );
    let plaintext = decipher.update(ciphertext, 'hex', 'utf-8');
    plaintext += decipher.final('utf-8');
    return plaintext;
  }

  /**
   * Encrypt an object (for complex credential structures)
   */
  static async encryptObject<T extends object>(obj: T): Promise<{ encrypted: string; iv: string }> {
    const json = JSON.stringify(obj);
    const result = await this.encrypt(json);
    return { encrypted: result.ciphertext, iv: result.iv };
  }

  /**
   * Decrypt an object
   */
  static async decryptObject<T extends object>(encrypted: string, iv: string): Promise<T> {
    const json = await this.decrypt(encrypted, iv);
    return JSON.parse(json) as T;
  }
}
