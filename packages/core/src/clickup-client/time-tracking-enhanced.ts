import { ClickUpClient } from './index.js';
import axios from 'axios';

// ========================================
// TIME TRACKING TYPE DEFINITIONS
// ========================================

export interface TimeEntryTag {
  name: string;
  tag_fg?: string;
  tag_bg?: string;
  creator?: number;
}

export interface CreateTimeEntryParams {
  description: string;
  start: number; // Unix timestamp in milliseconds
  billable: boolean;
  end?: number; // Unix timestamp in milliseconds
  task_id?: string;
  assignee?: number;
  tags?: TimeEntryTag[];
}

export interface UpdateTimeEntryParams {
  description?: string;
  start?: number;
  end?: number;
  billable?: boolean;
  task_id?: string;
  tags?: TimeEntryTag[];
}

export interface GetTimeEntriesParams {
  start_date?: number;
  end_date?: number;
  assignee?: number;
  include_task_tags?: boolean;
  include_location_names?: boolean;
  space_id?: string;
  folder_id?: string;
  list_id?: string;
  task_id?: string;
}

export interface TimeEntry {
  id: string;
  task: {
    id: string;
    name: string;
    status: {
      status: string;
      color: string;
      type: string;
      orderindex: number;
    };
    custom_type: string | null;
  } | null;
  wid: string; // Workspace ID
  user: {
    id: number;
    username: string;
    email: string;
    color: string;
    initials: string;
    profilePicture: string;
  };
  billable: boolean;
  start: string; // Unix timestamp in milliseconds
  end: string | null; // Unix timestamp in milliseconds
  duration: string; // Duration in milliseconds
  description: string;
  tags: TimeEntryTag[];
  source: string; // "manual", "timer", etc.
  at: string; // Creation timestamp
}

export interface RunningTimer {
  id: string;
  task: {
    id: string;
    name: string;
  } | null;
  user: {
    id: number;
    username: string;
    email: string;
  };
  start: string;
  description: string;
  billable: boolean;
  tags: TimeEntryTag[];
}

export interface TimeSummary {
  total_duration: number;
  billable_duration: number;
  non_billable_duration: number;
  entries_count: number;
  by_user?: Record<string, {
    duration: number;
    billable_duration: number;
    entries_count: number;
  }>;
  by_task?: Record<string, {
    duration: number;
    billable_duration: number;
    entries_count: number;
  }>;
}

// ========================================
// ENHANCED TIME TRACKING CLIENT
// ========================================

export class EnhancedTimeTrackingClient {
  private client: ClickUpClient;

  constructor(client: ClickUpClient) {
    this.client = client;
  }

  private getAxiosInstance() {
    return this.client.getAxiosInstance();
  }

  // ========================================
  // TIME ENTRY MANAGEMENT
  // ========================================

