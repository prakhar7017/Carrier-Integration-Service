# Carrier Integration Service

A production-grade TypeScript service for integrating with shipping carrier APIs, starting with UPS Rating API. Designed to be clean, maintainable, and easily extensible for future carriers and operations.

**Quick Start:** `npm install && npm run dev` - No credentials needed! (Runs in mock mode by default)

## Architecture Overview

This service follows a minimal, pragmatic architecture that balances flexibility with simplicity. The design prioritizes:

- **Clean separation of concerns** - Domain models, carrier adapters, and HTTP concerns are isolated
- **Testability** - HTTP layer is abstracted and can be stubbed for integration tests
- **Extensibility** - New carriers can be added by implementing the `Carrier` interface
- **Type safety** - Strong TypeScript types with runtime validation using Zod

## Design Patterns Used

### Strategy Pattern
The `Carrier` interface allows different carriers (UPS, FedEx, etc.) to be swapped in and out without changing client code. Each carrier adapter implements its own request/response transformation logic.

**Why Strategy?** Carriers have fundamentally different APIs, request formats, and response structures. Strategy allows each carrier to encapsulate its own complexity while presenting a unified interface.

### Adapter Pattern
Each carrier adapter (e.g., `UPSAdapter`) transforms domain models (`RateRequest`, `RateQuote`) to/from carrier-specific formats (`UPSRateRequest`, `UPSRateResponse`).

**Why Adapter?** This isolates carrier-specific details from the rest of the system. The caller never sees UPS-specific types or structures.

### Facade Pattern
The `CarrierIntegrationService` provides a simple, clean public API that hides the complexity of OAuth, HTTP requests, and carrier coordination.

**Why Facade?** Clients shouldn't need to know about OAuth tokens, HTTP clients, or which carriers are configured. The facade provides a single entry point.

### Constructor-Based Dependency Injection
All dependencies (HTTP client, OAuth client, carrier adapters) are injected via constructors. No DI framework is used.

**Why Manual DI?** For a service of this size, a DI framework adds unnecessary complexity. Constructor injection provides the same benefits (testability, flexibility) without the overhead.

## What Was NOT Implemented (And Why)

### Retry Logic
**Not implemented:** Automatic retries for failed requests.

**Why:** Retry strategies vary significantly by use case (exponential backoff, circuit breakers, etc.). This should be implemented at the HTTP client level or as middleware when there's a clear requirement.

**Future improvement:** Add configurable retry policies when needed.

### Circuit Breaker Pattern
**Not implemented:** Circuit breaker to prevent cascading failures.

**Why:** Premature optimization. Circuit breakers add complexity and should only be added when there's evidence of cascading failures or when integrating with unreliable services.

**Future improvement:** Implement circuit breaker pattern if carrier APIs prove unreliable.

### Observability/Metrics
**Not implemented:** Structured logging, metrics collection, distributed tracing.

**Why:** Observability requirements vary by deployment environment. This should be added via middleware or decorators when integrating with monitoring systems.

**Future improvement:** Add structured logging and metrics hooks.

### Template Method Pattern
**Not implemented:** Abstract base class with template methods for carrier operations.

**Why:** Carriers differ too much in their API structures. A template method would require too many hooks and overrides, making it harder to understand than separate implementations.

### Event System
**Not implemented:** Event-driven architecture for carrier responses.

**Why:** Adds unnecessary complexity for synchronous rate requests. If async operations are needed later (e.g., webhooks), events can be added then.

### Plugin Framework
**Not implemented:** Dynamic plugin loading for carriers.

**Why:** Overengineering. Carriers are known at build time. Simple constructor injection is sufficient.

## Project Structure

```
src/
├── domain/              # Domain models and validation
│   ├── types.ts        # Carrier-agnostic types (RateRequest, RateQuote)
│   ├── errors.ts       # Structured error types
│   └── validation.ts   # Zod schemas for runtime validation
├── http/               # HTTP client abstraction
│   ├── client.ts       # HttpClient interface and NodeHttpClient
│   └── stub-client.ts  # Stub client for testing
├── auth/               # OAuth 2.0 authentication
│   ├── oauth.ts        # OAuth client with token caching
│   └── oauth.test.ts   # OAuth integration tests
├── carriers/           # Carrier implementations
│   ├── carrier.ts      # Carrier interface (Strategy)
│   └── ups/            # UPS adapter
│       ├── adapter.ts  # UPS request/response transformation
│       ├── adapter.test.ts  # UPS integration tests
│       └── types.ts    # UPS-specific types
├── config.ts           # Configuration helpers
├── service.ts          # Service facade
├── service.test.ts     # Service integration tests
└── index.ts            # Public API exports
```

