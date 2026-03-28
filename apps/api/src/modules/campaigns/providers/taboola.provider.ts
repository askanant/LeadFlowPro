import { IAdPlatformProvider, CampaignLaunchPayload, CampaignLaunchResult } from './types';

/**
 * Taboola Provider
 * Uses Taboola Backstage API with API key authentication
 */
export class TaboolaAdsPlatform implements IAdPlatformProvider {
  readonly name = 'taboola';

  async launch(
    campaign: CampaignLaunchPayload,
    credentials: {
      accessToken?: string;
      accountId?: string;
      appId?: string;
      appSecret?: string;
      extraConfig?: any;
    }
  ): Promise<CampaignLaunchResult> {
    if (!credentials.appId || !credentials.appSecret || !credentials.accountId) {
      throw new Error('No valid Taboola credentials configured');
    }

    // Taboola uses Client ID and Secret for authentication
    const clientId = credentials.appId;
    const clientSecret = credentials.appSecret;
    const accountId = credentials.accountId;

    // First, get auth token
    const authResponse = await fetch('https://backstage.taboola.com/api/1.0/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!authResponse.ok) {
      throw new Error('Failed to authenticate with Taboola');
    }

    const authData = (await authResponse.json()) as { session_id?: string };
    if (!authData.session_id) {
      throw new Error('No session ID returned from Taboola auth');
    }

    // Create campaign
    const apiEndpoint = `https://backstage.taboola.com/api/1.0/accounts/${accountId}/campaigns/create`;

    const campaignPayload = {
      name: campaign.name,
      advertiser_id: accountId,
      status: 'PAUSED', // Taboola campaigns start paused
      spending_limit_daily: campaign.dailyBudget || 100, // Daily budget in account currency
      spending_limit_lifetime: campaign.totalBudget || undefined,
      template_name: 'lead_generation', // Taboola template for lead gen
      default_cpc: 0.5, // Default cost-per-click starting bid
    };

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authData.session_id}`,
      },
      body: JSON.stringify(campaignPayload),
    });

    if (!response.ok) {
      const error = (await response.json()) as { error?: { message?: string } };
      throw new Error(error.error?.message ?? `Taboola API error: ${response.statusText}`);
    }

    const result = (await response.json()) as {
      campaign?: { id?: string };
      data?: { id?: string };
    };
    const campaignId = result.campaign?.id || result.data?.id;

    if (!campaignId) {
      throw new Error('No campaign ID returned from Taboola API');
    }

    return {
      platformCampaignId: campaignId,
      status: 'paused',
    };
  }

  async pause(
    platformCampaignId: string,
    credentials: {
      accessToken?: string;
      accountId?: string;
      appId?: string;
      appSecret?: string;
      extraConfig?: any;
    }
  ): Promise<void> {
    if (!credentials.appId || !credentials.appSecret || !credentials.accountId) {
      throw new Error('No valid Taboola credentials configured');
    }

    const clientId = credentials.appId;
    const clientSecret = credentials.appSecret;
    const accountId = credentials.accountId;

    // Authenticate
    const authResponse = await fetch('https://backstage.taboola.com/api/1.0/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!authResponse.ok) {
      throw new Error('Failed to authenticate with Taboola');
    }

    const authData = (await authResponse.json()) as { session_id?: string };
    if (!authData.session_id) {
      throw new Error('No session ID returned from Taboola auth');
    }

    // Update campaign status
    const apiEndpoint = `https://backstage.taboola.com/api/1.0/accounts/${accountId}/campaigns/${platformCampaignId}/pause`;

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authData.session_id}`,
      },
    });

    if (!response.ok) {
      const error = (await response.json()) as { error?: { message?: string } };
      throw new Error(error.error?.message ?? `Taboola API error: ${response.statusText}`);
    }
  }

  async resume(
    platformCampaignId: string,
    credentials: {
      accessToken?: string;
      accountId?: string;
      appId?: string;
      appSecret?: string;
      extraConfig?: any;
    }
  ): Promise<void> {
    if (!credentials.appId || !credentials.appSecret || !credentials.accountId) {
      throw new Error('No valid Taboola credentials configured');
    }

    const clientId = credentials.appId;
    const clientSecret = credentials.appSecret;
    const accountId = credentials.accountId;

    // Authenticate
    const authResponse = await fetch('https://backstage.taboola.com/api/1.0/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!authResponse.ok) {
      throw new Error('Failed to authenticate with Taboola');
    }

    const authData = (await authResponse.json()) as { session_id?: string };
    if (!authData.session_id) {
      throw new Error('No session ID returned from Taboola auth');
    }

    // Update campaign status
    const apiEndpoint = `https://backstage.taboola.com/api/1.0/accounts/${accountId}/campaigns/${platformCampaignId}/resume`;

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authData.session_id}`,
      },
    });

    if (!response.ok) {
      const error = (await response.json()) as { error?: { message?: string } };
      throw new Error(error.error?.message ?? `Taboola API error: ${response.statusText}`);
    }
  }
}
