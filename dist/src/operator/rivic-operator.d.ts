export interface RivicConfig {
    namespace: string;
    quantumSafeMode: boolean;
    cbomEnabled: boolean;
    algorithms: {
        keyExchange: 'kyber-1024' | 'kyber-768' | 'kyber-512';
        signature: 'dilithium-5' | 'dilithium-3' | 'dilithium-2';
    };
    compliance: {
        eidas: boolean;
        dora: boolean;
    };
}
export declare class RivicOperator {
    private kc;
    private k8sApi;
    private customApi;
    private admissionApi;
    private cbomGenerator;
    private interceptor;
    private environment;
    private edition;
    constructor();
    private validateEnvironment;
    start(): Promise<void>;
    private installCRDs;
    private setupAdmissionWebhook;
    private watchRivicConfigs;
    private handleRivicConfigEvent;
    private applyQuantumConfig;
    private removeQuantumConfig;
    private storeCBOM;
    private startWebhookServer;
    private injectRivicAgent;
    private createPatch;
}
//# sourceMappingURL=rivic-operator.d.ts.map