# ClickUp Comment Formatting Support

## Overview

The ClickUp MCP Server now provides comprehensive support for ClickUp's native comment formatting structure as documented in the [ClickUp API Comment Formatting Guide](https://developer.clickup.com/docs/comment-formatting). This implementation goes beyond simple markdown conversion to properly handle ClickUp's structured comment format with text blocks and attributes.

## 🎯 ClickUp's Comment Format Structure

ClickUp uses a structured comment format with an array of comment blocks, each containing:

```typescript
interface ClickUpCommentBlock {
  text: string;
  attributes: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    code?: boolean;
    color?: string;
    background_color?: string;
    link?: {
      url: string;
    };
  };
}

interface ClickUpCommentFormat {
  comment: ClickUpCommentBlock[];
}
```

## 🚀 Key Features

### ✅ **Full ClickUp Format Support**
- **Structured Comments**: Proper ClickUp comment block format with text and attributes
- **Rich Formatting**: Bold, italic, underline, strikethrough, code, and links
- **Bidirectional Conversion**: Markdown ↔ ClickUp Format ↔ Display
- **Backward Compatibility**: Maintains support for plain text comments

### 🔄 **Smart Processing**
- **Automatic Detection**: Detects markdown formatting and converts appropriately
- **Format Preservation**: Maintains formatting integrity through conversions
- **Fallback Support**: Graceful handling of unsupported formats
- **Error Recovery**: Robust error handling with fallback to plain text

## 📝 Supported Formatting

### Text Formatting
- **Bold**: `**text**` → `{ text: "text", attributes: { bold: true } }`
- **Italic**: `*text*` → `{ text: "text", attributes: { italic: true } }`
- **Underline**: `__text__` → `{ text: "text", attributes: { underline: true } }`
- **Strikethrough**: `~~text~~` → `{ text: "text", attributes: { strikethrough: true } }`
- **Code**: `` `text` `` → `{ text: "text", attributes: { code: true } }`

### Links
- **Markdown Links**: `[text](url)` → `{ text: "text", attributes: { link: { url: "url" } } }`

### Complex Formatting
- **Headers**: `# Header` → Bold text (ClickUp doesn't have native headers)
- **Lists**: `- Item` → `• Item` with proper formatting
- **Blockquotes**: `> Quote` → `> Quote` with preserved structure
- **Code Blocks**: ````code```` → Code-formatted text blocks

## 💡 Usage Examples

### Creating Comments with Formatting

```typescript
// Using the create_task_comment tool
{
  "task_id": "868f9p3bg",
  "comment_text": "**Status Update**\n\nCompleted:\n- *Authentication* system\n- `Database` setup\n\nNext: [Review PR](https://github.com/repo/pull/123)"
}
```

This gets converted to ClickUp's format:
```json
{
  "comment": [
    { "text": "Status Update", "attributes": { "bold": true } },
    { "text": "\n\nCompleted:\n", "attributes": {} },
    { "text": "• ", "attributes": {} },
    { "text": "Authentication", "attributes": { "italic": true } },
    { "text": " system\n", "attributes": {} },
    { "text": "• ", "attributes": {} },
    { "text": "Database", "attributes": { "code": true } },
    { "text": " setup\n\nNext: ", "attributes": {} },
    { "text": "Review PR", "attributes": { "link": { "url": "https://github.com/repo/pull/123" } } }
  ]
}
```

### Advanced Formatting Examples

#### Status Update Comment
```typescript
{
  "comment_text": `## 🚀 Sprint Update

### ✅ Completed
- **Authentication** module
- *Database* migrations
- \`API\` endpoints

### 🔄 In Progress
- **Frontend** components
- *Testing* suite

### 📋 Next Steps
1. Code review
2. Deploy to staging
3. User testing

**Blockers**: None
**ETA**: End of week

For details, see [Jira ticket](https://company.atlassian.net/browse/PROJ-123)`
}
```

#### Code Review Comment
```typescript
{
  "comment_text": `Found an issue in the \`authentication\` module:

\`\`\`typescript
// This should use bcrypt
const hash = md5(password); // ❌ Insecure
\`\`\`

**Recommendation**: Use \`bcrypt\` for password hashing.

See [security guidelines](https://docs.company.com/security) for more info.`
}
```

## 🔧 Technical Implementation

### Core Components

#### 1. ClickUp Comment Formatter (`src/utils/clickup-comment-formatter.ts`)
The main utility that handles conversion between formats:

```typescript
import { 
  markdownToClickUpComment,
  clickUpCommentToMarkdown,
  prepareCommentForClickUp 
} from '../utils/clickup-comment-formatter.js';

