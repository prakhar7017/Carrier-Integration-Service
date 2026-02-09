/**
 * UPS API-specific types (internal to UPS adapter)
 */

export interface UPSRateRequest {
  RateRequest: {
    Request: {
      RequestOption: string;
      TransactionReference?: {
        CustomerContext?: string;
      };
    };
    Shipment: {
      Shipper: {
        Name?: string;
        ShipperNumber?: string;
        Address: {
          AddressLine?: string[];
          City: string;
          StateProvinceCode: string;
          PostalCode: string;
          CountryCode: string;
        };
      };
      ShipTo: {
        Name?: string;
        Address: {
          AddressLine?: string[];
          City: string;
          StateProvinceCode: string;
          PostalCode: string;
          CountryCode: string;
        };
      };
      ShipFrom?: {
        Name?: string;
        Address: {
          AddressLine?: string[];
          City: string;
          StateProvinceCode: string;
          PostalCode: string;
          CountryCode: string;
        };
      };
      Package: Array<{
        PackagingType?: {
          Code: string;
          Description?: string;
        };
        Dimensions?: {
          UnitOfMeasurement: {
            Code: string;
            Description?: string;
          };
          Length: string;
          Width: string;
          Height: string;
        };
        PackageWeight: {
          UnitOfMeasurement: {
            Code: string;
            Description?: string;
          };
          Weight: string;
        };
      }>;
    };
  };
}

export interface UPSRateResponse {
  RateResponse?: {
    Response?: {
      ResponseStatus?: {
        Code?: string;
        Description?: string;
      };
      Alert?: Array<{
        Code?: string;
        Description?: string;
      }>;
      TransactionReference?: {
        CustomerContext?: string;
      };
    };
    RatedShipment?: Array<{
      Service?: {
        Code?: string;
        Description?: string;
      };
      RatedShipmentAlert?: Array<{
        Code?: string;
        Description?: string;
      }>;
      TransportationCharges?: {
        CurrencyCode?: string;
        MonetaryValue?: string;
      };
      TotalCharges?: {
        CurrencyCode?: string;
        MonetaryValue?: string;
      };
      GuaranteedDelivery?: {
        Date?: string;
        Time?: string;
      };
      ScheduledDeliveryTime?: string;
      RatedPackage?: Array<{
        TransportationCharges?: {
          CurrencyCode?: string;
          MonetaryValue?: string;
        };
        BaseServiceCharge?: {
          CurrencyCode?: string;
          MonetaryValue?: string;
        };
        ItemizedCharges?: Array<{
          Code?: string;
          Description?: string;
          MonetaryValue?: string;
        }>;
      }>;
    }>;
  };
}
