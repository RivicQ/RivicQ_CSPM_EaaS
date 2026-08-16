/** Shared algorithm → risk + BSI / DORA / eIDAS mapping for CBOM reports. */

export type CbomRiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type AlgorithmProfile = {
  name: string;
  keySize?: number;
  quantumSafe: boolean;
  risk: CbomRiskLevel;
  bsiRef: string;
  doraRef: string;
  eidasRef: string;
};

const DORA_ART9 = 'DORA Art. 9';
const DORA_ART9_2 = 'DORA Art. 9(2)';
const DORA_ART9_4 = 'DORA Art. 9(4)(b)';
const EIDAS_TS = 'eIDAS 2.0 ETSI TS 119 312';
const EIDAS_ANNEX = 'eIDAS 2.0 Annex IV';

const CATALOG: Array<{ test: RegExp; profile: Omit<AlgorithmProfile, 'name' | 'keySize'> & { name: string; keySize?: number } }> = [
  { test: /3des|triple\s*des|des-ede3|desede/i, profile: { name: '3DES', keySize: 168, quantumSafe: false, risk: 'CRITICAL', bsiRef: 'BSI TR-02102-1, Section 3.2', doraRef: DORA_ART9_2, eidasRef: EIDAS_TS } },
  { test: /\bdes\b|des-cbc/i, profile: { name: 'DES', keySize: 56, quantumSafe: false, risk: 'CRITICAL', bsiRef: 'BSI TR-02102-1, Section 3.2', doraRef: DORA_ART9_2, eidasRef: EIDAS_TS } },
  { test: /rc4|arcfour/i, profile: { name: 'RC4', quantumSafe: false, risk: 'CRITICAL', bsiRef: 'BSI TR-02102-2, Section 3.3', doraRef: DORA_ART9_2, eidasRef: EIDAS_TS } },
  { test: /md5/i, profile: { name: 'MD5', quantumSafe: false, risk: 'CRITICAL', bsiRef: 'BSI TR-02102-1, Section 3.3', doraRef: DORA_ART9_2, eidasRef: EIDAS_TS } },
  { test: /sha-?1(?![0-9])/i, profile: { name: 'SHA-1', quantumSafe: false, risk: 'HIGH', bsiRef: 'BSI TR-02102-1, Section 3.3', doraRef: DORA_ART9_2, eidasRef: EIDAS_TS } },
  { test: /tls\s*1\.0|tlsv1(?!\.[123])/i, profile: { name: 'TLS 1.0', quantumSafe: false, risk: 'CRITICAL', bsiRef: 'BSI TR-02102-2, Section 3.2', doraRef: DORA_ART9_2, eidasRef: EIDAS_TS } },
  { test: /tls\s*1\.1|tlsv1\.1/i, profile: { name: 'TLS 1.1', quantumSafe: false, risk: 'HIGH', bsiRef: 'BSI TR-02102-2, Section 3.2', doraRef: DORA_ART9_2, eidasRef: EIDAS_TS } },
  { test: /rsa[-_]?1024|1024[-_]?bit.*rsa/i, profile: { name: 'RSA-1024', keySize: 1024, quantumSafe: false, risk: 'CRITICAL', bsiRef: 'BSI TR-02102-1, Section 3.5', doraRef: DORA_ART9_4, eidasRef: EIDAS_ANNEX } },
  { test: /rsa[-_]?2048|2048[-_]?bit.*rsa/i, profile: { name: 'RSA-2048', keySize: 2048, quantumSafe: false, risk: 'HIGH', bsiRef: 'BSI TR-02102-1, Section 3.5', doraRef: DORA_ART9_4, eidasRef: EIDAS_ANNEX } },
  { test: /rsa[-_]?3072/i, profile: { name: 'RSA-3072', keySize: 3072, quantumSafe: false, risk: 'MEDIUM', bsiRef: 'BSI TR-02102-1, Section 3.5', doraRef: DORA_ART9_4, eidasRef: EIDAS_ANNEX } },
  { test: /rsa[-_]?4096/i, profile: { name: 'RSA-4096', keySize: 4096, quantumSafe: false, risk: 'MEDIUM', bsiRef: 'BSI TR-02102-1, Section 3.5', doraRef: DORA_ART9_4, eidasRef: EIDAS_ANNEX } },
  { test: /\brsa\b|RS256|RS384|RS512/i, profile: { name: 'RSA', keySize: 2048, quantumSafe: false, risk: 'HIGH', bsiRef: 'BSI TR-02102-1, Section 3.5', doraRef: DORA_ART9_4, eidasRef: EIDAS_ANNEX } },
  { test: /ecdsa|p-?256|prime256v1|secp256r1/i, profile: { name: 'ECDSA P-256', keySize: 256, quantumSafe: false, risk: 'HIGH', bsiRef: 'BSI TR-02102-1, Section 3.5', doraRef: DORA_ART9_4, eidasRef: EIDAS_ANNEX } },
  { test: /p-?384|secp384r1/i, profile: { name: 'ECDSA P-384', keySize: 384, quantumSafe: false, risk: 'MEDIUM', bsiRef: 'BSI TR-02102-1, Section 3.5', doraRef: DORA_ART9_4, eidasRef: EIDAS_ANNEX } },
  { test: /ed25519/i, profile: { name: 'Ed25519', keySize: 256, quantumSafe: false, risk: 'MEDIUM', bsiRef: 'BSI TR-02102-1, Section 3.6', doraRef: DORA_ART9, eidasRef: EIDAS_TS } },
  { test: /x25519|curve25519/i, profile: { name: 'X25519', keySize: 256, quantumSafe: false, risk: 'MEDIUM', bsiRef: 'BSI TR-02102-1, Section 3.6', doraRef: DORA_ART9, eidasRef: EIDAS_TS } },
  { test: /aes[-_]?128/i, profile: { name: 'AES-128', keySize: 128, quantumSafe: true, risk: 'LOW', bsiRef: 'BSI TR-02102-1, Section 3.1', doraRef: DORA_ART9, eidasRef: EIDAS_TS } },
  { test: /aes[-_]?256[-_]?gcm/i, profile: { name: 'AES-256-GCM', keySize: 256, quantumSafe: true, risk: 'LOW', bsiRef: 'BSI TR-02102-1, Section 3.1', doraRef: DORA_ART9, eidasRef: EIDAS_TS } },
  { test: /aes[-_]?256/i, profile: { name: 'AES-256', keySize: 256, quantumSafe: true, risk: 'LOW', bsiRef: 'BSI TR-02102-1, Section 3.1', doraRef: DORA_ART9, eidasRef: EIDAS_TS } },
  { test: /chacha20|poly1305/i, profile: { name: 'ChaCha20-Poly1305', keySize: 256, quantumSafe: true, risk: 'LOW', bsiRef: 'BSI TR-02102-1, Section 3.1', doraRef: DORA_ART9, eidasRef: EIDAS_TS } },
  { test: /sha-?512/i, profile: { name: 'SHA-512', quantumSafe: true, risk: 'LOW', bsiRef: 'BSI TR-02102-1, Section 3.3', doraRef: DORA_ART9, eidasRef: EIDAS_TS } },
  { test: /sha-?384/i, profile: { name: 'SHA-384', quantumSafe: true, risk: 'LOW', bsiRef: 'BSI TR-02102-1, Section 3.3', doraRef: DORA_ART9, eidasRef: EIDAS_TS } },
  { test: /sha-?256|sha256/i, profile: { name: 'SHA-256', quantumSafe: true, risk: 'LOW', bsiRef: 'BSI TR-02102-1, Section 3.3', doraRef: DORA_ART9, eidasRef: EIDAS_TS } },
  { test: /ml-?kem|kyber/i, profile: { name: 'ML-KEM', keySize: 768, quantumSafe: true, risk: 'LOW', bsiRef: 'BSI TR-02102-1, Section 4 (NIST FIPS 203)', doraRef: DORA_ART9, eidasRef: EIDAS_ANNEX } },
  { test: /ml-?dsa|dilithium/i, profile: { name: 'ML-DSA', keySize: 87, quantumSafe: true, risk: 'LOW', bsiRef: 'BSI TR-02102-1, Section 4 (NIST FIPS 204)', doraRef: DORA_ART9, eidasRef: EIDAS_ANNEX } },
  { test: /slh-?dsa|sphincs/i, profile: { name: 'SLH-DSA', quantumSafe: true, risk: 'LOW', bsiRef: 'BSI TR-02102-1, Section 4 (NIST FIPS 205)', doraRef: DORA_ART9, eidasRef: EIDAS_ANNEX } },
  { test: /argon2/i, profile: { name: 'Argon2', quantumSafe: true, risk: 'LOW', bsiRef: 'BSI TR-02102-1, Section 3.3', doraRef: DORA_ART9, eidasRef: EIDAS_TS } },
  { test: /bcrypt/i, profile: { name: 'bcrypt', quantumSafe: true, risk: 'LOW', bsiRef: 'BSI TR-02102-1, Section 3.3', doraRef: DORA_ART9, eidasRef: EIDAS_TS } },
  { test: /tls\s*1\.3|tlsv1\.3/i, profile: { name: 'TLS 1.3', quantumSafe: true, risk: 'LOW', bsiRef: 'BSI TR-02102-2, Section 3.2', doraRef: DORA_ART9_2, eidasRef: EIDAS_TS } },
];

export function profileForAlgorithm(raw: string, keySize?: number): AlgorithmProfile {
  const text = `${raw} ${keySize ? `${keySize}` : ''}`.trim();
  for (const entry of CATALOG) {
    if (entry.test.test(text)) {
      return {
        ...entry.profile,
        keySize: keySize || entry.profile.keySize,
      };
    }
  }
  return {
    name: raw || 'Unknown',
    keySize,
    quantumSafe: false,
    risk: 'MEDIUM',
    bsiRef: 'BSI TR-02102-1',
    doraRef: DORA_ART9,
    eidasRef: EIDAS_TS,
  };
}

export function quantumRiskLabel(vulnerableCount: number, total: number): string {
  if (total <= 0) return 'None detected';
  const ratio = vulnerableCount / total;
  if (ratio >= 0.5 || vulnerableCount >= 8) return 'High';
  if (ratio >= 0.2 || vulnerableCount >= 3) return 'Elevated';
  if (vulnerableCount >= 1) return 'Moderate';
  return 'Low';
}

export function securityScore(critical: number, high: number, medium: number, low: number): number {
  const penalty = critical * 18 + high * 8 + medium * 3 + low * 1;
  return Math.max(12, Math.min(100, 100 - penalty));
}
