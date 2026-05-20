Demo Mock API
==============

This small Flask server serves demo fixtures from `demo/fixtures/` so the
`web` frontend can be run against a local API without cloud credentials.

Run locally (Python 3.10+ recommended):

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python server.py
```

By default the mock API serves on `http://0.0.0.0:5000`.

Run the frontend (in a separate terminal) using the mock API:

```bash
# from cryptobom-saas/web
REACT_APP_API_URL=http://localhost:5000/api/v1 npm start
```

Notes:
- The mock API is intentionally simple and synchronous. It returns demo
  findings and CBOM fixtures located under `demo/fixtures/`.
- Use this for demos and local development. Replace with real staging/prod
  endpoints when credentials are available.
