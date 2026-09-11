import { BOM_LAYERS, PIPELINE_STAGES, layersForEdition } from './bomFramework';

describe('BOM catalog', () => {
  it('has six layers with Community CBOM/SBOM and Enterprise Q/H/AI/I', () => {
    expect(BOM_LAYERS).toHaveLength(6);
    const ids = BOM_LAYERS.map((l) => l.id);
    expect(ids).toEqual(['cbom', 'qbom', 'sbom', 'hbom', 'aibom', 'ibom']);
    const community = layersForEdition(false);
    expect(community.filter((l) => l.enabled).map((l) => l.id)).toEqual(['cbom', 'sbom']);
    const enterprise = layersForEdition(true);
    expect(enterprise.every((l) => l.enabled)).toBe(true);
  });

  it('has eight pipeline stages with production monitoring as Enterprise', () => {
    expect(PIPELINE_STAGES).toHaveLength(8);
    expect(PIPELINE_STAGES[6].name).toMatch(/Production/i);
    expect(PIPELINE_STAGES[6].oss).toBe(false);
    expect(PIPELINE_STAGES.filter((s) => s.oss)).toHaveLength(7);
  });
});
