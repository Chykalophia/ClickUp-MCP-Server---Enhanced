/**
 * ClickUp Comment Formatting Utility
 * Handles ClickUp's specific comment format structure with text blocks and attributes
 * Based on: https://developer.clickup.com/docs/comment-formatting
 */

export interface ClickUpCommentBlock {
  text: string;
  attributes?: {
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
    'code-block'?: {
      'code-block': string;
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
      // const level = line.match(/^#+/)?.[0].length || 1;
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
 * Convert markdown text to plain text by stripping all markdown formatting
 * @param markdown The markdown text to convert
 * @returns Plain text without any markdown formatting
 */
export function markdownToPlainText(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  let plainText = markdown;

  // Remove headers
  plainText = plainText.replace(/^#{1,6}\s+/gm, '');
  
  // Remove bold and italic
  plainText = plainText.replace(/\*\*([^*]+)\*\*/g, '$1');
  plainText = plainText.replace(/\*([^*]+)\*/g, '$1');
  plainText = plainText.replace(/__([^_]+)__/g, '$1');
  plainText = plainText.replace(/_([^_]+)_/g, '$1');
  
  // Remove strikethrough
  plainText = plainText.replace(/~~([^~]+)~~/g, '$1');
  
  // Remove inline code
  plainText = plainText.replace(/`([^`]+)`/g, '$1');
  
  // Remove code blocks
  plainText = plainText.replace(/```[\s\S]*?```/g, (match) => {
    // Extract just the code content, remove the ``` markers
    const lines = match.split('\n');
    return lines.slice(1, -1).join('\n');
  });
  
  // Remove links, keep just the text
  plainText = plainText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Remove blockquotes
  plainText = plainText.replace(/^>\s*/gm, '');
  
  // Convert list items to simple bullets
  plainText = plainText.replace(/^[-*+]\s+/gm, '• ');
  plainText = plainText.replace(/^\d+\.\s+/gm, '• ');
  
  // Clean up extra whitespace
  plainText = plainText.replace(/\n{3,}/g, '\n\n');
  plainText = plainText.trim();
  
  return plainText;
}

/**
 * Clean up duplicate content in ClickUp's comment_text field
 * ClickUp sometimes duplicates content when processing structured comments
 * @param commentText The comment_text field from ClickUp API response
 * @returns Cleaned comment text without duplication
 */
export function cleanDuplicateCommentText(commentText: string): string {
  if (!commentText || typeof commentText !== 'string') {
    return commentText;
  }

  // ClickUp often appends the original markdown at the end after the processed text
  // Look for patterns where the same content appears twice
  
  // First, try to find if there's a clear markdown pattern at the end
  // ClickUp typically appends content that starts with markdown headers or formatting
  const markdownPatterns = [
    /🎉 \*\*.*?\*\*/, // Emoji + bold pattern
    /🔧 \*\*.*?\*\*/, // Emoji + bold pattern
    /🎯 \*\*.*?\*\*/, // Emoji + bold pattern
    /### .*?\*\*/, // Header + bold pattern
    /## .*?\*\*/, // Header + bold pattern
    /# .*?\*\*/ // Header + bold pattern
  ];
  
  for (const pattern of markdownPatterns) {
    const matches = commentText.match(new RegExp(pattern.source, 'g'));
    if (matches && matches.length >= 2) {
      // Found duplicate pattern, try to find the split point
      const firstMatch = commentText.indexOf(matches[0]);
      const lastMatch = commentText.lastIndexOf(matches[matches.length - 1]);
      
      if (firstMatch !== lastMatch) {
        // There are multiple occurrences, likely a duplication
        // Keep everything up to the last occurrence of the first match
        const splitPoint = commentText.indexOf(matches[0], firstMatch + 1);
        if (splitPoint > 0) {
          return commentText.substring(0, splitPoint).trim();
        }
      }
    }
  }
  
  // Alternative approach: look for the pattern where content is repeated
  // Split by common separators and look for duplicates
  const lines = commentText.split('\n');
  const totalLines = lines.length;
  
  if (totalLines > 6) {
    // Look for a point where content starts repeating
    for (let i = Math.floor(totalLines / 3); i < Math.floor(totalLines * 2 / 3); i++) {
      const beforeSplit = lines.slice(0, i).join('\n');
      const afterSplit = lines.slice(i).join('\n');
      
      // Check if the after split contains similar content to before split
      if (afterSplit.length > beforeSplit.length * 0.5 && 
          beforeSplit.length > 50 && 
          afterSplit.includes(lines[0]) && 
          afterSplit.includes(lines[1])) {
        return beforeSplit.trim();
      }
    }
  }
  
  // Last resort: check for exact duplicates by splitting in half
  const length = commentText.length;
  if (length > 100) {
    const midPoint = Math.floor(length / 2);
    const firstHalf = commentText.substring(0, midPoint);
    const secondHalf = commentText.substring(midPoint);
    
    // Check if second half starts with similar content to first half
    const firstLines = firstHalf.split('\n').slice(0, 3);
    const secondLines = secondHalf.split('\n').slice(0, 3);
    
    let similarity = 0;
    for (let i = 0; i < Math.min(firstLines.length, secondLines.length); i++) {
      if (firstLines[i].trim() && secondLines[i].includes(firstLines[i].trim().substring(0, 20))) {
        similarity++;
      }
    }
    
    if (similarity >= 2) {
      return firstHalf.trim();
    }
  }
  
  return commentText;
}

/**
 * Process a comment response from ClickUp to clean up any duplication issues
 * @param comment The comment object from ClickUp API
 * @returns Cleaned comment object
 */
export function cleanClickUpCommentResponse(comment: any): any {
  if (!comment || typeof comment !== 'object') {
    return comment;
  }

  const cleaned = { ...comment };
  
  // Clean up comment_text field if it exists
  if (cleaned.comment_text && typeof cleaned.comment_text === 'string') {
    cleaned.comment_text = cleanDuplicateCommentText(cleaned.comment_text);
  }
  
  // Clean up comment_markdown field if it exists
  if (cleaned.comment_markdown && typeof cleaned.comment_markdown === 'string') {
    cleaned.comment_markdown = cleanDuplicateCommentText(cleaned.comment_markdown);
  }
  
  return cleaned;
}

/**
 * Ensure proper newline separation before code blocks
 * ClickUp requires a newline before code blocks to prevent them from being merged with previous text
 * @param blocks Array of comment blocks to process
 * @returns Processed array with proper newline separation
 */
export function ensureCodeBlockSeparation(blocks: ClickUpCommentBlock[]): ClickUpCommentBlock[] {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return blocks;
  }

