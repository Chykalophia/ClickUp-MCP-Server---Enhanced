import {
  ALL_TOOLSETS,
  CORE_TOOLS,
  PROFILES,
  TOOLSETS,
  describeToolsets,
  isToolActive,
  resolveToolsets,
} from '../tools/toolsets';

describe('resolveToolsets', () => {
  it('defaults to core mode with no extra toolsets', () => {
    const resolved = resolveToolsets(undefined, undefined);
    expect(resolved.mode).toBe('core');
    expect(resolved.isAll).toBe(false);
    expect(resolved.enabled.size).toBe(0);
    expect(resolved.unknown).toEqual([]);
    expect(resolved.fellBack).toBe(false);
  });

  it.each(['', '   '])('treats %p as unset', value => {
    expect(resolveToolsets(value, undefined).enabled.size).toBe(0);
  });

  it.each(['all', 'ALL', 'tasks,all'])('enables everything for CLICKUP_TOOLSETS=%p', value => {
    const resolved = resolveToolsets(value, undefined);
    expect(resolved.isAll).toBe(true);
    expect(resolved.enabled.size).toBe(ALL_TOOLSETS.length);
  });

  it('enables everything for CLICKUP_TOOL_MODE=all', () => {
    expect(resolveToolsets(undefined, 'all').isAll).toBe(true);
    expect(resolveToolsets(undefined, ' All ').isAll).toBe(true);
  });

  it('adds the requested toolsets to core', () => {
    const resolved = resolveToolsets('tasks,comments', undefined);
    expect([...resolved.enabled].sort()).toEqual(['comments', 'tasks']);
    expect(resolved.isAll).toBe(false);
    expect(resolved.mode).toBe('core');
  });

  it('accepts spaces, mixed case, and underscores', () => {
    const resolved = resolveToolsets('  Tasks   Custom_Fields , TIME_TRACKING ', undefined);
    expect([...resolved.enabled].sort()).toEqual(['custom-fields', 'tasks', 'time-tracking']);
    expect(resolved.unknown).toEqual([]);
  });

  it('collects unknown names without dropping the valid ones', () => {
    const resolved = resolveToolsets('tasks,not-a-toolset', undefined);
    expect([...resolved.enabled]).toEqual(['tasks']);
    expect(resolved.unknown).toEqual(['not-a-toolset']);
    expect(resolved.fellBack).toBe(false);
  });

  it('falls back to core (not all) when nothing resolves', () => {
    const resolved = resolveToolsets('bogus,alsobogus', undefined);
    expect(resolved.isAll).toBe(false);
    expect(resolved.enabled.size).toBe(0);
    expect(resolved.fellBack).toBe(true);
    expect(resolved.unknown).toEqual(['bogus', 'alsobogus']);
  });

  it('reports isAll when every toolset is named explicitly', () => {
    expect(resolveToolsets(ALL_TOOLSETS.join(','), undefined).isAll).toBe(true);
  });

  it('ignores duplicates', () => {
    expect(resolveToolsets('tasks,tasks,tasks', undefined).enabled.size).toBe(1);
  });

  it.each(Object.entries(PROFILES))('expands profile %s', (profile, toolsets) => {
    expect([...resolveToolsets(profile, undefined).enabled].sort()).toEqual([...toolsets].sort());
  });

  it('expands the pm profile to the documented toolsets', () => {
    expect([...resolveToolsets('pm', undefined).enabled].sort()).toEqual(
      ['checklists', 'comments', 'custom-fields', 'dependencies', 'lists', 'tasks'].sort()
    );
  });

  it('narrows to exactly the named toolsets with CLICKUP_TOOL_MODE=all', () => {
    const resolved = resolveToolsets('goals', 'all');
    expect(resolved.legacyNarrow).toBe(true);
    expect([...resolved.enabled]).toEqual(['goals']);
  });

  it('reports an unknown mode and uses core', () => {
    const resolved = resolveToolsets(undefined, 'everything');
    expect(resolved.mode).toBe('core');
    expect(resolved.unknownMode).toBe('everything');
  });
});

describe('isToolActive', () => {
  const core = resolveToolsets(undefined, undefined);

  it('keeps core and catalog tools on in core mode', () => {
    expect(isToolActive('clickup_create_task', 'tasks', core)).toBe(true);
    expect(isToolActive('clickup_list_toolsets', 'catalog', core)).toBe(true);
    expect(isToolActive('clickup_delete_task', 'tasks', core)).toBe(false);
  });

  it('turns on whole toolsets named in CLICKUP_TOOLSETS', () => {
    const resolved = resolveToolsets('goals', undefined);
    expect(isToolActive('clickup_create_goal', 'goals', resolved)).toBe(true);
    expect(isToolActive('clickup_create_task', 'tasks', resolved)).toBe(true);
  });

  it('drops core extras in legacy narrow mode, but keeps the catalog', () => {
    const resolved = resolveToolsets('goals', 'all');
    expect(isToolActive('clickup_create_task', 'tasks', resolved)).toBe(false);
    expect(isToolActive('clickup_call_tool', 'catalog', resolved)).toBe(true);
  });
});

describe('describeToolsets', () => {
  it('names the lever when narrowed', () => {
    const summary = describeToolsets(resolveToolsets(undefined, undefined), {
      total: 160,
      enabled: 15,
    });
    expect(summary).toContain('15 of 160 tools');
    expect(summary).toContain('145 available on demand');
    expect(summary).toContain('CLICKUP_TOOL_MODE=all');
  });

  it('reports all mode', () => {
    expect(
      describeToolsets(resolveToolsets('all', undefined), { total: 160, enabled: 160 })
    ).toContain('all 160 tools');
  });
});

describe('toolset metadata', () => {
  it('gives every toolset a description and a unique flag', () => {
    for (const name of ALL_TOOLSETS) {
      expect(TOOLSETS[name].description.length).toBeGreaterThan(0);
      expect(typeof TOOLSETS[name].unique).toBe('boolean');
    }
  });

  it('marks the toolsets other ClickUp MCP servers lack as unique', () => {
    const unique = ALL_TOOLSETS.filter(name => TOOLSETS[name].unique).sort();
    expect(unique).toEqual(
      [
        'chat',
        'checklists',
        'dependencies',
        'goals',
        'spaces',
        'time-tracking',
        'views',
        'webhooks',
      ].sort()
    );
  });

  it('only maps profiles to real toolsets', () => {
    for (const toolsets of Object.values(PROFILES)) {
      for (const t of toolsets) expect(ALL_TOOLSETS).toContain(t);
    }
  });

  it('keeps the core list small', () => {
    expect(CORE_TOOLS.length).toBeLessThanOrEqual(16);
  });
});
