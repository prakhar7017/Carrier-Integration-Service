/**
 * Runtime validation schemas using Zod
 */

import { z } from 'zod';
import { Address, Package, RateRequest } from './types';

export const AddressSchema: z.ZodType<Address> = z.object({
  street: z.array(z.string().min(1)).min(1),
  city: z.string().min(1),
  stateOrProvince: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().length(2), // ISO country code
});

export const PackageSchema: z.ZodType<Package> = z.object({
  weight: z.number().positive(),
  dimensions: z
    .object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
});

export const RateRequestSchema: z.ZodType<RateRequest> = z.object({
  origin: AddressSchema,
  destination: AddressSchema,
  packages: z.array(PackageSchema).min(1),
  serviceLevel: z.string().optional(),
});
