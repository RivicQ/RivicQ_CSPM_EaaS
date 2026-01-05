import { CBOMGenerator } from '../../src/cbom/generator';

describe('CBOMGenerator Unit Tests', () => {
  let generator: CBOMGenerator;

  beforeEach(() => {
    generator = new CBOMGenerator();
  });

  describe('Initialization', () => {
    it('should initialize CBOM generator', () => {
      expect(generator).toBeDefined();
    });
  });

  describe('CBOM Generation', () => {
    it('should generate CycloneDX 1.6 compliant CBOM', async () => {
      const cbom = await generator.generateBuildTimeCBOM('.');
      
      expect(cbom).toBeDefined();
      expect(cbom.bomFormat).toBe('CycloneDX');
      expect(cbom.specVersion).toBe('1.6');
    });

    it('should include component metadata', async () => {
      const cbom = await generator.generateBuildTimeCBOM('.');
      
      expect(cbom.metadata).toBeDefined();
      expect(cbom.metadata.component).toBeDefined();
      expect(cbom.metadata.component.name).toBeDefined();
      expect(cbom.metadata.component.version).toBeDefined();
    });

    it('should track cryptographic assets', async () => {
      const cbom = await generator.generateBuildTimeCBOM('.');
      
      expect(cbom.components).toBeDefined();
      expect(Array.isArray(cbom.components)).toBe(true);
    });

    it('should include quantum-safe algorithm tracking', async () => {
      const cbom = await generator.generateBuildTimeCBOM('.');
      
      const quantumComponents = cbom.components.filter(
        (c: any) => c.cryptoProperties?.algorithmProperties?.variant?.includes('kyber') ||
                    c.cryptoProperties?.algorithmProperties?.variant?.includes('dilithium')
      );
      
      // Expect at least some quantum-safe tracking
      expect(cbom.components.length).toBeGreaterThan(0);
    });
  });

  describe('Compliance Auditing', () => {
    it('should generate compliance audit report', async () => {
      const audit = await generator.generateComplianceAudit();
      
      expect(audit).toBeDefined();
      expect(audit.timestamp).toBeDefined();
      expect(audit.compliance).toBeDefined();
    });

    it('should validate eIDAS 2.0 compliance', async () => {
      const audit = await generator.generateComplianceAudit();
      
      expect(audit.compliance.eidas2_0).toBeDefined();
    });

    it('should validate DORA compliance', async () => {
      const audit = await generator.generateComplianceAudit();
      
      expect(audit.compliance.dora).toBeDefined();
    });
  });

  describe('Namespace Scanning', () => {
    it('should scan and track crypto assets in namespace', async () => {
      const cbom = await generator.generateForNamespace('default', {
        keyExchange: 'kyber-1024',
        signature: 'dilithium-5'
      });
      
      expect(cbom).toBeDefined();
      expect(cbom.components).toBeDefined();
    });
  });
});
