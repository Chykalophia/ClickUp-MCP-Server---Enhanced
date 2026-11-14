# CLAUDE.md

## Comment policy

- Comments document an interface (TSDoc on exported APIs) or explain a non-obvious *why*. Nothing else.
- No narration ("// Create client"), no section banners in files under ~600 lines, no commented-out code. Git keeps history.
- No history or reasoning in comments: no "changed / fixed / previously / now uses", no "we decided", no references to chats, handoff docs or commit hashes.
- Why-comments are present tense and at most 2 lines. Link an issue for workarounds and ClickUp API quirks where one exists.
- TSDoc: purpose, params, returns, throws. Don't repeat types in `@param`. Keep `@returns` accurate to the real response shape.
- A TODO must name a concrete action (ideally an issue). Otherwise open an issue instead.
- Never edit tool directives (`eslint-disable`, `@ts-expect-error`) or license headers in a cleanup. No emoji in comments.
