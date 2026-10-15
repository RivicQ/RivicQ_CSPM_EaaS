/** Canonical rendered docs live in the Archify site, not raw markdown. */
export function archifyDocsHref(slug?: string): string {
  const base = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  const hash = slug ? `#types/${slug}` : '#types';
  return `${base}/archify/site/index.html${hash}`;
}
