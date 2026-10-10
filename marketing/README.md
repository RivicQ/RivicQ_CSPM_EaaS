# RivicQ CryptoBOM — Professional Marketing Site

Standalone marketing and product showcase UI for RivicQ CryptoBOM. This site is **completely separate** from the React application in `web/src/` — no application code is modified.

## Pages

| Page | Path | Description |
|------|------|-------------|
| **Landing** | `index.html` | Product overview with interactive hero network, posture scoring, compliance grid, multi-cloud selector, and PQC migration timeline |
| **Live Demo** | `showcase.html` | Interactive security posture command center with simulated CBOM scan, findings table, algorithm donut chart, and asset topology map |

## Local Preview

Open any HTML file directly in a browser, or serve the folder:

```bash
cd marketing
python3 -m http.server 5500
# → http://localhost:5500/index.html
# → http://localhost:5500/showcase.html
```

Platform links auto-resolve to `http://localhost:3000/platform` when served on port 5500.

## Design System

Brand tokens are aligned with `web/src/theme/tokens.ts`:

- **Primary:** RivicQ Indigo `#4f46e5`
- **Quantum:** Purple `#7c3aed`
- **Gold:** Enterprise accent `#f59e0b`
- **Fonts:** Inter (UI), JetBrains Mono (metrics/code)
- **Theme:** Dark professional with glass-morphism cards

## Deployment

Published automatically via GitHub Pages CI (`.github/workflows/pages.yml`) to:

- **Landing:** `https://rivicq.github.io/RivicQ_CSPM_EaaS/marketing/`
- **Live Demo:** `https://rivicq.github.io/RivicQ_CSPM_EaaS/marketing/showcase.html`

The React SaaS application remains at `/platform/*`.

## Structure

```
marketing/
├── index.html          # Product landing page
├── showcase.html       # Interactive demo dashboard
├── css/
│   ├── tokens.css      # Design tokens (CSS variables)
│   ├── main.css        # Landing page styles
│   └── showcase.css    # Dashboard demo styles
└── js/
    ├── main.js         # Navigation, scroll, platform links
    ├── visuals.js      # Canvas animations, counters, charts
    └── showcase.js     # Demo dashboard interactions
```

## Interactive Features

- **Hero network graph** — Canvas-based crypto asset topology with hover physics
- **Animated posture score ring** — SVG progress ring with scroll-triggered animation
- **Live metric counters** — Simulated real-time KPI updates
- **Multi-cloud selector** — Click providers to update posture stats
- **Compliance cards** — Hover-activated framework highlights
- **Demo CBOM scan** — Simulated scan with progress bar and activity feed
- **Algorithm donut chart** — Animated distribution visualization
- **Asset topology map** — Multi-cloud zone visualization with data flow particles
