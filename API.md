# Carrier Integration Service API Documentation

## Base URL

```
http://localhost:3000
```

## Endpoints

### 1. Health Check

**GET** `/health`

Check if the service is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-08T12:00:00.000Z"
}
```

**Example:**
```bash
curl http://localhost:3000/health
```

---

### 2. Get Rates from All Carriers

**POST** `/api/rates`

Get shipping rate quotes from all configured carriers.

**Request Body:**
```json
{
  "origin": {
    "street": ["123 Main Street"],
    "city": "New York",
    "stateOrProvince": "NY",
    "postalCode": "10001",
    "country": "US"
  },
  "destination": {
    "street": ["456 Oak Avenue"],
    "city": "Los Angeles",
    "stateOrProvince": "CA",
    "postalCode": "90001",
    "country": "US"
  },
  "packages": [
    {
      "weight": 5,
      "dimensions": {
        "length": 10,
        "width": 8,
        "height": 6
      }
    }
  ],
  "serviceLevel": "GROUND"  // Optional
}
```

**Response (Success):**
```json
{
  "success": true,
  "quotes": [
    {
      "carrier": "UPS",
      "serviceLevel": "03",
      "serviceName": "Ground",
      "totalCost": 25.50,
      "currency": "USD",
      "estimatedDays": 5,
      "carrierQuoteId": "03-1234567890"
    },
    {
      "carrier": "UPS",
      "serviceLevel": "01",
      "serviceName": "Next Day Air",
      "totalCost": 45.75,
      "currency": "USD",
      "estimatedDays": 1,
      "carrierQuoteId": "01-1234567890"
    }
  ],
  "count": 2
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid rate request: packages array must contain at least 1 element"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/rates \
  -H "Content-Type: application/json" \
  -d @test-request.json
```

---

### 3. Get Rates from Specific Carrier

**POST** `/api/rates/:carrier`

Get shipping rate quotes from a specific carrier.

**URL Parameters:**
- `carrier` - Carrier name (e.g., "UPS", "ups", "FedEx")

**Request Body:** Same as `/api/rates`

**Response (Success):**
```json
{
  "success": true,
  "carrier": "UPS",
  "quotes": [
    {
      "carrier": "UPS",
      "serviceLevel": "03",
      "serviceName": "Ground",
      "totalCost": 25.50,
      "currency": "USD",
      "estimatedDays": 5,
      "carrierQuoteId": "03-1234567890"
    }
  ],
  "count": 1
}
```

**Response (Error - Carrier Not Found):**
```json
{
  "success": false,
  "error": {
    "code": "CARRIER_UNAVAILABLE",
    "message": "Carrier 'FEDEX' is not configured"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/rates/UPS \
  -H "Content-Type: application/json" \
  -d @test-request.json
```

---

## Error Codes

| HTTP Status | Error Code | Description |
|------------|------------|-------------|
| 400 | `INVALID_REQUEST` | Invalid request format or missing required fields |
| 401 | `AUTH_FAILED` | OAuth authentication failed |
| 429 | `RATE_LIMITED` | API rate limit exceeded |
| 502 | `MALFORMED_RESPONSE`, `NETWORK_ERROR`, `TIMEOUT` | Carrier API issues |
| 503 | `CARRIER_UNAVAILABLE` | Carrier service unavailable |
| 500 | `INTERNAL_ERROR` | Internal server error |

---

## Testing Examples

### Using cURL

**Health Check:**
```bash
curl http://localhost:3000/health
```

**Get Rates (using file):**
```bash
curl -X POST http://localhost:3000/api/rates \
  -H "Content-Type: application/json" \
  -d @test-request.json
```

**Get Rates (inline JSON):**
```bash
curl -X POST http://localhost:3000/api/rates \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {
      "street": ["123 Main St"],
      "city": "New York",
      "stateOrProvince": "NY",
      "postalCode": "10001",
      "country": "US"
    },
    "destination": {
      "street": ["456 Oak Ave"],
      "city": "Los Angeles",
      "stateOrProvince": "CA",
      "postalCode": "90001",
      "country": "US"
    },
    "packages": [{"weight": 5}]
  }'
```

**Get Rates from Specific Carrier:**
```bash
curl -X POST http://localhost:3000/api/rates/UPS \
  -H "Content-Type: application/json" \
  -d @test-request.json
```

### Using JavaScript/TypeScript

```typescript
const response = await fetch('http://localhost:3000/api/rates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    origin: {
      street: ['123 Main St'],
      city: 'New York',
      stateOrProvince: 'NY',
      postalCode: '10001',
      country: 'US',
    },
    destination: {
      street: ['456 Oak Ave'],
      city: 'Los Angeles',
      stateOrProvince: 'CA',
      postalCode: '90001',
      country: 'US',
    },
    packages: [{ weight: 5 }],
  }),
});

const data = await response.json();
console.log(data);
```

### Using Postman

1. Import the collection (create a Postman collection with these endpoints)
2. Set the base URL to `http://localhost:3000`
3. Use the `test-request.json` file for request body
4. Send requests to test each endpoint

---

## Environment Variables

**For Mock Mode (Default - No credentials needed):**
```bash
CARRIER_MODE=mock  # Optional, defaults to mock
PORT=3000  # Optional, defaults to 3000
```

**For Real Mode (Production - Credentials required):**
```bash
CARRIER_MODE=real
UPS_CLIENT_ID=your_client_id
UPS_CLIENT_SECRET=your_client_secret
UPS_BASE_URL=https://wwwcie.ups.com  # Optional
UPS_SHIPPER_NUMBER=your_shipper_number  # Optional
PORT=3000  # Optional, defaults to 3000
```

See [RUNTIME_MODES.md](./RUNTIME_MODES.md) for complete runtime mode documentation.
