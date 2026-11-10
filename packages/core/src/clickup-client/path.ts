/**
 * Path-segment encoding for ClickUp endpoint URLs.
 *
 * Every caller-supplied value that goes into an endpoint path goes through
 * `seg()`. Without it, an ID such as `x/../../view/abc` makes axios normalize
 * the URL to a different resource (`DELETE /webhook/x/../../view/abc` becomes
 * `DELETE /view/abc`), and `abc?x=` or `abc#` cuts the rest of the path off
 * (`DELETE /task/abc?x=/dependency` deletes the task). IDs reach these paths
 * from model output, which can be steered by text the model read (a task
 * description, a chat message), so the path structure must not depend on them.
 *
 * Encoding alone is not enough: `encodeURIComponent('..')` is still `..`, and
 * URL normalization resolves it. Dot segments are therefore refused outright.
 */
export class InvalidPathSegmentError extends Error {
  constructor(value: string) {
    super(`Invalid ClickUp ID: ${JSON.stringify(value.slice(0, 80))}`);
    this.name = 'InvalidPathSegmentError';
  }
}

export function seg(value: string | number): string {
  const text = String(value);
  if (text === '' || text === '.' || text === '..') {
    throw new InvalidPathSegmentError(text);
  }
  return encodeURIComponent(text);
}

const CLICKUP_API_ORIGIN = 'https://api.clickup.com';
const DOT_SEGMENT = /^(?:\.|%2e){1,2}$/i;

/**
 * The HTTP layer's backstop for seg(): refuse an endpoint whose path contains
 * a dot segment (axios would resolve it to another resource), a fragment or a
 * backslash, or that resolves anywhere but https://api.clickup.com/api/v2|v3.
 * A path built with seg() never trips this; a raw interpolation of a hostile
 * ID does, so a missed call site fails closed instead of hitting the wrong
 * resource with the caller's token.
 */
export function assertSafeEndpoint(url: string | undefined, baseURL: string | undefined): void {
  if (url === undefined) return;
  const queryAt = url.indexOf('?');
  const pathPart = queryAt === -1 ? url : url.slice(0, queryAt);
  if (url.includes('#') || url.includes('\\')) {
    throw new InvalidPathSegmentError(url);
  }
  const relative = pathPart.replace(/^https:\/\/api\.clickup\.com/, '');
  if (relative.split('/').some(segment => DOT_SEGMENT.test(segment))) {
    throw new InvalidPathSegmentError(url);
  }
  const resolved = new URL(/^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `${baseURL ?? ''}${url}`);
  if (resolved.origin !== CLICKUP_API_ORIGIN || !/^\/api\/v[23]\//.test(resolved.pathname)) {
    throw new InvalidPathSegmentError(url);
  }
}
