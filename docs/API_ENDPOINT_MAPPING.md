# ClickUp API Endpoint Mapping & Implementation Guide

**Document Version:** 1.0  
**Date:** August 21, 2025  
**Research Task:** 868f9p3ee  
**Project:** ClickUp MCP Server - Enhanced Enhancement (868f9p3bg)

## Current Implementation Status

### ✅ IMPLEMENTED (36 endpoints)

#### Authentication & Workspaces
- `GET /user` → `get_workspaces` (via auth client)
- `GET /team/{team_id}/seat` → `get_workspace_seats`

#### Tasks
- `GET /list/{list_id}/task` → `get_tasks`
- `GET /task/{task_id}` → `get_task_details`
- `POST /list/{list_id}/task` → `create_task`
- `PUT /task/{task_id}` → `update_task`
- `POST /list/{list_id}/task/{task_id}` → `add_task_to_list`
- `DELETE /list/{list_id}/task/{task_id}` → `remove_task_from_list`

#### Lists
- `GET /folder/{folder_id}/list` → `get_lists` (folder)
- `GET /space/{space_id}/list` → `get_lists` (space) + `get_folderless_lists`
- `GET /list/{list_id}` → `get_list`
- `POST /folder/{folder_id}/list` → `create_list` (folder)
- `POST /space/{space_id}/list` → `create_list` (space) + `create_folderless_list`
- `PUT /list/{list_id}` → `update_list`
- `DELETE /list/{list_id}` → `delete_list`

#### Folders
- `POST /space/{space_id}/folder` → `create_folder`
- `PUT /folder/{folder_id}` → `update_folder`
- `DELETE /folder/{folder_id}` → `delete_folder`

#### Spaces
- `GET /team/{team_id}/space` → `get_spaces`
- `GET /space/{space_id}` → `get_space`

#### Templates (Limited)
- `POST /folder/{folder_id}/list` (with template_id) → `create_list_from_template_in_folder`
- `POST /space/{space_id}/list` (with template_id) → `create_list_from_template_in_space`

#### Checklists
- `POST /task/{task_id}/checklist` → `create_checklist`
- `PUT /checklist/{checklist_id}` → `update_checklist`
- `DELETE /checklist/{checklist_id}` → `delete_checklist`
- `POST /checklist/{checklist_id}/checklist_item` → `create_checklist_item`
- `PUT /checklist/{checklist_id}/checklist_item/{checklist_item_id}` → `update_checklist_item`
- `DELETE /checklist/{checklist_id}/checklist_item/{checklist_item_id}` → `delete_checklist_item`

#### Comments
- `GET /task/{task_id}/comment` → `get_task_comments`
- `POST /task/{task_id}/comment` → `create_task_comment`
- `GET /view/{view_id}/comment` → `get_chat_view_comments`
- `POST /view/{view_id}/comment` → `create_chat_view_comment`
- `GET /list/{list_id}/comment` → `get_list_comments`
- `POST /list/{list_id}/comment` → `create_list_comment`
- `PUT /comment/{comment_id}` → `update_comment`
- `DELETE /comment/{comment_id}` → `delete_comment`
- `GET /comment/{comment_id}/reply` → `get_threaded_comments`
- `POST /comment/{comment_id}/reply` → `create_threaded_comment`

#### Documents (READ ONLY)
- `GET /team/{team_id}/doc` → `get_docs_from_workspace`
- `GET /doc/{doc_id}` → `get_doc_content`
- `GET /doc/{doc_id}/page` → `get_doc_pages`
- `GET /team/{team_id}/doc/search` → `search_docs`

---

## 🔴 PHASE 1: CRITICAL MISSING ENDPOINTS

### Document Management (WRITE OPERATIONS)
**Priority:** URGENT | **Complexity:** Medium | **New Tools:** 8

#### Document CRUD
```
POST /doc
├── Tool: create_doc
├── Parameters: workspace_id, name, parent_id?, content?
└── Response: Document object

PUT /doc/{doc_id}
├── Tool: update_doc
├── Parameters: doc_id, name?, sharing?
└── Response: Updated document

DELETE /doc/{doc_id}
├── Tool: delete_doc
├── Parameters: doc_id
└── Response: Success confirmation
```

#### Document Pages
```
POST /doc/{doc_id}/page
├── Tool: create_doc_page
├── Parameters: doc_id, name, content, content_format?, position?
└── Response: Page object

PUT /doc/{doc_id}/page/{page_id}
├── Tool: update_doc_page
├── Parameters: doc_id, page_id, name?, content?, content_format?
└── Response: Updated page

DELETE /doc/{doc_id}/page/{page_id}
├── Tool: delete_doc_page
├── Parameters: doc_id, page_id
└── Response: Success confirmation
```

#### Document Sharing
```
GET /doc/{doc_id}/sharing
├── Tool: get_doc_sharing
├── Parameters: doc_id
└── Response: Sharing settings

PUT /doc/{doc_id}/sharing
├── Tool: update_doc_sharing
├── Parameters: doc_id, sharing_settings
└── Response: Updated sharing settings
```

