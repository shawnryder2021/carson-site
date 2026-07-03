// Escapes user-supplied text before it's interpolated into HTML (transactional
// emails, etc.). Distinct from lib/sanitizeHtml, which cleans admin-authored
// block HTML — this one neutralizes ALL markup in a plain-text value so a
// shopper's name like `<img src=x onerror=…>` can't execute in the recipient's
// email client.
export function escapeHtml(input: unknown): string {
  const s = input == null ? '' : String(input);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Safely serialize an object for embedding in a <script type="application/ld+json">
// block. Plain JSON.stringify leaves `</script>` and the U+2028/U+2029 line
// separators intact, which can break out of the script element — escape them.
export function jsonLdSafe(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
