import {
  ALL_TOOLSETS,
  TOOLSETS,
  TOTAL_TOOL_COUNT,
  describeToolsets,
  resolveToolsets,
} from '../tools/toolsets';

describe('resolveToolsets', () => {
  it('enables everything when unset', () => {
    const resolved = resolveToolsets(undefined);
    expect(resolved.isAll).toBe(true);
    expect(resolved.enabled.size).toBe(ALL_TOOLSETS.length);
    expect(resolved.toolCount).toBe(TOTAL_TOOL_COUNT);
    expect(resolved.unknown).toEqual([]);
  });

  it.each(['', '   ', 'all', 'ALL'])('enables everything for %p', (value) => {
    expect(resolveToolsets(value).isAll).toBe(true);
  });

  it('enables only the requested toolsets', () => {
    const resolved = resolveToolsets('tasks,comments');
    expect([...resolved.enabled].sort()).toEqual(['comments', 'tasks']);
    expect(resolved.isAll).toBe(false);
    expect(resolved.toolCount).toBe(TOOLSETS.tasks.count + TOOLSETS.comments.count);
  });

  it('accepts spaces, mixed case, and underscores', () => {
    const resolved = resolveToolsets('  Tasks   Custom_Fields , TIME_TRACKING ');
    expect([...resolved.enabled].sort()).toEqual(['custom-fields', 'tasks', 'time-tracking']);
    expect(resolved.unknown).toEqual([]);
  });

  it('collects unknown names without dropping the valid ones', () => {
    const resolved = resolveToolsets('tasks,not-a-toolset');
    expect([...resolved.enabled]).toEqual(['tasks']);
    expect(resolved.unknown).toEqual(['not-a-toolset']);
  });

  it('falls back to every toolset when nothing resolves, rather than serving none', () => {
    const resolved = resolveToolsets('bogus,alsobogus');
    expect(resolved.isAll).toBe(true);
    expect(resolved.enabled.size).toBe(ALL_TOOLSETS.length);
    expect(resolved.unknown).toEqual(['bogus', 'alsobogus']);
  });

  it('reports isAll when every toolset is named explicitly', () => {
    expect(resolveToolsets(ALL_TOOLSETS.join(',')).isAll).toBe(true);
  });

  it('ignores duplicates', () => {
    const resolved = resolveToolsets('tasks,tasks,tasks');
    expect(resolved.enabled.size).toBe(1);
    expect(resolved.toolCount).toBe(TOOLSETS.tasks.count);
  });
});

describe('describeToolsets', () => {
  it('names the env var when everything is on, so the lever is discoverable', () => {
    const summary = describeToolsets(resolveToolsets('all'));
    expect(summary).toContain(`all ${TOTAL_TOOL_COUNT} tools`);
    expect(summary).toContain('CLICKUP_TOOLSETS');
  });

  it('reports the narrowed count and how many are withheld', () => {
    const resolved = resolveToolsets('tasks');
    const summary = describeToolsets(resolved);
    expect(summary).toContain(`~${TOOLSETS.tasks.count} of ${TOTAL_TOOL_COUNT} tools`);
    expect(summary).toContain(`${TOTAL_TOOL_COUNT - TOOLSETS.tasks.count} withheld`);
  });
});

describe('toolset metadata', () => {
  // The startup banner quotes these counts, so drift makes the server lie about
  // its own surface. index-enhanced.ts must register exactly these toolsets.
  it('totals the documented tool count', () => {
    const sum = ALL_TOOLSETS.reduce((acc, name) => acc + TOOLSETS[name].count, 0);
    expect(sum).toBe(TOTAL_TOOL_COUNT);
    expect(TOTAL_TOOL_COUNT).toBe(156);
  });

  it('gives every toolset a positive count and a description', () => {
    for (const name of ALL_TOOLSETS) {
      expect(TOOLSETS[name].count).toBeGreaterThan(0);
      expect(TOOLSETS[name].description.length).toBeGreaterThan(0);
    }
  });
});
