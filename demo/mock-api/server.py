from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import os
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app)

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), '..', 'fixtures')

with open(os.path.join(FIXTURES_DIR, 'findings.json')) as f:
    FINDINGS = json.load(f)

with open(os.path.join(FIXTURES_DIR, 'cbom-schema.json')) as f:
    CBOM_SCHEMA = json.load(f)

with open(os.path.join(FIXTURES_DIR, 'benchmarks.json')) as f:
    BENCHMARKS = json.load(f)

DEMO_USERS = {
    'demo@rivicq.local': {
        'id': 'user-demo-oss',
        'name': 'Demo OSS User',
        'email': 'demo@rivicq.local',
        'password': 'Password123!',
        'edition': 'oss',
        'role': 'admin',
    },
    'enterprise@rivicq.local': {
        'id': 'user-demo-enterprise',
        'name': 'Demo Enterprise User',
        'email': 'enterprise@rivicq.local',
        'password': 'Password123!',
        'edition': 'enterprise',
        'role': 'admin',
    },
}

SESSIONS = {}


def _public_user(user):
    return {
        'id': user['id'],
        'name': user['name'],
        'email': user['email'],
        'edition': user['edition'],
        'role': user['role'],
    }

@app.route('/api/v1/scans', methods=['GET'])
def list_scans():
    # Return a summary list with one demo scan
    scan = {
        'id': FINDINGS.get('scan_id'),
        'started_at': FINDINGS.get('started_at'),
        'completed_at': FINDINGS.get('completed_at'),
        'summary': FINDINGS.get('summary')
    }
    return jsonify({'scans': [scan]})


@app.route('/api/v1/auth/editions', methods=['GET'])
def auth_editions():
    return jsonify({
        'editions': [
            {'id': 'oss', 'name': 'CryptoBOM OSS'},
            {'id': 'enterprise', 'name': 'CryptoBOM Enterprise'},
        ]
    })


@app.route('/api/v1/auth/register', methods=['POST'])
def auth_register():
    payload = request.get_json() or {}
    email = str(payload.get('email', '')).strip().lower()
    if not email:
        return jsonify({'error': 'email is required'}), 400
    if email in DEMO_USERS:
        return jsonify({'error': 'user already exists'}), 409

    edition = payload.get('edition') if payload.get('edition') in ['oss', 'enterprise'] else 'oss'
    user = {
        'id': f'user-{uuid.uuid4().hex[:8]}',
        'name': payload.get('name') or 'New User',
        'email': email,
        'password': payload.get('password') or 'Password123!',
        'edition': edition,
        'role': 'analyst',
    }
    DEMO_USERS[email] = user
    token = f'token-{uuid.uuid4().hex}'
    SESSIONS[token] = email
    return jsonify({'token': token, 'user': _public_user(user)})


@app.route('/api/v1/auth/login', methods=['POST'])
def auth_login():
    payload = request.get_json() or {}
    email = str(payload.get('email', '')).strip().lower()
    password = payload.get('password')
    edition = payload.get('edition')

    user = DEMO_USERS.get(email)
    if not user or user.get('password') != password:
        return jsonify({'error': 'invalid credentials'}), 401

    if edition in ['oss', 'enterprise']:
        user['edition'] = edition

    token = f'token-{uuid.uuid4().hex}'
    SESSIONS[token] = email
    return jsonify({'token': token, 'user': _public_user(user)})


@app.route('/api/v1/auth/me', methods=['GET'])
def auth_me():
    auth_header = request.headers.get('Authorization', '')
    token = auth_header.replace('Bearer ', '').strip()
    email = SESSIONS.get(token)
    if not email:
        return jsonify({'error': 'unauthorized'}), 401

    user = DEMO_USERS.get(email)
    if not user:
        return jsonify({'error': 'unauthorized'}), 401

    return jsonify({'user': _public_user(user)})

@app.route('/api/v1/scans/<scan_id>', methods=['GET'])
def get_scan(scan_id):
    if scan_id == FINDINGS.get('scan_id'):
        return jsonify(FINDINGS)
    return jsonify({'error': 'not found'}), 404