  const processedBlocks: ClickUpCommentBlock[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const currentBlock = blocks[i];
    const previousBlock = i > 0 ? blocks[i - 1] : null;

    // Check if current block is a code block
    const isCodeBlock = currentBlock.attributes && 
      (currentBlock.attributes['code-block'] || currentBlock.attributes.code);

    // If this is a code block and there's a previous block
    if (isCodeBlock && previousBlock) {
      // Check if the previous block ends with a newline
      const previousText = previousBlock.text || '';
      const endsWithNewline = previousText.endsWith('\n');

      if (!endsWithNewline) {
        // Add newline to the previous block's text
        const updatedPreviousBlock = {
          ...previousBlock,
          text: `${previousText }\n`,
          attributes: previousBlock.attributes || {}
        };
        
        // Replace the previous block in our processed array
        if (processedBlocks.length > 0) {
          processedBlocks[processedBlocks.length - 1] = updatedPreviousBlock;
        }
      }
    }

    processedBlocks.push({
      ...currentBlock,
      attributes: currentBlock.attributes || {}
    });
  }

  return processedBlocks;
}

/**
 * Prepare comment content for ClickUp API submission
 * Supports both simple text and markdown input
 * @param content The content to prepare (markdown or plain text)
 * @returns Object with ONLY structured comment format (no comment_text to avoid duplication)
 */
export function prepareCommentForClickUp(content: string): {
  comment: ClickUpCommentBlock[];
} {
  if (!content || typeof content !== 'string') {
    return { 
      comment: [{ text: '', attributes: {} }]
    };
  }

  // Check if content contains markdown formatting
  const hasMarkdown = /[*_`~#[\]()>-]/.test(content) || content.includes('```');
  
  if (hasMarkdown) {
    const formatted = parseMarkdownToClickUpComment(content);
    return {
      comment: ensureCodeBlockSeparation(formatted.comment)
    };
  } 
  // Simple plain text
  return {
    comment: [{ text: content, attributes: {} }]
  };
  
}

/**
 * Process structured comment blocks to ensure proper code block separation
 * This function should be called on any structured comment array before sending to ClickUp
 * @param blocks Array of comment blocks
 * @returns Processed array with proper newline separation before code blocks
 */
export function processCommentBlocks(blocks: ClickUpCommentBlock[]): ClickUpCommentBlock[] {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return blocks;
  }

  // First, ensure all blocks have attributes (even if empty)
  const normalizedBlocks = blocks.map(block => ({
    ...block,
    attributes: block.attributes || {}
  }));

  return ensureCodeBlockSeparation(normalizedBlocks);
}
