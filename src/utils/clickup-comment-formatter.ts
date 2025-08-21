/**
 * ClickUp Comment Formatting Utility
 * Handles ClickUp's specific comment format structure with text blocks and attributes
 * Based on: https://developer.clickup.com/docs/comment-formatting
 */

export interface ClickUpCommentBlock {
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

export interface ClickUpCommentFormat {
  comment: ClickUpCommentBlock[];
}

/**
 * Convert markdown text to ClickUp's structured comment format
 * @param markdown The markdown text to convert
 * @returns ClickUp comment format structure
 */
export function markdownToClickUpComment(markdown: string): ClickUpCommentFormat {
  if (!markdown || typeof markdown !== 'string') {
    return { comment: [{ text: '', attributes: {} }] };
  }

  const blocks: ClickUpCommentBlock[] = [];
  
  // Improved regex pattern that properly captures links
  const parts = markdown.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|~~[^~]+~~|__[^_]+__|_[^_]+_|\[([^\]]+)\]\(([^)]+)\))/g);
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    
    // Bold text: **text**
    if (part.startsWith('**') && part.endsWith('**')) {
      const text = part.slice(2, -2);
      blocks.push({
        text,
        attributes: { bold: true }
      });
    }
    // Italic text: *text* or _text_
    else if ((part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) ||
             (part.startsWith('_') && part.endsWith('_') && !part.startsWith('__'))) {
      const text = part.slice(1, -1);
      blocks.push({
        text,
        attributes: { italic: true }
      });
    }
    // Underline: __text__
    else if (part.startsWith('__') && part.endsWith('__')) {
      const text = part.slice(2, -2);
      blocks.push({
        text,
        attributes: { underline: true }
      });
    }
    // Strikethrough: ~~text~~
    else if (part.startsWith('~~') && part.endsWith('~~')) {
      const text = part.slice(2, -2);
      blocks.push({
        text,
        attributes: { strikethrough: true }
      });
    }
    // Inline code: `text`
    else if (part.startsWith('`') && part.endsWith('`')) {
      const text = part.slice(1, -1);
      blocks.push({
        text,
        attributes: { code: true }
      });
    }
    // Links: [text](url) - check if this is a link match
    else if (part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)) {
      const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (match) {
        const [, linkText, url] = match;
        blocks.push({
          text: linkText,
          attributes: { link: { url } }
        });
      }
    }
    // Check if this is a captured group from link regex (skip these)
    else if (i > 0 && parts[i-1] && parts[i-1].match(/^\[([^\]]+)\]\(([^)]+)\)$/)) {
      // This is a captured group from the link regex, skip it
      continue;
    }
    // Plain text
    else {
      if (part.trim()) {
        blocks.push({
          text: part,
          attributes: {}
        });
      }
    }
  }

  // If no blocks were created, add the original text as plain text
  if (blocks.length === 0) {
    blocks.push({
      text: markdown,
      attributes: {}
    });
  }

  return { comment: blocks };
}

/**
 * Convert ClickUp comment format back to markdown
 * @param commentFormat ClickUp comment format structure
 * @returns Markdown string
 */
export function clickUpCommentToMarkdown(commentFormat: ClickUpCommentFormat): string {
  if (!commentFormat?.comment || !Array.isArray(commentFormat.comment)) {
    return '';
  }

  return commentFormat.comment.map(block => {
    let text = block.text || '';
    const attrs = block.attributes || {};

    // Apply formatting based on attributes
    if (attrs.bold) {
      text = `**${text}**`;
    }
    if (attrs.italic) {
      text = `*${text}*`;
    }
    if (attrs.underline) {
      text = `__${text}__`;
    }
    if (attrs.strikethrough) {
      text = `~~${text}~~`;
    }
    if (attrs.code) {
      text = `\`${text}\``;
    }
    if (attrs.link) {
      text = `[${text}](${attrs.link.url})`;
    }

    return text;
  }).join('');
}

/**
 * Create a simple plain text comment in ClickUp format
 * @param text Plain text content
 * @returns ClickUp comment format structure
 */
export function createPlainTextComment(text: string): ClickUpCommentFormat {
  return {
    comment: [{
      text: text || '',
      attributes: {}
    }]
  };
}

/**
 * Create a bold text comment in ClickUp format
 * @param text Text to make bold
 * @returns ClickUp comment format structure
 */
export function createBoldComment(text: string): ClickUpCommentFormat {
  return {
    comment: [{
      text: text || '',
      attributes: { bold: true }
    }]
  };
}

