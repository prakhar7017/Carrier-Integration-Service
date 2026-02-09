/**
 * UPS adapter - transforms domain models to/from UPS API format
 */

import { Carrier } from '../carrier';
import { RateRequest, RateQuote, Address, Package } from '../../domain/types';
import { ErrorCode, CarrierIntegrationError } from '../../domain/errors';
import { HttpClient, HttpRequest } from '../../http/client';
import { OAuthClient } from '../../auth/oauth';
import { UPSRateRequest, UPSRateResponse } from './types';

export interface UPSConfig {
  baseUrl: string;
  oauthClient: OAuthClient;
  shipperNumber?: string;
}

/**
 * UPS Rating API adapter
 */
export class UPSAdapter implements Carrier {
  constructor(
    private readonly config: UPSConfig,
    private readonly httpClient: HttpClient
  ) {}

  getName(): string {
    return 'UPS';
  }

  async getRates(request: RateRequest): Promise<RateQuote[]> {
    const upsRequest = this.transformRequest(request);
    console.log('UPS request:', upsRequest);
    const accessToken = await this.config.oauthClient.getAccessToken();
    console.log('Access token:', accessToken);
    const httpRequest: HttpRequest = {
      url: `${this.config.baseUrl}/api/rating/v1/Rate`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        transId: this.generateTransactionId(),
        transactionSrc: 'carrier-integration-service',
      },
      body: upsRequest,
    };

    try {
      const response = await this.httpClient.request<UPSRateResponse>(
        httpRequest
      );

      // Handle HTTP-level errors
      if (response.status === 401) {
        // Token might be expired, clear it and retry once
        this.config.oauthClient.clearToken();
        const newToken = await this.config.oauthClient.getAccessToken();
        httpRequest.headers = httpRequest.headers || {};
        httpRequest.headers.Authorization = `Bearer ${newToken}`;
        const retryResponse = await this.httpClient.request<UPSRateResponse>(
          httpRequest
        );
        return this.transformResponse(retryResponse.body);
      }

      if (response.status === 429) {
        throw new CarrierIntegrationError(
          ErrorCode.RATE_LIMITED,
          'UPS API rate limit exceeded'
        );
      }

      if (response.status >= 500) {
        throw new CarrierIntegrationError(
          ErrorCode.CARRIER_UNAVAILABLE,
          `UPS API returned server error: ${response.status}`
        );
      }

      if (response.status !== 200) {
        throw new CarrierIntegrationError(
          ErrorCode.INVALID_REQUEST,
          `UPS API returned error status: ${response.status}`
        );
      }

      return this.transformResponse(response.body);
    } catch (error) {
      if (error instanceof CarrierIntegrationError) {
        throw error;
      }
      if (error instanceof Error && error.message === 'Request timeout') {
        throw new CarrierIntegrationError(
          ErrorCode.TIMEOUT,
          'UPS API request timed out',
          error
        );
      }
      throw new CarrierIntegrationError(
        ErrorCode.NETWORK_ERROR,
        'Network error communicating with UPS API',
        error as Error
      );
    }
  }

  /**
   * Transform domain RateRequest to UPS API format
   */
  private transformRequest(request: RateRequest): UPSRateRequest {
    return {
      RateRequest: {
        Request: {
          RequestOption: 'Rate',
        },
        Shipment: {
          Shipper: {
            ...(this.config.shipperNumber && {
              ShipperNumber: this.config.shipperNumber,
            }),
            Address: this.transformAddress(request.origin),
          },
          ShipTo: {
            Address: this.transformAddress(request.destination),
          },
          Package: request.packages.map((pkg) => ({
            PackagingType: {
              Code: '02', // Customer Supplied Package
            },
            ...(pkg.dimensions && {
              Dimensions: {
                UnitOfMeasurement: {
                  Code: 'IN',
                },
                Length: pkg.dimensions.length.toString(),
                Width: pkg.dimensions.width.toString(),
                Height: pkg.dimensions.height.toString(),
              },
            }),
            PackageWeight: {
              UnitOfMeasurement: {
                Code: 'LBS',
              },
              Weight: pkg.weight.toString(),
            },
          })),
        },
      },
    };
  }

  /**
   * Transform UPS API response to domain RateQuote[]
   */
  private transformResponse(response: UPSRateResponse): RateQuote[] {
    // Validate response structure
    if (!response.RateResponse) {
      throw new CarrierIntegrationError(
        ErrorCode.MALFORMED_RESPONSE,
        'UPS response missing RateResponse'
      );
    }

    const rateResponse = response.RateResponse;

    // Check for errors in response
    if (rateResponse.Response?.ResponseStatus?.Code !== '1') {
      const description =
        rateResponse.Response?.ResponseStatus?.Description ||
        rateResponse.Response?.Alert?.[0]?.Description ||
        'Unknown UPS error';
      throw new CarrierIntegrationError(
        ErrorCode.INVALID_REQUEST,
        `UPS API error: ${description}`
      );
    }

    if (!rateResponse.RatedShipment || rateResponse.RatedShipment.length === 0) {
      return [];
    }

    return rateResponse.RatedShipment.map((shipment) => {
      const serviceCode = shipment.Service?.Code || 'UNKNOWN';
      const serviceName = shipment.Service?.Description || 'Unknown Service';
      const totalCharges = shipment.TotalCharges || shipment.TransportationCharges;
      
      if (!totalCharges?.MonetaryValue) {
        throw new CarrierIntegrationError(
          ErrorCode.MALFORMED_RESPONSE,
          'UPS response missing charge information'
        );
      }

      const cost = parseFloat(totalCharges.MonetaryValue);
      if (isNaN(cost)) {
        throw new CarrierIntegrationError(
          ErrorCode.MALFORMED_RESPONSE,
          `Invalid cost value: ${totalCharges.MonetaryValue}`
        );
      }

      // Estimate delivery days from GuaranteedDelivery if available
      let estimatedDays: number | undefined;
      if (shipment.GuaranteedDelivery?.Date) {
        const deliveryDate = new Date(shipment.GuaranteedDelivery.Date);
        const now = new Date();
        const diffTime = deliveryDate.getTime() - now.getTime();
        estimatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (estimatedDays < 0) estimatedDays = undefined;
      }

      return {
        carrier: 'UPS',
        serviceLevel: serviceCode,
        serviceName,
        totalCost: cost,
        currency: totalCharges.CurrencyCode || 'USD',
        estimatedDays,
        carrierQuoteId: `${serviceCode}-${Date.now()}`,
      };
    });
  }

  /**
   * Transform domain Address to UPS Address format
   */
  private transformAddress(address: Address): {
    AddressLine?: string[];
    City: string;
    StateProvinceCode: string;
    PostalCode: string;
    CountryCode: string;
  } {
    return {
      ...(address.street.length > 0 && { AddressLine: address.street }),
      City: address.city,
      StateProvinceCode: address.stateOrProvince,
      PostalCode: address.postalCode,
      CountryCode: address.country,
    };
  }

  /**
   * Generate a unique transaction ID
   */
  private generateTransactionId(): string {
    return `TXN-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}
