// Minimal HTML sanitizer for admin-authored page content. Admins are trusted,
// but we still strip scripts, event handlers, and javascript: URLs so a bad
// paste can't inject active content. Not a full sanitizer — sufficient for a
// single-tenant admin CMS.
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  let html = input;
  // Remove <script>…</script> and <style>…</style> blocks entirely.
  html = html.replace(/<\s*(script|style|iframe|object|embed)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  // Remove self-closing / unclosed dangerous tags.
  html = html.replace(/<\s*(script|object|embed|link|meta)\b[^>]*>/gi, '');
  // Strip inline event handlers: on*="..." or on*='...' or on*=value.
  html = html.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');
  html = html.replace(/\son\w+\s*=\s*'[^']*'/gi, '');
  html = html.replace(/\son\w+\s*=\s*[^\s>]+/gi, '');
  // Neutralize javascript: and data: (non-image) URLs in href/src.
  html = html.replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"');
  html = html.replace(/(href|src)\s*=\s*("|')\s*data:(?!image\/)[^"']*\2/gi, '$1="#"');
  return html;
}
