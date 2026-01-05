/**
 * Runtime Crypto Interceptor
 * Simulates LD_PRELOAD functionality for transparent crypto upgrades
 */
import { RivicConfig } from '../operator/rivic-operator';
export interface CryptoOperation {
    operation: 'encrypt' | 'decrypt' | 'sign' | 'verify' | 'keyExchange';
    originalAlgorithm: string;
    upgradedAlgorithm: string;
    timestamp: number;
    success: boolean;
}
export declare class CryptoInterceptor {
    private config;
    private operations;
    private metrics;
    constructor();
    updateConfig(config: RivicConfig): void;
    /**
     * Simulates intercepting OpenSSL calls
     * In production, this would be implemented as a shared library (librivic.so)
     */
    interceptCryptoCall(functionName: string, algorithm: string, data: Buffer): {
        algorithm: string;
        result: Buffer;
    };
    private upgradeAlgorithm;
    private mapFunctionToOperation;
    private performQuantumSafeOperation;
    private simulateKyberOperation;
    private simulateDilithiumOperation;
    private simulateHybridOperation;
    getMetrics(): {
        operations: CryptoOperation[];
        quantumReadiness: number;
        totalInterceptions: number;
        quantumUpgrades: number;
        legacyOperations: number;
    };
    private calculateQuantumReadiness;
    generateRuntimeCBOM(): any;
    private isQuantumSafe;
    /**
     * Shadow mode - monitor without interfering
     */
    enableShadowMode(): void;
    /**
     * Generate compliance alerts
     */
    checkCompliance(): Array<{
        level: 'warning' | 'critical';
        message: string;
    }>;
}
//# sourceMappingURL=runtime.d.ts.map