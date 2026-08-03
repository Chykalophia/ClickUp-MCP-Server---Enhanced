import { z } from 'zod';

/**
 * Schema for a ClickUp identifier that tolerates AI clients emitting a numeric
 * JSON value for an ID (e.g. `workspace_id: 8420834`) while still rejecting
 * genuinely invalid input.
 *
 * Unlike `z.coerce.string()`, which stringifies *anything* (`null` -> "null",
 * objects -> "[object Object]") and lets it satisfy `.min(1)`, this only
 * converts an actual `number` to its string form and otherwise validates a
 * non-empty string — so `null`, `undefined`, booleans, arrays and objects are
 * rejected at the boundary. The exposed JSON schema stays `type: string`.
 */
export const idSchema = (message = 'ID is required'): z.ZodTypeAny =>
  z.preprocess(
    (value) => (typeof value === 'number' ? String(value) : value),
    z.string().min(1, message)
  );