## Usage

### Runtime Modes

The service supports two runtime modes controlled by the `CARRIER_MODE` environment variable:

#### Mock Mode (Default)
- **No credentials required** - Perfect for development and testing
- Uses stubbed HTTP responses that mirror real UPS API behavior
- Full execution flow still runs (OAuth, transformations, validations)
- Set `CARRIER_MODE=mock` or leave unset (defaults to mock)

#### Real Mode
- **Requires UPS credentials** - For production use
- Uses actual UPS API endpoints
- Set `CARRIER_MODE=real` and provide credentials

### Basic Setup

```typescript
import {
  CarrierIntegrationService,
  createUPSAdapter,
  NodeHttpClient,
} from './src';

// Create HTTP client
const httpClient = new NodeHttpClient();

// Create UPS adapter
// In mock mode: credentials optional
// In real mode: credentials required
const upsAdapter = createUPSAdapter(httpClient);

// Create service
const service = new CarrierIntegrationService({
  carriers: [upsAdapter],
});

// Get rates
const request = {
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
  packages: [
    {
      weight: 5,
      dimensions: {
        length: 10,
        width: 8,
        height: 6,
      },
    },
  ],
};

const quotes = await service.getRates(request);
```

### Environment Variables

**For Mock Mode (Default - No credentials needed):**
```bash
# Optional - defaults to mock if not set
CARRIER_MODE=mock
```

**For Real Mode (Production - Credentials required):**
```bash
CARRIER_MODE=real
UPS_CLIENT_ID=your_client_id
UPS_CLIENT_SECRET=your_client_secret
UPS_SHIPPER_NUMBER=your_shipper_number  # Optional
UPS_BASE_URL=https://wwwcie.ups.com  # Optional
```

Copy `.env.example` to `.env` and configure as needed.

## OAuth Token Management

The `OAuthClient` handles token lifecycle automatically:

- **Acquisition:** Fetches token on first request
- **Caching:** Reuses valid tokens (with 60-second expiry buffer)
- **Refresh:** Automatically refreshes on 401 responses
- **Concurrency:** Prevents duplicate token requests when multiple calls happen simultaneously

## Error Handling

The service returns structured errors with specific error codes:

- `AUTH_FAILED` - OAuth authentication failed
- `RATE_LIMITED` - API rate limit exceeded (429)
- `INVALID_REQUEST` - Invalid input or carrier API error
- `CARRIER_UNAVAILABLE` - Carrier API unavailable (5xx)
- `MALFORMED_RESPONSE` - Invalid response structure from carrier
- `NETWORK_ERROR` - Network communication error
- `TIMEOUT` - Request timeout

All errors extend `CarrierIntegrationError` and include the original error as `cause` when available.

## Quick Start

### Start the Server

```bash
# Install dependencies
npm install

# Build
npm run build

# Start server (mock mode - no credentials needed)
npm run dev
```

The server starts in **mock mode by default** - no UPS credentials required! It uses stubbed HTTP responses.

### Runtime Modes

- **Mock Mode (Default)**: No credentials needed, uses stubbed responses
- **Real Mode**: Requires UPS credentials, uses actual UPS API

Set `CARRIER_MODE=real` and provide credentials for production use. See [RUNTIME_MODES.md](./RUNTIME_MODES.md) for details.

## Testing

### No Real Credentials Required

All tests use **realistic UPS API mocks** - no real UPS credentials or API access needed. The HTTP layer is stubbed with responses that mirror actual UPS API behavior.

### Mock System Architecture

The test infrastructure (`src/__fixtures__/`) provides:

1. **Realistic UPS API Responses** (`ups-responses.ts`)
   - Based on official UPS Rating API documentation
   - Includes successful responses, error responses, and edge cases
   - OAuth token responses with proper expiry handling

2. **Mock Helpers** (`ups-mock-helper.ts`)
   - `UPSOAuthMock`: Simulates OAuth 2.0 client-credentials flow
   - `UPSRatingApiMock`: Simulates UPS Rating API endpoints
   - Handles token lifecycle (acquire, cache, refresh on expiry)
   - Supports error scenarios (401, 429, 5xx, malformed responses)

