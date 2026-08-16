import type { NormalizedCbomReport } from './cbomNormalize';

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  triggerDownload(filename.endsWith('.json') ? filename : `${filename}.json`, blob);
}

function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function pdfEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** Minimal single-page PDF so Community export works without extra dependencies. */
export function downloadSimplePdf(filename: string, title: string, lines: string[]): void {
  const wrapped: string[] = [title, ''];
  lines.forEach((line) => {
    const chunks = line.match(/.{1,92}/g) || [line];
    wrapped.push(...chunks);
  });
  const content = wrapped
    .slice(0, 48)
    .map((line, i) => `BT /F1 11 Tf 48 ${760 - i * 14} Td (${pdfEscape(line)}) Tj ET`)
    .join('\n');

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj`,
    `4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];

  let offset = 9;
  const offsets = [0];
  let body = '%PDF-1.4\n';
  objects.forEach((obj) => {
    offsets.push(offset);
    body += `${obj}\n`;
    offset = body.length;
  });
  const xrefPos = body.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  const pdf = `${body}${xref}trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  triggerDownload(filename.endsWith('.pdf') ? filename : `${filename}.pdf`, new Blob([pdf], { type: 'application/pdf' }));
}

export function reportToPdfLines(report: NormalizedCbomReport): string[] {
  const lines = [
    `Target: ${report.target}`,
    `Generated: ${report.generatedAt}`,
    `Source: ${report.source}`,
    `Security score: ${report.score}`,
    `Quantum exposure: ${report.quantumRisk}`,
    `Severity  C:${report.severity.critical}  H:${report.severity.high}  M:${report.severity.medium}  L:${report.severity.low}`,
    `Frameworks: DORA Art. 9 · BSI TR-02102-1 · eIDAS 2.0`,
    '',
    'Cryptographic inventory',
  ];
  report.algorithms.slice(0, 24).forEach((a) => {
    lines.push(
      `${a.algorithm}  key=${a.keySize || '—'}  qsafe=${a.quantumSafe ? 'yes' : 'no'}  risk=${a.riskLevel}  n=${a.count}`,
    );
    lines.push(`  BSI ${a.bsiRef} | ${a.doraRef} | ${a.eidasRef}`);
  });
  if (report.algorithms.length === 0) {
    lines.push('No cryptographic material detected in scanned files.');
  }
  return lines;
}

export function downloadCbomBundle(report: NormalizedCbomReport): void {
  const stamp = report.generatedAt.slice(0, 10);
  const base = `rivicq-cbom-${stamp}`;
  downloadJson(`${base}.json`, report);
  downloadSimplePdf(`${base}.pdf`, 'RivicQ CBOM report', reportToPdfLines(report));
}

export function assetsToReport(target: string, assets: any[]): NormalizedCbomReport {
  const algorithms = assets.map((a, i) => {
    const algorithm = a.algorithm || a.crypto_algorithm || 'Unknown';
    return {
      id: String(a.id || `asset-${i}`),
      name: a.name || algorithm,
      algorithm,
      keySize: a.key_size || a.keySize,
      quantumSafe: Boolean(a.quantum_safe ?? a.quantumSafe),
      riskLevel: String(a.risk_level || a.riskLevel || 'MEDIUM').toUpperCase() as NormalizedCbomReport['algorithms'][number]['riskLevel'],
      count: 1,
      location: a.location || a.cloud_provider,
      bsiRef: a.bsi_ref || a.bsiRef || 'BSI TR-02102-1',
      doraRef: a.dora_ref || a.doraRef || 'DORA Art. 9',
      eidasRef: a.eidas_ref || a.eidasRef || 'eIDAS 2.0',
    };
  });
  const severity = algorithms.reduce(
    (acc, a) => {
      const k = a.riskLevel.toLowerCase() as keyof typeof acc;
      if (k in acc) acc[k] += 1;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0 },
  );
  return {
    target,
    source: 'engine',
    score: Math.max(12, 100 - severity.critical * 18 - severity.high * 8 - severity.medium * 3),
    quantumRisk: algorithms.some((a) => !a.quantumSafe) ? 'Elevated' : 'Low',
    severity,
    algorithms,
    generatedAt: new Date().toISOString(),
  };
}
