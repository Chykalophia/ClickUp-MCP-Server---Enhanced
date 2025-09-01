/**
 * Test Data Generator for Intelligence Package Testing
 * Provides consistent mock data for all test suites
 */

export interface MockTask {
  id: string;
  name: string;
  status: string;
  priority: number;
  assignees: string[];
  due_date?: string;
  created_date: string;
  completed_date?: string;
  time_estimate?: number;
  time_spent?: number;
  tags?: string[];
  custom_fields?: any[];
}

export interface MockUser {
  id: string;
  username: string;
  email: string;
  role: string;
  availability?: number;
  skills?: string[];
  capacity?: number;
}

export class TestDataGenerator {
  static generateMockTasks(count: number = 5): MockTask[] {
    const tasks: MockTask[] = [];
    const statuses = ['pending', 'in progress', 'completed', 'blocked'];
    const priorities = [1, 2, 3, 4];
    
    for (let i = 0; i < count; i++) {
      tasks.push({
        id: `task_${i + 1}`,
        name: `Test Task ${i + 1}`,
        status: statuses[i % statuses.length],
        priority: priorities[i % priorities.length],
        assignees: [`user_${(i % 3) + 1}`],
        created_date: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
        due_date: new Date(Date.now() + ((i + 1) * 24 * 60 * 60 * 1000)).toISOString(),
        time_estimate: (i + 1) * 3600000, // hours in milliseconds
        time_spent: i * 1800000, // half the estimate
        tags: [`tag_${i % 3}`, 'test'],
        custom_fields: []
      });
    }
    
    return tasks;
  }

  static generateMockUsers(count: number = 3): MockUser[] {
    const users: MockUser[] = [];
    const roles = ['developer', 'designer', 'manager'];
    const skills = [
      ['javascript', 'react', 'node.js'],
      ['figma', 'sketch', 'ui/ux'],
      ['project-management', 'strategy', 'leadership']
    ];
    
    for (let i = 0; i < count; i++) {
      users.push({
        id: `user_${i + 1}`,
        username: `testuser${i + 1}`,
        email: `user${i + 1}@test.com`,
        role: roles[i % roles.length],
        availability: 0.8 + (i * 0.1), // 80-100% availability
        skills: skills[i % skills.length],
        capacity: 40 - (i * 5) // 40, 35, 30 hours per week
      });
    }
    
    return users;
  }

  static generateOverdueTasks(count: number = 2): MockTask[] {
    const tasks = this.generateMockTasks(count);
    return tasks.map(task => ({
      ...task,
      due_date: new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString(), // Yesterday
      status: 'in progress'
    }));
  }

  static generateHealthyTasks(count: number = 3): MockTask[] {
    const tasks = this.generateMockTasks(count);
    return tasks.map(task => ({
      ...task,
      status: 'completed',
      completed_date: new Date().toISOString(),
      time_spent: task.time_estimate || 3600000
    }));
  }

  static generateUnavailableUsers(count: number = 2): MockUser[] {
    const users = this.generateMockUsers(count);
    return users.map(user => ({
      ...user,
      availability: 0, // No availability
      capacity: 0
    }));
  }

  static generateComplexTask(): MockTask {
    return {
      id: 'complex_task_1',
      name: 'Build Advanced API Integration System',
      status: 'pending',
      priority: 4,
      assignees: ['user_1', 'user_2'],
      created_date: new Date().toISOString(),
      due_date: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000)).toISOString(),
      time_estimate: 80 * 3600000, // 80 hours
      time_spent: 0,
      tags: ['backend', 'api', 'integration', 'complex'],
      custom_fields: [
        { id: 'complexity', value: 'high' },
        { id: 'risk_level', value: 'medium' }
      ]
    };
  }

  static generateSimpleTask(): MockTask {
    return {
      id: 'simple_task_1',
      name: 'Update documentation',
      status: 'pending',
      priority: 1,
      assignees: ['user_1'],
      created_date: new Date().toISOString(),
      due_date: new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)).toISOString(),
      time_estimate: 2 * 3600000, // 2 hours
      time_spent: 0,
      tags: ['documentation', 'simple'],
      custom_fields: []
    };
  }

  static generateWorkflowData() {
    return {
      tasks: this.generateMockTasks(10),
      users: this.generateMockUsers(5),
      timeframe: {
        start: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString(),
        end: new Date().toISOString()
      }
    };
  }
}