3. **Stub HTTP Client** (`http/stub-client.ts`)
   - Captures all HTTP requests for inspection
   - Returns configured responses based on URL patterns
   - Simulates network delays and timeouts
   - **Only the HTTP layer is stubbed** - all business logic is real

### Integration Tests

End-to-end integration tests (`src/integration.test.ts`) test the full flow: **Service → Carrier → OAuth → HTTP**. These tests:

- ✅ Test the complete request/response transformation chain
- ✅ Verify domain models → UPS API format → normalized quotes
- ✅ Test OAuth token lifecycle (acquire, reuse, refresh on expiry)
- ✅ Verify error propagation through all layers
- ✅ Use realistic API response fixtures based on UPS documentation
- ✅ Test real-world scenarios (multiple packages, concurrent requests, etc.)
- ✅ Verify structured error codes (AUTH_FAILED, RATE_LIMITED, etc.)

**Key Point:** Tests stub **only the HTTP layer**, not internal logic. The OAuth client, carrier adapters, and business logic are all real - ensuring tests verify actual integration behavior.

### Unit Tests

Component-level unit tests (`src/auth/oauth.unit.test.ts`) test OAuth client in isolation for focused testing of token management logic.

### Running Tests

```bash
# Run all tests (no environment variables needed)
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### How Mocks Work

1. **OAuth Token Flow:**
   - First request triggers OAuth token acquisition via stubbed HTTP client
   - Token is cached by the real OAuth client
   - Subsequent requests reuse cached token (verified by request capture)
   - On 401, token is refreshed automatically (real OAuth client behavior)

2. **Rating API Flow:**
   - Domain `RateRequest` is transformed to UPS API format (real adapter)
   - Stubbed HTTP client returns realistic UPS response
   - Response is parsed and normalized to `RateQuote[]` (real adapter)
   - Errors are transformed to structured `CarrierIntegrationError` (real error handling)

3. **Request Capture:**
   - All HTTP requests are captured for inspection
   - Tests verify request payloads, headers, and OAuth tokens
   - No mocking of internal logic - only HTTP responses are stubbed

## Extending for New Carriers

To add a new carrier (e.g., FedEx):

1. **Create carrier adapter:**

```typescript
import { Carrier } from '../carrier';
import { RateRequest, RateQuote } from '../../domain/types';

export class FedExAdapter implements Carrier {
  getName(): string {
    return 'FEDEX';
  }

  async getRates(request: RateRequest): Promise<RateQuote[]> {
    // Transform request to FedEx format
    // Make HTTP request
    // Transform response to RateQuote[]
  }
}
```

2. **Add to service:**

```typescript
const service = new CarrierIntegrationService({
  carriers: [upsAdapter, fedExAdapter],
});
```

That's it! The service automatically aggregates quotes from all carriers.

## Future Improvements

When requirements emerge, consider adding:

1. **Retry Logic** - Configurable retry policies for transient failures
2. **Circuit Breaker** - Prevent cascading failures when carriers are down
3. **Observability** - Structured logging, metrics, distributed tracing
4. **Caching** - Cache rate quotes for identical requests
5. **Rate Limiting** - Client-side rate limiting to respect carrier limits
6. **Additional Operations** - Label generation, tracking, address validation
7. **Additional Carriers** - FedEx, USPS, DHL adapters

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Start server (mock mode)
npm run dev
```

## Running the API Server

### Start the Server

```bash
# Development mode (with ts-node)
npm run dev

# Production mode (after building)
npm run build
npm start
```

The server will start on `http://localhost:3000` (or the port specified in `PORT` environment variable).

### API Endpoints

See [API.md](./API.md) for complete API documentation.

**Quick Start:**

1. **Health Check:**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Get Rates from All Carriers:**
   ```bash
   curl -X POST http://localhost:3000/api/rates \
     -H "Content-Type: application/json" \
     -d @test-request.json
   ```

3. **Get Rates from Specific Carrier:**
   ```bash
   curl -X POST http://localhost:3000/api/rates/UPS \
     -H "Content-Type: application/json" \
     -d @test-request.json
   ```

### Testing the API

For testing, you can use the provided `test-request.json` file or create your own requests. See [API.md](./API.md) for detailed examples and error codes.

## License

MIT
#   C a r r i e r - I n t e g r a t i o n - S e r v i c e  
 