### Custom Fields Management
**Priority:** URGENT | **Complexity:** High | **New Tools:** 7

#### Custom Field CRUD
```
GET /list/{list_id}/field
├── Tool: get_custom_fields
├── Parameters: list_id
└── Response: Array of custom fields

POST /list/{list_id}/field
├── Tool: create_custom_field
├── Parameters: list_id, name, type, config
└── Response: Custom field object

PUT /field/{field_id}
├── Tool: update_custom_field
├── Parameters: field_id, name?, config?
└── Response: Updated custom field

DELETE /field/{field_id}
├── Tool: delete_custom_field
├── Parameters: field_id
└── Response: Success confirmation
```

#### Custom Field Values
```
POST /task/{task_id}/field/{field_id}
├── Tool: set_custom_field_value
├── Parameters: task_id, field_id, value
└── Response: Success confirmation

DELETE /task/{task_id}/field/{field_id}
├── Tool: remove_custom_field_value
├── Parameters: task_id, field_id
└── Response: Success confirmation

GET /space/{space_id}/field
├── Tool: get_space_custom_fields
├── Parameters: space_id
└── Response: Array of space custom fields
```

### Template Management
**Priority:** HIGH | **Complexity:** Medium | **New Tools:** 5

#### Task Templates
```
GET /team/{team_id}/taskTemplate
├── Tool: get_task_templates
├── Parameters: team_id, page?
└── Response: Array of task templates

POST /team/{team_id}/taskTemplate
├── Tool: create_task_template
├── Parameters: team_id, name, description?, content
└── Response: Task template object

PUT /taskTemplate/{template_id}
├── Tool: update_task_template
├── Parameters: template_id, name?, description?, content?
└── Response: Updated template

DELETE /taskTemplate/{template_id}
├── Tool: delete_task_template
├── Parameters: template_id
└── Response: Success confirmation

POST /list/{list_id}/taskTemplate/{template_id}
├── Tool: create_task_from_template
├── Parameters: list_id, template_id, name?, assignees?
└── Response: Created task object
```

---

## 🟡 PHASE 2: ENHANCED FUNCTIONALITY

### Time Tracking
**Priority:** HIGH | **Complexity:** Medium | **New Tools:** 8

#### Time Entries
```
GET /team/{team_id}/time_entries
├── Tool: get_time_entries
├── Parameters: team_id, start_date?, end_date?, assignee?, task_id?
└── Response: Array of time entries

POST /team/{team_id}/time_entries
├── Tool: create_time_entry
├── Parameters: team_id, task_id?, description?, duration, start_date?, billable?
└── Response: Time entry object

PUT /team/{team_id}/time_entries/{timer_id}
├── Tool: update_time_entry
├── Parameters: team_id, timer_id, description?, duration?, billable?
└── Response: Updated time entry

DELETE /team/{team_id}/time_entries/{timer_id}
├── Tool: delete_time_entry
├── Parameters: team_id, timer_id
└── Response: Success confirmation
```

#### Timer Operations
```
GET /team/{team_id}/time_entries/current
├── Tool: get_running_timers
├── Parameters: team_id, assignee?
└── Response: Array of running timers

POST /team/{team_id}/time_entries/{timer_id}/start
├── Tool: start_timer
├── Parameters: team_id, timer_id, task_id?, description?
└── Response: Started timer object

POST /team/{team_id}/time_entries/{timer_id}/stop
├── Tool: stop_timer
├── Parameters: team_id, timer_id
└── Response: Stopped timer object

GET /task/{task_id}/time
├── Tool: get_task_time_tracked
├── Parameters: task_id
└── Response: Total time tracked for task
```

### Goals & Targets
**Priority:** HIGH | **Complexity:** Medium-High | **New Tools:** 7

#### Goals Management
```
GET /team/{team_id}/goal
├── Tool: get_goals
├── Parameters: team_id, include_completed?
└── Response: Array of goals

POST /team/{team_id}/goal
├── Tool: create_goal
├── Parameters: team_id, name, description?, type, unit?, color?
└── Response: Goal object

PUT /goal/{goal_id}
├── Tool: update_goal
├── Parameters: goal_id, name?, description?, color?
└── Response: Updated goal

DELETE /goal/{goal_id}
├── Tool: delete_goal
├── Parameters: goal_id
└── Response: Success confirmation
```

#### Goal Targets
```
POST /goal/{goal_id}/target
├── Tool: create_goal_target
├── Parameters: goal_id, name, type, target_value, due_date?
└── Response: Goal target object

PUT /goal/{goal_id}/target/{target_id}
├── Tool: update_goal_target
├── Parameters: goal_id, target_id, name?, target_value?, due_date?
└── Response: Updated target

DELETE /goal/{goal_id}/target/{target_id}
├── Tool: delete_goal_target
├── Parameters: goal_id, target_id
└── Response: Success confirmation
```

