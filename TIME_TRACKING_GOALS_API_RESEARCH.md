# Time Tracking & Goals API Research & Implementation Design

**Task:** 2.1: Research Time Tracking & Goals APIs (868f9p5wc)  
**Date:** August 21, 2025  
**Status:** In Progress

## Executive Summary

Time Tracking and Goals represent critical productivity features in ClickUp that are currently **completely missing** from the MCP server implementation. This research analyzes the complete Time Tracking and Goals APIs to design a comprehensive implementation strategy for Phase 2.

## Current Implementation Gap

### ❌ Currently Missing (Complete Gap)
The ClickUp MCP server has **NO time tracking or goals functionality** implemented:
- No time entry creation or management
- No timer start/stop operations
- No time reporting or analytics
- No goals creation or tracking
- No goal progress monitoring

This represents a **critical functionality gap** as time tracking and goals are essential for:
- Project management and billing
- Productivity tracking and analytics
- Team performance monitoring
- Goal setting and achievement tracking
- Resource planning and allocation

## ClickUp Time Tracking API Analysis

### API Version & Base URL
- **API Version:** v2 (Time Tracking uses v2 endpoints)
- **Base URL:** `https://api.clickup.com/api/v2/`
- **Authentication:** Bearer token in Authorization header

### Time Tracking Hierarchy
```
Workspace/Team
├── Time Entries
│   ├── Manual Time Entries
│   ├── Timer-based Entries
│   └── Bulk Time Operations
├── Running Timers
│   ├── Start/Stop Operations
│   └── Current Timer Status
└── Time Reports
    ├── User Time Summaries
    ├── Task Time Aggregation
    └── Project Time Analytics
```

## Complete Time Tracking API Endpoints

### 1. Time Entry Management

#### 1.1 Get Time Entries
- **Endpoint:** `GET /team/{team_id}/time_entries`
- **Purpose:** Retrieve time entries with filtering and pagination
- **Parameters:**
  - `start_date` (optional) - Filter by start date (Unix timestamp)
  - `end_date` (optional) - Filter by end date (Unix timestamp)
  - `assignee` (optional) - Filter by user ID
  - `include_task_tags` (optional) - Include task tags in response
  - `include_location_names` (optional) - Include location names
  - `space_id` (optional) - Filter by space
  - `folder_id` (optional) - Filter by folder
  - `list_id` (optional) - Filter by list
  - `task_id` (optional) - Filter by task

#### 1.2 Create Time Entry
- **Endpoint:** `POST /team/{team_id}/time_entries`
- **Purpose:** Create a new time entry (manual or timer-based)
- **Required Fields:**
  - `description` - Time entry description
  - `start` - Start time (Unix timestamp in milliseconds)
  - `billable` - Whether time is billable (boolean)
- **Optional Fields:**
  - `end` - End time (Unix timestamp in milliseconds)
  - `task_id` - Associated task ID
  - `assignee` - User ID for the time entry
  - `tags` - Array of tag objects

#### 1.3 Update Time Entry
- **Endpoint:** `PUT /team/{team_id}/time_entries/{timer_id}`
- **Purpose:** Update existing time entry
- **Updatable Fields:**
  - `description` - Update description
  - `start` - Update start time
  - `end` - Update end time
  - `billable` - Update billable status
  - `task_id` - Change associated task
  - `tags` - Update tags

#### 1.4 Delete Time Entry
- **Endpoint:** `DELETE /team/{team_id}/time_entries/{timer_id}`
- **Purpose:** Delete a time entry
- **Response:** 204 No Content on success

### 2. Timer Operations

#### 2.1 Get Running Timers
- **Endpoint:** `GET /team/{team_id}/time_entries/current`
- **Purpose:** Get currently running timers for team members
- **Parameters:**
  - `assignee` (optional) - Filter by specific user

