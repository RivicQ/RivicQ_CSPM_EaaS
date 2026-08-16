import { profileForAlgorithm, quantumRiskLabel, securityScore } from '../utils/complianceCatalog';
import type { CbomComponent, NormalizedCbomReport } from '../utils/cbomNormalize';

export class PublicScanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PublicScanError';
  }
}

const SKIP_DIR = /(^|\/)(node_modules|vendor|dist|build|\.git|coverage|__pycache__|\.next|target)(\/|$)/i;
const SCAN_EXT = /\.(go|py|js|jsx|ts|tsx|java|rs|c|cc|cpp|h|hpp|rb|php|cs|kt|swift|tf|yml|yaml|json|pem|key|conf|cfg|ini|env|mod|toml|gradle|xml)$/i;
const SCAN_NAME = /^(dockerfile|makefile|go\.mod|go\.sum|package\.json|requirements\.txt|pipfile|cargo\.toml|pom\.xml|build\.gradle)$/i;
const MAX_FILES = 36;
const MAX_BYTES = 180_000;

export function parseGitHubTarget(input: string): { owner: string; repo: string } {
  const trimmed = input.trim().replace(/\.git$/, '');
  const ssh = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+)$/i);
  if (ssh) return { owner: ssh[1], repo: ssh[2] };
  const url = trimmed.match(/github\.com[/:]([^/\s]+)\/([^/\s?#]+)/i);
  if (url) return { owner: url[1], repo: url[2] };
  const short = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (short) return { owner: short[1], repo: short[2] };
  throw new PublicScanError('Enter a public GitHub URL or owner/repo (for example https://github.com/owner/repo).');
}

type TreeItem = { path: string; type: string; size?: number };

function isScanCandidate(path: string): boolean {
  if (SKIP_DIR.test(path)) return false;
  const base = path.split('/').pop() || path;
  return SCAN_EXT.test(path) || SCAN_NAME.test(base);
}

async function githubJson<T>(url: string): Promise<T> {
  const resp = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (resp.status === 404) throw new PublicScanError('Repository not found or it is private. Only public GitHub repos can be scanned from this page.');
  if (resp.status === 403) throw new PublicScanError('GitHub rate limit reached. Wait a minute and retry, or sign in to run a full engine scan.');
  if (!resp.ok) throw new PublicScanError(`GitHub returned ${resp.status}. Try again or sign in for a full CBOM scan.`);
  return resp.json() as Promise<T>;
}

function collectMatches(path: string, content: string): CbomComponent[] {
  const hits: CbomComponent[] = [];
  const patterns: Array<{ re: RegExp; sample: string }> = [
    { re: /3des|triple\s*des|des-ede3/gi, sample: '3DES' },
    { re: /\bmd5\b/gi, sample: 'MD5' },
    { re: /sha-?1(?![0-9])/gi, sample: 'SHA-1' },
    { re: /tlsv?1\.0|tls\s*1\.0/gi, sample: 'TLS 1.0' },
    { re: /tlsv?1\.1|tls\s*1\.1/gi, sample: 'TLS 1.1' },
    { re: /rsa[-_]?1024/gi, sample: 'RSA-1024' },
    { re: /rsa[-_]?2048|2048[-_]?bit/gi, sample: 'RSA-2048' },
    { re: /rsa[-_]?4096/gi, sample: 'RSA-4096' },
    { re: /\bRSA\b|RS256|crypto\.subtle.*RSA/g, sample: 'RSA' },
    { re: /ecdsa|secp256r1|prime256v1|P-256/gi, sample: 'ECDSA P-256' },
    { re: /ed25519/gi, sample: 'Ed25519' },
    { re: /x25519|curve25519/gi, sample: 'X25519' },
    { re: /aes[-_]?256[-_]?gcm/gi, sample: 'AES-256-GCM' },
    { re: /aes[-_]?256/gi, sample: 'AES-256' },
    { re: /aes[-_]?128/gi, sample: 'AES-128' },
    { re: /chacha20|poly1305/gi, sample: 'ChaCha20-Poly1305' },
    { re: /ml-?kem|kyber/gi, sample: 'ML-KEM' },
    { re: /ml-?dsa|dilithium/gi, sample: 'ML-DSA' },
    { re: /argon2/gi, sample: 'Argon2' },
    { re: /bcrypt/gi, sample: 'bcrypt' },
    { re: /tlsv?1\.3|tls\s*1\.3/gi, sample: 'TLS 1.3' },
    { re: /openssl|libcrypto|jsonwebtoken|node-forge|pycryptodome|bouncycastle/gi, sample: 'RSA' },
  ];

  patterns.forEach((p, i) => {
    const matches = content.match(p.re);
    if (!matches || matches.length === 0) return;
    const profile = profileForAlgorithm(p.sample);
    hits.push({
      id: `${path}-${profile.name}-${i}`,
      name: profile.name,
      algorithm: profile.name,
      keySize: profile.keySize,
      quantumSafe: profile.quantumSafe,
      riskLevel: profile.risk,
      count: matches.length,
      location: path,
      bsiRef: profile.bsiRef,
      doraRef: profile.doraRef,
      eidasRef: profile.eidasRef,
      evidence: `${matches.length} match${matches.length === 1 ? '' : 'es'} in ${path}`,
    });
  });
  return hits;
}

function mergeComponents(items: CbomComponent[]): CbomComponent[] {
  const map = new Map<string, CbomComponent>();
  items.forEach((item) => {
    const key = item.algorithm;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...item });
      return;
    }
    prev.count += item.count;
    if (item.location && prev.location && !prev.location.includes(item.location)) {
      prev.location = `${prev.location}, ${item.location}`;
    }
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export async function scanPublicGitHubRepo(
  target: string,
  onProgress?: (pct: number, stage: string) => void,
): Promise<NormalizedCbomReport> {
  const { owner, repo } = parseGitHubTarget(target);
  onProgress?.(8, 'Connecting');
  const repoInfo = await githubJson<{ default_branch: string; private: boolean }>(
    `https://api.github.com/repos/${owner}/${repo}`,
  );
  if (repoInfo.private) {
    throw new PublicScanError('This repository is private. Sign in to scan authorized private repos.');
  }
  const branch = repoInfo.default_branch || 'main';
  onProgress?.(22, 'Discovering files');
  const tree = await githubJson<{ tree: TreeItem[]; sha: string }>(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  );
  const files = (tree.tree || [])
    .filter((t) => t.type === 'blob' && isScanCandidate(t.path) && (t.size || 0) < MAX_BYTES)
    .slice(0, MAX_FILES);

  onProgress?.(40, 'Analyzing crypto');
  const findings: CbomComponent[] = [];
  let scanned = 0;
  for (const file of files) {
    scanned += 1;
    const pct = 40 + Math.round((scanned / Math.max(files.length, 1)) * 40);
    onProgress?.(pct, 'Analyzing crypto');
    try {
      const raw = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`);
      if (!raw.ok) continue;
      const text = (await raw.text()).slice(0, MAX_BYTES);
      findings.push(...collectMatches(file.path, text));
    } catch {
      // Skip individual file failures; keep the rest of the report.
    }
  }

  onProgress?.(88, 'Building CBOM');
  const algorithms = mergeComponents(findings);
  const severity = algorithms.reduce(
    (acc, a) => {
      const k = a.riskLevel.toLowerCase() as keyof typeof acc;
      acc[k] += a.count;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0 },
  );
  const vuln = algorithms.filter((a) => !a.quantumSafe).length;
  onProgress?.(100, 'Quantifying risk');

  return {
    target: `https://github.com/${owner}/${repo}`,
    source: 'public-github',
    score: securityScore(severity.critical, severity.high, severity.medium, severity.low),
    quantumRisk: quantumRiskLabel(vuln, algorithms.length),
    severity,
    algorithms,
    fileCount: files.length,
    commitSha: tree.sha,
    defaultBranch: branch,
    generatedAt: new Date().toISOString(),
  };
}
