#!/usr/bin/env python3
"""
CryptoBOM SaaS Python SDK Examples

This module demonstrates how to use the CryptoBOM SaaS API with Python.
"""

import requests
import json
from typing import Dict, List, Optional
from dataclasses import dataclass


BASE_URL = "http://localhost:9090"


@dataclass
class HealthResponse:
    status: str
    version: str
    edition: str
    timestamp: str


@dataclass
class Asset:
    id: str
    name: str
    algorithm: str
    key_size: int
    usage: str
    quantum_vulnerable: bool
    compliance_frameworks: List[str]


class CryptoBOMClient:
    """Python client for CryptoBOM SaaS API"""

    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()

    def health_check(self) -> HealthResponse:
        """Check API health status"""
        response = self.session.get(f"{self.base_url}/health")
        response.raise_for_status()
        data = response.json()
        return HealthResponse(
            status=data["status"],
            version=data["version"],
            edition=data["edition"],
            timestamp=data["timestamp"]
        )

    def list_assets(self, page: int = 1, limit: int = 50) -> Dict:
        """List all cryptographic assets"""
        response = self.session.get(
            f"{self.base_url}/api/v1/assets",
            params={"page": page, "limit": limit}
        )
        response.raise_for_status()
        return response.json()

    def create_asset(self, name: str, algorithm: str, key_size: int = 2048,
                    usage: str = "", compliance_frameworks: List[str] = None) -> Asset:
        """Create a new cryptographic asset"""
        data = {
            "name": name,
            "algorithm": algorithm,
            "keySize": key_size,
            "usage": usage,
            "complianceFrameworks": compliance_frameworks or []
        }
        response = self.session.post(
            f"{self.base_url}/api/v1/assets",
            json=data
        )
        response.raise_for_status()
        return Asset(**response.json())

    def analyze_asset(self, asset_id: str, providers: List[str] = None,
                      compliance_frameworks: List[str] = None) -> Dict:
        """Analyze a cryptographic asset"""
        data = {
            "assetId": asset_id,
            "providers": providers or ["mock"],
            "complianceFrameworks": compliance_frameworks or ["NIST", "ISO"]
        }
        response = self.session.post(
            f"{self.base_url}/api/v1/engine/analyze",
            json=data
        )
        response.raise_for_status()
        return response.json()

    def discover_assets(self, sources: List[str] = None,
                        providers: List[str] = None) -> Dict:
        """Discover cryptographic assets"""
        data = {
            "sources": sources or ["kubernetes", "container"],
            "providers": providers or ["mock"]
        }
        response = self.session.post(
            f"{self.base_url}/api/v1/engine/discover",
            json=data
        )
        response.raise_for_status()
        return response.json()

    def compliance_scan(self, frameworks: List[str], scope: str = "all") -> Dict:
        """Run compliance scan"""
        data = {
            "frameworks": frameworks,
            "scope": scope
        }
        response = self.session.post(
            f"{self.base_url}/api/v1/engine/compliance-scan",
            json=data
        )
        response.raise_for_status()
        return response.json()

    def devsecops_assess(self, pipeline: str, include_quantum: bool = True,
                         compliance_frameworks: List[str] = None) -> Dict:
        """Run DevSecOps pipeline assessment"""
        data = {
            "pipeline": pipeline,
            "includeQuantum": include_quantum,
            "complianceFrameworks": compliance_frameworks or ["NIST", "ISO"]
        }
        response = self.session.post(
            f"{self.base_url}/api/v1/engine/devsecops-assess",
            json=data
        )
        response.raise_for_status()
        return response.json()


def main():
    """Example usage"""
    print("🔐 CryptoBOM SaaS Python Examples")
    print("=" * 40)

    client = CryptoBOMClient()

    print("\n📡 Checking health...")
    health = client.health_check()
    print(f"✅ Status: {health.status} | Version: {health.version} | Edition: {health.edition}")

    print("\n📦 Creating asset...")
    asset = client.create_asset(
        name="web-server-tls",
        algorithm="RSA-4096",
        key_size=4096,
        usage="tls_transactions",
        compliance_frameworks=["PCI-DSS", "SOX"]
    )
    print(f"✅ Asset created: {asset.name} (ID: {asset.id})")

    print("\n🔍 Analyzing asset...")
    analysis = client.analyze_asset(
        asset_id=asset.id,
        providers=["mock"],
        compliance_frameworks=["NIST", "ISO"]
    )
    print(f"✅ Analysis completed: {json.dumps(analysis, indent=2)}")

    print("\n📋 Running compliance scan...")
    compliance = client.compliance_scan(
        frameworks=["NIST", "ISO", "BSI"],
        scope="all"
    )
    print(f"✅ Compliance scan completed: {json.dumps(compliance, indent=2)}")

    print("\n🛡️ Running DevSecOps assessment...")
    devsecops = client.devsecops_assess(
        pipeline="github-actions",
        include_quantum=True,
        compliance_frameworks=["NIST", "ISO"]
    )
    print(f"✅ DevSecOps assessment completed: {json.dumps(devsecops, indent=2)}")

    print("\n✨ All examples completed!")


if __name__ == "__main__":
    main()
