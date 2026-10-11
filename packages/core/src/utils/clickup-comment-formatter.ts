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
    // ClickUp's comment-formatting reference documents the link attribute as a
    // plain URL string ("link": "https://..."), which is what this module
    // writes. The `{url}` object form is still accepted on read because
    // comments written by older versions of this server used it.
    link?: string | { url: string };
    // Block-level attributes. ClickUp carries these on the '\n' that terminates
    // a line, not on the line's text. All verified against the live API.
    header?: number;
    list?: {
      list: 'bullet' | 'ordered' | 'checked' | 'unchecked' | string;
    };
    indent?: number;
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
 * Inline token pattern. Every alternative is non-capturing because the whole
 * token is wrapped in ONE capture for String.split, which emits every capture
 * (inner groups used to leak the bare URL of a link back into the output as a
 * stray text block).
 *
 * Order matters at a given position: the mention wins over the link so
 * `@[Name](123)` is not read as a link with an orphaned `@`, and `***x***`
 * (bold + italic) is tried before `**x**`.
 *
 * Emphasis delimiters follow the GFM flanking rules closely enough for the
 * common cases: the content may not start or end with whitespace (so
 * `2 * 3 * 4` is not italic), and `_x_` / `__x__` only count when the
 * underscores are not inside a word (so `snake_case_name` and URLs such as
 * `https://x.com/a_b_c` stay literal).
 */
const INLINE_TOKEN_SOURCE = [
  String.raw`@\[[^\]]+\]\(\d+\)`, // @[Name](123) mention
  String.raw`\[[^\]]+\]\([^)\s]+\)`, // [text](url) link
  '`[^`]+`', // `code`
  String.raw`\*\*\*[^*\s](?:[^*]*[^*\s])?\*\*\*`, // ***bold italic***
  String.raw`\*\*[^\s*](?:.*?[^\s*])?\*\*`, // **bold** (may contain *italic*)
  String.raw`(?<![A-Za-z0-9_])__[^_\s](?:[^_]*[^_\s])?__(?![A-Za-z0-9_])`, // __underline__
  String.raw`~~[^~\s](?:[^~]*[^~\s])?~~`, // ~~strike~~
  String.raw`\*[^*\s](?:[^*]*[^*\s])?\*`, // *italic*
  String.raw`(?<![A-Za-z0-9_])_[^_\s](?:[^_]*[^_\s])?_(?![A-Za-z0-9_])`, // _italic_
].join('|');

type InlineAttributes = NonNullable<ClickUpCommentBlock['attributes']>;

/**
 * Tokenize inline markdown into ClickUp text blocks. Emphasis and link tokens
 * are tokenized recursively so nested formatting survives:
 * `**bold [link](u)**` becomes a bold text block plus a bold+link block, and
 * `` **use `x`** `` keeps `x` as bold inline code.
 */
function tokenizeInline(markdown: string, inherited: InlineAttributes = {}): ClickUpCommentBlock[] {
  const blocks: ClickUpCommentBlock[] = [];
  const parts = markdown.split(new RegExp(`(${INLINE_TOKEN_SOURCE})`, 'g'));

  const nested = (inner: string, add: InlineAttributes): void => {
    blocks.push(...tokenizeInline(inner, { ...inherited, ...add }));
  };

  for (const part of parts) {
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
      continue;
    }

    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      // ClickUp's comment-formatting reference documents the link attribute
      // as a plain URL string: "attributes": {"link": "https://..."}.
      nested(link[1], { link: link[2] });
      continue;
    }

    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
      blocks.push({ text: part.slice(1, -1), attributes: { ...inherited, code: true } });
    } else if (part.length > 6 && part.startsWith('***') && part.endsWith('***')) {
      nested(part.slice(3, -3), { bold: true, italic: true });
    } else if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
      nested(part.slice(2, -2), { bold: true });
    } else if (part.length > 4 && part.startsWith('__') && part.endsWith('__')) {
      nested(part.slice(2, -2), { underline: true });
    } else if (part.length > 4 && part.startsWith('~~') && part.endsWith('~~')) {
      nested(part.slice(2, -2), { strikethrough: true });
    } else if (
      part.length > 2 &&
      ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_')))
    ) {
      nested(part.slice(1, -1), { italic: true });
    } else {
      // Whitespace-only parts are kept: dropping them ran adjacent tokens
      // together ("**a** *b*" posted as "ab").
      blocks.push({ text: part, attributes: { ...inherited } });
    }
  }

  return blocks;
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

  const blocks = tokenizeInline(markdown);

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
 * Read a comment link attribute in either shape. ClickUp documents (and this
 * module writes) a plain URL string; older versions of this server wrote
 * `{url}`, and comments created that way may still come back in that shape.
 */
