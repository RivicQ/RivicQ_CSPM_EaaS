Local Demo Guide
=================

This guide explains how to run a local end-to-end demo of the CryptoBOM SaaS
frontend using a lightweight mock API server. This is useful for demos and
local development when cloud credentials are not available.

1. Start the mock API server:

```bash
cd demo/mock-api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python server.py
```

The mock API will run at `http://localhost:5000`.

2. Start the frontend using the mock API:

```bash
cd web
REACT_APP_API_URL=http://localhost:5000/api/v1 npm install
REACT_APP_API_URL=http://localhost:5000/api/v1 npm start
```

3. Open the frontend at `http://localhost:3000` (or the port printed by the
React dev server). The dashboard (CISO, CSPM, CBOM, PQC) will load demo data
from the mock API fixtures.

Notes:
- To switch to a staging backend, set `REACT_APP_API_URL` to the staging API
  base URL (e.g. `https://staging.example.com/api/v1`) and ensure CORS is
  configured on the backend.
- The mock API is a development convenience and should not be used for any
  production testing.
