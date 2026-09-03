import { BOM_LAYERS, PIPELINE_STAGES, layersForEdition } from './bomFramework';

describe('five-BOM catalog', () => {
  it('has five layers with Community CBOM/QBOM/SBOM and locked AIBOM/IBOM', () => {
    expect(BOM_LAYERS).toHaveLength(5);
    const ids = BOM_LAYERS.map((l) => l.id);
    expect(ids).toEqual(['cbom', 'qbom', 'sbom', 'aibom', 'ibom']);
    const community = layersForEdition(false);
    expect(community.filter((l) => l.enabled).map((l) => l.id)).toEqual(['cbom', 'qbom', 'sbom']);
    const paid = layersForEdition(true);
    expect(paid.every((l) => l.enabled)).toBe(true);
  });

  it('has eight pipeline stages with production monitoring as Enterprise', () => {
    expect(PIPELINE_STAGES).toHaveLength(8);
    expect(PIPELINE_STAGES[6].name).toMatch(/Production/i);
    expect(PIPELINE_STAGES[6].oss).toBe(false);
    expect(PIPELINE_STAGES.filter((s) => s.oss)).toHaveLength(7);
  });
});