@app.route('/api/v1/scans', methods=['POST'])
def create_scan():
    payload = request.get_json() or {}
    # Simulate creating a scan; return immediate response with demo scan id
    now = datetime.utcnow().isoformat() + 'Z'
    resp = {
        'scan_id': 'demo-fixtures-v1',
        'status': 'queued',
        'created_at': now,
        'params': payload
    }
    return jsonify(resp), 201

@app.route('/api/v1/assets', methods=['GET'])
def list_assets():
    assets = []
    for t in FINDINGS.get('targets', []):
        assets.append({
            'id': t.get('id'),
            'host': t.get('host'),
            'port': t.get('port'),
            'protocol': t.get('protocol'),
            'label': t.get('label')
        })
    return jsonify({'assets': assets})

@app.route('/api/v1/assets/<asset_id>/bom', methods=['GET'])
def get_asset_bom(asset_id):
    # Return the cbom schema as a placeholder
    return jsonify(CBOM_SCHEMA)

@app.route('/api/v1/ibmq/attest', methods=['POST'])
def ibmq_attest():
    data = request.get_json() or {}
    resp = {
        'attestation': {
            'id': 'demo-ibmq-attest-1',
            'quantum_safe': False,
            'confidence': 0.25,
            'recommendations': ['Migrate to post-quantum algorithms']
        }
    }
    return jsonify(resp)

@app.route('/api/v1/findings', methods=['GET'])
def get_findings():
    return jsonify(FINDINGS)


@app.route('/api/v1/benchmarks', methods=['GET'])
def get_benchmarks():
    return jsonify(BENCHMARKS)


@app.route('/api/v1/inventory/summary', methods=['GET'])
def inventory_summary():
    assets = [
        {
            'id': t.get('id'),
            'host': t.get('host'),
            'protocol': t.get('protocol'),
            'risk_level': next((f['severity'] for f in FINDINGS['findings'] if f['target_id'] == t['id']), 'MEDIUM'),
            'quantum_safe': any(f.get('quantum_safe') for f in FINDINGS['findings'] if f['target_id'] == t['id']),
            'algorithm': next((f['algorithm'] for f in FINDINGS['findings'] if f.get('algorithm')), 'RSA-2048'),
        }
        for t in FINDINGS.get('targets', [])
    ]
    return jsonify({
        'total_assets': len(assets),
        'quantum_safe': sum(1 for asset in assets if asset['quantum_safe']),
        'vulnerabilities': FINDINGS['summary']['total_findings'],
        'compliance_score': 82,
        'cbom_reports': 12,
        'assets': assets,
    })


@app.route('/api/v1/inventory/assets', methods=['GET'])
def inventory_assets():
    assets = []
    for t in FINDINGS.get('targets', []):
        matched = next((f for f in FINDINGS['findings'] if f['target_id'] == t['id']), None)
        assets.append({
            'id': t.get('id'),
            'name': t.get('label'),
            'host': t.get('host'),
            'protocol': t.get('protocol'),
            'risk_level': matched['severity'] if matched else 'MEDIUM',
            'quantum_safe': bool(matched and matched.get('quantum_safe')),
            'algorithm': matched.get('algorithm') if matched else 'RSA-2048',
        })
    return jsonify({'assets': assets})


@app.route('/api/v1/compliance/dashboard', methods=['GET'])
def compliance_dashboard():
    dashboards = [
        { 'framework': 'iso27001', 'status': 'active', 'score': 85, 'total_controls': 114, 'passed_controls': 97, 'failed_controls': 8, 'pending_controls': 9 },
        { 'framework': 'dora', 'status': 'active', 'score': 72, 'total_controls': 65, 'passed_controls': 47, 'failed_controls': 10, 'pending_controls': 8 },
        { 'framework': 'bsi', 'status': 'active', 'score': 78, 'total_controls': 88, 'passed_controls': 68, 'failed_controls': 12, 'pending_controls': 8 },
        { 'framework': 'nist', 'status': 'active', 'score': 81, 'total_controls': 96, 'passed_controls': 75, 'failed_controls': 11, 'pending_controls': 10 },
    ]
    return jsonify({'dashboards': dashboards})


