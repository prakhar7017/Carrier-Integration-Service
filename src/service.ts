/**
 * Carrier Integration Service - Facade providing clean public API
 */

import { RateRequest, RateQuote } from './domain/types';
import { RateRequestSchema } from './domain/validation';
import { ErrorCode, CarrierIntegrationError } from './domain/errors';
import { Carrier } from './carriers/carrier';

export interface CarrierServiceConfig {
  carriers: Carrier[];
}

/**
 * Main service facade - provides carrier-agnostic API
 */
export class CarrierIntegrationService {
  constructor(private readonly config: CarrierServiceConfig) {
    if (!config.carriers || config.carriers.length === 0) {
      throw new Error('At least one carrier must be configured');
    }
  }

  /**
   * Get rate quotes from all configured carriers
   */
  async getRates(request: RateRequest): Promise<RateQuote[]> {
    // Validate input
    const validationResult = RateRequestSchema.safeParse(request);
    console.log('Validation result:', validationResult);
    if (!validationResult.success) {
      throw new CarrierIntegrationError(
        ErrorCode.INVALID_REQUEST,
        `Invalid rate request: ${validationResult.error.message}`,
        validationResult.error
      );
    }

    // Request rates from all carriers in parallel
    const carrierPromises = this.config.carriers.map((carrier) =>
      carrier
        .getRates(request)
        .then((quotes) => ({ carrier: carrier.getName(), quotes }))
        .catch((error) => {
          // Log error but don't fail entire request if one carrier fails
          console.error(`Carrier ${carrier.getName()} failed:`, error);
          return { carrier: carrier.getName(), quotes: [] as RateQuote[] };
        })
    );
    console.log('Carrier promises:', carrierPromises);

    const results = await Promise.all(carrierPromises);
    console.log('Results:', results);
    // Flatten all quotes into a single array
    const quotes = results.flatMap((result) => result.quotes);
    console.log('Quotes:', quotes);
    return quotes;
  }

  /**
   * Get rate quotes from a specific carrier
   */
  async getRatesFromCarrier(
    carrierName: string,
    request: RateRequest
  ): Promise<RateQuote[]> {
    const validationResult = RateRequestSchema.safeParse(request);
    if (!validationResult.success) {
      throw new CarrierIntegrationError(
        ErrorCode.INVALID_REQUEST,
        `Invalid rate request: ${validationResult.error.message}`,
        validationResult.error
      );
    }

    const carrier = this.config.carriers.find(
      (c) => c.getName().toUpperCase() === carrierName.toUpperCase()
    );

    if (!carrier) {
      throw new CarrierIntegrationError(
        ErrorCode.CARRIER_UNAVAILABLE,
        `Carrier '${carrierName}' is not configured`
      );
    }

    return carrier.getRates(request);
  }
}