export function readLinkAttribute(link: unknown): string | undefined {
  if (typeof link === 'string') return link;
  if (link && typeof link === 'object' && typeof (link as { url?: unknown }).url === 'string') {
    return (link as { url: string }).url;
  }
  return undefined;
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
      const rawName =
        block.text || (typeof block.user?.username === 'string' ? block.user.username : '');
      const name = rawName.replace(/^@/, '');
      return typeof block.user?.id === 'number' && name
        ? `@[${name}](${block.user.id})`
        : (block.text ?? '');
    }

    if (block.type === 'emoticon' && !block.text && block.emoticon?.code) {
      // Emoticon blocks may carry only the code point ("1f600"); spell the
      // emoji out rather than dropping it.
      try {
        return block.emoticon.code
          .split('-')
          .map(code => String.fromCodePoint(parseInt(code, 16)))
          .join('');
      } catch {
        return '';
      }
    }

    const attrs = block.attributes || {};
    const raw = block.text || '';
    const hasEmphasis = Boolean(
      attrs.bold || attrs.italic || attrs.underline || attrs.strikethrough
    );
    // Markdown emphasis may not open or close on whitespace ("**run **" is not
    // bold), so edge whitespace is moved outside the delimiters.
    const lead = hasEmphasis ? (raw.match(/^\s*/)?.[0] ?? '') : '';
    const trail = hasEmphasis && raw.trim() ? (raw.match(/\s*$/)?.[0] ?? '') : '';
    let text = hasEmphasis ? raw.slice(lead.length, raw.length - trail.length) : raw;
    if (hasEmphasis && !text) {
      return raw;
    }

    // Innermost first so combinations nest validly: `code` inside emphasis,
    // emphasis inside the link text.
    if (attrs.code) {
      text = `\`${text}\``;
    }
    if (attrs.strikethrough) {
      text = `~~${text}~~`;
    }
    if (attrs.underline) {
      text = `__${text}__`;
    }
    if (attrs.italic) {
      text = `*${text}*`;
    }
    if (attrs.bold) {
      text = `**${text}**`;
    }
    const url = readLinkAttribute(attrs.link);
    if (url) {
      text = `[${text}](${url})`;
    }

    return `${lead}${text}${trail}`;
  };

  // A '\n' block carries the finished line's block-level formatting, so lines
  // are buffered and only spelled out as markdown once their terminator says
  // what kind of line they were.
  const lines: string[] = [];
  let current = '';
  const ordinals: number[] = [];
  // ClickUp marks EVERY line of a code block with its own code-block
  // terminator, so consecutive code lines are gathered into one fence.
  let codeGroup: { language: string; lines: string[] } | null = null;

  const flushCode = (): void => {
    if (codeGroup) {
      const fence = codeGroup.language === 'plain' ? '' : codeGroup.language;
      lines.push(`\`\`\`${fence}\n${codeGroup.lines.join('\n')}\n\`\`\``);
      codeGroup = null;
    }
  };

  for (const block of commentFormat.comment) {
    if (block.text !== '\n') {
      current += inline(block);
      continue;
    }

    const attrs = block.attributes || {};
    const listKind = attrs.list?.list;
    const indent = typeof attrs.indent === 'number' && attrs.indent > 0 ? attrs.indent : 0;
    const pad = '  '.repeat(indent);

    if (attrs['code-block']) {
      const language = attrs['code-block']['code-block'] ?? 'plain';
      if (codeGroup && codeGroup.language !== language) {
        flushCode();
      }
      if (!codeGroup) {
        codeGroup = { language, lines: [] };
      }
      codeGroup.lines.push(current);
      current = '';
      continue;
    }

    flushCode();

    if (typeof attrs.header === 'number') {
      lines.push(`${'#'.repeat(attrs.header)} ${current}`);
    } else if (listKind === 'ordered') {
      ordinals[indent] = (ordinals[indent] ?? 0) + 1;
      lines.push(`${pad}${ordinals[indent]}. ${current}`);
    } else if (listKind === 'checked' || listKind === 'unchecked') {
      lines.push(`${pad}- [${listKind === 'checked' ? 'x' : ' '}] ${current}`);
    } else if (listKind) {
      lines.push(`${pad}- ${current}`);
    } else if (attrs.blockquote) {
      lines.push(`> ${current}`);
    } else {
      lines.push(current);
    }

    if (listKind !== 'ordered') {
      ordinals.length = 0;
    } else {
      // Deeper levels restart when a shallower item follows them.
      ordinals.length = indent + 1;
    }
    current = '';
  }

  flushCode();

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
        attributes: { link: url },
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
    //
    // Leading indentation (two spaces, or a tab, per level) becomes ClickUp's
    // numeric `indent` line attribute so nested lists keep their nesting.
    const leading = lines[i].match(/^[ \t]*/)?.[0] ?? '';
    const indentLevel = Math.floor(leading.replace(/\t/g, '  ').length / 2);
    const withIndent = (
      attributes: NonNullable<ClickUpCommentBlock['attributes']>
    ): NonNullable<ClickUpCommentBlock['attributes']> =>
      indentLevel > 0 ? { ...attributes, indent: indentLevel } : attributes;

    // Task-list items map to ClickUp's native checklist lines, which the
    // comment-formatting reference documents as "list": {"list": "checked" |
    // "unchecked"}. Must run before the bullet case, which would otherwise
    // post a literal "[ ] item".
    const checkbox = line.match(/^[-*+]\s+\[( |x|X)\]\s+(.*)$/);
    if (checkbox) {
      const state = checkbox[1] === ' ' ? 'unchecked' : 'checked';
      pushLine(checkbox[2], withIndent({ list: { list: state } }));
      continue;
    }

    const bullet = line.match(/^[-*+]\s+(.*)$/);
    if (bullet) {
      pushLine(bullet[1], withIndent({ list: { list: 'bullet' } }));
      continue;
    }

    const ordered = line.match(/^\d+[.)]\s+(.*)$/);
    if (ordered) {
      pushLine(ordered[1], withIndent({ list: { list: 'ordered' } }));
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

      // ClickUp's comment format is a Quill-style delta: every '\n' ends its
      // own line, and a line's block format lives on ITS terminator. Joining
      // the code with embedded '\n's and attaching code-block only to the final
      // terminator therefore formatted just the last line as code. Each line
      // gets its own code-block terminator instead (blank lines included, so
      // they stay inside the block).
      for (const codeLine of codeLines) {
        if (codeLine) {
          blocks.push({ text: codeLine, attributes: {} });
        }
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
    // Single-delimiter emphasis (*italic*, _italic_) is included so a comment
    // whose only markup is italic does not post its asterisks literally; the
    // underscore form uses the same word-boundary rule as the tokenizer so
    // snake_case identifiers alone do not count.
    /(\*\*.+?\*\*|__.+?__|`.+?`|~~.+?~~|^#{1,6}\s|\[.+?\]\(.+?\)|^>\s|^\s*[-*+]\s|^\s*\d+[.)]\s|```|\*[^*\s](?:[^*\n]*[^*\s])?\*|(?<![A-Za-z0-9_])_[^_\s](?:[^_\n]*[^_\s])?_(?![A-Za-z0-9_]))/m.test(
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
  // A caller-built `link: {url}` is rewritten to the documented string form.
  const normalizedBlocks = blocks.map(block => {
    if (block.type === 'tag' || block.type === 'emoticon') {
      return { ...block };
    }
    const attributes = { ...(block.attributes || {}) };
    if (attributes.link !== undefined) {
      const url = readLinkAttribute(attributes.link);
      if (url) {
        attributes.link = url;
      } else {
        delete attributes.link;
      }
    }
    return { ...block, attributes };
  });

  return ensureCodeBlockSeparation(normalizedBlocks);
}