@app.route('/api/v1/compliance/risks', methods=['GET'])
def compliance_risks():
    risks = [
        { 'id': 'risk-1', 'severity': 'critical', 'title': 'TLS 1.0 enabled', 'status': 'open' },
        { 'id': 'risk-2', 'severity': 'high', 'title': 'RSA-512 certificate', 'status': 'open' },
        { 'id': 'risk-3', 'severity': 'medium', 'title': 'Missing HSTS on legacy API', 'status': 'open' },
    ]
    return jsonify({'risks': risks})


@app.route('/api/v1/cloud/resources/summary', methods=['GET'])
def cloud_resources_summary():
    return jsonify({
        'total_resources': 1604,
        'by_provider': {'aws': 847, 'gcp': 523, 'ibm': 234},
        'security_findings': {'critical': 2, 'high': 7, 'medium': 12},
    })


@app.route('/api/v1/cbom', methods=['GET'])
def cbom_reports():
    reports = [
        { 'id': 'cbom-1', 'name': 'TLS Inventory CBOM', 'status': 'complete', 'asset_count': 6 },
        { 'id': 'cbom-2', 'name': 'Cloud Crypto CBOM', 'status': 'complete', 'asset_count': 42 },
        { 'id': 'cbom-3', 'name': 'Enterprise PQC CBOM', 'status': 'queued', 'asset_count': 18 },
    ]
    return jsonify({'reports': reports})


@app.route('/api/v1/enterprise/quantum/assessment', methods=['GET'])
def enterprise_quantum_assessment():
    return jsonify({
        'risk_score': 72,
        'pqc_readiness': 45,
        'quantum_safe_assets': 18,
        'at_risk_assets': 24,
    })


@app.route('/api/v1/enterprise/quantum/migration-roadmap', methods=['GET'])
def enterprise_quantum_roadmap():
    return jsonify({
        'milestones': [
            { 'name': 'Inventory', 'description': 'Identify quantum-vulnerable assets', 'progress': 100 },
            { 'name': 'Assessment', 'description': 'Prioritize highest-risk algorithms', 'progress': 60 },
            { 'name': 'Migration', 'description': 'Move to PQC algorithms', 'progress': 30 },
            { 'name': 'Validation', 'description': 'Validate enterprise controls', 'progress': 10 },
        ]
    })


@app.route('/api/v1/enterprise/ibm/hpcs/status', methods=['GET'])
def ibm_hpcs_status():
    return jsonify({
        'status': 'healthy',
        'provider': 'ibm',
        'cluster_name': 'rivicq-hpcs-primary',
        'key_count': 24,
        'rotation_policy_days': 90,
        'last_sync': '2026-05-20T00:00:00Z',
    })


@app.route('/api/v1/enterprise/ibm/hpcs/keys', methods=['GET'])
def ibm_hpcs_keys():
    return jsonify({
        'keys': [
            { 'id': 'ibm-key-1', 'name': 'Customer Root HSM Key', 'status': 'active', 'attestation': 'verified' },
            { 'id': 'ibm-key-2', 'name': 'PQC Migration Keystore', 'status': 'active', 'attestation': 'pending' },
            { 'id': 'ibm-key-3', 'name': 'Archive Signing Key', 'status': 'rotation-due', 'attestation': 'verified' },
        ]
    })


@app.route('/api/v1/enterprise/ibm/cos/buckets', methods=['GET'])
def ibm_cos_buckets():
    return jsonify({
        'buckets': [
            { 'name': 'cryptobom-audit', 'region': 'eu-de', 'encrypted': True, 'objects': 1842 },
            { 'name': 'cryptobom-backups', 'region': 'eu-de', 'encrypted': True, 'objects': 94 },
        ]
    })


@app.route('/api/v1/enterprise/aws/cloudhsm/status', methods=['GET'])
def aws_cloudhsm_status():
    return jsonify({
        'status': 'healthy',
        'provider': 'aws',
        'cluster_id': 'cluster-0123abcd',
        'hsm_count': 3,
        'fips_level': '140-3 L3',
        'last_sync': '2026-05-20T00:00:00Z',
    })


