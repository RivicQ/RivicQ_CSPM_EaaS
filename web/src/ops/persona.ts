export type OpsPersona = 'ciso' | 'analyst' | 'engineer';

const KEY = 'rivicq.ops.persona';

export function loadPersona(): OpsPersona {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'ciso' || v === 'analyst' || v === 'engineer') return v;
  } catch {
    /* ignore */
  }
  return 'analyst';
}

export function persistPersona(p: OpsPersona) {
  try {
    localStorage.setItem(KEY, p);
  } catch {
    /* ignore */
  }
}

export const PERSONA_LABEL: Record<OpsPersona, string> = {
  ciso: 'CISO',
  analyst: 'Analyst',
  engineer: 'Engineer',
};

export const PERSONA_HELP: Record<OpsPersona, string> = {
  ciso: 'Risk, quantum readiness, compliance mappings, and reports. Scanner internals stay off this layout.',
  analyst: 'Findings, evidence, assets, and scans for investigation.',
  engineer: 'CLI/CI scanners, policy gates, pipeline, and PATH tools.',
};
