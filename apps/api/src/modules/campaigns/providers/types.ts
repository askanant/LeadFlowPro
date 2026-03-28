export interface CampaignLaunchPayload {
  name: string;
  dailyBudget?: number;
  totalBudget?: number;
  leadTargetDaily?: number;
  targetingConfig?: any;
  startDate?: Date;
  endDate?: Date;
}

export interface CampaignLaunchResult {
  platformCampaignId: string;
  status: string;
}

export interface IAdPlatformProvider {
  readonly name: string;

  /**
   * Launch a campaign on the ad platform
   */
  launch(
    campaign: CampaignLaunchPayload,
    credentials: {
      accessToken?: string;
      refreshToken?: string;
      accountId?: string;
      appId?: string;
      appSecret?: string;
      extraConfig?: any;
    }
  ): Promise<CampaignLaunchResult>;

  /**
   * Pause a campaign on the ad platform
   */
  pause(
    platformCampaignId: string,
    credentials: {
      accessToken?: string;
      refreshToken?: string;
      accountId?: string;
      appId?: string;
      appSecret?: string;
      extraConfig?: any;
    }
  ): Promise<void>;

  /**
   * Resume a paused campaign on the ad platform
   */
  resume(
    platformCampaignId: string,
    credentials: {
      accessToken?: string;
      refreshToken?: string;
      accountId?: string;
      appId?: string;
      appSecret?: string;
      extraConfig?: any;
    }
  ): Promise<void>;
}
