// Validates a post-login `?next=` redirect target. Only same-origin relative
// paths are allowed. Rejects protocol-relative (`//host`), backslash tricks
// (`/\host`, which the URL parser normalizes to `//host`), and absolute URLs.
export function safeNext(next: string | null | undefined, fallback = '/'): string {
  if (!next) return fallback;
  // Must start with a single "/" that is NOT followed by "/" or "\".
  if (!/^\/(?![/\\])/.test(next)) return fallback;
  return next;
}
