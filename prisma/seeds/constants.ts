export const DEFAULT_PASSWORD = 'Seed@12345';

// Fixed IDs allow upsert-based idempotent seeding even though the field has
// autoincrement — explicit values override the sequence on first run.
export const SUBSCRIPTION_IDS = {
  BASIC: 1n,
  STANDARD: 2n,
  PREMIUM: 3n,
} as const;
