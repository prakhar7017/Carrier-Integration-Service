/**
 * HTTP API Server for Carrier Integration Service
 * Exposes REST endpoints for rate shopping
 */

import express, { Request, Response, NextFunction } from 'express';
import { CarrierIntegrationService } from './service';
import { createUPSAdapter } from './config';
import { NodeHttpClient } from './http/client';
import { StubHttpClient } from './http/stub-client';
import { RateRequest } from './domain/types';
import { CarrierIntegrationError, ErrorCode } from './domain/errors';
import { setupUPSMocks } from './__fixtures__/ups-mock-helper';

const app = express();
app.use(express.json());

// Determine runtime mode (default: mock)
const CARRIER_MODE = (process.env.CARRIER_MODE || 'mock').toLowerCase();
const isMockMode = CARRIER_MODE === 'mock';

// Initialize service
let service: CarrierIntegrationService | null = null;

function initializeService(): void {
  let httpClient;
  let requireCredentials = true;

  if (isMockMode) {
    // Mock mode: Use stub HTTP client with UPS mocks
    httpClient = new StubHttpClient();
    setupUPSMocks(httpClient, {
      baseUrl: 'https://wwwcie.ups.com',
    });
    requireCredentials = false; // Don't require credentials in mock mode
    console.log('Running in MOCK mode - UPS API calls will be stubbed');
  } else {
    // Real mode: Use real HTTP client, require credentials
    httpClient = new NodeHttpClient();
    requireCredentials = true;
    console.log('Running in REAL mode - Using actual UPS API');
    
    // Validate credentials are present
    if (!process.env.UPS_CLIENT_ID || !process.env.UPS_CLIENT_SECRET) {
      throw new Error(
        'UPS_CLIENT_ID and UPS_CLIENT_SECRET environment variables are required when CARRIER_MODE=real'
      );
    }
  }

  const upsAdapter = createUPSAdapter(httpClient, undefined, requireCredentials);
  service = new CarrierIntegrationService({
    carriers: [upsAdapter],
  });
}

// Initialize on startup
try {
  initializeService();
} catch (error) {
  console.error('❌ Failed to initialize service:', error instanceof Error ? error.message : error);
  process.exit(1);
}

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /api/rates
 * Get rate quotes from all configured carriers
 * 
 * Request body:
 * {
 *   "origin": {
 *     "street": ["123 Main St"],
 *     "city": "New York",
 *     "stateOrProvince": "NY",
 *     "postalCode": "10001",
 *     "country": "US"
 *   },
 *   "destination": {
 *     "street": ["456 Oak Ave"],
 *     "city": "Los Angeles",
 *     "stateOrProvince": "CA",
 *     "postalCode": "90001",
 *     "country": "US"
 *   },
 *   "packages": [
 *     {
 *       "weight": 5,
 *       "dimensions": {
 *         "length": 10,
 *         "width": 8,
 *         "height": 6
 *       }
 *     }
 *   ],
 *   "serviceLevel": "GROUND" // Optional
 * }
 */
app.post('/api/rates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!service) {
      throw new Error('Service not initialized');
    }

    const rateRequest = req.body as RateRequest;
    const quotes = await service.getRates(rateRequest);

    res.json({
      success: true,
      quotes,
      count: quotes.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/rates/:carrier
 * Get rate quotes from a specific carrier
 * 
 * URL params:
 *   - carrier: Carrier name (e.g., "UPS", "ups")
 * 
 * Request body: Same as /api/rates
 */
app.post('/api/rates/:carrier', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!service) {
      throw new Error('Service not initialized');
    }

    const carrierName = req.params.carrier;
    const rateRequest = req.body as RateRequest;
    const quotes = await service.getRatesFromCarrier(carrierName, rateRequest);

    res.json({
      success: true,
      carrier: carrierName.toUpperCase(),
      quotes,
      count: quotes.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Error handling middleware
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof CarrierIntegrationError) {
    res.status(getHttpStatusForError(err.code)).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.cause && { cause: err.cause.message }),
      },
    });
  } else {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Internal server error',
      },
    });
  }
});

/**
 * Map error codes to HTTP status codes
 */
function getHttpStatusForError(code: ErrorCode): number {
  switch (code) {
    case ErrorCode.AUTH_FAILED:
      return 401;
    case ErrorCode.RATE_LIMITED:
      return 429;
    case ErrorCode.INVALID_REQUEST:
      return 400;
    case ErrorCode.CARRIER_UNAVAILABLE:
      return 503;
    case ErrorCode.MALFORMED_RESPONSE:
    case ErrorCode.NETWORK_ERROR:
    case ErrorCode.TIMEOUT:
      return 502;
    default:
      return 500;
  }
}

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Carrier Integration Service API running on http://localhost:${PORT}`);
    console.log(`📚 API Documentation:`);
    console.log(`   GET  /health - Health check`);
    console.log(`   POST /api/rates - Get rates from all carriers`);
    console.log(`   POST /api/rates/:carrier - Get rates from specific carrier`);
    console.log(`\n💡 Example: curl -X POST http://localhost:${PORT}/api/rates -H "Content-Type: application/json" -d @test-request.json`);
    console.log(`\n⚙️  Mode: ${isMockMode ? 'MOCK' : 'REAL'} (set CARRIER_MODE=real|mock to change)`);
  });
}

export default app;
