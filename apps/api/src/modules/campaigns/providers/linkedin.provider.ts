import { IAdPlatformProvider, CampaignLaunchPayload, CampaignLaunchResult } from './types';

/**
 * LinkedIn Ads Provider
 * Uses LinkedIn Marketing Developer Platform (API v2) with OAuth 2.0
 */
export class LinkedInAdsPlatform implements IAdPlatformProvider {
  readonly name = 'linkedin';

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
      throw new Error('No valid LinkedIn credentials configured');
    }

    // LinkedIn account ID format: urn:li:sponsoredAccount:<ID>
    const accountUrn = credentials.accountId.startsWith('urn:')
      ? credentials.accountId
      : `urn:li:sponsoredAccount:${credentials.accountId}`;

    const apiEndpoint = 'https://api.linkedin.com/rest/campaigns';

    const campaignPayload = {
      account: accountUrn,
      name: campaign.name,
      status: 'DRAFT',
      costType: 'CPM', // Cost-per-thousand-impressions (LinkedIn default)
      objective: 'LEAD_GENERATION', // LinkedIn objective for lead gen
      // Optional: dailyBudget in cents (LinkedIn uses cents)
      ...(campaign.dailyBudget && {
        dailyBudget: {
          currencyCode: 'USD',
          amount: Math.round(campaign.dailyBudget * 100), // Convert to cents
        },
      }),
      ...(campaign.startDate && {
        startDate: Math.floor(campaign.startDate.getTime() / 1000), // Unix timestamp in seconds
      }),
      ...(campaign.endDate && {
        endDate: Math.floor(campaign.endDate.getTime() / 1000), // Unix timestamp in seconds
      }),
    };

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202405', // Latest stable version
      },
      body: JSON.stringify(campaignPayload),
    });

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      throw new Error(error.message ?? `LinkedIn API error: ${response.statusText}`);
    }

    const result = (await response.json()) as { id?: string };
    if (!result.id) {
      throw new Error('No campaign ID returned from LinkedIn API');
    }

    return {
      platformCampaignId: result.id,
      status: 'draft',
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
    if (!credentials.accessToken) {
      throw new Error('No valid LinkedIn credentials configured');
    }

    const apiEndpoint = `https://api.linkedin.com/rest/campaigns/${platformCampaignId}`;

    const response = await fetch(apiEndpoint, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202405',
      },
      body: JSON.stringify({
        patch: {
          $set: {
            status: 'PAUSED',
          },
        },
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      throw new Error(error.message ?? `LinkedIn API error: ${response.statusText}`);
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
    if (!credentials.accessToken) {
      throw new Error('No valid LinkedIn credentials configured');
    }

    const apiEndpoint = `https://api.linkedin.com/rest/campaigns/${platformCampaignId}`;

    const response = await fetch(apiEndpoint, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202405',
      },
      body: JSON.stringify({
        patch: {
          $set: {
            status: 'ACTIVE',
          },
        },
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      throw new Error(error.message ?? `LinkedIn API error: ${response.statusText}`);
    }
  }
}
