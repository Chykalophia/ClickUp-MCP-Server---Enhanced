/* eslint-disable no-console */
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
  processCommentBlocks,
  ClickUpCommentBlock,
  ClickUpCommentFormat,
} from '../utils/clickup-comment-formatter';

describe('ClickUp Comment Formatter', () => {
  describe('createPlainTextComment', () => {
    it('should create a plain text comment', () => {
      const result = createPlainTextComment('Hello world');

      expect(result).toEqual({
        comment: [
          {
            text: 'Hello world',
            attributes: {},
          },
        ],
      });
    });

    it('should handle empty text', () => {
      const result = createPlainTextComment('');

      expect(result).toEqual({
        comment: [
          {
            text: '',
            attributes: {},
          },
        ],
      });
    });
  });

  describe('createBoldComment', () => {
    it('should create a bold text comment', () => {
      const result = createBoldComment('Bold text');

      expect(result).toEqual({
        comment: [
          {
            text: 'Bold text',
            attributes: { bold: true },
          },
        ],
      });
    });
  });

  describe('createItalicComment', () => {
    it('should create an italic text comment', () => {
      const result = createItalicComment('Italic text');

      expect(result).toEqual({
        comment: [
          {
            text: 'Italic text',
            attributes: { italic: true },
          },
        ],
      });
    });
  });

  describe('createCodeComment', () => {
    it('should create a code text comment', () => {
      const result = createCodeComment('const x = 1;');

      expect(result).toEqual({
        comment: [
          {
            text: 'const x = 1;',
            attributes: { code: true },
          },
        ],
      });
    });
  });

  describe('createLinkComment', () => {
    it('should create a link comment', () => {
      const result = createLinkComment('ClickUp', 'https://clickup.com');

      expect(result).toEqual({
        comment: [
          {
            text: 'ClickUp',
            attributes: { link: 'https://clickup.com' },
          },
        ],
      });
    });
  });

  describe('markdownToClickUpComment', () => {
    it('should convert bold markdown to ClickUp format', () => {
      const result = markdownToClickUpComment('**bold text**');

      expect(result.comment).toContainEqual({
        text: 'bold text',
        attributes: { bold: true },
      });
    });

    it('should convert italic markdown to ClickUp format', () => {
      const result = markdownToClickUpComment('*italic text*');

      expect(result.comment).toContainEqual({
        text: 'italic text',
        attributes: { italic: true },
      });
    });

    it('should convert underline markdown to ClickUp format', () => {
      const result = markdownToClickUpComment('__underlined text__');

      expect(result.comment).toContainEqual({
        text: 'underlined text',
        attributes: { underline: true },
      });
    });

    it('should convert strikethrough markdown to ClickUp format', () => {
      const result = markdownToClickUpComment('~~strikethrough text~~');

      expect(result.comment).toContainEqual({
        text: 'strikethrough text',
        attributes: { strikethrough: true },
      });
    });

    it('should convert inline code markdown to ClickUp format', () => {
      const result = markdownToClickUpComment('`code text`');

      expect(result.comment).toContainEqual({
        text: 'code text',
        attributes: { code: true },
      });
    });

    it('should convert links markdown to ClickUp format', () => {
      const result = markdownToClickUpComment('[ClickUp](https://clickup.com)');

      expect(result.comment).toContainEqual({
        text: 'ClickUp',
        attributes: { link: 'https://clickup.com' },
      });
    });

    it('should handle mixed formatting', () => {
      const result = markdownToClickUpComment('This is **bold** and *italic* text');

      expect(result.comment).toEqual([
        { text: 'This is ', attributes: {} },
        { text: 'bold', attributes: { bold: true } },
        { text: ' and ', attributes: {} },
        { text: 'italic', attributes: { italic: true } },
        { text: ' text', attributes: {} },
      ]);
    });

    it('should handle plain text', () => {
      const result = markdownToClickUpComment('Just plain text');

      expect(result).toEqual({
        comment: [
          {
            text: 'Just plain text',
            attributes: {},
          },
        ],
      });
    });

    it('should handle empty input', () => {
      const result = markdownToClickUpComment('');

      expect(result).toEqual({
        comment: [
          {
            text: '',
            attributes: {},
          },
        ],
      });
    });
  });

  describe('clickUpCommentToMarkdown', () => {
    it('should convert bold ClickUp format to markdown', () => {
      const input: ClickUpCommentFormat = {
        comment: [
          {
            text: 'bold text',
            attributes: { bold: true },
          },
        ],
      };

      const result = clickUpCommentToMarkdown(input);
      expect(result).toBe('**bold text**');
    });

    it('should convert italic ClickUp format to markdown', () => {
      const input: ClickUpCommentFormat = {
        comment: [
          {
            text: 'italic text',
            attributes: { italic: true },
          },
        ],
      };

      const result = clickUpCommentToMarkdown(input);
      expect(result).toBe('*italic text*');
    });

    it('should convert underline ClickUp format to markdown', () => {
      const input: ClickUpCommentFormat = {
        comment: [
          {
            text: 'underlined text',
            attributes: { underline: true },
          },
        ],
      };

      const result = clickUpCommentToMarkdown(input);
      expect(result).toBe('__underlined text__');
    });

    it('should convert strikethrough ClickUp format to markdown', () => {
      const input: ClickUpCommentFormat = {
        comment: [
          {
            text: 'strikethrough text',
            attributes: { strikethrough: true },
          },
        ],
      };

      const result = clickUpCommentToMarkdown(input);
      expect(result).toBe('~~strikethrough text~~');
    });

    it('should convert code ClickUp format to markdown', () => {
      const input: ClickUpCommentFormat = {
        comment: [
          {
            text: 'code text',
            attributes: { code: true },
          },
        ],
      };

      const result = clickUpCommentToMarkdown(input);
      expect(result).toBe('`code text`');
    });

    it('should convert link ClickUp format to markdown', () => {
      const input: ClickUpCommentFormat = {
        comment: [
          {
            text: 'ClickUp',
            attributes: { link: { url: 'https://clickup.com' } },
          },
        ],
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
          { text: ' text', attributes: {} },
        ],
      };

      const result = clickUpCommentToMarkdown(input);
      expect(result).toBe('This is **bold** and *italic* text');
    });

    it('should handle plain text', () => {
      const input: ClickUpCommentFormat = {
        comment: [
          {
            text: 'Just plain text',
            attributes: {},
          },
        ],
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
    // ClickUp carries block-level formatting on the '\n' that terminates the
    // line, not on the line's text. Every attribute asserted below was verified
    // against the live API by round-tripping a comment through it.
    it('should handle headers', () => {
      const result = parseMarkdownToClickUpComment('# Header 1\n\nSome text');

      expect(result.comment.slice(0, 2)).toEqual([
        { text: 'Header 1', attributes: {} },
        { text: '\n', attributes: { header: 1 } },
      ]);
    });

    it('clamps deep headings to the three levels ClickUp offers', () => {
      const result = parseMarkdownToClickUpComment('##### Deep');

      expect(result.comment).toContainEqual({ text: '\n', attributes: { header: 3 } });
    });

    it('should handle list items', () => {
      const result = parseMarkdownToClickUpComment('- Item 1\n- Item 2');

      expect(result.comment).toEqual([
        { text: 'Item 1', attributes: {} },
        { text: '\n', attributes: { list: { list: 'bullet' } } },
        { text: 'Item 2', attributes: {} },
        { text: '\n', attributes: { list: { list: 'bullet' } } },
      ]);
    });

    it('routes every list spelling through the markdown path, not plain text', () => {
      // The prepareCommentForClickUp gate has to recognise the same line shapes
      // the parser handles, or `* item` and `1) item` post as literal text.
      for (const source of ['* star bullet', '+ plus bullet', '1) paren ordered']) {
        const blocks = prepareCommentForClickUp(source).comment;
        expect(blocks[blocks.length - 1].attributes?.list).toBeDefined();
      }
    });

    it('handles ordered lists without mangling the marker', () => {
      // `^[-*+\d.]\s*` stripped only the first character of the marker, so
      // "1. Item" used to come out as the literal text "• . Item".
      const result = parseMarkdownToClickUpComment('1. First\n2. Second');

      expect(result.comment).toEqual([
        { text: 'First', attributes: {} },
        { text: '\n', attributes: { list: { list: 'ordered' } } },
        { text: 'Second', attributes: {} },
        { text: '\n', attributes: { list: { list: 'ordered' } } },
      ]);
    });

    it('should handle blockquotes', () => {
      const result = parseMarkdownToClickUpComment('> This is a quote');

      expect(result.comment).toEqual([
        { text: 'This is a quote', attributes: {} },
        { text: '\n', attributes: { blockquote: true } },
      ]);
    });

    it('should handle code blocks', () => {
      const result = parseMarkdownToClickUpComment('```\nconst x = 1;\nconsole.log(x);\n```');

      // Every code line carries its own code-block terminator; with a single
      // terminator ClickUp formats only the last line as code.
      expect(result.comment).toEqual([
        { text: 'const x = 1;', attributes: {} },
        { text: '\n', attributes: { 'code-block': { 'code-block': 'plain' } } },
        { text: 'console.log(x);', attributes: {} },
        { text: '\n', attributes: { 'code-block': { 'code-block': 'plain' } } },
      ]);
    });

    it('keeps the fence language on the code block', () => {
      const result = parseMarkdownToClickUpComment('```javascript\nconst x = 1;\n```');

      expect(result.comment).toContainEqual({
        text: '\n',
        attributes: { 'code-block': { 'code-block': 'javascript' } },
      });
    });

    it('terminates a block-typed last line so its formatting is not lost', () => {
      // The line break carries the attribute, so omitting it on the final line
      // would silently drop the heading.
      const result = parseMarkdownToClickUpComment('Intro\n\n## Trailing heading');

      expect(result.comment[result.comment.length - 1]).toEqual({
        text: '\n',
        attributes: { header: 2 },
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
      expect(result.comment).toContainEqual({ text: 'Status Update', attributes: {} });
      expect(result.comment).toContainEqual({ text: '\n', attributes: { header: 1 } });

      // Should contain formatted text
      expect(result.comment).toContainEqual({
        text: 'Authentication',
        attributes: { bold: true },
      });

      // Should contain code block
      expect(result.comment).toContainEqual({
        text: "const user = { name: 'John' };",
        attributes: {},
      });
      expect(result.comment).toContainEqual({
        text: '\n',
        attributes: { 'code-block': { 'code-block': 'javascript' } },
      });

      // Should contain link
      expect(result.comment).toContainEqual({
        text: 'ClickUp',
        attributes: { link: 'https://clickup.com' },
      });
    });
  });

  describe('prepareCommentForClickUp', () => {
    it('should prepare plain text comment', () => {
      const result = prepareCommentForClickUp('Hello world');

      expect(result).toEqual({
        comment: [
          {
            text: 'Hello world',
            attributes: {},
          },
        ],
      });
    });

    it('should prepare markdown comment', () => {
      const result = prepareCommentForClickUp('**Bold** text');

      expect(result.comment).toContainEqual({
        text: 'Bold',
        attributes: { bold: true },
      });
      expect(result.comment).toEqual([
        {
          text: 'Bold',
          attributes: { bold: true },
        },
        {
          text: ' text',
          attributes: {},
        },
      ]);
    });

    it('should handle empty input', () => {
      const result = prepareCommentForClickUp('');

      expect(result).toEqual({
        comment: [
          {
            text: '',
            attributes: {},
          },
        ],
      });
    });
  });

  describe('combineCommentBlocks', () => {
    it('should combine multiple comment blocks', () => {
      const blocks: ClickUpCommentBlock[] = [
        { text: 'Hello ', attributes: {} },
        { text: 'world', attributes: { bold: true } },
        { text: '!', attributes: {} },
      ];

      const result = combineCommentBlocks(blocks);

      expect(result).toEqual({
        comment: blocks,
      });
    });
  });

  describe('Bidirectional conversion', () => {
    it('should maintain content through markdown -> ClickUp -> markdown conversion', () => {
      const originalMarkdown =
        '**Bold** and *italic* text with `code` and [link](https://example.com)';

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

  describe('processCommentBlocks — mention/tag pass-through', () => {
    it('preserves UI-shape tag block ({type:"tag", text:"@Name"})', () => {
      const blocks: ClickUpCommentBlock[] = [
        { text: 'Hey ' },
        { type: 'tag', text: '@Peter Krzyzek' },
        { text: ' quick check' },
      ];

      const processed = processCommentBlocks(blocks);

      expect(processed).toHaveLength(3);
      expect(processed[1]).toMatchObject({ type: 'tag', text: '@Peter Krzyzek' });
    });

    it('preserves API-docs-shape tag block ({type:"tag", user:{id}}) without injecting attributes', () => {
      const blocks: ClickUpCommentBlock[] = [
        { text: 'I need someone to look at this. Maybe ' },
        { type: 'tag', user: { id: 38366580 } },
        { text: ' — thanks' },
      ];

      const processed = processCommentBlocks(blocks);

      // Lock exact shape — no synthesized attributes:{} on tag blocks
      expect(processed[1]).toEqual({ type: 'tag', user: { id: 38366580 } });
      expect(processed[1]).not.toHaveProperty('attributes');
      expect(processed[1]).not.toHaveProperty('text');
    });

    it('preserves combined tag block ({type, text, user}) without injecting attributes', () => {
      const blocks: ClickUpCommentBlock[] = [
        { type: 'tag', text: '@Peter Krzyzek', user: { id: 38366580 } },
      ];

      const processed = processCommentBlocks(blocks);

      expect(processed[0]).toEqual({
        type: 'tag',
        text: '@Peter Krzyzek',
        user: { id: 38366580 },
      });
      expect(processed[0]).not.toHaveProperty('attributes');
    });

    it('preserves emoticon blocks without injecting attributes', () => {
      const blocks: ClickUpCommentBlock[] = [
        { text: 'Done ' },
        { type: 'emoticon', emoticon: { code: '1f389' } },
      ];

      const processed = processCommentBlocks(blocks);

      expect(processed[1]).toEqual({
        type: 'emoticon',
        emoticon: { code: '1f389' },
      });
      expect(processed[1]).not.toHaveProperty('attributes');
    });

    it('returns empty input unchanged', () => {
      expect(processCommentBlocks([])).toEqual([]);
    });

    it('does not regress existing attributes round-trip', () => {
      const blocks: ClickUpCommentBlock[] = [
        { text: 'This is ' },
        { text: 'important', attributes: { bold: true } },
        { text: ' — link ' },
        { text: 'here', attributes: { link: { url: 'https://example.com' } } },
      ];

      const processed = processCommentBlocks(blocks);

      expect(processed[1]).toMatchObject({ text: 'important', attributes: { bold: true } });
      expect(processed[3]).toMatchObject({
        text: 'here',
        attributes: { link: 'https://example.com' },
      });
    });

    it('passes through unknown forward-compat keys without dropping them', () => {
      const blocks: ClickUpCommentBlock[] = [
        { text: 'hi', someFutureKey: { foo: 'bar' } } as ClickUpCommentBlock,
      ];

      const processed = processCommentBlocks(blocks);

      expect(processed[0].someFutureKey).toEqual({ foo: 'bar' });
    });
  });

  describe('inline @mentions in markdown text', () => {
    it('converts @[Name](id) into a tag block rather than a link', () => {
      const result = markdownToClickUpComment('Hey @[Jane](81344), please review');

      expect(result.comment).toEqual([
        { text: 'Hey ', attributes: {} },
        { type: 'tag', text: '@Jane', user: { id: 81344 } },
        { text: ', please review', attributes: {} },
      ]);
    });

    it('gives the tag block a numeric user id, not the string from the source', () => {
      const [block] = markdownToClickUpComment('@[Jane](81344)').comment;

      expect(block.user?.id).toBe(81344);
      expect(typeof block.user?.id).toBe('number');
    });

    it('does not put an attributes bag on the tag block', () => {
      const [block] = markdownToClickUpComment('@[Jane](81344)').comment;

      expect(block).not.toHaveProperty('attributes');
    });

    it('leaves a link with a non-numeric target alone', () => {
      const result = markdownToClickUpComment('see @[docs](https://example.com) here');

      expect(result.comment).toContainEqual({
        text: 'docs',
        attributes: { link: 'https://example.com' },
      });
      expect(result.comment.some(block => block.type === 'tag')).toBe(false);
    });

    it('keeps markdown formatting in the same comment as a mention', () => {
      const result = prepareCommentForClickUp(
        '## Findings\n\n- **bold** item\n\nping @[Bob](42)'
      ).comment;

      expect(result).toContainEqual({ text: '\n', attributes: { header: 2 } });
      expect(result).toContainEqual({ text: '\n', attributes: { list: { list: 'bullet' } } });
      expect(result).toContainEqual({ text: 'bold', attributes: { bold: true } });
      expect(result).toContainEqual({ type: 'tag', text: '@Bob', user: { id: 42 } });
    });

    it('converts a mention inside a heading instead of leaving literal syntax', () => {
      const result = parseMarkdownToClickUpComment('## Over to @[Jane](81344)').comment;

      expect(result).toContainEqual({ text: 'Over to ', attributes: {} });
      expect(result).toContainEqual({ type: 'tag', text: '@Jane', user: { id: 81344 } });
      expect(result).toContainEqual({ text: '\n', attributes: { header: 2 } });
      expect(result.every(block => !(block.text ?? '').includes('@[Jane]'))).toBe(true);
    });

    it('survives processCommentBlocks with its shape intact', () => {
      const blocks = prepareCommentForClickUp('ping @[Jane](81344) please').comment;

      expect(processCommentBlocks(blocks)).toContainEqual({
        type: 'tag',
        text: '@Jane',
        user: { id: 81344 },
      });
    });
  });

  describe('code block separation', () => {
    it('does not split a list item that contains inline code', () => {
      // Observed live: inline `code` counted as a code block, so the separator
      // newline was injected into the bullet's own text and broke the line.
      const blocks = prepareCommentForClickUp('- `inline code` in a list item').comment;

      expect(blocks).toEqual([
        { text: 'inline code', attributes: { code: true } },
        { text: ' in a list item', attributes: {} },
        { text: '\n', attributes: { list: { list: 'bullet' } } },
      ]);
    });

    it('does not add a blank line inside a fenced code block', () => {
      // The '\n' marker carrying the code-block attribute IS the terminator;
      // giving it a separator of its own padded every code block.
      const blocks = prepareCommentForClickUp('```\nconst x = 1;\n```').comment;

      expect(blocks[0]).toEqual({ text: 'const x = 1;', attributes: {} });
    });

    it('still separates a caller-supplied code block from preceding text', () => {
      const processed = processCommentBlocks([
        { text: 'Run this:' },
        { text: 'npm test', attributes: { 'code-block': { 'code-block': 'bash' } } },
      ]);

      expect(processed[0].text).toBe('Run this:\n');
    });
  });

  describe('clickUpCommentToMarkdown — block-level attributes', () => {
    it('rebuilds headings, lists, quotes and code blocks from the line markers', () => {
      const markdown = clickUpCommentToMarkdown({
        comment: [
          { text: 'Title', attributes: {} },
          { text: '\n', attributes: { header: 2 } },
          { text: 'first', attributes: {} },
          { text: '\n', attributes: { list: { list: 'bullet' } } },
          { text: 'step one', attributes: {} },
          { text: '\n', attributes: { list: { list: 'ordered' } } },
          { text: 'step two', attributes: {} },
          { text: '\n', attributes: { list: { list: 'ordered' } } },
          { text: 'quoted', attributes: {} },
          { text: '\n', attributes: { blockquote: true } },
          { text: 'const x = 1;', attributes: {} },
          { text: '\n', attributes: { 'code-block': { 'code-block': 'javascript' } } },
        ],
      });

      expect(markdown).toBe(
        '## Title\n- first\n1. step one\n2. step two\n> quoted\n```javascript\nconst x = 1;\n```'
      );
    });

    it('restarts ordered numbering after a non-ordered line', () => {
      const markdown = clickUpCommentToMarkdown({
        comment: [
          { text: 'a', attributes: {} },
          { text: '\n', attributes: { list: { list: 'ordered' } } },
          { text: 'break', attributes: {} },
          { text: '\n', attributes: {} },
          { text: 'b', attributes: {} },
          { text: '\n', attributes: { list: { list: 'ordered' } } },
        ],
      });

      expect(markdown).toBe('1. a\nbreak\n1. b');
    });

    it('round-trips a tag block back to inline mention syntax', () => {
      const markdown = clickUpCommentToMarkdown({
        comment: [
          { text: 'over to ', attributes: {} },
          { type: 'tag', text: '@Jane', user: { id: 81344 } },
        ],
      });

      expect(markdown).toBe('over to @[Jane](81344)');
    });

    it('renders a tag block that carries no user id as its plain text', () => {
      // What ClickUp actually returns on read: the id is resolved server-side
      // and only the display text comes back on the block.
      const markdown = clickUpCommentToMarkdown({
        comment: [{ type: 'tag', text: '@Peter' }],
      });

      expect(markdown).toBe('@Peter');
    });
  });

  describe('link conversion regression', () => {
    it('does not emit the bare URL as a trailing text block', () => {
      // The old split regex used capturing inner groups, so String.split fed the
      // link text and the URL back in as extra parts and the URL was pushed as
      // plain text after the link block.
      const result = markdownToClickUpComment('[link](https://example.com)');

      expect(result.comment).toEqual([
        { text: 'link', attributes: { link: 'https://example.com' } },
      ]);
    });

    it('does not duplicate URLs mid-sentence either', () => {
      const result = markdownToClickUpComment('see [docs](https://example.com/a) now');

      expect(result.comment.map(block => block.text)).toEqual(['see ', 'docs', ' now']);
    });
  });
});

describe('ClickUp Comment Formatter — documented shapes and lossless round trips', () => {
  const roundTrip = (markdown: string): string =>
    clickUpCommentToMarkdown({ comment: prepareCommentForClickUp(markdown).comment });

  describe('link attribute shape', () => {
    // https://developer.clickup.com/docs/comment-formatting documents
    // "attributes": {"link": "https://clickup.com/api"} — a plain string.
    it('writes the documented string form', () => {
      const result = parseMarkdownToClickUpComment('see [api](https://clickup.com/api)');
      expect(result.comment).toContainEqual({
        text: 'api',
        attributes: { link: 'https://clickup.com/api' },
      });
    });

    it('reads both the string form and the legacy {url} form', () => {
      expect(
        clickUpCommentToMarkdown({
          comment: [{ text: 'a', attributes: { link: 'https://a.example' } }],
        })
      ).toBe('[a](https://a.example)');
      expect(
        clickUpCommentToMarkdown({
          comment: [{ text: 'b', attributes: { link: { url: 'https://b.example' } } }],
        })
      ).toBe('[b](https://b.example)');
    });

    it('rewrites a caller-supplied {url} link to the string form', () => {
      const processed = processCommentBlocks([
        { text: 'x', attributes: { link: { url: 'https://x.example' } } },
      ]);
      expect(processed[0].attributes).toEqual({ link: 'https://x.example' });
    });

    it('createLinkComment uses the string form', () => {
      expect(createLinkComment('t', 'https://clickup.com').comment[0].attributes).toEqual({
        link: 'https://clickup.com',
      });
    });
  });

  describe('multi-line fenced code blocks', () => {
    const markdown = '```ts\nconst a = 1;\n\nconst b = 2;\n```';

    it('marks every line, including blank ones, as code', () => {
      const terminators = parseMarkdownToClickUpComment(markdown).comment.filter(
        block => block.text === '\n'
      );
      expect(terminators).toHaveLength(3);
      for (const terminator of terminators) {
        expect(terminator.attributes).toEqual({ 'code-block': { 'code-block': 'ts' } });
      }
    });

    it('reads consecutive code lines back as ONE fence', () => {
      expect(roundTrip(markdown)).toBe(markdown);
    });
  });

  describe('task-list checkboxes', () => {
    it('maps - [ ] and - [x] to native checklist lines', () => {
      const result = parseMarkdownToClickUpComment('- [ ] todo\n- [x] done\n* [X] also done');
      const terminators = result.comment.filter(block => block.text === '\n');
      expect(terminators.map(block => block.attributes)).toEqual([
        { list: { list: 'unchecked' } },
        { list: { list: 'checked' } },
        { list: { list: 'checked' } },
      ]);
      expect(result.comment.map(block => block.text)).not.toContain('[ ] todo');
      expect(result.comment).toContainEqual({ text: 'todo', attributes: {} });
    });

    it('round-trips a checklist', () => {
      expect(roundTrip('- [ ] todo\n- [x] done')).toBe('- [ ] todo\n- [x] done');
    });
  });

  describe('nested lists', () => {
    it('carries indentation as the indent line attribute and reads it back', () => {
      const markdown = '- parent\n  - child\n    1. grandchild';
      const blocks = prepareCommentForClickUp(markdown).comment;
      const terminators = blocks.filter(block => block.text === '\n');
      expect(terminators.map(block => block.attributes)).toEqual([
        { list: { list: 'bullet' } },
        { list: { list: 'bullet' }, indent: 1 },
        { list: { list: 'ordered' }, indent: 2 },
      ]);
      expect(clickUpCommentToMarkdown({ comment: blocks })).toBe(markdown);
    });
  });

  describe('inline tokenizer', () => {
    it('does not italicize inside snake_case identifiers', () => {
      const result = markdownToClickUpComment('rename my_var_name now');
      expect(result.comment).toEqual([{ text: 'rename my_var_name now', attributes: {} }]);
    });

    it('does not italicize underscores inside a bare URL', () => {
      const result = markdownToClickUpComment('https://example.com/a_b_c');
      expect(result.comment.every(block => !block.attributes?.italic)).toBe(true);
    });

    it('still italicizes a standalone _word_', () => {
      expect(markdownToClickUpComment('an _emphasised_ word').comment).toContainEqual({
        text: 'emphasised',
        attributes: { italic: true },
      });
    });

    it('does not treat spaced asterisks (arithmetic) as italic', () => {
      const result = markdownToClickUpComment('2 * 3 * 4');
      expect(result.comment).toEqual([{ text: '2 * 3 * 4', attributes: {} }]);
    });

    it('keeps the space between two adjacent formatted words', () => {
      const result = markdownToClickUpComment('**a** *b*');
      expect(result.comment.map(block => block.text).join('')).toBe('a b');
    });

    it('keeps a link inside bold text', () => {
      const result = markdownToClickUpComment('**see [docs](https://d.example) now**');
      expect(result.comment).toEqual([
        { text: 'see ', attributes: { bold: true } },
        { text: 'docs', attributes: { bold: true, link: 'https://d.example' } },
        { text: ' now', attributes: { bold: true } },
      ]);
    });

    it('keeps inline code inside bold text', () => {
      const result = markdownToClickUpComment('**run `npm test`**');
      expect(result.comment).toEqual([
        { text: 'run ', attributes: { bold: true } },
        { text: 'npm test', attributes: { bold: true, code: true } },
      ]);
    });

    it('handles ***bold italic***', () => {
      expect(markdownToClickUpComment('***both***').comment).toEqual([
        { text: 'both', attributes: { bold: true, italic: true } },
      ]);
    });

    it('nested formatting survives markdown -> blocks -> markdown -> blocks', () => {
      const markdown = '**run `npm test` via [ci](https://ci.example)** and ***both***';
      const first = prepareCommentForClickUp(markdown).comment;
      const second = prepareCommentForClickUp(clickUpCommentToMarkdown({ comment: first })).comment;
      const visible = (blocks: ClickUpCommentBlock[]) =>
        // Edge whitespace may move outside the delimiters on the way back
        // ("**run **" is not valid emphasis), which is visually identical.
        blocks
          .filter(block => block.text?.trim())
          .map(block => [block.text?.trim(), block.attributes]);
      expect(visible(second)).toEqual(visible(first));
    });
  });

  describe('fast-path markdown detection', () => {
    it('routes an italic-only comment through the markdown path', () => {
      expect(prepareCommentForClickUp('this is *really* it').comment).toContainEqual({
        text: 'really',
        attributes: { italic: true },
      });
    });

    it('leaves snake_case-only text on the plain path', () => {
      expect(prepareCommentForClickUp('set my_var_name please').comment).toEqual([
        { text: 'set my_var_name please', attributes: {} },
      ]);
    });
  });

  describe('reader fallbacks', () => {
    it('spells out an emoticon block that has only a code', () => {
      expect(
        clickUpCommentToMarkdown({ comment: [{ type: 'emoticon', emoticon: { code: '1f600' } }] })
      ).toBe('\u{1F600}');
    });

    it('falls back to user.username for a tag block without text', () => {
      expect(
        clickUpCommentToMarkdown({
          comment: [{ type: 'tag', user: { id: 7, username: 'Jane' } }],
        })
      ).toBe('@[Jane](7)');
    });
  });
});
