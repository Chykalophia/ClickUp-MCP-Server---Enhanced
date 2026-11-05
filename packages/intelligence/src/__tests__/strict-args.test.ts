import { z } from 'zod';
import { closeJsonSchemaObjects, findUnknownKeys } from '../utils/strict-args';
import { taskDecompositionTool } from '../tools/task-decomposition-engine';

describe('findUnknownKeys', () => {
  const schema = z.object({
    task: z.object({ name: z.string(), description: z.string().optional() }),
    items: z.array(z.object({ id: z.string() })).optional(),
    options: z.object({ depth: z.number() }).prefault({ depth: 1 }),
    meta: z.record(z.string(), z.object({ v: z.number() })).optional(),
    loose: z.object({ a: z.string() }).passthrough().optional(),
  });

  it('accepts input that only uses declared keys', () => {
    expect(findUnknownKeys(schema, { task: { name: 'x', description: 'y' }, items: [{ id: '1' }] })).toEqual([]);
  });

  it('reports a misspelled nested key with its path', () => {
    expect(findUnknownKeys(schema, { task: { name: 'x', descripton: 'y' } })).toEqual(['task.descripton']);
  });

  it('walks arrays, defaults and record values', () => {
    expect(
      findUnknownKeys(schema, {
        task: { name: 'x' },
        items: [{ id: '1' }, { id: '2', extra: true }],
        options: { depth: 2, deep: 3 },
        meta: { k: { v: 1, w: 2 } },
      })
    ).toEqual(['items.1.extra', 'options.deep', 'meta.k.w']);
  });

  it('reports top-level unknown keys and leaves passthrough objects open', () => {
    expect(findUnknownKeys(schema, { task: { name: 'x' }, loose: { a: 'a', b: 'b' }, bogus: 1 })).toEqual(['bogus']);
  });

  it('catches a misspelled key in a real tool schema', () => {
    const args = { task: { id: 't1', name: 'Build it', descripton: 'typo' } };
    expect(findUnknownKeys(taskDecompositionTool.inputSchema as z.ZodType, args)).toContain('task.descripton');
  });
});

describe('findUnknownKeys edge cases', () => {
  it('checks nested keys declared on only one side of an object intersection', () => {
    const both = z.intersection(z.object({ config: z.object({ enabled: z.boolean() }) }), z.object({ name: z.string() }));
    expect(findUnknownKeys(both, { name: 'n', config: { enabeld: true } })).toEqual(['config.enabeld']);
  });

  it('lets a typed catchall on one side of an intersection accept extra keys', () => {
    const both = z.intersection(z.object({ a: z.string() }).catchall(z.object({ v: z.number() })), z.object({ b: z.string() }));
    expect(findUnknownKeys(both, { a: 'x', b: 'y', extra: { v: 1 } })).toEqual([]);
    expect(findUnknownKeys(both, { a: 'x', b: 'y', extra: { v: 1, w: 2 } })).toEqual(['extra.w']);
  });

  it('reports undeclared keys in .strict() objects at any depth', () => {
    const schema = z.object({ inner: z.object({ a: z.string() }).strict() }).strict();
    expect(findUnknownKeys(schema, { inner: { a: 'x', b: 1 }, top: 2 })).toEqual(['inner.b', 'top']);
  });

  it('checks values of a typed catchall but not of a passthrough object', () => {
    const typed = z.object({ a: z.string() }).catchall(z.object({ v: z.number() }));
    expect(findUnknownKeys(typed, { a: 'x', extra: { v: 1, w: 2 } })).toEqual(['extra.w']);
    expect(findUnknownKeys(z.object({}).passthrough(), { any: { thing: 1 } })).toEqual([]);
  });
});

describe('unions stay open', () => {
  const choice = z.object({
    pick: z.union([z.object({ kind: z.literal('a'), a: z.string() }), z.object({ kind: z.literal('b') })]),
  });

  it('does not flag keys inside union branches', () => {
    expect(findUnknownKeys(choice, { pick: { kind: 'a', a: 'x', extra: 1 } })).toEqual([]);
  });

  it('does not close union branches in the JSON Schema', () => {
    const json = z.toJSONSchema(choice, { io: 'input' }) as any;
    closeJsonSchemaObjects(json);
    expect(json.additionalProperties).toBe(false);
    for (const branch of json.properties.pick.anyOf) expect(branch.additionalProperties).toBeUndefined();
  });
});

describe('closeJsonSchemaObjects', () => {
  it('closes objects under a property named like a union keyword', () => {
    const json = z.toJSONSchema(z.object({ anyOf: z.object({ x: z.string() }) }), { io: 'input' }) as any;
    closeJsonSchemaObjects(json);
    expect(json.properties.anyOf.additionalProperties).toBe(false);
  });

  it('closes nested object schemas', () => {
    const json = z.toJSONSchema(z.object({ task: z.object({ name: z.string() }) }), { io: 'input' }) as any;
    closeJsonSchemaObjects(json);
    expect(json.additionalProperties).toBe(false);
    expect(json.properties.task.additionalProperties).toBe(false);
  });

  it('closes object intersections, which zod emits as one merged object', () => {
    const both = z.intersection(z.object({ a: z.string() }), z.object({ b: z.string() }));
    const json = z.toJSONSchema(z.object({ both }), { io: 'input' }) as any;
    closeJsonSchemaObjects(json);
    expect(json.properties.both.additionalProperties).toBe(false);
    // The runtime check agrees: keys from either side pass, others do not.
    expect(findUnknownKeys(z.object({ both }), { both: { a: 'x', b: 'y', c: 'z' } })).toEqual(['both.c']);
  });
});
