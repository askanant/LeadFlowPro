import { api } from './client';
import { useAuthStore } from '../store/auth';

// Transform API user to AuthUser format
function transformUser(apiUser: any) {
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: `${apiUser.firstName || ''} ${apiUser.lastName || ''}`.trim() || apiUser.email,
    role: apiUser.role,
    tenantId: apiUser.tenantId,
  };
}

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  const result = data.data;

  // If 2FA is required, return the partial result so the UI can prompt for a code
  if (result.requiresTwoFactor) {
    return { requiresTwoFactor: true as const, twoFactorToken: result.twoFactorToken as string };
  }

  const transformedUser = transformUser(result.user);
  useAuthStore.getState().setAuth(result.accessToken, transformedUser, result.refreshToken);
  return { ...result, user: transformedUser, requiresTwoFactor: false as const };
}

export async function loginWith2FA(twoFactorToken: string, code: string) {
  const { data } = await api.post('/auth/2fa/validate', { twoFactorToken, code });
  const result = data.data;
  const transformedUser = transformUser(result.user);
  useAuthStore.getState().setAuth(result.accessToken, transformedUser, result.refreshToken);
  return { ...result, user: transformedUser };
}

// ── 2FA management ────────────────────────────────────────────────────────────

export async function get2FAStatus() {
  const { data } = await api.get('/auth/2fa/status');
  return data.data as { enabled: boolean };
}

export async function setup2FA() {
  const { data } = await api.post('/auth/2fa/setup');
  return data.data as { secret: string; qrCode: string };
}

export async function verify2FA(code: string) {
  const { data } = await api.post('/auth/2fa/verify', { code });
  return data.data as { enabled: boolean };
}

export async function disable2FA(code: string) {
  const { data } = await api.post('/auth/2fa/disable', { code });
  return data.data as { enabled: boolean };
}

export async function register(payload: {
  companyName: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}) {
  const { data } = await api.post('/auth/register', payload);
  const transformedUser = transformUser(data.data.user);
  useAuthStore.getState().setAuth(data.data.accessToken, transformedUser, data.data.refreshToken);
  useAuthStore.getState().setNeedsSetup(true);
  return { ...data.data, user: transformedUser };
}

export async function logout() {
  await api.post('/auth/logout').catch(() => {});
  useAuthStore.getState().logout();
}
