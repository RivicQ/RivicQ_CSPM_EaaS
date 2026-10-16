# Admin UX audit

`/admin` (role admin): users, audit (capped), API keys, webhooks, SAML configuration store.

Backend remains authoritative. Frontend role chips are not proof of authorization.

Dangerous actions: API key revoke exists; org delete is not a Community product surface. SSO “Type DELETE” is not required until live ACS exists.
