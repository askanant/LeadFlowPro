import { IAdPlatformProvider } from './types';
import { MetaAdsPlatform } from './meta.provider';
import { GoogleAdsPlatform } from './google.provider';
import { LinkedInAdsPlatform } from './linkedin.provider';
import { MicrosoftAdsPlatform } from './microsoft.provider';
import { TaboolaAdsPlatform } from './taboola.provider';

const providers: Record<string, IAdPlatformProvider> = {
  meta: new MetaAdsPlatform(),
  google: new GoogleAdsPlatform(),
  linkedin: new LinkedInAdsPlatform(),
  microsoft: new MicrosoftAdsPlatform(),
  taboola: new TaboolaAdsPlatform(),
};

export function getAdPlatformProvider(platform: string): IAdPlatformProvider {
  const provider = providers[platform.toLowerCase()];
  if (!provider) {
    throw new Error(`Ad platform provider not found: ${platform}`);
  }
  return provider;
}

export type { IAdPlatformProvider, CampaignLaunchPayload, CampaignLaunchResult } from './types';
