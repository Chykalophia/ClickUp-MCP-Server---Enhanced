import { z } from 'zod';

/**
 * Finds keys in `input` that `schema` does not declare, at any depth.
 *
 * zod's `.strict()` only applies to the object it is called on, so nested
 * objects strip unknown keys silently and a misspelled `task.descripton` would
 * pass. This walks the raw input next to the schema and returns the dot paths
 * of undeclared keys. Objects that set a catchall (passthrough) are skipped, and
 * so are unions, because which branch matched is not known here. For an
 * intersection, a key is unknown only when neither side declares it.
 */
export function findUnknownKeys(schema: z.ZodType, input: unknown, path: string[] = []): string[] {
  if (input === null || input === undefined) return [];
  const def = (schema as any)._zod?.def;
  if (!def) return [];

  switch (def.type) {
    case 'optional':
    case 'nullable':
    case 'default':
    case 'prefault':
    case 'readonly':
    case 'catch':
    case 'nonoptional':
      return findUnknownKeys(def.innerType, input, path);
    case 'pipe':
      return findUnknownKeys(def.in, input, path);
    case 'intersection': {
      // A key is unknown only if neither side declares it.
      const right = new Set(findUnknownKeys(def.right, input, path));
      return findUnknownKeys(def.left, input, path).filter(key => right.has(key));
    }
    case 'array':
      if (!Array.isArray(input)) return [];
      return input.flatMap((item, i) => findUnknownKeys(def.element, item, [...path, String(i)]));
    case 'record':
      if (typeof input !== 'object' || Array.isArray(input)) return [];
      return Object.entries(input as Record<string, unknown>).flatMap(([k, v]) =>
        findUnknownKeys(def.valueType, v, [...path, k])
      );
    case 'object': {
      if (typeof input !== 'object' || Array.isArray(input)) return [];
      const shape = def.shape as Record<string, z.ZodType>;
      const catchall = def.catchall?._zod?.def?.type;
      const passthrough = catchall !== undefined && catchall !== 'never';
      const found: string[] = [];
      for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
        if (Object.prototype.hasOwnProperty.call(shape, key)) {
          found.push(...findUnknownKeys(shape[key], value, [...path, key]));
        } else if (!passthrough) {
          found.push([...path, key].join('.'));
        }
      }
      return found;
    }
    default:
      return [];
  }
}

/**
 * Sets `additionalProperties: false` on every object node of a JSON Schema
 * that declares `properties` and leaves `additionalProperties` unset, so the
 * advertised schema matches what `findUnknownKeys` enforces.
 */
export function closeJsonSchemaObjects(node: unknown): void {
  if (Array.isArray(node)) {
    node.forEach(closeJsonSchemaObjects);
    return;
  }
  if (!node || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  if (obj.type === 'object' && obj.properties && obj.additionalProperties === undefined) {
    obj.additionalProperties = false;
  }
  for (const [key, value] of Object.entries(obj)) {
    // Union branches are left open, matching findUnknownKeys. allOf branches are
    // left open too, since closing each would make it reject the other's keys.
    if (key === 'anyOf' || key === 'oneOf' || key === 'allOf') continue;
    closeJsonSchemaObjects(value);
  }
}
