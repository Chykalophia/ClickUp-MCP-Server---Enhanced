import { marked } from 'marked';
import TurndownService from 'turndown';

/**
 * Markdown processing utilities for ClickUp content
 * Handles conversion between markdown, HTML, and plain text formats
 */

// Configure marked for ClickUp-compatible HTML output
marked.setOptions({
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // Convert line breaks to <br>
});

// Configure Turndown for ClickUp HTML to markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx', // Use # for headers
  codeBlockStyle: 'fenced', // Use ``` for code blocks
  fence: '```', // Use ``` for code fences
  emDelimiter: '*', // Use * for emphasis
  strongDelimiter: '**', // Use ** for strong
  linkStyle: 'inlined', // Use [text](url) for links
  linkReferenceStyle: 'full', // Use full reference links
});

// Add custom rules for ClickUp-specific elements
turndownService.addRule('strikethrough', {
  filter: ['del', 's'],
  replacement: (content) => `~~${content}~~`
});

turndownService.addRule('underline', {
  filter: 'u',
  replacement: (content) => `<u>${content}</u>` // Keep underline as HTML since markdown doesn't support it
});

turndownService.addRule('highlight', {
  filter: 'mark',
  replacement: (content) => `==${content}==` // Use highlight syntax
});

/**
 * Convert markdown to HTML for ClickUp API submission
 * @param markdown The markdown content to convert
 * @returns HTML string suitable for ClickUp API
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }
  
  try {
    const result = marked.parse(markdown);
    return typeof result === 'string' ? result : '';
  } catch (error) {
    console.warn('Failed to parse markdown, returning as plain text:', error);
    return markdown;
  }
}

/**
 * Convert HTML to markdown for display/editing
 * @param html The HTML content to convert
 * @returns Markdown string
 */
export function htmlToMarkdown(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  try {
    return turndownService.turndown(html);
  } catch (error) {
    console.warn('Failed to convert HTML to markdown, returning as plain text:', error);
    // Strip HTML tags as fallback
    return html.replace(/<[^>]*>/g, '');
  }
}

/**
 * Convert markdown to plain text by stripping formatting
 * @param markdown The markdown content to convert
 * @returns Plain text string
 */
export function markdownToPlainText(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }
  
  try {
    // First convert to HTML, then strip tags
    const htmlResult = marked.parse(markdown);
    const html = typeof htmlResult === 'string' ? htmlResult : '';
    return html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n').trim();
  } catch (error) {
    console.warn('Failed to convert markdown to plain text:', error);
    // Fallback: basic markdown stripping
    return markdown
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // Convert images to alt text
      .trim();
  }
}

/**
 * Detect if content contains markdown formatting
 * @param content The content to check
 * @returns True if content appears to contain markdown
 */
export function isMarkdown(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false;
  }
  
  // Check for common markdown patterns
  const markdownPatterns = [
    /#{1,6}\s+/, // Headers
    /\*\*.*?\*\*/, // Bold
    /\*.*?\*/, // Italic
    /`.*?`/, // Inline code
    /```[\s\S]*?```/, // Code blocks
    /\[.*?\]\(.*?\)/, // Links
    /!\[.*?\]\(.*?\)/, // Images
    /^\s*[-*+]\s+/m, // Unordered lists
    /^\s*\d+\.\s+/m, // Ordered lists
    /^\s*>\s+/m, // Blockquotes
    /~~.*?~~/, // Strikethrough
    /==[^=]+==/, // Highlight
  ];
  
  return markdownPatterns.some(pattern => pattern.test(content));
}

/**
 * Detect if content contains HTML formatting
 * @param content The content to check
 * @returns True if content appears to contain HTML
 */
export function isHtml(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false;
  }
  
  // Check for HTML tags
  return /<[^>]+>/g.test(content);
}

/**
 * Smart content formatter that detects format and converts appropriately
 * @param content The content to format
 * @param targetFormat The desired output format
 * @returns Formatted content
 */
export function formatContent(
  content: string, 
  targetFormat: 'html' | 'markdown' | 'plain'
): string {
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  // Detect current format
  const isCurrentlyHtml = isHtml(content);
  const isCurrentlyMarkdown = !isCurrentlyHtml && isMarkdown(content);
  
  switch (targetFormat) {
    case 'html':
      if (isCurrentlyHtml) return content;
      if (isCurrentlyMarkdown) return markdownToHtml(content);
      return content; // Plain text, return as-is
      
    case 'markdown':
      if (isCurrentlyMarkdown) return content;
      if (isCurrentlyHtml) return htmlToMarkdown(content);
      return content; // Plain text, return as-is
      
    case 'plain':
      if (isCurrentlyMarkdown) return markdownToPlainText(content);
      if (isCurrentlyHtml) return htmlToMarkdown(content).replace(/[*_`#\[\]()]/g, '');
      return content; // Already plain text
      
    default:
      return content;
  }
}

/**
 * Prepare content for ClickUp API submission
 * Converts markdown to HTML and provides both formats
 * @param content The content to prepare (markdown or plain text)
 * @returns Object with both HTML and plain text versions
 */
export function prepareContentForClickUp(content: string): {
  description: string; // HTML version for rich text
  text_content?: string; // Plain text version for compatibility
} {
  if (!content || typeof content !== 'string') {
    return { description: '' };
  }
  
  // If content looks like markdown, convert to HTML
  if (isMarkdown(content)) {
    const html = markdownToHtml(content);
    const plainText = markdownToPlainText(content);
    
    return {
      description: html,
      text_content: plainText
    };
  }
  
  // If content is already HTML, use as-is
  if (isHtml(content)) {
    const plainText = htmlToMarkdown(content);
    
    return {
      description: content,
      text_content: markdownToPlainText(plainText)
    };
  }
  
  // Plain text content
  return {
    description: content,
    text_content: content
  };
}

/**
 * Process ClickUp response content for display
 * Converts HTML to markdown for better readability
 * @param response ClickUp API response with description/text_content
 * @returns Processed content with markdown formatting
 */
export function processClickUpResponse(response: any): any {
  if (!response || typeof response !== 'object') {
    return response;
  }
  
  const processed = { ...response };
  
  // Process description field
  if (processed.description && isHtml(processed.description)) {
    processed.description_markdown = htmlToMarkdown(processed.description);
  }
  
  // Process comment fields
  if (processed.comment_text && processed.comment && Array.isArray(processed.comment)) {
    // ClickUp comments come as rich text blocks, try to convert to markdown
    try {
      const htmlContent = processed.comment.map((block: any) => {
        if (typeof block === 'string') return block;
        if (block.text) return block.text;
        return '';
      }).join('');
      
      if (htmlContent && isHtml(htmlContent)) {
        processed.comment_markdown = htmlToMarkdown(htmlContent);
      }
    } catch (error) {
      console.warn('Failed to process comment blocks:', error);
    }
  }
  
  return processed;
}
