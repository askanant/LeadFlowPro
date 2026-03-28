import { IAdPlatformProvider, CampaignLaunchPayload, CampaignLaunchResult } from './types';

/**
 * Microsoft Ads Provider
 * Uses Microsoft Advertising API (Bing Ads, Yahoo, AOL) with OAuth 2.0
 */
export class MicrosoftAdsPlatform implements IAdPlatformProvider {
  readonly name = 'microsoft';

  async launch(
    campaign: CampaignLaunchPayload,
    credentials: {
      accessToken?: string;
      refreshToken?: string;
      accountId?: string;
      appId?: string;
      appSecret?: string;
      extraConfig?: any;
    }
  ): Promise<CampaignLaunchResult> {
    if (!credentials.accessToken || !credentials.accountId) {
      throw new Error('No valid Microsoft Ads credentials configured');
    }

    const customerId = credentials.accountId;
    const apiEndpoint = 'https://api.ads.microsoft.com/api/v13/campaigns';

    const campaignPayload = {
      Name: campaign.name,
      Status: 'Paused', // Microsoft requires campaigns to start paused, then be activated
      BudgetType: 'DailyBudgetStandard',
      DailyBudget: campaign.dailyBudget ? campaign.dailyBudget * 100000 : 500000, // Microsoft uses 100,000ths of currency
      BiddingScheme: {
        Type: 'EnhancedCpcBiddingScheme',
      },
      ...(campaign.startDate && {
        StartDate: campaign.startDate.toISOString().split('T')[0],
      }),
      ...(campaign.endDate && {
        EndDate: campaign.endDate.toISOString().split('T')[0],
      }),
    };

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
        'Customer-Id': customerId,
      },
      body: JSON.stringify(campaignPayload),
    });

    if (!response.ok) {
      const error = (await response.json()) as { error?: { message?: string } };
      throw new Error(
        error.error?.message ?? `Microsoft Ads API error: ${response.statusText}`
      );
    }

    const result = (await response.json()) as { id?: string; Id?: string };
    const campaignId = result.id || result.Id;

    if (!campaignId) {
      throw new Error('No campaign ID returned from Microsoft Ads API');
    }

    return {
      platformCampaignId: String(campaignId),
      status: 'paused',
    };
  }

  async pause(
    platformCampaignId: string,
    credentials: {
      accessToken?: string;
      accountId?: string;
      extraConfig?: any;
      [key: string]: any;
    }
  ): Promise<void> {
    if (!credentials.accessToken || !credentials.accountId) {
      throw new Error('No valid Microsoft Ads credentials configured');
    }

    const customerId = credentials.accountId;
    const apiEndpoint = `https://api.ads.microsoft.com/api/v13/campaigns/${platformCampaignId}`;

    const response = await fetch(apiEndpoint, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
        'Customer-Id': customerId,
      },
      body: JSON.stringify({
        Status: 'Paused',
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { error?: { message?: string } };
      throw new Error(
        error.error?.message ?? `Microsoft Ads API error: ${response.statusText}`
      );
    }
  }

  async resume(
    platformCampaignId: string,
    credentials: {
      accessToken?: string;
      accountId?: string;
      extraConfig?: any;
      [key: string]: any;
    }
  ): Promise<void> {
    if (!credentials.accessToken || !credentials.accountId) {
      throw new Error('No valid Microsoft Ads credentials configured');
    }

    const customerId = credentials.accountId;
    const apiEndpoint = `https://api.ads.microsoft.com/api/v13/campaigns/${platformCampaignId}`;

    const response = await fetch(apiEndpoint, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
        'Customer-Id': customerId,
      },
      body: JSON.stringify({
        Status: 'Active',
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { error?: { message?: string } };
      throw new Error(
        error.error?.message ?? `Microsoft Ads API error: ${response.statusText}`
      );
    }
  }
}
