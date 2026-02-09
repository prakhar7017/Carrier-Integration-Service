/**
 * Domain models - carrier-agnostic types
 */

export interface Address {
  street: string[];
  city: string;
  stateOrProvince: string;
  postalCode: string;
  country: string;
}

export interface Package {
  weight: number; // in pounds
  dimensions?: {
    length: number; // in inches
    width: number;
    height: number;
  };
}

export interface RateRequest {
  origin: Address;
  destination: Address;
  packages: Package[];
  serviceLevel?: string; // e.g., "GROUND", "EXPRESS", "OVERNIGHT"
}

export interface RateQuote {
  carrier: string;
  serviceLevel: string;
  serviceName: string;
  totalCost: number; // in USD
  currency: string;
  estimatedDays?: number;
  carrierQuoteId?: string;
}
