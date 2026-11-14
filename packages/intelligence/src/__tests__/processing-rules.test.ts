import { addProcessingRuleSchema, evaluateRuleCondition } from '../tools/real-time-tools';

describe('clickup_add_processing_rule input', () => {
  const base = { id: 'r1', eventType: 'task_update' as const };
  const validCondition = { field: 'priority.priority', operator: 'equals', value: 'urgent' };

  it('rejects a JavaScript string as the condition', () => {
    expect(addProcessingRuleSchema.safeParse({ ...base, condition: 'process.exit(1)' }).success).toBe(false);
  });

  it('rejects a JavaScript string as the action', () => {
    const result = addProcessingRuleSchema.safeParse({
      ...base,
      condition: validCondition,
      action: "require('child_process').execSync('id')",
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown keys and a missing comparison value', () => {
    expect(addProcessingRuleSchema.safeParse({ ...base, condition: { ...validCondition, oprator: 'x' } }).success).toBe(false);
    expect(addProcessingRuleSchema.safeParse({ ...base, condition: { field: 'name', operator: 'equals' } }).success).toBe(false);
    expect(addProcessingRuleSchema.safeParse({ ...base, condition: { field: 'name', operator: 'exists' } }).success).toBe(true);
  });

  it('defaults the action to a log line', () => {
    const parsed = addProcessingRuleSchema.parse({ id: 'r1', eventType: 'task_update' });
    expect(parsed.action).toEqual({ type: 'log' });
    expect(parsed.priority).toBe(1);
  });
});

describe('evaluateRuleCondition', () => {
  const data = { priority: { priority: 'urgent' }, tags: ['bug', 'ui'], name: 'Fix login' };

  it('fires on every event when there is no condition', () => {
    expect(evaluateRuleCondition(undefined, data)).toBe(true);
  });

  it('compares a nested field', () => {
    expect(evaluateRuleCondition({ field: 'priority.priority', operator: 'equals', value: 'urgent' }, data)).toBe(true);
    expect(evaluateRuleCondition({ field: 'priority.priority', operator: 'not_equals', value: 'urgent' }, data)).toBe(false);
  });

  it('checks containment in strings and arrays', () => {
    expect(evaluateRuleCondition({ field: 'name', operator: 'contains', value: 'login' }, data)).toBe(true);
    expect(evaluateRuleCondition({ field: 'tags', operator: 'contains', value: 'bug' }, data)).toBe(true);
    expect(evaluateRuleCondition({ field: 'tags', operator: 'contains', value: 'docs' }, data)).toBe(false);
  });

  it('treats missing paths as absent and ignores inherited properties', () => {
    expect(evaluateRuleCondition({ field: 'status.status', operator: 'exists' }, data)).toBe(false);
    expect(evaluateRuleCondition({ field: 'constructor', operator: 'exists' }, data)).toBe(false);
    expect(evaluateRuleCondition({ field: 'priority', operator: 'exists' }, data)).toBe(true);
  });
});