@app.route('/api/v1/enterprise/aws/kms/keys', methods=['GET'])
def aws_kms_keys():
    return jsonify({
        'keys': [
            { 'id': 'aws-kms-1', 'alias': 'alias/rivicq-signing', 'status': 'enabled', 'rotation_enabled': True },
            { 'id': 'aws-kms-2', 'alias': 'alias/rivicq-backup', 'status': 'enabled', 'rotation_enabled': True },
            { 'id': 'aws-kms-3', 'alias': 'alias/rivicq-archive', 'status': 'enabled', 'rotation_enabled': False },
        ]
    })


@app.route('/api/v1/enterprise/aws/cloudtrail/crypto-events', methods=['GET'])
def aws_cloudtrail_events():
    return jsonify({
        'events': [
            { 'id': 'evt-1', 'name': 'KeyRotation', 'severity': 'low', 'time': '2026-05-20T01:00:00Z' },
            { 'id': 'evt-2', 'name': 'KeyAccess', 'severity': 'medium', 'time': '2026-05-20T02:00:00Z' },
            { 'id': 'evt-3', 'name': 'PolicyUpdate', 'severity': 'low', 'time': '2026-05-20T03:00:00Z' },
        ]
    })


@app.route('/api/v1/enterprise/gcp/kms/keys', methods=['GET'])
def gcp_kms_keys():
    return jsonify({
        'keys': [
            { 'id': 'gcp-kms-1', 'name': 'projects/rivicq/locations/eu/keyRings/prod/cryptoKeyVersions/1', 'state': 'enabled' },
            { 'id': 'gcp-kms-2', 'name': 'projects/rivicq/locations/eu/keyRings/backup/cryptoKeyVersions/3', 'state': 'enabled' },
        ]
    })


@app.route('/api/v1/enterprise/gcp/gke/workloads', methods=['GET'])
def gcp_gke_workloads():
    return jsonify({
        'workloads': [
            { 'name': 'cryptobom-api', 'namespace': 'production', 'status': 'Running' },
            { 'name': 'cryptobom-scanner', 'namespace': 'security', 'status': 'Running' },
            { 'name': 'grafana', 'namespace': 'monitoring', 'status': 'Running' },
        ]
    })


@app.route('/api/v1/enterprise/gcp/hsm/keyrings', methods=['GET'])
def gcp_hsm_keyrings():
    return jsonify({
        'keyrings': [
            { 'name': 'rivicq-prod', 'location': 'europe-west3', 'keys': 8 },
            { 'name': 'rivicq-archive', 'location': 'europe-west3', 'keys': 3 },
        ]
    })


@app.route('/api/v1/cncf/dashboard', methods=['GET'])
def cncf_dashboard():
    return jsonify({
        'tools_summary': { 'total': 10, 'healthy': 9, 'unhealthy': 1, 'pending': 0 },
        'tools': [
            { 'name': 'Prometheus', 'status': 'healthy' },
            { 'name': 'Grafana', 'status': 'healthy' },
            { 'name': 'ArgoCD', 'status': 'healthy' },
            { 'name': 'Flux', 'status': 'healthy' },
            { 'name': 'Helm', 'status': 'healthy' },
        ]
    })


@app.route('/api/v1/cncf/tools', methods=['GET'])
def cncf_tools():
    return jsonify({
        'tools': [
            { 'name': 'Prometheus', 'category': 'Observability', 'status': 'healthy' },
            { 'name': 'Grafana', 'category': 'Observability', 'status': 'healthy' },
            { 'name': 'ArgoCD', 'category': 'GitOps', 'status': 'healthy' },
            { 'name': 'Flux', 'category': 'GitOps', 'status': 'healthy' },
            { 'name': 'Helm', 'category': 'Package Management', 'status': 'healthy' },
            { 'name': 'Trivy', 'category': 'Security', 'status': 'healthy' },
        ]
    })

@app.route('/fixtures/<path:filename>', methods=['GET'])
def fixtures(filename):
    return send_from_directory(FIXTURES_DIR, filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
