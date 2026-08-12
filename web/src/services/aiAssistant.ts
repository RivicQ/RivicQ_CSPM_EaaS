import { aiService } from './api';
import type { WorkspaceContext } from '../types/assistant';

const SUGGESTED_PROMPTS = [
  'Summarize my security posture',
  'What are my critical findings?',
  'How PQC-ready is my inventory?',
  'Show compliance status',
  'Which assets need attention?',
];

export function getSuggestedPrompts(): string[] {
  return SUGGESTED_PROMPTS;
}

function formatProviderBreakdown(map?: Record<string, number>): string {
  if (!map || !Object.keys(map).length) return 'No cloud breakdown available.';
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `• ${k.toUpperCase()}: ${v}`)
    .join('\n');
}

function formatFindings(map?: Record<string, number>): string {
  if (!map) return 'No finding counts available.';
  return Object.entries(map)
    .map(([k, v]) => `• ${k}: ${v}`)
    .join('\n');
}

function buildLocalSummary(ctx: WorkspaceContext): string {
  const inv = ctx.inventory;
  const cloud = ctx.cloud;
  const lines: string[] = ['**Workspace snapshot**'];

  if (inv?.totalAssets != null) {
    lines.push(`• **${inv.totalAssets}** cryptographic assets tracked`);
  }
  if (inv?.complianceScore != null) {
    lines.push(`• Compliance score: **${inv.complianceScore}%**`);
  }
  if (inv?.quantumSafeCount != null && inv?.nonQuantumSafe != null) {
    const total = inv.quantumSafeCount + inv.nonQuantumSafe;
    const pct = total ? Math.round((inv.quantumSafeCount / total) * 100) : 0;
    lines.push(`• PQC readiness: **${pct}%** (${inv.quantumSafeCount} quantum-safe, ${inv.nonQuantumSafe} legacy)`);
  }
  if (cloud?.securityFindings) {
    lines.push(`• Open findings — ${formatFindings(cloud.securityFindings).replace(/\n/g, ', ')}`);
  }
  if (ctx.compliance?.overallScore != null) {
    lines.push(`• Overall compliance: **${ctx.compliance.overallScore}%** across ${ctx.compliance.frameworks?.length ?? 0} frameworks`);
  }
  lines.push(`\n_Scanned ${new Date(ctx.scannedAt).toLocaleTimeString()} · ${ctx.edition} edition · page ${ctx.page}_`);
  return lines.join('\n');
}