#### 2.2 Start Timer
- **Endpoint:** `POST /team/{team_id}/time_entries/{timer_id}/start`
- **Purpose:** Start a timer for a time entry
- **Parameters:**
  - `start` (optional) - Custom start time (defaults to current time)

#### 2.3 Stop Timer
- **Endpoint:** `POST /team/{team_id}/time_entries/{timer_id}/stop`
- **Purpose:** Stop a running timer
- **Parameters:**
  - `end` (optional) - Custom end time (defaults to current time)

### 3. Time Entry Data Structure

```typescript
interface TimeEntry {
  id: string;
  task: {
    id: string;
    name: string;
    status: TaskStatus;
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
  tags: Array<{
    name: string;
    tag_fg: string;
    tag_bg: string;
    creator: number;
  }>;
  source: string; // "manual", "timer", etc.
  at: string; // Creation timestamp
}
```

## ClickUp Goals API Analysis

### Goals Hierarchy
```
Workspace/Team
├── Goals
│   ├── Goal Types (Number, Currency, Task, etc.)
│   ├── Goal Targets & Milestones
│   └── Goal Progress Tracking
├── Goal Folders
│   └── Goal Organization
└── Goal Analytics
    ├── Progress Reports
    └── Achievement Metrics
```

## Complete Goals API Endpoints

### 1. Goal Management

#### 1.1 Get Goals
- **Endpoint:** `GET /team/{team_id}/goal`
- **Purpose:** Retrieve team goals
- **Parameters:**
  - `include_completed` (optional) - Include completed goals

#### 1.2 Create Goal
- **Endpoint:** `POST /team/{team_id}/goal`
- **Purpose:** Create a new goal
- **Required Fields:**
  - `name` - Goal name
  - `due_date` - Goal due date (Unix timestamp)
  - `description` - Goal description
  - `multiple_owners` - Allow multiple owners (boolean)
  - `owners` - Array of owner user IDs
  - `color` - Goal color (hex code)

#### 1.3 Update Goal
- **Endpoint:** `PUT /goal/{goal_id}`
- **Purpose:** Update existing goal
- **Updatable Fields:**
  - `name` - Update goal name
  - `due_date` - Update due date
  - `description` - Update description
  - `rem_owners` - Remove owners (array of user IDs)
  - `add_owners` - Add owners (array of user IDs)
  - `color` - Update color

#### 1.4 Delete Goal
- **Endpoint:** `DELETE /goal/{goal_id}`
- **Purpose:** Delete a goal
- **Response:** 204 No Content on success

### 2. Goal Targets Management

#### 2.1 Create Goal Target
- **Endpoint:** `POST /goal/{goal_id}/target`
- **Purpose:** Create a target for a goal
- **Target Types:**
  - **Number Target:** Numeric value tracking
  - **Currency Target:** Monetary value tracking
  - **Boolean Target:** True/false completion
  - **Task Target:** Task completion tracking
  - **List Target:** List completion tracking

#### 2.2 Update Goal Target
- **Endpoint:** `PUT /goal/{goal_id}/target/{target_id}`
- **Purpose:** Update goal target
- **Updatable Fields:**
  - `name` - Target name
  - `target_value` - Target value
  - `unit` - Unit of measurement

#### 2.3 Delete Goal Target
- **Endpoint:** `DELETE /goal/{goal_id}/target/{target_id}`
- **Purpose:** Delete a goal target

### 3. Goal Data Structure

