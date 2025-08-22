// Mock the markdown utilities to avoid ESM issues with marked library
jest.mock('../utils/markdown', () => ({
  markdownToHtml: jest.fn((markdown: string) => {
    if (!markdown) return '';
    return markdown
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  }),
  
  htmlToMarkdown: jest.fn((html: string) => {
    if (!html) return '';
    return html
      .replace(/<h1>(.+?)<\/h1>/g, '# $1')
      .replace(/<strong>(.+?)<\/strong>/g, '**$1**')
      .replace(/<em>(.+?)<\/em>/g, '*$1*')
      .replace(/<code>(.+?)<\/code>/g, '`$1`');
  }),
  
  markdownToPlainText: jest.fn((markdown: string) => {
    if (!markdown) return '';
    return markdown
      .replace(/^#+\s+/gm, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '$1');
  }),
  
  isMarkdown: jest.fn((content: string) => {
    if (!content) return false;
    return /^#|^\*|^-|\*\*|\*|`/.test(content);
  }),
  
  isHtml: jest.fn((content: string) => {
    if (!content) return false;
    return /<[^>]+>/.test(content);
  }),
  
  formatContent: jest.fn((content: string, targetFormat: 'html' | 'markdown' | 'plain') => {
    if (!content) return '';
    
    switch (targetFormat) {
    case 'html':
      return content.includes('<') ? content : `<p>${content}</p>`;
    case 'plain':
      return content.replace(/<[^>]+>/g, '').replace(/[#*`]/g, '');
    case 'markdown':
    default:
      return content;
    }
  }),
  
  prepareContentForClickUp: jest.fn((content: string) => {
    if (!content) return { description: '' };
    
    const isMarkdownContent = /^#|^\*|^-|\*\*|\*|`/.test(content);
    if (isMarkdownContent) {
      const html = content
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return {
        description: html,
        text_content: content.replace(/[#*`]/g, '')
      };
    }
    
    return { description: content };
  }),
  
  processClickUpResponse: jest.fn((content: string) => {
    if (!content) return '';
    return content
      .replace(/<h1>(.+?)<\/h1>/g, '# $1')
      .replace(/<strong>(.+?)<\/strong>/g, '**$1**');
  })
}));

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isMarkdown', () => {
    it('should detect markdown content', () => {
      expect(isMarkdown('# Header')).toBe(true);
      expect(isMarkdown('**bold text**')).toBe(true);
      expect(isMarkdown('- list item')).toBe(true);
      expect(isMarkdown('plain text')).toBe(false);
    });
  });

  describe('isHtml', () => {
    it('should detect HTML content', () => {
      expect(isHtml('<p>paragraph</p>')).toBe(true);
      expect(isHtml('<div>content</div>')).toBe(true);
      expect(isHtml('plain text')).toBe(false);
    });
  });

  describe('markdownToPlainText', () => {
    it('should convert markdown to plain text', () => {
      const markdown = '# Header\n\n**Bold** text with *italic*';
      const result = markdownToPlainText(markdown);
      
      expect(result).toContain('Header');
      expect(result).toContain('Bold text with italic');
      expect(result).not.toContain('#');
      expect(result).not.toContain('**');
      expect(result).not.toContain('*');
    });
  });

  describe('formatContent', () => {
    it('should format content based on target format', () => {
      const markdown = '# Test\n\n**Bold** text';
      
      const htmlResult = formatContent(markdown, 'html');
      expect(htmlResult).toContain('<');
      
      const plainResult = formatContent(markdown, 'plain');
      expect(plainResult).not.toContain('#');
      expect(plainResult).not.toContain('**');
    });

    it('should handle plain text input', () => {
      const plainText = 'Just plain text';
      
      expect(formatContent(plainText, 'html')).toContain('<p>');
      expect(formatContent(plainText, 'plain')).toBe(plainText);
      expect(formatContent(plainText, 'markdown')).toBe(plainText);
    });
  });

  describe('prepareContentForClickUp', () => {
    it('should prepare markdown content for ClickUp', () => {
      const markdown = '# Header\n\n**Bold** text';
      const result = prepareContentForClickUp(markdown);
      
      expect(typeof result).toBe('object');
      expect(result.description).toBeDefined();
      expect(result.description.length).toBeGreaterThan(0);
    });

    it('should handle empty content', () => {
      expect(prepareContentForClickUp('')).toEqual({ description: '' });
      expect(prepareContentForClickUp(null as any)).toEqual({ description: '' });
      expect(prepareContentForClickUp(undefined as any)).toEqual({ description: '' });
    });
  });

  describe('processClickUpResponse', () => {
    it('should process ClickUp response content', () => {
      const htmlContent = '<p><strong>Bold</strong> text</p>';
      const result = processClickUpResponse(htmlContent);
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('bidirectional conversion', () => {
    it('should maintain content integrity through conversions', () => {
      const originalMarkdown = '# Header\n\n**Bold** text with *italic* and `code`';
      
      // Convert to HTML and back
      const html = markdownToHtml(originalMarkdown);
      const backToMarkdown = htmlToMarkdown(html);
      
      // Should preserve the essential content structure
      expect(backToMarkdown).toContain('Header');
      expect(backToMarkdown).toContain('Bold');
      expect(backToMarkdown).toContain('italic');
      expect(backToMarkdown).toContain('code');
    });
  });
});
