# Carrier Integration Service

A production-grade TypeScript service for integrating with shipping carrier APIs, starting with the UPS Rating API. Designed to be clean, maintainable, and easily extensible for future carriers and operations.

**Quick Start:** `npm install && npm run dev` — no credentials needed (runs in mock mode by default).

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Design Patterns Used](#design-patterns-used)
- [What Was NOT Implemented](#what-was-not-implemented-and-why)
- [Project Structure](#project-structure)
- [Usage](#usage)
- [Quick Start](#quick-start)
- [Testing](#testing)
- [Extending for New Carriers](#extending-for-new-carriers)
- [API Documentation](#running-the-api-server)
- [License](#license)

---

## Architecture Overview

This service uses a minimal, pragmatic architecture:

| Goal | Approach |
|------|----------|
| **Separation of concerns** | Domain models, carrier adapters, and HTTP are isolated |
| **Testability** | HTTP layer is abstracted and can be stubbed for integration tests |
| **Extensibility** | New carriers implement the `Carrier` interface |
| **Type safety** | Strong TypeScript types with runtime validation (Zod) |

---

## Design Patterns Used

### Strategy Pattern

The `Carrier` interface lets you swap carriers (UPS, FedEx, etc.) without changing client code. Each adapter implements its own request/response logic.

**Why?** Carriers have different APIs and formats. Strategy keeps each carrier’s complexity behind a single interface.

### Adapter Pattern

Each carrier adapter (e.g. `UPSAdapter`) maps domain models (`RateRequest`, `RateQuote`) to/from carrier-specific shapes (`UPSRateRequest`, `UPSRateResponse`).

**Why?** Callers never see carrier-specific types; only domain types.

### Facade Pattern

`CarrierIntegrationService` exposes a simple API and hides OAuth, HTTP, and carrier coordination.

**Why?** Clients don’t need to know about tokens, HTTP clients, or carrier configuration.

### Constructor-Based Dependency Injection

Dependencies (HTTP client, OAuth client, carriers) are injected via constructors. No DI framework.

**Why?** For this size, manual injection keeps things clear and testable without extra tooling.

---

## What Was NOT Implemented (And Why)

| Not implemented | Reason | Future option |
|-----------------|--------|----------------|
| **Retry logic** | Strategy depends on use case; better at HTTP/client layer | Configurable retry when needed |
| **Circuit breaker** | Adds complexity; add when instability is proven | Add if carrier APIs are unreliable |
| **Observability** | Depends on environment; use middleware when integrating | Structured logging, metrics |
| **Template method** | Carriers differ too much; separate implementations are clearer | — |
| **Event system** | Not needed for synchronous rate requests | Add if webhooks/async needed |
| **Plugin framework** | Carriers are known at build time | — |

---

## Project Structure

```text
src/
├── domain/                 # Domain models and validation
│   ├── types.ts            # RateRequest, RateQuote, Address, Package
│   ├── errors.ts           # ErrorCode, CarrierIntegrationError
│   └── validation.ts       # Zod schemas
├── http/
│   ├── client.ts           # HttpClient interface, NodeHttpClient
│   └── stub-client.ts      # Stub for tests and mock mode
├── auth/
│   ├── oauth.ts            # OAuth 2.0 client-credentials, token cache
│   └── oauth.unit.test.ts
├── carriers/
│   ├── carrier.ts          # Carrier interface
│   └── ups/
│       ├── adapter.ts      # UPS request/response mapping
│       └── types.ts        # UPS API types
├── __fixtures__/
│   ├── ups-responses.ts    # UPS API response fixtures
│   └── ups-mock-helper.ts  # OAuth + Rating mock setup
├── config.ts               # createUPSAdapter (env wiring)
├── service.ts              # CarrierIntegrationService facade
├── integration.test.ts     # End-to-end tests
├── server.ts               # Express API server
└── index.ts                # Public exports
```

---

## Usage

### Runtime Modes

Controlled by the `CARRIER_MODE` environment variable:

| Mode | Credentials | Behavior |
|------|-------------|----------|
| **Mock (default)** | Not required | Stubbed HTTP; full OAuth/transform flow still runs |
| **Real** | Required | Real UPS API calls |

### Environment Variables

**Mock mode (default):**

```bash
CARRIER_MODE=mock   # optional; default
PORT=3000          # optional
```

**Real mode (production):**

```bash
CARRIER_MODE=real
UPS_CLIENT_ID=your_client_id
UPS_CLIENT_SECRET=your_client_secret
# Optional:
UPS_SHIPPER_NUMBER=your_shipper_number
UPS_BASE_URL=https://wwwcie.ups.com
PORT=3000
```

Copy `.env.example` to `.env` and set values as needed.

### Programmatic usage

```typescript
import {
  CarrierIntegrationService,
  createUPSAdapter,
  NodeHttpClient,
} from './src';

const httpClient = new NodeHttpClient();
const upsAdapter = createUPSAdapter(httpClient);
const service = new CarrierIntegrationService({ carriers: [upsAdapter] });

const quotes = await service.getRates({
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
  packages: [{ weight: 5, dimensions: { length: 10, width: 8, height: 6 } }],
});
```

### OAuth token lifecycle

- **Acquisition** on first request  
- **Caching** with 60-second expiry buffer  
- **Refresh** on 401  
- **Concurrency** — single in-flight token request when multiple calls occur

### Error codes

| Code | Meaning |
|------|---------|
| `AUTH_FAILED` | OAuth failed |
| `RATE_LIMITED` | 429 from carrier |
| `INVALID_REQUEST` | Bad input or carrier error |
| `CARRIER_UNAVAILABLE` | 5xx from carrier |
| `MALFORMED_RESPONSE` | Invalid carrier response |
| `NETWORK_ERROR` | Network/connection error |
| `TIMEOUT` | Request timeout |

Errors are `CarrierIntegrationError` with a `cause` when available.

---

## Quick Start

```bash
npm install
npm run build
npm run dev
```

Server runs at `http://localhost:3000` in **mock mode** (no UPS credentials).

---

## Testing

Tests use **stubbed HTTP** only; no real UPS credentials.

- **Integration tests** (`src/integration.test.ts`): full stack Service → Carrier → OAuth → HTTP (stub).
- **Unit tests** (`src/auth/oauth.unit.test.ts`): OAuth client in isolation.

```bash
npm test
npm run test:coverage
npm run test:watch
```

Only the HTTP layer is stubbed; OAuth, adapters, and business logic are real.

---

## Extending for New Carriers

1. Implement the `Carrier` interface (e.g. `FedExAdapter` with `getName()` and `getRates()`).
2. Register the adapter when creating the service:

```typescript
const service = new CarrierIntegrationService({
  carriers: [upsAdapter, fedExAdapter],
});
```

The service aggregates quotes from all carriers and handles per-carrier failures without failing the whole request.

---

## Running the API Server

```bash
npm run dev    # development (ts-node)
# or
npm run build && npm start   # production
```

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/rates` | POST | Rates from all carriers |
| `/api/rates/:carrier` | POST | Rates from one carrier (e.g. `UPS`) |

Full request/response and error details: **[API.md](./API.md)**.

**Example:**

```bash
curl -X POST http://localhost:3000/api/rates \
  -H "Content-Type: application/json" \
  -d @test-request.json
```

---

## License

MIT
