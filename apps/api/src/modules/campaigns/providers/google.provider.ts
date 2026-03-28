import { IAdPlatformProvider, CampaignLaunchPayload, CampaignLaunchResult } from './types';

/**
 * Google Ads Provider
 * Uses Google Ads API v14 with OAuth 2.0 credentials
 */
export class GoogleAdsPlatform implements IAdPlatformProvider {
  readonly name = 'google';

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
      throw new Error('No valid Google Ads credentials configured');
    }

    // Google Ads API requires customer ID in format: 1234567890 (10 digits)
    const customerId = credentials.accountId.replace(/-/g, '');
    const apiEndpoint = 'https://googleads.googleapis.com/v14/customers/' + customerId + '/campaigns';

    const campaignResource = {
      name: campaign.name,
      status: 'ENABLED',
      advertisingChannelType: 'SEARCH',
      advertisingChannelSubType: 'SEARCH_UNKNOWN',
      campaignBudgetId: credentials.extraConfig?.budgetResourceId, // Required: must have budget configured
      startDate: campaign.startDate ? campaign.startDate.toISOString().split('T')[0].replace(/-/g, '') : null,
      endDate: campaign.endDate ? campaign.endDate.toISOString().split('T')[0].replace(/-/g, '') : null,
    };

    // Filter out null values
    const filteredCampaign = Object.fromEntries(
      Object.entries(campaignResource).filter(([, v]) => v !== null && v !== undefined)
    );

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
      },
      body: JSON.stringify({
        campaignOperation: {
          create: filteredCampaign,
        },
      }),
    });

    const result = (await response.json()) as {
      results?: Array<{ resourceName?: string }>;
      error?: { message: string };
    };

    if (!response.ok || result.error) {
      throw new Error(result.error?.message ?? 'Google Ads API error');
    }

    if (!result.results?.[0]?.resourceName) {
      throw new Error('No campaign resource returned from Google Ads API');
    }

    // resourceName format: customers/1234567890/campaigns/9876543210
    const platformCampaignId = result.results[0].resourceName;

    return {
      platformCampaignId,
      status: 'active',
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
      throw new Error('No valid Google Ads credentials configured');
    }

    const customerId = credentials.accountId.replace(/-/g, '');
    const apiEndpoint = 'https://googleads.googleapis.com/v14/customers/' + customerId + '/campaigns:mutate';

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
      },
      body: JSON.stringify({
        campaignOperations: [
          {
            update: {
              resourceName: platformCampaignId,
              status: 'PAUSED',
            },
            updateMask: {
              paths: ['status'],
            },
          },
        ],
      }),
    });

    const result = (await response.json()) as { error?: { message: string } };
    if (!response.ok || result.error) {
      throw new Error(result.error?.message ?? 'Google Ads API error');
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
      throw new Error('No valid Google Ads credentials configured');
    }

    const customerId = credentials.accountId.replace(/-/g, '');
    const apiEndpoint = 'https://googleads.googleapis.com/v14/customers/' + customerId + '/campaigns:mutate';

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
      },
      body: JSON.stringify({
        campaignOperations: [
          {
            update: {
              resourceName: platformCampaignId,
              status: 'ENABLED',
            },
            updateMask: {
              paths: ['status'],
            },
          },
        ],
      }),
    });

    const result = (await response.json()) as { error?: { message: string } };
    if (!response.ok || result.error) {
      throw new Error(result.error?.message ?? 'Google Ads API error');
    }
  }
}
