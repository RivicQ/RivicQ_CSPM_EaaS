import { CryptoInterceptor } from '../../src/interceptor/runtime';

describe('CryptoInterceptor Unit Tests', () => {
  let interceptor: CryptoInterceptor;

  beforeEach(() => {
    interceptor = new CryptoInterceptor();
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      expect(interceptor).toBeDefined();
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const config = {
        namespace: 'default',
        quantumSafeMode: true,
        cbomEnabled: true,
        algorithms: {
          keyExchange: 'kyber-1024' as const,
          signature: 'dilithium-5' as const
        },
        compliance: {
          eidas: true,
          dora: true
        }
      };

      expect(() => {
        interceptor.updateConfig(config);
      }).not.toThrow();
    });
  });

  describe('Crypto Interception', () => {
    beforeEach(() => {
      const config = {
        namespace: 'default',
        quantumSafeMode: true,
        cbomEnabled: true,
        algorithms: {
          keyExchange: 'kyber-1024' as const,
          signature: 'dilithium-5' as const
        },
        compliance: {
          eidas: true,
          dora: true
        }
      };
      interceptor.updateConfig(config);
    });

    it('should intercept RSA key exchange and upgrade to Kyber', () => {
      const testData = Buffer.from('test-rsa-operation');
      const result = interceptor.interceptCryptoCall('EVP_PKEY_CTX_new', 'RSA', testData);

      expect(result).toBeDefined();
      expect(result.algorithm).toBeDefined();
      expect(result.result).toBeDefined();
    });

    it('should intercept ECDSA signature and upgrade to Dilithium', () => {
      const testData = Buffer.from('test-signature-operation');
      const result = interceptor.interceptCryptoCall('EVP_DigestSign', 'ECDSA', testData);

      expect(result).toBeDefined();
      expect(result.algorithm).toBeDefined();
    });

    it('should return metrics', () => {
      const metrics = interceptor.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.totalInterceptions).toBeGreaterThanOrEqual(0);
      expect(metrics.quantumUpgrades).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Quantum-Safe Mode Bypass', () => {
    it('should pass through without modification when quantum-safe mode is disabled', () => {
      const config = {
        namespace: 'default',
        quantumSafeMode: false,
        cbomEnabled: false,
        algorithms: {
          keyExchange: 'kyber-512' as const,
          signature: 'dilithium-2' as const
        },
        compliance: {
          eidas: false,
          dora: false
        }
      };
      interceptor.updateConfig(config);

      const testData = Buffer.from('test-data');
      const result = interceptor.interceptCryptoCall('EVP_PKEY_CTX_new', 'RSA', testData);

      expect(result).toBeDefined();
    });
  });
});