// Convert markdown to ClickUp format
const clickUpFormat = markdownToClickUpComment('**Bold** text');

// Convert ClickUp format back to markdown
const markdown = clickUpCommentToMarkdown(clickUpFormat);

// Prepare for API submission
const prepared = prepareCommentForClickUp('**Bold** text');
```

#### 2. Enhanced Comments Client (`src/clickup-client/comments.ts`)
Updated to use ClickUp's native format:

```typescript
// Automatically converts markdown input to ClickUp format
const comment = await commentsClient.createTaskComment(taskId, {
  comment_text: '**Bold** and *italic* text'
});

// Returns processed response with markdown representation
console.log(comment.comment_markdown); // "**Bold** and *italic* text"
```

### Processing Pipeline

1. **Input Processing**:
   - Detect if input contains markdown formatting
   - Parse markdown into ClickUp comment blocks
   - Apply appropriate attributes to each text segment

2. **API Submission**:
   - Send structured comment format to ClickUp API
   - Include fallback `comment_text` for compatibility
   - ClickUp processes and stores the rich formatting

3. **Response Processing**:
   - Receive ClickUp response with comment blocks
   - Convert back to markdown for display
   - Add `comment_markdown` field to response

4. **Error Handling**:
   - Graceful fallback to plain text if conversion fails
   - Preserve original content in case of processing errors
   - Log warnings for debugging

## 🧪 Testing

### Test Coverage
Comprehensive tests cover all formatting scenarios:

```bash
# Run ClickUp comment formatting tests
npm test -- --testPathPattern=clickup-comment-formatter

# Test specific formatting features
npm test -- --testNamePattern="bold|italic|links"
```

### Test Categories
- **Basic Formatting**: Bold, italic, code, links
- **Complex Parsing**: Mixed formatting, headers, lists
- **Bidirectional Conversion**: Markdown → ClickUp → Markdown
- **Edge Cases**: Empty content, malformed markdown
- **Error Handling**: Invalid input, conversion failures

## 🔍 Comparison with Previous Implementation

### Before (Simple Markdown)
```typescript
// Old approach - simple HTML conversion
{
  "comment_text": "<strong>Bold</strong> text"
}
```

### After (ClickUp Native Format)
```typescript
// New approach - ClickUp structured format
{
  "comment": [
    { "text": "Bold", "attributes": { "bold": true } },
    { "text": " text", "attributes": {} }
  ],
  "comment_text": "**Bold** text" // Fallback
}
```

## 🚀 Benefits

### For Users
- **Rich Formatting**: Comments render with proper formatting in ClickUp
- **Better Readability**: Structured content with headers, lists, and emphasis
- **Link Support**: Clickable links in comments
- **Code Formatting**: Proper code highlighting and formatting

### For Developers
- **Native Integration**: Uses ClickUp's official comment format
- **Type Safety**: Full TypeScript support with proper interfaces
- **Error Resilience**: Robust error handling and fallbacks
- **Extensible**: Easy to add new formatting features

## 🔮 Future Enhancements

### Planned Features
- **Color Support**: Text and background colors
- **Emoji Processing**: Enhanced emoji support
- **Mention Support**: @user mentions in comments
- **Advanced Lists**: Nested lists and task lists
- **Table Support**: Structured table formatting

### API Extensions
- **Bulk Comment Processing**: Process multiple comments efficiently
- **Format Validation**: Validate comment format before submission
- **Template Support**: Pre-defined comment templates
- **Rich Media**: Support for images and attachments in comments

## 📖 References

- [ClickUp Comment Formatting API](https://developer.clickup.com/docs/comment-formatting)
- [ClickUp API Documentation](https://developer.clickup.com/docs/tasks)
- [GitHub Flavored Markdown](https://github.github.com/gfm/)
- [MCP Server Documentation](./README.md)

---

**Note**: This implementation provides full compatibility with ClickUp's native comment formatting while maintaining backward compatibility with plain text comments. The system automatically detects and converts markdown formatting to ClickUp's structured format for optimal rendering.
