import { z } from 'zod';

/** Same rule as the API's password DTOs. */
export const passwordRule = z
  .string()
  .min(10, 'At least 10 characters')
  .regex(/[A-Za-z]/, 'Include a letter')
  .regex(/\d/, 'Include a number');

/** Rupee amount typed in a form; converted to paise before sending. */
export const rupeeField = z.coerce
  .number({ invalid_type_error: 'Enter an amount' })
  .min(0, 'Must be 0 or more');

export const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PAN = /^[A-Z]{5}\d{4}[A-Z]$/;
export const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
