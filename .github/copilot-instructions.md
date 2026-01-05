<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Rivic Q-Runtime Development Instructions

## Project Context
This is a quantum-safe cloud-native infrastructure project for EU banking compliance. The project implements post-quantum cryptography (PQC) using NIST standards and provides cryptographic observability through CBOM generation.

## Architecture Guidelines
- Follow Kubernetes-native patterns and CRD best practices
- Implement transparent crypto interception without application changes
- Generate CycloneDX 1.6 compliant CBOMs for all crypto assets
- Ensure eIDAS 2.0 and DORA regulation compliance
- Use TypeScript for type safety and maintainability

## Key Technologies
- **Post-Quantum Crypto**: ML-KEM (Kyber), ML-DSA (Dilithium)
- **Orchestration**: Kubernetes operators and admission controllers
- **Observability**: Prometheus metrics, CBOM generation
- **Standards**: CycloneDX 1.6, NIST PQC, eIDAS 2.0

## Coding Standards
- Use async/await patterns for all I/O operations
- Implement comprehensive error handling and logging
- Follow security-first principles for crypto operations
- Write unit tests for all crypto and operator logic
- Document all public APIs with JSDoc comments

## Banking & Compliance Focus
- Prioritize transparency and auditability
- Implement "shadow mode" for safe testing
- Generate detailed compliance reports
- Ensure backward compatibility with existing systems
