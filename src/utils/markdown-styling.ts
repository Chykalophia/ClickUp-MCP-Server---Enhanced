/**
 * Simple Markdown Styling Processor
 * Provides enhanced display formatting for markdown content with visual styling
 */

export interface MarkdownStyleOptions {
  useColors?: boolean;
  useEmojis?: boolean;
  indentSize?: number;
  maxWidth?: number;
}

const DEFAULT_OPTIONS: MarkdownStyleOptions = {
  useColors: true,
  useEmojis: true,
  indentSize: 2,
  maxWidth: 80
};

// ANSI color codes for terminal styling
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  
  // Text colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

// Emoji mappings for enhanced visual display
const EMOJI_MAP = {
  h1: '🔥',
  h2: '⚡',
  h3: '💫',
  h4: '✨',
  h5: '🌟',
  h6: '⭐',
  bold: '💪',
  italic: '✨',
  code: '💻',
  link: '🔗',
  image: '🖼️',
  list: '📋',
  quote: '💬',
  check: '✅',
  uncheck: '☐',
  warning: '⚠️',
  info: '💡',
  success: '🎉',
  error: '❌'
};

/**
 * Apply color styling to text
 */
function colorize(text: string, color: string, options: MarkdownStyleOptions): string {
  if (!options.useColors) return text;
  return `${color}${text}${COLORS.reset}`;
}

/**
 * Add emoji prefix to text
 */
function addEmoji(text: string, emoji: string, options: MarkdownStyleOptions): string {
  if (!options.useEmojis) return text;
  return `${emoji} ${text}`;
}

/**
 * Process headers with styling
 */
function processHeaders(content: string, options: MarkdownStyleOptions): string {
  return content.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, text) => {
    const level = hashes.length;
    const emoji = EMOJI_MAP[`h${level}` as keyof typeof EMOJI_MAP];
    
    let styled = text;
    
    switch (level) {
      case 1:
        styled = colorize(text.toUpperCase(), COLORS.bright + COLORS.red, options);
        break;
      case 2:
        styled = colorize(text, COLORS.bright + COLORS.blue, options);
        break;
      case 3:
        styled = colorize(text, COLORS.bright + COLORS.green, options);
        break;
      case 4:
        styled = colorize(text, COLORS.bright + COLORS.yellow, options);
        break;
      case 5:
        styled = colorize(text, COLORS.bright + COLORS.magenta, options);
        break;
      case 6:
        styled = colorize(text, COLORS.bright + COLORS.cyan, options);
        break;
    }
    
    const result = addEmoji(styled, emoji, options);
    return `\n${result}\n${'='.repeat(Math.min(text.length, options.maxWidth || 80))}\n`;
  });
}

/**
 * Process bold and italic text
 */
function processEmphasis(content: string, options: MarkdownStyleOptions): string {
  // Bold text
  content = content.replace(/\*\*([^*]+)\*\*/g, (match, text) => {
    const styled = colorize(text, COLORS.bright, options);
    return options.useEmojis ? `💪 ${styled}` : styled;
  });
  
  // Italic text
  content = content.replace(/\*([^*]+)\*/g, (match, text) => {
    const styled = colorize(text, COLORS.italic, options);
    return options.useEmojis ? `✨ ${styled}` : styled;
  });
  
  return content;
}

/**
 * Process code blocks and inline code
 */
