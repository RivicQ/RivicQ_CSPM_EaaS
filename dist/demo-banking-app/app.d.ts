/**
 * Demo Banking Application
 * Simulates a typical banking service that will be upgraded to quantum-safe crypto
 */
export declare class BankingDemoApp {
    private app;
    private interceptor;
    private cbomGenerator;
    private transactions;
    private kycData;
    constructor();
    private setupMiddleware;
    private setupRoutes;
    private handleTransaction;
    private handleKYC;
    private signTransaction;
    private encryptKYCData;
    private getTransactions;
    private getCryptoMetrics;
    private getCBOM;
    private getCompliance;
    private enableQuantumSafe;
    private disableQuantumSafe;
    private generateRecommendations;
    private generateDashboard;
    start(port?: number): void;
}
//# sourceMappingURL=app.d.ts.map