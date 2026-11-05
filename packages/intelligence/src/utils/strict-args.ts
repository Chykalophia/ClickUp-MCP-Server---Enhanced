import { z } from 'zod';

/**
 * Finds keys in `input` that `schema` does not declare, at any depth.
 *
 * zod's `.strict()` only applies to the object it is called on, so nested
 * objects strip unknown keys silently and a misspelled `task.descripton` would
 * pass. This walks the raw input next to the schema and returns the dot paths
 * of undeclared keys. Passthrough objects (catchall unknown/any) and unions are
 * left open, because which union branch matched is not known here. A typed
 * catchall checks its values, and an intersection of objects accepts keys
 * declared by either side.
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
      const left = objectDef(def.left);
      const right = objectDef(def.right);
      if (left && right) {
        // Two object sides: check each key against the side(s) that declare it.
        if (typeof input !== 'object' || Array.isArray(input)) return [];
        const found: string[] = [];
        for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
          const l = ownShapeEntry(left, key);
          const r = ownShapeEntry(right, key);
          const keyPath = [...path, key];
          if (l && r) found.push(...findUnknownKeys(z.intersection(l, r), value, keyPath));
          else if (l || r) found.push(...findUnknownKeys((l ?? r) as z.ZodType, value, keyPath));
          else if (isOpenCatchall(left) || isOpenCatchall(right)) continue;
          else {
            // Undeclared on both sides: a typed catchall still accepts it, checking the value.
            const typed = [left, right].find(side => side.catchall);
            if (typed) found.push(...findUnknownKeys(typed.catchall, value, keyPath));
            else found.push(keyPath.join('.'));
          }
        }
        return found;
      }
      // Otherwise a key is unknown only if neither side declares it.
      const rightUnknown = new Set(findUnknownKeys(def.right, input, path));
      return findUnknownKeys(def.left, input, path).filter(key => rightUnknown.has(key));
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
      const found: string[] = [];
      for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
        const declared = ownShapeEntry(def, key);
        if (declared) {
          found.push(...findUnknownKeys(declared, value, [...path, key]));
        } else if (def.catchall && !isOpenCatchall(def)) {
          // A typed catchall (e.g. .catchall(z.object(...))) still checks its values.
          found.push(...findUnknownKeys(def.catchall, value, [...path, key]));
        } else if (!def.catchall) {
          found.push([...path, key].join('.'));
        }
      }
      return found;
    }
    default:
      return [];
  }
}

/** The object def under any optional/default/nullable wrappers, if there is one. */
function objectDef(schema: z.ZodType): any {
  let def = (schema as any)._zod?.def;
  while (def && def.innerType) def = def.innerType._zod?.def;
  return def?.type === 'object' ? def : undefined;
}

function ownShapeEntry(def: any, key: string): z.ZodType | undefined {
  return Object.prototype.hasOwnProperty.call(def.shape, key) ? def.shape[key] : undefined;
}

/** True when undeclared keys are allowed through unchecked (passthrough, unknown, any). */
function isOpenCatchall(def: any): boolean {
  const type = def.catchall?._zod?.def?.type;
  return type !== undefined && type !== 'never' && (type === 'unknown' || type === 'any');
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
    // Only skip the keyword itself, not a property that happens to share its name.
    if ((key === 'anyOf' || key === 'oneOf' || key === 'allOf') && Array.isArray(value)) continue;
    closeJsonSchemaObjects(value);
  }
}
