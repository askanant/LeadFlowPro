import { config } from '../../../config';
import { ExotelProvider } from './exotel.provider';
import { TwilioProvider } from './twilio.provider';
import type { ITelephonyProvider } from './types';
import { LoggerService } from '../../../shared/services/logger.service';

export type { AvailableNumber, ITelephonyProvider, ProvisionResult } from './types';

let _provider: ITelephonyProvider | null = null;

/** Returns a singleton provider instance based on TELEPHONY_PROVIDER env var. */
export function getTelephonyProvider(): ITelephonyProvider {
  if (_provider) return _provider;

  switch (config.TELEPHONY_PROVIDER) {
    case 'twilio':
      _provider = new TwilioProvider();
      break;
    case 'exotel':
    default:
      _provider = new ExotelProvider();
      break;
  }

  LoggerService.logInfo(`Telephony provider: ${_provider.name}`);
  return _provider;
}
