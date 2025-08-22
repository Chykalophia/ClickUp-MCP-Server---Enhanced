# ClickUp Task Creation/Update Fix

## Problem Identified

The ClickUp MCP server was incorrectly handling markdown content in task descriptions:

1. **HTML Generation**: Markdown content was being converted to HTML and sent via the `description` field
2. **Wrong Field Usage**: ClickUp API expects markdown content in the `markdown_content` field, not converted to HTML
3. **Update Tool Issues**: The update task tool was potentially not working due to field handling issues

## Root Cause

The `prepareContentForClickUp()` function in `src/utils/markdown.ts` was:
- Converting markdown to HTML using `markdownToHtml()`
- Sending the HTML via the `description` field
- Not using the `markdown_content` field that ClickUp expects for markdown

## Fixes Applied

### 1. Updated `prepareContentForClickUp()` Function

**Before:**
```typescript
// Converted markdown to HTML and sent via description field
if (isMarkdown(content)) {
  const html = markdownToHtml(content);
  return { description: html, text_content: plainText };
}
```

**After:**
```typescript
// Send raw markdown via markdown_content field
if (isMarkdown(content)) {
  return { 
    markdown_content: content,  // Raw markdown to ClickUp
    text_content: plainText 
  };
}
```

### 2. Updated Task Interface Definitions

Added `markdown_content` field support to:
- `CreateTaskParams` interface
- `UpdateTaskParams` interface

### 3. Updated Task Client Methods

Modified `createTask()` and `updateTask()` methods to:
- Handle both `description` and `markdown_content` fields
- Use appropriate field based on content type
- Remove original `description` field when using `markdown_content`

### 4. Enhanced Tool Definitions

Added `markdown_content` parameter to:
- `clickup_create_task` tool
- `clickup_update_task` tool

Added logic to prefer `markdown_content` over `description` when both are provided.

## Field Usage Logic

| Content Type | Field Used | Processing |
|--------------|------------|------------|
| Markdown | `markdown_content` | Raw markdown sent to ClickUp |
| HTML | `description` | HTML sent as-is |
| Plain Text | `description` | Plain text sent as-is |

## Verification Results

✅ **Markdown Content**: Now correctly uses `markdown_content` field  
✅ **HTML Content**: Still uses `description` field (correct)  
✅ **Plain Text**: Uses `description` field (correct)  
✅ **Edge Cases**: Handled properly (empty, null, undefined)  
✅ **Build**: No compilation errors  

## Testing

The fix has been verified with unit tests showing:
- Markdown detection works correctly
- Field selection logic is accurate
- Content processing maintains data integrity
- Edge cases are handled safely

## Impact

This fix will:
1. **Prevent HTML formatting issues** in ClickUp task descriptions
2. **Enable proper markdown rendering** in ClickUp interface
3. **Fix task update functionality** that may have been broken
4. **Maintain backward compatibility** with existing HTML/plain text content

## Usage Examples

### Creating Task with Markdown
```typescript
// This will now use markdown_content field
clickup_create_task({
  list_id: "123456",
  name: "Task with Markdown",
  description: "# Header\n\nThis is **bold** text"
})
```

### Creating Task with Explicit Markdown
```typescript
// Direct markdown_content usage
clickup_create_task({
  list_id: "123456", 
  name: "Task with Explicit Markdown",
  markdown_content: "# Header\n\nThis is **bold** text"
})
```

### Updating Task
```typescript
// Update will now work correctly with markdown
clickup_update_task({
  task_id: "868fa998b",
  description: "# Updated\n\nWith **new** content"
})
```

## Files Modified

1. `src/utils/markdown.ts` - Fixed `prepareContentForClickUp()` function
2. `src/clickup-client/tasks.ts` - Updated interfaces and methods
3. `src/tools/task-tools.ts` - Enhanced tool definitions

## Next Steps

1. Test with actual ClickUp API to verify behavior
2. Update any existing tasks that have HTML formatting issues
3. Monitor for any regression issues
4. Consider adding validation for markdown_content field usage
