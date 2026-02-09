# Carrier Integration Service — API Reference

REST API for the Carrier Integration Service. Use this for rate shopping and health checks.

---

## Base URL

```text
http://localhost:3000
```

Default port can be overridden with the `PORT` environment variable.

---

## Endpoints

### 1. Health Check

**GET** `/health`

Check if the service is running.

**Response (200 OK):**

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

**Request body:** JSON with origin, destination, and packages.

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
  "serviceLevel": "GROUND"
}
```

`serviceLevel` is optional (e.g. `"GROUND"`, `"EXPRESS"`).

**Response (200 OK):**

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

**Response (4xx/5xx):**

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

| Parameter | Description |
|-----------|-------------|
| `carrier` | Carrier name (e.g. `UPS`, `ups`) |

**Request body:** Same as `POST /api/rates`.

**Response (200 OK):**
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

**Response (404 — carrier not configured):**

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
|-------------|------------|-------------|
| 400 | `INVALID_REQUEST` | Invalid request format or missing required fields |
| 401 | `AUTH_FAILED` | OAuth authentication failed |
| 429 | `RATE_LIMITED` | API rate limit exceeded |
| 502 | `MALFORMED_RESPONSE`, `NETWORK_ERROR`, `TIMEOUT` | Carrier API or network issues |
| 503 | `CARRIER_UNAVAILABLE` | Carrier service unavailable |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

Error response body:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "cause": "Optional cause message"
  }
}
```

---

## Testing Examples

### cURL

**Health check:**

```bash
curl http://localhost:3000/health
```

**Get rates (from file):**

```bash
curl -X POST http://localhost:3000/api/rates \
  -H "Content-Type: application/json" \
  -d @test-request.json
```

**Get rates (inline JSON):**

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

**Get rates for one carrier:**

```bash
curl -X POST http://localhost:3000/api/rates/UPS \
  -H "Content-Type: application/json" \
  -d @test-request.json
```

### JavaScript / TypeScript

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

### Postman / REST clients

1. Base URL: `http://localhost:3000`
2. For `POST /api/rates` and `POST /api/rates/:carrier`, use `Content-Type: application/json` and the same body as in the examples above (or use `test-request.json`).

---

## Environment Variables

**Mock mode (default):**

```bash
CARRIER_MODE=mock   # optional
PORT=3000           # optional
```

**Real mode (production):**

```bash
CARRIER_MODE=real
UPS_CLIENT_ID=your_client_id
UPS_CLIENT_SECRET=your_client_secret
# Optional:
UPS_BASE_URL=https://wwwcie.ups.com
UPS_SHIPPER_NUMBER=your_shipper_number
PORT=3000
```

See [README.md](./README.md#usage) for full details.
