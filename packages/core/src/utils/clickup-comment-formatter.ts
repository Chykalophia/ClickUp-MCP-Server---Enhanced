/* eslint-disable max-len */
/**
 * ClickUp Comment Formatting Utility
 * Handles ClickUp's specific comment format structure with text blocks and attributes
 * Based on: https://developer.clickup.com/docs/comment-formatting
 */

import { validateUrl } from './security.js';

export interface ClickUpCommentBlock {
  text?: string;
  type?: string;
  user?: {
    id: number;
    [key: string]: unknown;
  };
  emoticon?: {
    code: string;
    [key: string]: unknown;
  };
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
    // Block-level attributes. ClickUp carries these on the '\n' that terminates
    // a line, not on the line's text. All verified against the live API.
    header?: number;
    list?: {
      list: 'bullet' | 'ordered' | 'checked' | 'unchecked' | string;
    };
    blockquote?: boolean;
    'code-block'?: {
      'code-block': string;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ClickUpCommentFormat {
  comment: ClickUpCommentBlock[];
}

/**
 * Inline @mention syntax accepted inside markdown comment text:
 * `@[Display Name](<numeric user id>)`. Same spelling the first-party ClickUp
 * MCP uses, so a caller can mention someone without dropping to a hand-built
 * block array — and therefore without giving up markdown in the rest of the
 * comment. The id must be digits only; `[text](url)` with anything else in the
 * parentheses stays an ordinary link.
 */
const INLINE_MENTION_PATTERN = /^@\[([^\]]+)\]\((\d+)\)$/;

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