```typescript
interface Goal {
  id: string;
  name: string;
  team_id: string;
  date_created: string;
  start_date: string | null;
  due_date: string;
  description: string;
  private: boolean;
  archived: boolean;
  creator: number;
  color: string;
  pretty_id: string;
  multiple_owners: boolean;
  folder_id: string | null;
  members: Array<{
    id: number;
    username: string;
    email: string;
    color: string;
    initials: string;
    profilePicture: string;
  }>;
  owners: Array<{
    id: number;
    username: string;
    email: string;
    color: string;
    initials: string;
    profilePicture: string;
  }>;
  key_results: GoalTarget[];
  percent_completed: number;
  history: GoalHistoryEntry[];
  pretty_url: string;
}

interface GoalTarget {
  id: string;
  goal_id: string;
  name: string;
  creator: number;
  type: 'number' | 'currency' | 'boolean' | 'task' | 'list';
  date_created: string;
  start_value: number;
  target_value: number;
  current_value: number;
  unit: string | null;
  task_statuses: string[] | null;
  list_ids: string[] | null;
  completed: boolean;
  percent_completed: number;
}
```

## Implementation Strategy

### Phase 2.1: Time Tracking Implementation (Priority: HIGH)

#### Tools to Implement (8 tools):
1. **`get_time_entries`** - Get time entries with filtering
2. **`create_time_entry`** - Create manual time entries
3. **`update_time_entry`** - Update existing time entries
4. **`delete_time_entry`** - Delete time entries
5. **`start_timer`** - Start timer for time tracking
6. **`stop_timer`** - Stop running timer
7. **`get_running_timers`** - Get currently running timers
8. **`get_time_summary`** - Get time summaries and reports

#### Technical Architecture:
- **Enhanced Client:** `src/clickup-client/time-tracking-enhanced.ts`
- **Validation Schemas:** `src/schemas/time-tracking-schemas.ts`
- **MCP Tools:** `src/tools/time-tracking-tools.ts`

### Phase 2.2: Goals Implementation (Priority: HIGH)

#### Tools to Implement (7 tools):
1. **`get_goals`** - Get team goals
2. **`create_goal`** - Create new goals
3. **`update_goal`** - Update existing goals
4. **`delete_goal`** - Delete goals
5. **`create_goal_target`** - Create goal targets/milestones
6. **`update_goal_target`** - Update goal targets
7. **`delete_goal_target`** - Delete goal targets

#### Technical Architecture:
- **Enhanced Client:** `src/clickup-client/goals-enhanced.ts`
- **Validation Schemas:** `src/schemas/goals-schemas.ts`
- **MCP Tools:** `src/tools/goals-tools.ts`

## Implementation Complexity Assessment

### Time Tracking Complexity: **MEDIUM**
- **API Complexity:** Moderate - well-documented endpoints
- **Data Structures:** Standard - straightforward time entry model
- **Timer Operations:** Medium - requires state management
- **Integration:** Low - minimal dependencies on other systems

### Goals Complexity: **MEDIUM-HIGH**
- **API Complexity:** Moderate - multiple goal types and targets
- **Data Structures:** Complex - nested targets and progress tracking
- **Business Logic:** High - progress calculation and target management
- **Integration:** Medium - may integrate with task completion

## Success Criteria

### Time Tracking Success Criteria:
- ✅ AI agents can create and manage time entries
- ✅ Timer start/stop functionality working
- ✅ Time reporting and analytics available
- ✅ Billable time management implemented
- ✅ Integration with task management

### Goals Success Criteria:
- ✅ AI agents can create and manage goals
- ✅ Goal targets and milestones supported
- ✅ Progress tracking and analytics working
- ✅ Multiple goal types implemented
- ✅ Team collaboration features enabled

## Next Steps

1. **Complete API Research** - Finalize endpoint analysis
2. **Design Enhanced Clients** - Architecture for time tracking and goals
3. **Implement Validation Schemas** - Zod schemas for all operations
4. **Develop MCP Tools** - Complete tool implementation
5. **Integration Testing** - Ensure compatibility with existing tools

## Estimated Implementation Effort

- **Time Tracking Implementation:** 2-3 development sessions
- **Goals Implementation:** 2-3 development sessions
- **Testing & Integration:** 1 development session
- **Total Phase 2 Effort:** 5-7 development sessions

**Research Status: 🔄 IN PROGRESS** - Comprehensive API analysis and architecture design underway.
