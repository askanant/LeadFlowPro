import { IAdPlatformProvider, CampaignLaunchPayload, CampaignLaunchResult } from './types';

export class MetaAdsPlatform implements IAdPlatformProvider {
  readonly name = 'meta';

  async launch(
    campaign: CampaignLaunchPayload,
    credentials: {
      accessToken?: string;
      accountId?: string;
      [key: string]: any;
    }
  ): Promise<CampaignLaunchResult> {
    if (!credentials.accessToken || !credentials.accountId) {
      throw new Error('No valid Meta credentials configured');
    }

    const url = `https://graph.facebook.com/v18.0/act_${credentials.accountId}/campaigns`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: campaign.name,
        objective: 'LEAD_GENERATION',
        status: 'ACTIVE',
        special_ad_categories: [],
        access_token: credentials.accessToken,
      }),
    });

    const result = (await response.json()) as { id?: string; error?: { message: string } };
    if (!response.ok || result.error) {
      throw new Error(result.error?.message ?? 'Meta API error');
    }

    // Subscribe webhook for lead delivery
    const webhookUrl = `https://graph.facebook.com/v18.0/${result.id}/subscribed_apps`;
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscribed_fields: ['leadgen'],
        access_token: credentials.accessToken,
      }),
    }).catch(() => {}); // Non-fatal

    return {
      platformCampaignId: result.id ?? '',
      status: 'active',
    };
  }

  async pause(
    platformCampaignId: string,
    credentials: { accessToken?: string; [key: string]: any }
  ): Promise<void> {
    if (!credentials.accessToken) {
      throw new Error('No valid Meta credentials configured');
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${platformCampaignId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PAUSED',
          access_token: credentials.accessToken,
        }),
      }
    );

    const result = (await response.json()) as { success?: boolean; error?: { message: string } };
    if (!response.ok || result.error) {
      throw new Error(result.error?.message ?? 'Meta API error');
    }
  }

  async resume(
    platformCampaignId: string,
    credentials: { accessToken?: string; [key: string]: any }
  ): Promise<void> {
    if (!credentials.accessToken) {
      throw new Error('No valid Meta credentials configured');
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${platformCampaignId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'ACTIVE',
          access_token: credentials.accessToken,
        }),
      }
    );

    const result = (await response.json()) as { success?: boolean; error?: { message: string } };
    if (!response.ok || result.error) {
      throw new Error(result.error?.message ?? 'Meta API error');
    }
  }
}
