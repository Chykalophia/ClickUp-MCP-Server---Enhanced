/**
 * Test Data Generator
 * 
 * Utilities for generating mock data for Phase 2.1 Unit Testing Suite
 * 
 * @version 4.1.0
 * @package @chykalophia/clickup-intelligence-mcp-server
 */

import { Task } from '../../services/task-analysis-service.js';

export interface MockTask {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: number;
  assignees: number[];
  timeEstimate: number;
  timeSpent: number;
  dateCreated: string;
  dateDue?: string;
  dateCompleted?: string;
  tags: string[];
  customFields: Record<string, any>;
}

export interface MockWorkspace {
  id: string;
  name: string;
  members: MockUser[];
  projects: MockProject[];
}

export interface MockUser {
  id: number;
  name: string;
  email: string;
  role: string;
  skills: string[];
  capacity: number;
}

export interface MockProject {
  id: string;
  name: string;
  status: string;
  tasks: MockTask[];
  startDate: string;
  endDate?: string;
}

/**
 * Test Data Generator Class
 */
export class TestDataGenerator {
  private static taskIdCounter = 1;
  private static userIdCounter = 1;
  private static projectIdCounter = 1;

  /**
   * Generate a mock task with realistic data
   */
  static generateMockTask(overrides: Partial<MockTask> = {}): MockTask {
    const id = `task_${this.taskIdCounter++}`;
    const baseDate = new Date('2025-09-01');
    
    return {
      id,
      name: `Test Task ${id}`,
      description: `Description for ${id}`,
      status: 'in progress',
      priority: Math.floor(Math.random() * 4) + 1,
      assignees: [this.userIdCounter],
      timeEstimate: (Math.floor(Math.random() * 16) + 1) * 3600000, // 1-16 hours in ms
      timeSpent: Math.floor(Math.random() * 8) * 3600000, // 0-8 hours in ms
      dateCreated: new Date(baseDate.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      dateDue: Math.random() > 0.5 ? new Date(baseDate.getTime() + Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      dateCompleted: Math.random() > 0.7 ? new Date().toISOString() : undefined,
      tags: ['test', 'mock'],
      customFields: {},
      ...overrides
    };
  }

  /**
   * Generate multiple mock tasks
   */
  static generateMockTasks(count: number, overrides: Partial<MockTask> = {}): MockTask[] {
    return Array.from({ length: count }, () => this.generateMockTask(overrides));
  }

  /**
   * Generate a mock user
   */
  static generateMockUser(overrides: Partial<MockUser> = {}): MockUser {
    const id = this.userIdCounter++;
    
    return {
      id,
      name: `Test User ${id}`,
      email: `user${id}@test.com`,
      role: 'developer',
      skills: ['javascript', 'typescript', 'react'],
      capacity: 40, // hours per week
      ...overrides
    };
  }

  /**
   * Generate multiple mock users
   */
  static generateMockUsers(count: number, overrides: Partial<MockUser> = {}): MockUser[] {
    return Array.from({ length: count }, () => this.generateMockUser(overrides));
  }

  /**
   * Generate a mock project
   */
  static generateMockProject(overrides: Partial<MockProject> = {}): MockProject {
    const id = `project_${this.projectIdCounter++}`;
    const baseDate = new Date('2025-09-01');
    
    return {
      id,
      name: `Test Project ${id}`,
      status: 'active',
      tasks: this.generateMockTasks(10),
      startDate: new Date(baseDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      ...overrides
    };
  }

  /**
   * Generate a mock workspace
   */
  static generateMockWorkspace(overrides: Partial<MockWorkspace> = {}): MockWorkspace {
    return {
      id: 'workspace_test',
      name: 'Test Workspace',
      members: this.generateMockUsers(5),
      projects: [this.generateMockProject()],
      ...overrides
    };
  }

  /**
   * Generate task analysis service compatible task
   */
  static generateAnalysisTask(overrides: Partial<Task> = {}): Task {
    const mockTask = this.generateMockTask();
    
    return {
      id: mockTask.id,
      name: mockTask.name,
      description: mockTask.description,
      timeEstimate: mockTask.timeEstimate,
      priority: mockTask.priority,
      ...overrides
    };
  }

  /**
   * Generate realistic sprint data
   */
  static generateSprintData(sprintLength: number = 14) {
    const tasks = this.generateMockTasks(20);
    const velocity = Math.floor(Math.random() * 50) + 30; // 30-80 story points
    const capacity = Math.floor(Math.random() * 200) + 160; // 160-360 hours
    
    return {
      tasks,
      velocity,
      capacity,
      sprintLength,
      teamSize: 5,
      historicalVelocity: Array.from({ length: 6 }, () => Math.floor(Math.random() * 20) + 40)
    };
  }

  /**
   * Reset all counters (useful for test isolation)
   */
  static resetCounters(): void {
    this.taskIdCounter = 1;
    this.userIdCounter = 1;
    this.projectIdCounter = 1;
  }
}
