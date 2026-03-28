import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { prisma } from '../../shared/database/prisma';
import { NotFoundError, UnauthorizedError } from '../../shared/utils/errors';

const APP_NAME = 'LeadFlow Pro';

export class TwoFactorService {
  /** Generate a new TOTP secret and QR code for enrollment */
  async setup(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    const totp = new OTPAuth.TOTP({
      issuer: APP_NAME,
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: new OTPAuth.Secret({ size: 20 }),
    });

    const secret = totp.secret.base32;
    const uri = totp.toString();
    const qrCode = await QRCode.toDataURL(uri);

    // Store secret temporarily (not yet enabled until verified)
    await prisma.user.update({
      where: { id: userId },
      data: { totpSecret: secret },
    });

    return { secret, qrCode };
  }

  /** Verify OTP and enable 2FA */
  async verify(userId: string, token: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.totpSecret) throw new UnauthorizedError('2FA not set up');

    const valid = this.validateToken(user.totpSecret, token);
    if (!valid) throw new UnauthorizedError('Invalid verification code');

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return { enabled: true };
  }

  /** Disable 2FA */
  async disable(userId: string, token: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');
    if (!user.twoFactorEnabled || !user.totpSecret) {
      throw new UnauthorizedError('2FA is not enabled');
    }

    const valid = this.validateToken(user.totpSecret, token);
    if (!valid) throw new UnauthorizedError('Invalid verification code');

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, totpSecret: null },
    });

    return { enabled: false };
  }

  /** Validate a TOTP token during login */
  validateLogin(secret: string, token: string): boolean {
    return this.validateToken(secret, token);
  }

  /** Check if user has 2FA enabled */
  async getStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    if (!user) throw new NotFoundError('User');
    return { enabled: user.twoFactorEnabled };
  }

  private validateToken(secret: string, token: string): boolean {
    const totp = new OTPAuth.TOTP({
      issuer: APP_NAME,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    // Allow 1 period window (±30s)
    const delta = totp.validate({ token, window: 1 });
    return delta !== null;
  }
}

export const twoFactorService = new TwoFactorService();