---

## 🟢 PHASE 3: ADVANCED FEATURES

### Views Management
**Priority:** MEDIUM | **Complexity:** High | **New Tools:** 5

#### View Operations
```
GET /team/{team_id}/view
├── Tool: get_views
├── Parameters: team_id, space_id?, folder_id?, list_id?
└── Response: Array of views

POST /team/{team_id}/view
├── Tool: create_view
├── Parameters: team_id, name, type, parent_id, settings
└── Response: View object

PUT /view/{view_id}
├── Tool: update_view
├── Parameters: view_id, name?, settings?
└── Response: Updated view

DELETE /view/{view_id}
├── Tool: delete_view
├── Parameters: view_id
└── Response: Success confirmation

GET /view/{view_id}
├── Tool: get_view_details
├── Parameters: view_id
└── Response: Detailed view object
```

### Webhooks
**Priority:** MEDIUM | **Complexity:** Medium | **New Tools:** 4

#### Webhook Management
```
GET /team/{team_id}/webhook
├── Tool: get_webhooks
├── Parameters: team_id
└── Response: Array of webhooks

POST /team/{team_id}/webhook
├── Tool: create_webhook
├── Parameters: team_id, endpoint, events, filters?
└── Response: Webhook object

PUT /webhook/{webhook_id}
├── Tool: update_webhook
├── Parameters: webhook_id, endpoint?, events?, filters?
└── Response: Updated webhook

DELETE /webhook/{webhook_id}
├── Tool: delete_webhook
├── Parameters: webhook_id
└── Response: Success confirmation
```

### Dependencies
**Priority:** MEDIUM | **Complexity:** Medium | **New Tools:** 3

#### Task Dependencies
```
POST /task/{task_id}/link/{links_to}
├── Tool: add_task_dependency
├── Parameters: task_id, links_to, dependency_type?
└── Response: Dependency object

DELETE /task/{task_id}/link/{links_to}
├── Tool: remove_task_dependency
├── Parameters: task_id, links_to
└── Response: Success confirmation

GET /task/{task_id}/link
├── Tool: get_task_dependencies
├── Parameters: task_id
└── Response: Array of task dependencies
```

### Attachments
**Priority:** MEDIUM | **Complexity:** Medium-High | **New Tools:** 3

#### File Operations
```
POST /task/{task_id}/attachment
├── Tool: upload_attachment
├── Parameters: task_id, file_data, filename
└── Response: Attachment object

GET /task/{task_id}/attachment
├── Tool: get_attachments
├── Parameters: task_id
└── Response: Array of attachments

DELETE /attachment/{attachment_id}
├── Tool: delete_attachment
├── Parameters: attachment_id
└── Response: Success confirmation
```

### Enhanced Tags & Status
**Priority:** LOW | **Complexity:** Low-Medium | **New Tools:** 8

#### Tag Management
```
GET /space/{space_id}/tag
├── Tool: get_space_tags
├── Parameters: space_id
└── Response: Array of tags

POST /space/{space_id}/tag
├── Tool: create_tag
├── Parameters: space_id, name, color?
└── Response: Tag object

PUT /tag/{tag_id}
├── Tool: update_tag
├── Parameters: tag_id, name?, color?
└── Response: Updated tag

DELETE /tag/{tag_id}
├── Tool: delete_tag
├── Parameters: tag_id
└── Response: Success confirmation
```

#### Status Management
```
GET /list/{list_id}/status
├── Tool: get_list_statuses
├── Parameters: list_id
└── Response: Array of statuses

POST /list/{list_id}/status
├── Tool: create_status
├── Parameters: list_id, status, color, type
└── Response: Status object

PUT /status/{status_id}
├── Tool: update_status
├── Parameters: status_id, status?, color?, type?
└── Response: Updated status

DELETE /status/{status_id}
├── Tool: delete_status
├── Parameters: status_id
└── Response: Success confirmation
```

---

## Implementation Summary

### Total Endpoint Coverage
- **Currently Implemented:** 36 endpoints
- **Phase 1 Target:** +20 endpoints (56 total)
- **Phase 2 Target:** +15 endpoints (71 total)
- **Phase 3 Target:** +23 endpoints (94 total)

### Priority Distribution
- **🔴 URGENT (Phase 1):** 20 new endpoints
- **🟡 HIGH (Phase 2):** 15 new endpoints  
- **🟢 MEDIUM/LOW (Phase 3):** 23 new endpoints

### Complexity Assessment
- **Low Complexity:** 15 endpoints (basic CRUD operations)
- **Medium Complexity:** 30 endpoints (standard API operations)
- **High Complexity:** 13 endpoints (complex data structures, file handling)

### File Structure Impact
- **New Tool Files:** 9 files
- **New Client Files:** 9 files
- **Enhanced Existing Files:** 3 files

This comprehensive mapping provides the foundation for systematic implementation of all missing ClickUp API functionality, ensuring complete coverage and proper prioritization.