  // One capturing group only — the whole token. Inner groups are non-capturing
  // because String.split emits every capture, and the link alternative's inner
  // groups used to leak the bare URL back into the output as a stray text block.
  // The mention alternative comes first so `@[Name](123)` wins over the link
  // alternative, which would otherwise match `[Name](123)` and orphan the `@`.
  const parts = markdown.split(
    /(@\[[^\]]+\]\(\d+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|~~[^~]+~~|__[^_]+__|_[^_]+_|\[[^\]]+\]\([^)]+\))/g
  );

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    // @mention: @[Display Name](userId) -> tag block, not a link
    const mention = part.match(INLINE_MENTION_PATTERN);
    if (mention) {
      const [, displayName, userId] = mention;
      // Combined shape ({type, text, user}) is the most defensive of the three
      // ClickUp accepts: the id drives the notification, the text keeps the
      // name if a surface renders the block literally.
      blocks.push({
        type: 'tag',
        text: `@${displayName}`,
        user: { id: Number(userId) },
      });
    }
    // Bold text: **text**
    else if (part.startsWith('**') && part.endsWith('**')) {
      const text = part.slice(2, -2);
      blocks.push({
        text,
        attributes: { bold: true },
      });
    }
    // Italic text: *text* or _text_
    else if (
      (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) ||
      (part.startsWith('_') && part.endsWith('_') && !part.startsWith('__'))
    ) {
      const text = part.slice(1, -1);
      blocks.push({
        text,
        attributes: { italic: true },
      });
    }
    // Underline: __text__
    else if (part.startsWith('__') && part.endsWith('__')) {
      const text = part.slice(2, -2);
      blocks.push({
        text,
        attributes: { underline: true },
      });
    }
    // Strikethrough: ~~text~~
    else if (part.startsWith('~~') && part.endsWith('~~')) {
      const text = part.slice(2, -2);
      blocks.push({
        text,
        attributes: { strikethrough: true },
      });
    }
    // Inline code: `text`
    else if (part.startsWith('`') && part.endsWith('`')) {
      const text = part.slice(1, -1);
      blocks.push({
        text,
        attributes: { code: true },
      });
    }
    // Links: [text](url) - check if this is a link match
    else if (part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)) {
      const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (match) {
        const [, linkText, url] = match;
        blocks.push({
          text: linkText,
          attributes: { link: { url } },
        });
      }
    }
    // Plain text
    else {
      if (part.trim()) {
        blocks.push({
          text: part,
          attributes: {},
        });
      }
    }
  }

  // If no blocks were created, add the original text as plain text
  if (blocks.length === 0) {
    blocks.push({
      text: markdown,
      attributes: {},
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

  const inline = (block: ClickUpCommentBlock): string => {
    if (block.type === 'tag') {
      const name = (block.text ?? '').replace(/^@/, '');
      return typeof block.user?.id === 'number' && name
        ? `@[${name}](${block.user.id})`
        : (block.text ?? '');
    }

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
  };

  // A '\n' block carries the finished line's block-level formatting, so lines
  // are buffered and only spelled out as markdown once their terminator says
  // what kind of line they were.
  const lines: string[] = [];
  let current = '';
  let ordinal = 0;

  for (const block of commentFormat.comment) {
    if (block.text !== '\n') {
      current += inline(block);
      continue;
    }

    const attrs = block.attributes || {};
    const listKind = attrs.list?.list;

    if (typeof attrs.header === 'number') {
      lines.push(`${'#'.repeat(attrs.header)} ${current}`);
    } else if (listKind === 'ordered') {
      lines.push(`${(ordinal += 1)}. ${current}`);
    } else if (listKind === 'checked' || listKind === 'unchecked') {
      lines.push(`- [${listKind === 'checked' ? 'x' : ' '}] ${current}`);
    } else if (listKind) {
      lines.push(`- ${current}`);
    } else if (attrs.blockquote) {
      lines.push(`> ${current}`);
    } else if (attrs['code-block']) {
      const language = attrs['code-block']['code-block'] ?? '';
      lines.push(`\`\`\`${language === 'plain' ? '' : language}\n${current}\n\`\`\``);
    } else {
      lines.push(current);
    }

    if (listKind !== 'ordered') {
      ordinal = 0;
    }
    current = '';
  }

  if (current) {
    lines.push(current);
  }

  return lines.join('\n');
}

/**
 * Create a simple plain text comment in ClickUp format
 * @param text Plain text content
 * @returns ClickUp comment format structure
 */
export function createPlainTextComment(text: string): ClickUpCommentFormat {
  return {
    comment: [
      {
        text: text || '',
        attributes: {},
      },
    ],
  };
}

/**
 * Create a bold text comment in ClickUp format
 * @param text Text to make bold
 * @returns ClickUp comment format structure
 */
export function createBoldComment(text: string): ClickUpCommentFormat {
  return {
    comment: [
      {
        text: text || '',
        attributes: { bold: true },
      },
    ],
  };
}

/**
 * Create an italic text comment in ClickUp format
 * @param text Text to make italic
 * @returns ClickUp comment format structure
 */
export function createItalicComment(text: string): ClickUpCommentFormat {
  return {
    comment: [
      {
        text: text || '',
        attributes: { italic: true },
      },
    ],
  };
}

/**
 * Create a code text comment in ClickUp format
 * @param text Text to format as code
 * @returns ClickUp comment format structure
 */
export function createCodeComment(text: string): ClickUpCommentFormat {
  return {
    comment: [
      {
        text: text || '',
        attributes: { code: true },
      },
    ],
  };
}

/**
 * Create a link comment in ClickUp format
 * @param text Link text
 * @param url Link URL
 * @returns ClickUp comment format structure
 */
export function createLinkComment(text: string, url: string): ClickUpCommentFormat {
  // Validate URL for security
  const urlValidation = validateUrl(url);
  if (!urlValidation.isValid) {
    throw new Error(`Invalid URL: ${urlValidation.error}`);
  }

  return {
    comment: [
      {
        text: text || '',
        attributes: { link: { url } },
      },
    ],
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

  // ClickUp carries block-level formatting on the newline that TERMINATES the
  // line, not on the line's text. So a heading is the heading text followed by
  // {text:'\n', attributes:{header:1}}. Every one of these was verified against
  // the live API — ClickUp echoes header/list/blockquote/code-block back
  // unchanged. The line break is mandatory for a block-typed line, including
  // the last line of the comment, or the formatting is lost.
  const pushLine = (text: string, lineAttributes: ClickUpCommentBlock['attributes'] = {}): void => {
    blocks.push(...markdownToClickUpComment(text).comment);
    blocks.push({ text: '\n', attributes: lineAttributes });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      // Add line break for empty lines (except at the end)
      if (i < lines.length - 1) {
        blocks.push({ text: '\n', attributes: {} });
      }
      continue;
    }

    // Handle headers -> real ClickUp heading, not bold text.
    // ClickUp's editor offers three levels; deeper markdown headings clamp to 3.
    const header = line.match(/^(#{1,6})\s+(.*)$/);
    if (header) {
      const [, hashes, headerText] = header;
      pushLine(headerText, { header: Math.min(hashes.length, 3) });
      continue;
    }

    // Handle list items -> real bullet/ordered list blocks.
    // The old code replaced the marker with a literal '• ' character, which
    // rendered as a bullet-shaped glyph in a paragraph rather than a list, and
    // its `^[-*+\d.]\s*` pattern stripped only the FIRST character of an
    // ordered marker, so `1. Item` became `• . Item`.
    const bullet = line.match(/^[-*+]\s+(.*)$/);
    if (bullet) {
      pushLine(bullet[1], { list: { list: 'bullet' } });
      continue;
    }

    const ordered = line.match(/^\d+[.)]\s+(.*)$/);
    if (ordered) {
      pushLine(ordered[1], { list: { list: 'ordered' } });
      continue;
    }

    // Handle blockquotes -> real blockquote block, not a literal '> ' prefix
    if (line.startsWith('>')) {
      pushLine(line.replace(/^>\s*/, ''), { blockquote: true });
      continue;
    }

    // Handle fenced code blocks -> real code block, not the inline-code
    // attribute. The fence's language rides along; ClickUp defaults to 'plain'.
    if (line.startsWith('```')) {
      const language = line.slice(3).trim() || 'plain';
      const codeLines = [];
      i++; // Skip the opening ```
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }

      if (codeLines.length > 0) {
        blocks.push({ text: codeLines.join('\n'), attributes: {} });
        blocks.push({ text: '\n', attributes: { 'code-block': { 'code-block': language } } });
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
  plainText = plainText.replace(/```[\s\S]*?```/g, match => {
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
    /# .*?\*\*/, // Header + bold pattern
  ];

  for (const pattern of markdownPatterns) {
    // Prevent ReDoS by limiting input length
    const maxLength = 10000;
    if (commentText.length > maxLength) {
      continue; // Skip processing for overly long text
    }

    try {
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
    } catch {
      // Skip pattern if regex fails
      continue;
    }
  }

  // Alternative approach: look for the pattern where content is repeated
  // Split by common separators and look for duplicates
  const lines = commentText.split('\n');
  const totalLines = lines.length;

  if (totalLines > 6) {
    // Look for a point where content starts repeating
    for (let i = Math.floor(totalLines / 3); i < Math.floor((totalLines * 2) / 3); i++) {
      const beforeSplit = lines.slice(0, i).join('\n');
      const afterSplit = lines.slice(i).join('\n');

      // Check if the after split contains similar content to before split
      if (
        afterSplit.length > beforeSplit.length * 0.5 &&
        beforeSplit.length > 50 &&
        afterSplit.includes(lines[0]) &&
        afterSplit.includes(lines[1])
      ) {
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

  // Tag and emoticon blocks reference users/emojis by id and should not carry
  // an `attributes` field per ClickUp's spec — preserve their shape exactly.
  const shouldKeepShape = (block: ClickUpCommentBlock): boolean =>
    block.type === 'tag' || block.type === 'emoticon';

  const processedBlocks: ClickUpCommentBlock[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const currentBlock = blocks[i];
    const previousBlock = i > 0 ? blocks[i - 1] : null;

    // Check if current block is a code block.
    // Inline `code` used to count here, which broke list items: in
    // "- `x` in a list" the separator was injected into the bullet's own text
    // block, splitting the line. And a bare '\n' marker carrying the code-block
    // attribute IS the terminator of a code block, so it needs no separator of
    // its own — that added a blank line inside every fenced block.
    const isCodeBlock = Boolean(
      currentBlock.attributes && currentBlock.attributes['code-block'] && currentBlock.text !== '\n'
    );

    // If this is a code block and there's a previous block
    if (isCodeBlock && previousBlock) {
      // Check if the previous block ends with a newline
      const previousText = previousBlock.text || '';
      const endsWithNewline = previousText.endsWith('\n');

      if (!endsWithNewline) {
        const updatedPreviousBlock: ClickUpCommentBlock = shouldKeepShape(previousBlock)
          ? { ...previousBlock, text: `${previousText}\n` }
          : {
              ...previousBlock,
              text: `${previousText}\n`,
              attributes: previousBlock.attributes || {},
            };

        // Replace the previous block in our processed array
        if (processedBlocks.length > 0) {
          processedBlocks[processedBlocks.length - 1] = updatedPreviousBlock;
        }
      }
    }

    processedBlocks.push(
      shouldKeepShape(currentBlock)
        ? { ...currentBlock }
        : { ...currentBlock, attributes: currentBlock.attributes || {} }
    );
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
      comment: [{ text: '', attributes: {} }],
    };
  }

  // Check if content contains actual markdown formatting patterns (not just individual characters)
  const hasMarkdown =
    // Kept in step with the line handlers in parseMarkdownToClickUpComment:
    // anything that function treats as a block must be detected here, or the
    // content takes the plain-text path and the markup posts literally.
    /(\*\*.+?\*\*|__.+?__|`.+?`|~~.+?~~|^#{1,6}\s|\[.+?\]\(.+?\)|^>\s|^[-*+]\s|^\d+[.)]\s|```)/m.test(
      content
    );

  if (hasMarkdown) {
    const formatted = parseMarkdownToClickUpComment(content);
    return {
      comment: ensureCodeBlockSeparation(formatted.comment),
    };
  }
  // Simple plain text
  return {
    comment: [{ text: content, attributes: {} }],
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

  // Normalize attributes for plain/formatted text blocks. Tag and emoticon
  // blocks are preserved as-sent — they don't carry attributes per the API spec.
  const normalizedBlocks = blocks.map(block =>
    block.type === 'tag' || block.type === 'emoticon'
      ? { ...block }
      : { ...block, attributes: block.attributes || {} }
  );

  return ensureCodeBlockSeparation(normalizedBlocks);
}
