import {
  markdownToClickUpComment,
  clickUpCommentToMarkdown,
  parseMarkdownToClickUpComment,
  prepareCommentForClickUp,
  createPlainTextComment,
  createBoldComment,
  createItalicComment,
  createCodeComment,
  createLinkComment,
  combineCommentBlocks,
  ClickUpCommentBlock,
  ClickUpCommentFormat
} from '../utils/clickup-comment-formatter';

describe('ClickUp Comment Formatter', () => {
  describe('createPlainTextComment', () => {
    it('should create a plain text comment', () => {
      const result = createPlainTextComment('Hello world');
      
      expect(result).toEqual({
        comment: [{
          text: 'Hello world',
          attributes: {}
        }]
      });
    });

    it('should handle empty text', () => {
      const result = createPlainTextComment('');
      
      expect(result).toEqual({
        comment: [{
          text: '',
          attributes: {}
        }]
      });
    });
  });

  describe('createBoldComment', () => {
    it('should create a bold text comment', () => {
      const result = createBoldComment('Bold text');
      
      expect(result).toEqual({
        comment: [{
          text: 'Bold text',
          attributes: { bold: true }
        }]
      });
    });
  });

  describe('createItalicComment', () => {
    it('should create an italic text comment', () => {
      const result = createItalicComment('Italic text');
      
      expect(result).toEqual({
        comment: [{
          text: 'Italic text',
          attributes: { italic: true }
        }]
      });
    });
  });

  describe('createCodeComment', () => {
    it('should create a code text comment', () => {
      const result = createCodeComment('const x = 1;');
      
      expect(result).toEqual({
        comment: [{
          text: 'const x = 1;',
          attributes: { code: true }
        }]
      });
    });
  });

  describe('createLinkComment', () => {
    it('should create a link comment', () => {
      const result = createLinkComment('ClickUp', 'https://clickup.com');
      
      expect(result).toEqual({
        comment: [{
          text: 'ClickUp',
          attributes: { link: { url: 'https://clickup.com' } }
        }]
      });
    });
  });

  describe('markdownToClickUpComment', () => {
    it('should convert bold markdown to ClickUp format', () => {
      const result = markdownToClickUpComment('**bold text**');
      
      expect(result.comment).toContainEqual({
        text: 'bold text',
        attributes: { bold: true }
      });
    });

    it('should convert italic markdown to ClickUp format', () => {
      const result = markdownToClickUpComment('*italic text*');
      
      expect(result.comment).toContainEqual({
        text: 'italic text',
        attributes: { italic: true }
      });
    });

    it('should convert underline markdown to ClickUp format', () => {
      const result = markdownToClickUpComment('__underlined text__');
      
      expect(result.comment).toContainEqual({
        text: 'underlined text',
        attributes: { underline: true }
      });
    });

    it('should convert strikethrough markdown to ClickUp format', () => {
      const result = markdownToClickUpComment('~~strikethrough text~~');
      
      expect(result.comment).toContainEqual({
        text: 'strikethrough text',
        attributes: { strikethrough: true }
      });
    });

    it('should convert inline code markdown to ClickUp format', () => {
      const result = markdownToClickUpComment('`code text`');
      
      expect(result.comment).toContainEqual({
        text: 'code text',
        attributes: { code: true }
      });
    });

    it('should convert links markdown to ClickUp format', () => {
      const result = markdownToClickUpComment('[ClickUp](https://clickup.com)');
      
      expect(result.comment).toContainEqual({
        text: 'ClickUp',
        attributes: { link: { url: 'https://clickup.com' } }
      });
    });

    it('should handle mixed formatting', () => {
      const result = markdownToClickUpComment('This is **bold** and *italic* text');
      
      expect(result.comment).toEqual([
        { text: 'This is ', attributes: {} },
        { text: 'bold', attributes: { bold: true } },
        { text: ' and ', attributes: {} },
        { text: 'italic', attributes: { italic: true } },
        { text: ' text', attributes: {} }
      ]);
    });

    it('should handle plain text', () => {
      const result = markdownToClickUpComment('Just plain text');
      
      expect(result).toEqual({
        comment: [{
          text: 'Just plain text',
          attributes: {}
        }]
      });
    });

    it('should handle empty input', () => {
      const result = markdownToClickUpComment('');
      
      expect(result).toEqual({
        comment: [{
          text: '',
          attributes: {}
        }]
      });
    });
  });

  describe('clickUpCommentToMarkdown', () => {
    it('should convert bold ClickUp format to markdown', () => {
      const input: ClickUpCommentFormat = {
        comment: [{
          text: 'bold text',
          attributes: { bold: true }
        }]
      };
      
      const result = clickUpCommentToMarkdown(input);
      expect(result).toBe('**bold text**');
    });

    it('should convert italic ClickUp format to markdown', () => {
      const input: ClickUpCommentFormat = {
        comment: [{
          text: 'italic text',
          attributes: { italic: true }
        }]
      };
      
      const result = clickUpCommentToMarkdown(input);
      expect(result).toBe('*italic text*');
    });

    it('should convert underline ClickUp format to markdown', () => {
      const input: ClickUpCommentFormat = {
        comment: [{
          text: 'underlined text',
          attributes: { underline: true }
        }]
      };
      
      const result = clickUpCommentToMarkdown(input);
      expect(result).toBe('__underlined text__');
    });

    it('should convert strikethrough ClickUp format to markdown', () => {
      const input: ClickUpCommentFormat = {
        comment: [{
          text: 'strikethrough text',
          attributes: { strikethrough: true }
        }]
      };
      
      const result = clickUpCommentToMarkdown(input);
      expect(result).toBe('~~strikethrough text~~');
    });

    it('should convert code ClickUp format to markdown', () => {
      const input: ClickUpCommentFormat = {
        comment: [{
          text: 'code text',
          attributes: { code: true }
        }]
      };
      
      const result = clickUpCommentToMarkdown(input);
      expect(result).toBe('`code text`');
    });

    it('should convert link ClickUp format to markdown', () => {
      const input: ClickUpCommentFormat = {
        comment: [{
          text: 'ClickUp',
          attributes: { link: { url: 'https://clickup.com' } }
        }]
      };
      
      const result = clickUpCommentToMarkdown(input);
      expect(result).toBe('[ClickUp](https://clickup.com)');
    });

    it('should handle mixed formatting', () => {
      const input: ClickUpCommentFormat = {
        comment: [
          { text: 'This is ', attributes: {} },
          { text: 'bold', attributes: { bold: true } },
          { text: ' and ', attributes: {} },
          { text: 'italic', attributes: { italic: true } },
          { text: ' text', attributes: {} }
        ]
      };
      
      const result = clickUpCommentToMarkdown(input);
      expect(result).toBe('This is **bold** and *italic* text');
    });

    it('should handle plain text', () => {
      const input: ClickUpCommentFormat = {
        comment: [{
          text: 'Just plain text',
          attributes: {}
        }]
      };
      
      const result = clickUpCommentToMarkdown(input);
      expect(result).toBe('Just plain text');
    });

    it('should handle empty input', () => {
      const result = clickUpCommentToMarkdown({ comment: [] });
      expect(result).toBe('');
    });
  });

  describe('parseMarkdownToClickUpComment', () => {
    it('should handle headers', () => {
      const result = parseMarkdownToClickUpComment('# Header 1\n\nSome text');
      
      expect(result.comment).toContainEqual({
        text: 'Header 1',
        attributes: { bold: true }
      });
    });

    it('should handle list items', () => {
      const result = parseMarkdownToClickUpComment('- Item 1\n- Item 2');
      
      expect(result.comment[0].text).toContain('• Item 1');
    });

    it('should handle blockquotes', () => {
      const result = parseMarkdownToClickUpComment('> This is a quote');
      
      expect(result.comment[0].text).toBe('> ');
      expect(result.comment[1].text).toBe('This is a quote');
    });

    it('should handle code blocks', () => {
      const result = parseMarkdownToClickUpComment('```\nconst x = 1;\nconsole.log(x);\n```');
      
      expect(result.comment).toContainEqual({
        text: 'const x = 1;\nconsole.log(x);',
        attributes: { code: true }
      });
    });

    it('should handle complex markdown', () => {
      const markdown = `# Status Update

## Completed
- **Authentication** system
- *Database* setup

## Code
\`\`\`javascript
const user = { name: 'John' };
\`\`\`

Visit [ClickUp](https://clickup.com) for more info.`;

      const result = parseMarkdownToClickUpComment(markdown);
      
      // Should contain header
      expect(result.comment).toContainEqual({
        text: 'Status Update',
        attributes: { bold: true }
      });
      
      // Should contain formatted text
      expect(result.comment).toContainEqual({
        text: 'Authentication',
        attributes: { bold: true }
      });
      
      // Should contain code block
      expect(result.comment).toContainEqual({
        text: "const user = { name: 'John' };",
        attributes: { code: true }
      });
      
      // Should contain link
      expect(result.comment).toContainEqual({
        text: 'ClickUp',
        attributes: { link: { url: 'https://clickup.com' } }
      });
    });
  });

  describe('prepareCommentForClickUp', () => {
    it('should prepare plain text comment', () => {
      const result = prepareCommentForClickUp('Hello world');
      
      expect(result).toEqual({
        comment: [{
          text: 'Hello world',
          attributes: {}
        }],
        comment_text: 'Hello world'
      });
    });

    it('should prepare markdown comment', () => {
      const result = prepareCommentForClickUp('**Bold** text');
      
      expect(result.comment).toContainEqual({
        text: 'Bold',
        attributes: { bold: true }
      });
      expect(result.comment_text).toBe('**Bold** text');
    });

    it('should handle empty input', () => {
      const result = prepareCommentForClickUp('');
      
      expect(result).toEqual({
        comment: [{
          text: '',
          attributes: {}
        }]
      });
    });
  });

  describe('combineCommentBlocks', () => {
    it('should combine multiple comment blocks', () => {
      const blocks: ClickUpCommentBlock[] = [
        { text: 'Hello ', attributes: {} },
        { text: 'world', attributes: { bold: true } },
        { text: '!', attributes: {} }
      ];
      
      const result = combineCommentBlocks(blocks);
      
      expect(result).toEqual({
        comment: blocks
      });
    });
  });

  describe('Bidirectional conversion', () => {
    it('should maintain content through markdown -> ClickUp -> markdown conversion', () => {
      const originalMarkdown = '**Bold** and *italic* text with `code` and [link](https://example.com)';
      
      // Convert to ClickUp format
      const clickUpFormat = markdownToClickUpComment(originalMarkdown);
      
      // Convert back to markdown
      const convertedMarkdown = clickUpCommentToMarkdown(clickUpFormat);
      
      // Should preserve the essential formatting (may have minor differences in spacing)
      expect(convertedMarkdown).toContain('**Bold**');
      expect(convertedMarkdown).toContain('*italic*');
      expect(convertedMarkdown).toContain('`code`');
      expect(convertedMarkdown).toContain('[link](https://example.com)');
    });
  });
});
