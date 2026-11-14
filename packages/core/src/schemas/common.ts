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
/** Anything but whitespace and URL structure characters, and never "." or "..". */
const ID_PATTERN = /^(?!\.{1,2}$)[^\s/\\?#%]+$/;

export const idSchema = (message = 'ID is required') =>
  z.preprocess(
    value => (typeof value === 'number' ? String(value) : value),
    z
      .string()
      .min(1, message)
      // No real ClickUp ID has these; they would change the endpoint path an ID
      // is placed in (see clickup-client/path.ts), so refuse them up front with
      // a clear message rather than relying only on encoding further down.
      .regex(ID_PATTERN, 'Not a ClickUp ID: IDs never contain spaces, /, \\, ?, # or %')
  );
