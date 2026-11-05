import { SmartSprintPlanner } from '../../planners/smart-sprint-planner';

const task = (id: string) => ({ id, name: `Task ${id}`, status: 'open', priority: 3 });

describe('SmartSprintPlanner.calculateOptimalAllocations', () => {
  beforeAll(() => {
    process.env.CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN || 'test-token';
  });

  const allocate = (tasks: unknown[], members: unknown[]) =>
    (new SmartSprintPlanner() as any).calculateOptimalAllocations(tasks, members);

  it('returns no allocations instead of throwing when the team is empty', async () => {
    await expect(allocate([task('a')], [])).resolves.toEqual([]);
  });

  it("does not change the caller's team_members", async () => {
    const members = [{ user_id: 1, available_hours: 40, skills: [] }];
    const allocations = await allocate([task('a'), task('b')], members);
    expect(allocations).toHaveLength(2);
    expect(members[0].available_hours).toBe(40);
  });
});