function replyFromContext(message: string, ctx: WorkspaceContext): string | null {
  const q = message.toLowerCase();

  if (/help|what can you|commands/.test(q)) {
    return [
      'I can answer questions about your RivicQ workspace using live inventory, cloud, compliance, and security data.',
      '',
      'Try asking:',
      ...SUGGESTED_PROMPTS.map((p) => `• ${p}`),
    ].join('\n');
  }

  if (/summar|overview|posture|status|snapshot/.test(q)) {
    return buildLocalSummary(ctx);
  }

  if (/critical|finding|alert|threat|incident|risk/.test(q)) {
    const findings = ctx.cloud?.securityFindings;
    const events = ctx.security?.events ?? [];
    const criticalEvents = events.filter((e) => (e.severity || '').toLowerCase() === 'critical');
    const lines = ['**Security findings**'];
    if (findings) lines.push(formatFindings(findings));
    if (events.length) {
      lines.push('', '**Recent events:**');
      events.slice(0, 5).forEach((e) => {
        lines.push(`• [${(e.severity || 'info').toUpperCase()}] ${e.message || e.title}`);
      });
    } else {
      lines.push('No recent security events in the current scan.');
    }
    if (criticalEvents.length) {
      lines.push('', `⚠️ **${criticalEvents.length} critical event(s)** require immediate review.`);
    }
    return lines.join('\n');
  }

  if (/pqc|quantum|legacy|algorithm/.test(q)) {
    const inv = ctx.inventory;
    const legacy = ctx.assets?.filter((a) => a.quantum_safe === false) ?? [];
    const lines = ['**Post-quantum readiness**'];
    if (inv?.quantumSafeCount != null) {
      lines.push(`• Quantum-safe assets: **${inv.quantumSafeCount}**`);
      lines.push(`• Legacy / vulnerable: **${inv.nonQuantumSafe ?? inv.vulnerableAssets ?? '—'}**`);
    }
    if (legacy.length) {
      lines.push('', '**Priority migration targets:**');
      legacy.slice(0, 5).forEach((a) => {
        lines.push(`• ${a.name} (${a.algorithm || 'unknown'}) — ${a.risk_level || 'unknown'} risk`);
      });
    }
    lines.push('', 'Recommend migrating RSA/ECDSA/3DES to ML-KEM / ML-DSA where supported.');
    return lines.join('\n');
  }

  if (/compliance|framework|iso|gdpr|soc|nist|dora/.test(q)) {
    const lines = ['**Compliance status**'];
    if (ctx.compliance?.overallScore != null) {
      lines.push(`• Overall score: **${ctx.compliance.overallScore}%**`);
    }
    ctx.compliance?.frameworks?.forEach((f) => {
      lines.push(`• ${(f.name || f.framework || 'Framework').toUpperCase()}: **${f.score ?? '—'}%**`);
    });
    if (!ctx.compliance?.frameworks?.length) {
      lines.push('Compliance dashboards are not available on this edition or scan.');
    }
    return lines.join('\n');
  }

  if (/asset|inventory|crypto/.test(q)) {
    const lines = ['**Asset inventory**'];
    if (ctx.inventory?.totalAssets != null) {
      lines.push(`• Total assets: **${ctx.inventory.totalAssets}**`);
    }
    if (ctx.inventory?.byCategory) {
      lines.push('', 'By category:');
      lines.push(formatProviderBreakdown(ctx.inventory.byCategory));
    }
    if (ctx.assets?.length) {
      lines.push('', '**Top tracked assets:**');
      ctx.assets.slice(0, 6).forEach((a) => {
        lines.push(`• ${a.name} — ${a.cloud_provider || 'on-prem'} · ${a.algorithm || 'n/a'} · ${a.risk_level || 'unknown'}`);
      });
    }
    return lines.join('\n');
  }

  if (/cloud|aws|gcp|azure|provider|account/.test(q)) {
    const lines = ['**Cloud coverage**'];
    if (ctx.cloud?.totalResources != null) {
      lines.push(`• Resources monitored: **${ctx.cloud.totalResources}**`);
    }
    if (ctx.cloud?.scanCoverage != null) {
      lines.push(`• Scan coverage: **${ctx.cloud.scanCoverage}%**`);
    }
    if (ctx.cloud?.byProvider) {
      lines.push('', formatProviderBreakdown(ctx.cloud.byProvider));
    }
    return lines.join('\n');
  }

  if (/scan|cbom|scanner/.test(q)) {
    return [
      '**Scan activity**',
      ctx.cloud?.scansToday != null ? `• Scans today: **${ctx.cloud.scansToday}**` : '',
      ctx.cloud?.scanCoverage != null ? `• Coverage: **${ctx.cloud.scanCoverage}%** of connected resources` : '',
      '',
      'Open the **Scanner** workspace to trigger a new CBOM scan or review the latest report.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  return null;
}

async function tryBackendAI(message: string, ctx: WorkspaceContext): Promise<string | null> {
  try {
    const resp = await aiService.analyze({
      context: 'dashboard',
      query: message,
    });
    const data = resp.data;
    if (!data) return null;
    const parts = [
      data.summary,
      data.key_findings?.length ? `\n**Key findings:**\n${data.key_findings.map((f: string) => `• ${f}`).join('\n')}` : '',
      data.recommendations?.length
        ? `\n**Recommendations:**\n${data.recommendations.map((r: string) => `• ${r}`).join('\n')}`
        : '',
    ].filter(Boolean);
    if (parts.length) return parts.join('\n');
  } catch {
    // Enterprise AI endpoint may be unavailable — fall back to local analysis.
  }
  return null;
}

export async function askAssistant(message: string, ctx: WorkspaceContext): Promise<string> {
  const trimmed = message.trim();
  if (!trimmed) return 'Ask me anything about your posture, assets, compliance, or findings.';

  const backend = await tryBackendAI(trimmed, ctx);
  if (backend) return backend;

  const local = replyFromContext(trimmed, ctx);
  if (local) return local;

  return [
    buildLocalSummary(ctx),
    '',
    'I matched your question against the latest workspace scan. Try a more specific prompt like **"critical findings"**, **"PQC readiness"**, or **"compliance status"**.',
  ].join('\n');
}