function processCode(content: string, options: MarkdownStyleOptions): string {
  // Code blocks
  content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const langLabel = lang ? ` (${lang})` : '';
    const header = colorize(`CODE${langLabel}`, COLORS.bgBlue + COLORS.white, options);
    const styledCode = colorize(code.trim(), COLORS.dim + COLORS.cyan, options);
    const border = '─'.repeat(Math.min(60, options.maxWidth || 80));
    
    return `\n${addEmoji(header, EMOJI_MAP.code, options)}\n${border}\n${styledCode}\n${border}\n`;
  });
  
  // Inline code
  content = content.replace(/`([^`]+)`/g, (match, code) => {
    const styled = colorize(code, COLORS.bgBlack + COLORS.yellow, options);
    return options.useEmojis ? `💻 ${styled}` : styled;
  });
  
  return content;
}

/**
 * Process lists
 */
function processLists(content: string, options: MarkdownStyleOptions): string {
  const indent = ' '.repeat(options.indentSize || 2);
  
  // Unordered lists
  content = content.replace(/^(\s*)[-*+]\s+(.+)$/gm, (match, spaces, text) => {
    const bullet = options.useEmojis ? '📋' : '•';
    const styled = colorize(text, COLORS.white, options);
    return `${spaces}${bullet} ${styled}`;
  });
  
  // Ordered lists
  content = content.replace(/^(\s*)(\d+)\.\s+(.+)$/gm, (match, spaces, num, text) => {
    const bullet = options.useEmojis ? `${num}️⃣` : `${num}.`;
    const styled = colorize(text, COLORS.white, options);
    return `${spaces}${bullet} ${styled}`;
  });
  
  // Checkboxes
  content = content.replace(/^(\s*)- \[([x ])\]\s+(.+)$/gm, (match, spaces, check, text) => {
    const checkbox = check === 'x' ? EMOJI_MAP.check : EMOJI_MAP.uncheck;
    const styled = check === 'x' 
      ? colorize(text, COLORS.dim + COLORS.green, options)
      : colorize(text, COLORS.white, options);
    return `${spaces}${checkbox} ${styled}`;
  });
  
  return content;
}

/**
 * Process blockquotes
 */
function processBlockquotes(content: string, options: MarkdownStyleOptions): string {
  return content.replace(/^>\s+(.+)$/gm, (match, text) => {
    const styled = colorize(text, COLORS.italic + COLORS.cyan, options);
    const quote = addEmoji(styled, EMOJI_MAP.quote, options);
    return `│ ${quote}`;
  });
}

/**
 * Process links and images
 */
function processLinks(content: string, options: MarkdownStyleOptions): string {
  // Images
  content = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
    const styled = colorize(`[${alt || 'Image'}]`, COLORS.bright + COLORS.magenta, options);
    return addEmoji(`${styled} (${url})`, EMOJI_MAP.image, options);
  });
  
  // Links
  content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    const styled = colorize(text, COLORS.underline + COLORS.blue, options);
    return addEmoji(`${styled} (${url})`, EMOJI_MAP.link, options);
  });
  
  return content;
}

/**
 * Process horizontal rules
 */
function processHorizontalRules(content: string, options: MarkdownStyleOptions): string {
  return content.replace(/^---+$/gm, () => {
    const rule = '═'.repeat(Math.min(60, options.maxWidth || 80));
    return colorize(rule, COLORS.dim + COLORS.white, options);
  });
}

/**
 * Add visual separators and spacing
 */
function addVisualEnhancements(content: string, options: MarkdownStyleOptions): string {
  // Add spacing around sections
  content = content.replace(/\n(#{1,6})/g, '\n\n$1');
  content = content.replace(/(#{1,6}[^\n]+)\n/g, '$1\n\n');
  
  // Clean up excessive newlines
  content = content.replace(/\n{3,}/g, '\n\n');
  
  return content.trim();
}

/**
 * Main function to apply simple markdown styling
 * @param markdown The markdown content to style
 * @param options Styling options
 * @returns Styled markdown content with visual enhancements
 */
export function applyMarkdownStyling(markdown: string, options: MarkdownStyleOptions = {}): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }
  
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  let styled = markdown;
  
  // Apply styling in order
  styled = processHeaders(styled, opts);
  styled = processCode(styled, opts);
  styled = processEmphasis(styled, opts);
  styled = processLists(styled, opts);
  styled = processBlockquotes(styled, opts);
  styled = processLinks(styled, opts);
  styled = processHorizontalRules(styled, opts);
  styled = addVisualEnhancements(styled, opts);
  
  return styled;
}

/**
 * Create a styled preview of markdown content
 * @param markdown The markdown content
 * @param title Optional title for the preview
 * @param options Styling options
 * @returns Formatted preview with title and borders
 */
export function createMarkdownPreview(
  markdown: string, 
  title?: string, 
  options: MarkdownStyleOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const styled = applyMarkdownStyling(markdown, opts);
  
  if (!title) {
    return styled;
  }
  
  const border = '═'.repeat(Math.min(title.length + 4, opts.maxWidth || 80));
  const styledTitle = colorize(title.toUpperCase(), COLORS.bright + COLORS.white, opts);
  const titleWithEmoji = addEmoji(styledTitle, '📄', opts);
  
  return `${border}\n  ${titleWithEmoji}\n${border}\n\n${styled}\n\n${border}`;
}

/**
 * Extract and style markdown sections
 * @param markdown The markdown content
 * @param sectionType The type of section to extract ('headers', 'code', 'lists', etc.)
 * @param options Styling options
 * @returns Styled sections
 */
export function extractStyledSections(
  markdown: string, 
  sectionType: 'headers' | 'code' | 'lists' | 'quotes' | 'links',
  options: MarkdownStyleOptions = {}
): string[] {
  if (!markdown) return [];
  
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const sections: string[] = [];
  
  switch (sectionType) {
    case 'headers':
      const headerMatches = markdown.match(/^#{1,6}\s+.+$/gm);
      if (headerMatches) {
        sections.push(...headerMatches.map(h => processHeaders(h, opts)));
      }
      break;
      
    case 'code':
      const codeMatches = markdown.match(/```[\s\S]*?```|`[^`]+`/g);
      if (codeMatches) {
        sections.push(...codeMatches.map(c => processCode(c, opts)));
      }
      break;
      
    case 'lists':
      const listMatches = markdown.match(/^(\s*)[-*+]\s+.+$|^(\s*)\d+\.\s+.+$/gm);
      if (listMatches) {
        sections.push(...listMatches.map(l => processLists(l, opts)));
      }
      break;
      
    case 'quotes':
      const quoteMatches = markdown.match(/^>\s+.+$/gm);
      if (quoteMatches) {
        sections.push(...quoteMatches.map(q => processBlockquotes(q, opts)));
      }
      break;
      
    case 'links':
      const linkMatches = markdown.match(/\[([^\]]+)\]\(([^)]+)\)|!\[([^\]]*)\]\(([^)]+)\)/g);
      if (linkMatches) {
        sections.push(...linkMatches.map(l => processLinks(l, opts)));
      }
      break;
  }
  
  return sections;
}

