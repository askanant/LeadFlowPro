export interface AvailableNumber {
  number: string;
  providerSid: string;
  friendlyName?: string;
}

export interface ProvisionResult {
  providerSid: string;
  phoneNumber: string;
}

export interface ITelephonyProvider {
  readonly name: string;

  /**
   * List numbers available to assign.
   * Twilio: searches Twilio's available-numbers API.
   * Exotel: lists pre-purchased numbers in the account not yet in LeadFlow DB.
   */
  searchAvailableNumbers(opts?: { areaCode?: string }): Promise<AvailableNumber[]>;

  /**
   * Provision a number — configure webhooks and return provider SID.
   * Twilio: purchases the number.
   * Exotel: creates an App and assigns it to the pre-purchased number.
   */
  provisionNumber(opts: {
    number: string;
    providerSid?: string; // required for Exotel (pre-purchased), unused by Twilio
    tenantId: string;
    forwardTo: string;
  }): Promise<ProvisionResult>;
}
