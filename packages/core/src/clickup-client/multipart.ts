/**
 * Per-request headers for a FormData upload through the shared axios instance.
 * axios's http adapter expands this to `multipart/form-data; boundary=...` for the body. `false` sends
 * no Content-Type at all (ClickUp: 400 ATTCH_045), and omitting it keeps the instance's JSON default.
 */
export const MULTIPART_HEADERS = { 'Content-Type': 'multipart/form-data' } as const;