  /**
   * Get time entries for a team with filtering options
   */
  async getTimeEntries(teamId: string, params: GetTimeEntriesParams = {}): Promise<TimeEntry[]> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.start_date) queryParams.append('start_date', params.start_date.toString());
      if (params.end_date) queryParams.append('end_date', params.end_date.toString());
      if (params.assignee) queryParams.append('assignee', params.assignee.toString());
      if (params.include_task_tags) queryParams.append('include_task_tags', 'true');
      if (params.include_location_names) queryParams.append('include_location_names', 'true');
      if (params.space_id) queryParams.append('space_id', params.space_id);
      if (params.folder_id) queryParams.append('folder_id', params.folder_id);
      if (params.list_id) queryParams.append('list_id', params.list_id);
      if (params.task_id) queryParams.append('task_id', params.task_id);

      const endpoint = `/team/${teamId}/time_entries?${queryParams.toString()}`;
      const response = await this.getAxiosInstance().get(endpoint);
      
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting time entries:', error);
      throw this.handleError(error, `Failed to get time entries for team ${teamId}`);
    }
  }

  /**
   * Create a new time entry
   */
  async createTimeEntry(teamId: string, params: CreateTimeEntryParams): Promise<TimeEntry> {
    try {
      const endpoint = `/team/${teamId}/time_entries`;
      const response = await this.getAxiosInstance().post(endpoint, params);
      
      return response.data.data;
    } catch (error) {
      console.error('Error creating time entry:', error);
      throw this.handleError(error, `Failed to create time entry for team ${teamId}`);
    }
  }

  /**
   * Update an existing time entry
   */
  async updateTimeEntry(teamId: string, timerId: string, params: UpdateTimeEntryParams): Promise<TimeEntry> {
    try {
      const endpoint = `/team/${teamId}/time_entries/${timerId}`;
      const response = await this.getAxiosInstance().put(endpoint, params);
      
      return response.data.data;
    } catch (error) {
      console.error('Error updating time entry:', error);
      throw this.handleError(error, `Failed to update time entry ${timerId} for team ${teamId}`);
    }
  }

  /**
   * Delete a time entry
   */
  async deleteTimeEntry(teamId: string, timerId: string): Promise<void> {
    try {
      const endpoint = `/team/${teamId}/time_entries/${timerId}`;
      await this.getAxiosInstance().delete(endpoint);
    } catch (error) {
      console.error('Error deleting time entry:', error);
      throw this.handleError(error, `Failed to delete time entry ${timerId} for team ${teamId}`);
    }
  }

  // ========================================
  // TIMER OPERATIONS
  // ========================================

  /**
   * Get currently running timers for a team
   */
  async getRunningTimers(teamId: string, assignee?: number): Promise<RunningTimer[]> {
    try {
      const queryParams = new URLSearchParams();
      if (assignee) queryParams.append('assignee', assignee.toString());

      const endpoint = `/team/${teamId}/time_entries/current?${queryParams.toString()}`;
      const response = await this.getAxiosInstance().get(endpoint);
      
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting running timers:', error);
      throw this.handleError(error, `Failed to get running timers for team ${teamId}`);
    }
  }

  /**
   * Start a timer for a time entry
   */
  async startTimer(teamId: string, timerId: string, startTime?: number): Promise<void> {
    try {
      const endpoint = `/team/${teamId}/time_entries/${timerId}/start`;
      const params = startTime ? { start: startTime } : {};
      
      await this.getAxiosInstance().post(endpoint, params);
    } catch (error) {
      console.error('Error starting timer:', error);
      throw this.handleError(error, `Failed to start timer ${timerId} for team ${teamId}`);
    }
  }

  /**
   * Stop a running timer
   */
  async stopTimer(teamId: string, timerId: string, endTime?: number): Promise<void> {
    try {
      const endpoint = `/team/${teamId}/time_entries/${timerId}/stop`;
      const params = endTime ? { end: endTime } : {};
      
      await this.getAxiosInstance().post(endpoint, params);
    } catch (error) {
      console.error('Error stopping timer:', error);
      throw this.handleError(error, `Failed to stop timer ${timerId} for team ${teamId}`);
    }
  }

  // ========================================
  // TIME ANALYTICS & REPORTING
  // ========================================

  /**
   * Get time summary and analytics
   */
  async getTimeSummary(teamId: string, params: GetTimeEntriesParams = {}): Promise<TimeSummary> {
    try {
      // Get time entries for the specified parameters
      const timeEntries = await this.getTimeEntries(teamId, params);
      
      // Calculate summary statistics
      let totalDuration = 0;
      let billableDuration = 0;
      let nonBillableDuration = 0;
      const byUser: Record<string, any> = {};
      const byTask: Record<string, any> = {};

      for (const entry of timeEntries) {
        const duration = parseInt(entry.duration, 10);
        totalDuration += duration;

        if (entry.billable) {
          billableDuration += duration;
        } else {
          nonBillableDuration += duration;
        }

        // Group by user
        const userId = entry.user.id.toString();
        if (!byUser[userId]) {
          byUser[userId] = {
            duration: 0,
            billable_duration: 0,
            entries_count: 0,
            user_info: entry.user
          };
        }
        byUser[userId].duration += duration;
        if (entry.billable) {
          byUser[userId].billable_duration += duration;
        }
        byUser[userId].entries_count++;

        // Group by task
        if (entry.task) {
          const taskId = entry.task.id;
          if (!byTask[taskId]) {
            byTask[taskId] = {
              duration: 0,
              billable_duration: 0,
              entries_count: 0,
              task_info: entry.task
            };
          }
          byTask[taskId].duration += duration;
          if (entry.billable) {
            byTask[taskId].billable_duration += duration;
          }
          byTask[taskId].entries_count++;
        }
      }

      return {
        total_duration: totalDuration,
        billable_duration: billableDuration,
        non_billable_duration: nonBillableDuration,
        entries_count: timeEntries.length,
        by_user: byUser,
        by_task: byTask
      };
    } catch (error) {
      console.error('Error getting time summary:', error);
      throw this.handleError(error, `Failed to get time summary for team ${teamId}`);
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Format duration from milliseconds to human-readable format
   */
  formatDuration(milliseconds: number, includeSeconds: boolean = true): string {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

    if (hours > 0) {
      return includeSeconds 
        ? `${hours}h ${minutes}m ${seconds}s`
        : `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return includeSeconds 
        ? `${minutes}m ${seconds}s`
        : `${minutes}m`;
    } 
    return includeSeconds ? `${seconds}s` : '0m';
    
  }

  /**
   * Convert duration to different time units
   */
  convertDuration(milliseconds: number, format: 'milliseconds' | 'seconds' | 'minutes' | 'hours'): number {
    switch (format) {
    case 'milliseconds':
      return milliseconds;
    case 'seconds':
      return Math.floor(milliseconds / 1000);
    case 'minutes':
      return Math.floor(milliseconds / (1000 * 60));
    case 'hours':
      return Math.floor(milliseconds / (1000 * 60 * 60));
    default:
      return milliseconds;
    }
  }

  /**
   * Validate time range (start must be before end)
   */
  validateTimeRange(start: number, end?: number): boolean {
    if (end === undefined) return true;
    return start < end;
  }

  /**
   * Get current Unix timestamp in milliseconds
   */
  getCurrentTimestamp(): number {
    return Date.now();
  }

  // ========================================
  // ERROR HANDLING
  // ========================================

  private handleError(error: any, context: string): Error {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      
      switch (status) {
      case 400:
        return new Error(`${context}: Invalid request - ${message}`);
      case 401:
        return new Error(`${context}: Authentication failed - check API token`);
      case 403:
        return new Error(`${context}: Permission denied - insufficient access rights`);
      case 404:
        return new Error(`${context}: Resource not found - ${message}`);
      case 429:
        return new Error(`${context}: Rate limit exceeded - please retry later`);
      case 500:
        return new Error(`${context}: Server error - please try again`);
      default:
        return new Error(`${context}: ${message}`);
      }
    }
    
    return new Error(`${context}: ${error.message || 'Unknown error'}`);
  }
}

export const createEnhancedTimeTrackingClient = (client: ClickUpClient): EnhancedTimeTrackingClient => {
  return new EnhancedTimeTrackingClient(client);
};