/**
 * Create an italic text comment in ClickUp format
 * @param text Text to make italic
 * @returns ClickUp comment format structure
 */
export function createItalicComment(text: string): ClickUpCommentFormat {
  return {
    comment: [{
      text: text || '',
      attributes: { italic: true }
    }]
  };
}

/**
 * Create a code text comment in ClickUp format
 * @param text Text to format as code
 * @returns ClickUp comment format structure
 */
export function createCodeComment(text: string): ClickUpCommentFormat {
  return {
    comment: [{
      text: text || '',
      attributes: { code: true }
    }]
  };
}

/**
 * Create a link comment in ClickUp format
 * @param text Link text
 * @param url Link URL
 * @returns ClickUp comment format structure
 */
export function createLinkComment(text: string, url: string): ClickUpCommentFormat {
  return {
    comment: [{
      text: text || '',
      attributes: { link: { url } }
    }]
  };
}

/**
 * Combine multiple comment blocks into a single comment
 * @param blocks Array of comment blocks
 * @returns ClickUp comment format structure
 */
export function combineCommentBlocks(blocks: ClickUpCommentBlock[]): ClickUpCommentFormat {
  return { comment: blocks };
}

/**
 * Parse complex markdown and convert to ClickUp comment format
 * This handles more complex scenarios like mixed formatting
 * @param markdown Markdown text
 * @returns ClickUp comment format structure
 */
export function parseMarkdownToClickUpComment(markdown: string): ClickUpCommentFormat {
  if (!markdown || typeof markdown !== 'string') {
    return createPlainTextComment('');
  }

  // Handle line breaks and paragraphs
  const lines = markdown.split('\n');
  const blocks: ClickUpCommentBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      // Add line break for empty lines (except at the end)
      if (i < lines.length - 1) {
        blocks.push({ text: '\n', attributes: {} });
      }
      continue;
    }

    // Handle headers
    if (line.startsWith('#')) {
      const level = line.match(/^#+/)?.[0].length || 1;
      const headerText = line.replace(/^#+\s*/, '');
      blocks.push({
        text: headerText,
        attributes: { bold: true } // ClickUp doesn't have header formatting, use bold
      });
      blocks.push({ text: '\n', attributes: {} });
      continue;
    }

    // Handle list items
    if (line.match(/^[-*+]\s+/) || line.match(/^\d+\.\s+/)) {
      const listText = line.replace(/^[-*+\d.]\s*/, '• ');
      const converted = markdownToClickUpComment(listText);
      blocks.push(...converted.comment);
      blocks.push({ text: '\n', attributes: {} });
      continue;
    }

    // Handle blockquotes
    if (line.startsWith('>')) {
      const quoteText = line.replace(/^>\s*/, '');
      blocks.push({ text: '> ', attributes: {} });
      const converted = markdownToClickUpComment(quoteText);
      blocks.push(...converted.comment);
      blocks.push({ text: '\n', attributes: {} });
      continue;
    }

    // Handle code blocks
    if (line.startsWith('```')) {
      // For code blocks, we'll treat the content as code
      const codeLines = [];
      i++; // Skip the opening ```
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      
      if (codeLines.length > 0) {
        blocks.push({
          text: codeLines.join('\n'),
          attributes: { code: true }
        });
        blocks.push({ text: '\n', attributes: {} });
      }
      continue;
    }

    // Handle regular text with inline formatting
    const converted = markdownToClickUpComment(line);
    blocks.push(...converted.comment);
    
    // Add line break if not the last line
    if (i < lines.length - 1) {
      blocks.push({ text: '\n', attributes: {} });
    }
  }

  return { comment: blocks };
}

/**
 * Prepare comment content for ClickUp API submission
 * Supports both simple text and markdown input
 * @param content The content to prepare (markdown or plain text)
 * @returns Object with ClickUp comment format and fallback text
 */
export function prepareCommentForClickUp(content: string): {
  comment: ClickUpCommentBlock[];
  comment_text?: string; // Fallback for simple text
} {
  if (!content || typeof content !== 'string') {
    return { comment: [{ text: '', attributes: {} }] };
  }

  // Check if content contains markdown formatting
  const hasMarkdown = /[*_`~#\[\]()>-]/.test(content) || content.includes('```');
  
  if (hasMarkdown) {
    const formatted = parseMarkdownToClickUpComment(content);
    return {
      comment: formatted.comment,
      comment_text: content // Keep original as fallback
    };
  } else {
    // Simple plain text
    return {
      comment: [{ text: content, attributes: {} }],
      comment_text: content
    };
  }
}
