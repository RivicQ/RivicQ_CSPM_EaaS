/** Client-side Community exports. No new dependencies. */

export function downloadJSON(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function printBrandedReport(opts: {
  title: string;
  subtitle?: string;
  disclaimer?: string;
  bodyHtml: string;
}) {
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return;
  const disclaimer = opts.disclaimer
    || 'RivicQ Community report. Not a certification. IBM, IBM Plex, and Carbon are trademarks of IBM. RivicQ is not an IBM product.';
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>${escapeHtml(opts.title)}</title>
<style>
  body { font-family: "Outfit", Helvetica, Arial, sans-serif; color: #161616; margin: 32px; }
  h1 { color: #8251f3; font-size: 22px; margin: 0 0 8px; }
  .sub { color: #525252; margin-bottom: 16px; }
  .disclaimer { background: #f5f0ff; border-left: 4px solid #8251f3; padding: 12px 16px; margin: 16px 0; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e0e0e0; }
  th { background: #f4f4f4; }
  .ok { color: #24a148; font-weight: 600; }
  .bad { color: #da1e28; font-weight: 600; }
</style></head><body>
  <h1>${escapeHtml(opts.title)}</h1>
  ${opts.subtitle ? `<div class="sub">${escapeHtml(opts.subtitle)}</div>` : ''}
  <div class="disclaimer">${escapeHtml(disclaimer)}</div>
  ${opts.bodyHtml}
  <p style="margin-top:32px;font-size:12px;color:#8d8d8d">© ${new Date().getFullYear()} RivicQ GmbH · Apache-2.0 Community / commercial Enterprise license</p>
</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
