/**
 * Carrier abstraction - Strategy pattern
 */

import { RateRequest, RateQuote } from '../domain/types';
import { CarrierIntegrationError } from '../domain/errors';

export interface Carrier {
  /**
   * Get carrier identifier (e.g., "UPS", "FEDEX")
   */
  getName(): string;

  /**
   * Get rate quotes for the given request
   */
  getRates(request: RateRequest): Promise<RateQuote[]>;
}
