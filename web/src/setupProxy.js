const fs = require('fs');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const repoRoot = path.resolve(__dirname, '..', '..');
const docsDir = path.join(repoRoot, 'docs');
const ROOT_DOCS = new Set([
  'LEGAL.md',
  'PRIVACY.md',
  'SECURITY.md',
  'NOTICE',
  'CONTRIBUTING.md',
  'DATASETS.md',
  'TRADEMARKS.md',
  'README.md',
]);

function safeFile(root, rel) {
  const resolved = path.resolve(root, rel);
  const rootWithSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (resolved !== root && !resolved.startsWith(rootWithSep)) return null;
  return resolved;
}

// Dev-only: the Pages workflow copies docs into web/build, which the CRA server
// does not see. Serve the same tree so legal/privacy/security links resolve.
function servePublishedDocs(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const urlPath = req.path || '';
  const marker = '/docs/';
  const idx = urlPath.indexOf(marker);
  if (idx === -1) return next();
  let rel = '';
  try {
    rel = decodeURIComponent(urlPath.slice(idx + marker.length));
  } catch (err) {
    return next();
  }
  if (!rel || rel.includes('\0')) return next();
  const normalized = path.normalize(rel);
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) return next();

  const baseName = path.basename(normalized);
  const isMarkdown = /\.md$/i.test(baseName) || baseName === 'NOTICE';
  const wantsHtml = String(req.headers.accept || '').includes('text/html');
  if (isMarkdown && wantsHtml) {
    const slug = baseName === 'NOTICE' ? 'notice' : baseName.replace(/\.md$/i, '').toLowerCase();
    const prefix = urlPath.slice(0, idx).replace(/\/$/, '');
    return res.redirect(302, `${prefix}/archify/site/index.html#types/${encodeURIComponent(slug)}`);
  }

  const published = safeFile(docsDir, normalized);
  if (published && fs.existsSync(published) && fs.statSync(published).isFile()) {
    return res.sendFile(published);
  }
  if (ROOT_DOCS.has(normalized) || ROOT_DOCS.has(baseName)) {
    const rootFile = safeFile(repoRoot, baseName);
    if (rootFile && fs.existsSync(rootFile) && fs.statSync(rootFile).isFile()) {
      return res.sendFile(rootFile);
    }
  }
  return next();
}

function serveArchify(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const urlPath = req.path || '';
  const marker = '/archify/';
  const idx = urlPath.indexOf(marker);
  if (idx === -1) return next();
  let rel = '';
  try {
    rel = decodeURIComponent(urlPath.slice(idx + marker.length));
  } catch (err) {
    return next();
  }
  if (!rel || rel.includes('\0')) return next();
  const normalized = path.normalize(rel);
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) return next();
  const archifyRoot = path.join(repoRoot, 'archify');
  const published = safeFile(archifyRoot, normalized);
  if (!published || !fs.existsSync(published)) return next();
  const stat = fs.statSync(published);
  if (stat.isDirectory()) {
    const index = path.join(published, 'index.html');
    if (fs.existsSync(index)) return res.sendFile(index);
    return next();
  }
  if (stat.isFile()) return res.sendFile(published);
  return next();
}

// Only proxy API calls — never forward SPA routes like /platform/login to the Go backend.
module.exports = function setupProxy(app) {
  app.use(serveArchify);
  app.use(servePublishedDocs);
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.REACT_APP_API_PROXY || 'http://localhost:9090',
      changeOrigin: true,
    })
  );
};