/**
 * Create a markdown summary with key information highlighted
 * @param markdown The markdown content
 * @param options Styling options
 * @returns Styled summary
 */
export function createMarkdownSummary(markdown: string, options: MarkdownStyleOptions = {}): string {
  if (!markdown) return '';
  
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const summary: string[] = [];
  
  // Extract headers
  const headers = extractStyledSections(markdown, 'headers', opts);
  if (headers.length > 0) {
    summary.push(colorize('📋 SECTIONS:', COLORS.bright + COLORS.blue, opts));
    summary.push(...headers.slice(0, 5)); // Limit to first 5 headers
  }
  
  // Extract code blocks
  const codeBlocks = extractStyledSections(markdown, 'code', opts);
  if (codeBlocks.length > 0) {
    summary.push(colorize('💻 CODE BLOCKS:', COLORS.bright + COLORS.green, opts));
    summary.push(`${codeBlocks.length} code block(s) found`);
  }
  
  // Extract lists
  const lists = extractStyledSections(markdown, 'lists', opts);
  if (lists.length > 0) {
    summary.push(colorize('📝 LISTS:', COLORS.bright + COLORS.yellow, opts));
    summary.push(`${lists.length} list item(s) found`);
  }
  
  // Extract links
  const links = extractStyledSections(markdown, 'links', opts);
  if (links.length > 0) {
    summary.push(colorize('🔗 LINKS:', COLORS.bright + COLORS.cyan, opts));
    summary.push(`${links.length} link(s) found`);
  }
  
  return summary.join('\n');
}
