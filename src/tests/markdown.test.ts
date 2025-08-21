import {
  markdownToHtml,
  htmlToMarkdown,
  markdownToPlainText,
  isMarkdown,
  isHtml,
  formatContent,
  prepareContentForClickUp,
  processClickUpResponse
} from '../utils/markdown';

describe('Markdown Utilities', () => {
  describe('markdownToHtml', () => {
    it('should convert basic markdown to HTML', () => {
      const markdown = '# Header\n\n**Bold text** and *italic text*';
      const html = markdownToHtml(markdown);
      
      expect(html).toContain('<h1>Header</h1>');
      expect(html).toContain('<strong>Bold text</strong>');
      expect(html).toContain('<em>italic text</em>');
    });

    it('should handle code blocks', () => {
      const markdown = '```javascript\nconst x = 1;\n```';
      const html = markdownToHtml(markdown);
      
      expect(html).toContain('<pre><code class="language-javascript">');
      expect(html).toContain('const x = 1;');
    });

    it('should handle links and lists', () => {
      const markdown = '- [Link](https://example.com)\n- Item 2';
      const html = markdownToHtml(markdown);
      
      expect(html).toContain('<ul>');
      expect(html).toContain('<a href="https://example.com">Link</a>');
    });

    it('should return empty string for invalid input', () => {
      expect(markdownToHtml('')).toBe('');
      expect(markdownToHtml(null as any)).toBe('');
      expect(markdownToHtml(undefined as any)).toBe('');
    });
  });

  describe('htmlToMarkdown', () => {
    it('should convert basic HTML to markdown', () => {
      const html = '<h1>Header</h1><p><strong>Bold</strong> and <em>italic</em></p>';
      const markdown = htmlToMarkdown(html);
      
      expect(markdown).toContain('# Header');
      expect(markdown).toContain('**Bold**');
      expect(markdown).toContain('*italic*');
    });

    it('should handle lists and links', () => {
      const html = '<ul><li><a href="https://example.com">Link</a></li><li>Item 2</li></ul>';
      const markdown = htmlToMarkdown(html);
      
      expect(markdown).toContain('- [Link](https://example.com)');
      expect(markdown).toContain('- Item 2');
    });

    it('should return empty string for invalid input', () => {
      expect(htmlToMarkdown('')).toBe('');
      expect(htmlToMarkdown(null as any)).toBe('');
      expect(htmlToMarkdown(undefined as any)).toBe('');
    });
  });

  describe('markdownToPlainText', () => {
    it('should strip markdown formatting', () => {
      const markdown = '# Header\n\n**Bold** and *italic* text with `code`';
      const plainText = markdownToPlainText(markdown);
      
      expect(plainText).not.toContain('#');
      expect(plainText).not.toContain('**');
      expect(plainText).not.toContain('*');
      expect(plainText).not.toContain('`');
      expect(plainText).toContain('Header');
      expect(plainText).toContain('Bold');
      expect(plainText).toContain('italic');
      expect(plainText).toContain('code');
    });

    it('should handle links and images', () => {
      const markdown = '[Link text](https://example.com) and ![Alt text](image.jpg)';
      const plainText = markdownToPlainText(markdown);
      
      expect(plainText).toContain('Link text');
      expect(plainText).toContain('Alt text');
      expect(plainText).not.toContain('https://example.com');
      expect(plainText).not.toContain('image.jpg');
    });
  });

  describe('isMarkdown', () => {
    it('should detect markdown content', () => {
      expect(isMarkdown('# Header')).toBe(true);
      expect(isMarkdown('**bold**')).toBe(true);
      expect(isMarkdown('*italic*')).toBe(true);
      expect(isMarkdown('`code`')).toBe(true);
      expect(isMarkdown('[link](url)')).toBe(true);
      expect(isMarkdown('- list item')).toBe(true);
      expect(isMarkdown('1. numbered item')).toBe(true);
      expect(isMarkdown('> blockquote')).toBe(true);
    });

    it('should not detect plain text as markdown', () => {
      expect(isMarkdown('Just plain text')).toBe(false);
      expect(isMarkdown('Some text with numbers 123')).toBe(false);
      expect(isMarkdown('')).toBe(false);
      expect(isMarkdown(null as any)).toBe(false);
    });
  });

  describe('isHtml', () => {
    it('should detect HTML content', () => {
      expect(isHtml('<p>paragraph</p>')).toBe(true);
      expect(isHtml('<strong>bold</strong>')).toBe(true);
      expect(isHtml('<a href="url">link</a>')).toBe(true);
    });

    it('should not detect plain text as HTML', () => {
      expect(isHtml('Just plain text')).toBe(false);
      expect(isHtml('Text with < and > symbols')).toBe(false);
      expect(isHtml('')).toBe(false);
      expect(isHtml(null as any)).toBe(false);
    });
  });

  describe('formatContent', () => {
    it('should convert markdown to HTML', () => {
      const markdown = '**bold**';
      const html = formatContent(markdown, 'html');
      
      expect(html).toContain('<strong>bold</strong>');
    });

    it('should convert HTML to markdown', () => {
      const html = '<strong>bold</strong>';
      const markdown = formatContent(html, 'markdown');
      
      expect(markdown).toContain('**bold**');
    });

    it('should convert to plain text', () => {
      const markdown = '**bold**';
      const plain = formatContent(markdown, 'plain');
      
      expect(plain).toContain('bold');
      expect(plain).not.toContain('**');
    });
  });

  describe('prepareContentForClickUp', () => {
    it('should prepare markdown content for ClickUp API', () => {
      const markdown = '# Header\n\n**Bold** text';
      const result = prepareContentForClickUp(markdown);
      
      expect(result.description).toContain('<h1>Header</h1>');
      expect(result.description).toContain('<strong>Bold</strong>');
      expect(result.text_content).toContain('Header');
      expect(result.text_content).toContain('Bold');
      expect(result.text_content).not.toContain('<h1>');
      expect(result.text_content).not.toContain('**');
    });

    it('should handle plain text content', () => {
      const plainText = 'Just plain text';
      const result = prepareContentForClickUp(plainText);
      
      expect(result.description).toBe(plainText);
      expect(result.text_content).toBe(plainText);
    });

    it('should handle HTML content', () => {
      const html = '<p><strong>Bold</strong> text</p>';
      const result = prepareContentForClickUp(html);
      
      expect(result.description).toBe(html);
      expect(result.text_content).toContain('Bold text');
      expect(result.text_content).not.toContain('<p>');
    });

    it('should handle empty content', () => {
      const result = prepareContentForClickUp('');
      
      expect(result.description).toBe('');
      expect(result.text_content).toBeUndefined();
    });
  });

  describe('processClickUpResponse', () => {
    it('should process task response with HTML description', () => {
      const response = {
        id: '123',
        name: 'Test Task',
        description: '<h1>Header</h1><p><strong>Bold</strong> text</p>',
        text_content: 'Header\nBold text'
      };
      
      const processed = processClickUpResponse(response);
      
      expect(processed.description_markdown).toContain('# Header');
      expect(processed.description_markdown).toContain('**Bold**');
    });

    it('should process comment response with rich text blocks', () => {
      const response = {
        id: '456',
        comment: ['<p>Comment with <strong>bold</strong> text</p>'],
        comment_text: 'Comment with bold text'
      };
      
      const processed = processClickUpResponse(response);
      
      expect(processed.comment_markdown).toContain('**bold**');
    });

    it('should handle responses without HTML content', () => {
      const response = {
        id: '789',
        name: 'Plain Task',
        description: 'Just plain text'
      };
      
      const processed = processClickUpResponse(response);
      
      expect(processed.description_markdown).toBeUndefined();
      expect(processed.description).toBe('Just plain text');
    });

    it('should handle null/undefined responses', () => {
      expect(processClickUpResponse(null)).toBe(null);
      expect(processClickUpResponse(undefined)).toBe(undefined);
      expect(processClickUpResponse('string')).toBe('string');
    });
  });

  describe('GitHub Flavored Markdown Support', () => {
    it('should support strikethrough', () => {
      const markdown = '~~strikethrough~~';
      const html = markdownToHtml(markdown);
      
      expect(html).toContain('<del>strikethrough</del>');
    });

    it('should support tables', () => {
      const markdown = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |';
      const html = markdownToHtml(markdown);
      
      expect(html).toContain('<table>');
      expect(html).toContain('<th>Header 1</th>');
      expect(html).toContain('<td>Cell 1</td>');
    });

    it('should support task lists', () => {
      const markdown = '- [x] Completed task\n- [ ] Incomplete task';
      const html = markdownToHtml(markdown);
      
      expect(html).toContain('type="checkbox"');
      expect(html).toContain('checked=""');
    });

    it('should support fenced code blocks with language', () => {
      const markdown = '```typescript\nconst x: number = 1;\n```';
      const html = markdownToHtml(markdown);
      
      expect(html).toContain('class="language-typescript"');
      expect(html).toContain('const x: number = 1;');
    });
  });
});
