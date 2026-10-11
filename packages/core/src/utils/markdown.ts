/* eslint-disable no-console */
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
  replacement: content => `~~${content}~~`,
});

turndownService.addRule('underline', {
  filter: 'u',
  replacement: content => `<u>${content}</u>`, // Keep underline as HTML since markdown doesn't support it
});

turndownService.addRule('highlight', {
  filter: 'mark',
  replacement: content => `==${content}==`, // Use highlight syntax
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
    // Strip HTML tags as fallback with ReDoS-safe regex
    return html.replace(/<[^>]{0,1000}>/g, '');
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
    return html
      .replace(/<[^>]{0,1000}>/g, '')
      .replace(/\n\s*\n/g, '\n')
      .trim();
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

  // Check for HTML tags with ReDoS-safe regex
  return /<[^>]{0,1000}>/g.test(content);
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
      if (isCurrentlyHtml) return htmlToMarkdown(content).replace(/[*_`#[\]()]/g, '');
      return content; // Already plain text

    default:
      return content;
  }
}

/**
 * Real HTML markup, as opposed to text that merely contains angle brackets
 * (`Vec<T>`, `a < b > c`, `<https://autolink>`). Only well-known tags count, so
 * a description is converted only when it is actually HTML.
 */
const HTML_TAG_PATTERN =
  /<\/?(?:p|div|span|br|hr|h[1-6]|ul|ol|li|dl|dt|dd|strong|b|em|i|u|s|del|ins|strike|sub|sup|small|mark|abbr|cite|q|kbd|a|code|pre|blockquote|table|thead|tbody|tfoot|tr|td|th|caption|img|figure|figcaption|details|summary|section|article|header|footer|aside|nav|main|font|center)(?:\s[^<>]{0,1000})?\/?>/i;

/**
 * Remove fenced code blocks and inline code spans, so a Markdown description
 * that merely shows HTML as a code sample is not mistaken for HTML.
 */
function stripMarkdownCode(content: string): string {
  const withoutFences = content.replace(
    /^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\1[`~]*[ \t]*$|(?![\s\S]))/gm,
    ''
  );
  return stripInlineCode(withoutFences);
}

/**
 * Remove inline code spans: a run of N backticks up to the next run of exactly
 * N backticks. A linear scan rather than a backreference regex, which
 * backtracks quadratically on long runs of backticks.
 */
function stripInlineCode(content: string): string {
  const runs: Array<{ start: number; end: number }> = [];
  const byLength = new Map<number, number[]>();
  for (let i = 0; i < content.length; ) {
    if (content[i] !== '`') {
      i++;
      continue;
    }
    let end = i;
    while (content[end] === '`') end++;
    const length = end - i;
    const indexes = byLength.get(length) ?? [];
    indexes.push(runs.length);
    byLength.set(length, indexes);
    runs.push({ start: i, end });
    i = end;
  }
  if (runs.length < 2) return content;

  // For each run length, a cursor into its list of run indexes, so the search
  // for a closing run never revisits earlier candidates.
  const cursors = new Map<number, number>();
  let out = '';
  let copied = 0;
  for (let r = 0; r < runs.length; r++) {
    const run = runs[r];
    if (run.start < copied) continue; // inside a span already removed
    const length = run.end - run.start;
    const indexes = byLength.get(length) as number[];
    let cursor = cursors.get(length) ?? 0;
    while (cursor < indexes.length && indexes[cursor] <= r) cursor++;
    cursors.set(length, cursor);
    if (cursor === indexes.length) continue; // no closing run: literal backticks
    const close = runs[indexes[cursor]];
    out += content.slice(copied, run.start);
    copied = close.end;
    r = indexes[cursor];
  }
  return out + content.slice(copied);
}

export function looksLikeHtml(content: string): boolean {
  return typeof content === 'string' && HTML_TAG_PATTERN.test(stripMarkdownCode(content));
}

/**
 * Prepare a task description for ClickUp API submission.
 *
 * Always returns `markdown_description`. Markdown renders plain text exactly
 * like the plain `description` field does, so there is nothing to gain from
 * guessing: the old isMarkdown() heuristic missed GFM tables, bare URLs,
 * horizontal rules and more, and those descriptions were then sent to the
 * plain field and rendered literally. HTML input (which ClickUp does not
 * render in either field) is converted to markdown with turndown first.
 *
 * @param content The description to prepare (markdown, HTML, or plain text)
 * @returns `{ markdown_description }` ready to merge into the request body
 */
export function prepareContentForClickUp(content: string): {
  markdown_description: string;
} {
  if (!content || typeof content !== 'string') {
    return { markdown_description: '' };
  }

  if (looksLikeHtml(content)) {
    return { markdown_description: htmlToMarkdown(content) };
  }

  return { markdown_description: content };
}

/**
 * Process a ClickUp task response for display.
 *
 * When ClickUp returned `markdown_description` (requested with
 * include_markdown_description=true, the default on this server's task read
 * tools), it becomes the canonical `description`, and the duplicate plain-text
 * renderings (`markdown_description`, `text_content`) are dropped. ClickUp's
 * default `description` is a flattened plain-text rendering, so an agent that
 * read it and wrote it back destroyed headings, links and checklists.
 *
 * @param response ClickUp API response with description/text_content
 * @returns Processed content with a markdown description
 */
export function processClickUpResponse(response: any): any {
  if (!response || typeof response !== 'object') {
    return response;
  }

  const processed = { ...response };

  if (typeof processed.markdown_description === 'string') {
    processed.description = processed.markdown_description;
    delete processed.markdown_description;
    delete processed.text_content;
  } else if (processed.description && looksLikeHtml(processed.description)) {
    processed.description_markdown = htmlToMarkdown(processed.description);
  }

  if (Array.isArray(processed.subtasks)) {
    processed.subtasks = processed.subtasks.map((subtask: any) => processClickUpResponse(subtask));
  }

  return processed;
}
